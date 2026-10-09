import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useDailyHourly, useMapInsights, useTrashBins, useTrashGrid, useTrashPoints } from '../../api/hooks';
import { boundsToBbox, dailyRequestRange, dowsParam, hourParams, mapPeriodRange, subsParam } from '../../api/params';
import type { MapInsightsResponse, SubKey, TrashBin, TrashPoint } from '../../api/types';
import { ALL_SUB_KEYS, applyServerNames, subKeyOfPoint } from '../../lib/categories';
import { fmtHourRange, fmtPeriod } from '../../lib/format';
import { dateOfIso, dowOf, hourOfIso, inHourRange, isFullHourRange, MAP_PRESETS } from '../../lib/time';
import { toggleCategory, useFilters } from '../../state/filters';
import { loadMapView, saveMapView } from '../../state/mapView';
import { dailyFlags } from '../../lib/chart';
import { dowsText, subsText } from '../../lib/filterText';
import { DailyTrendChart } from '../charts/DailyTrendChart';
import { HourlyChart } from '../charts/HourlyChart';
import { ErrorBox, Skeleton } from '../common/Status';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterBar } from './FilterBar';
import { MapBadge } from './MapBadge';
import { MapLegend, ZoomControls } from './MapLegend';
import { MarkerPopup } from './MarkerPopup';
import { PhotoLightbox } from './PhotoLightbox';
import { PlaceSearch } from './PlaceSearch';
import { TrashMap, type PointGroup } from './TrashMap';
import { useDailyAggregate } from './useDailyAggregate';
import { BinPopup } from './BinPopup';
import { InsightPanels } from './InsightPanels';
import { BIN_MAX_LEVEL, groupBins, type BinGroup } from '../../lib/trashBins';

/** 카카오 지도를 쓸 수 없을 때 차트 집계에 쓰는 범위(서울 서북권) */
const FALLBACK_VIEW = { bbox: '126.850000,37.500000,127.100000,37.600000', level: 8 };
const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? '';

/** 품목을 모두 끈 상태(요청하지 않음)의 빈 분석 결과 */
const EMPTY_INSIGHTS: MapInsightsResponse = {
  total: 0,
  deficitSpots: [],
  topSpots: { cellM: 0, spots: [] },
  byCategory: [],
  bySubCategory: [],
};

type PopupState = { lat: number; lng: number; below: boolean } & (
  | { kind: 'trash'; points: TrashPoint[] }
  | { kind: 'bin'; bins: TrashBin[] }
);

export function MapSection() {
  const [filters, update] = useFilters();
  const [, kakaoError] = useKakaoLoader({ appkey: KAKAO_KEY, libraries: ['services', 'clusterer'] });
  const mapFailed = !KAKAO_KEY || !!kakaoError;

  const [initialView] = useState(loadMapView);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [view, setView] = useState<{ bbox: string | null; level: number }>({ bbox: null, level: initialView.level });
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [lightbox, setLightbox] = useState<TrashPoint | null>(null);
  const [showBins, setShowBins] = useState(true);
  const [showDeficit, setShowDeficit] = useState(true);
  const idleTimer = useRef<number | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  const effView = mapFailed ? FALLBACK_VIEW : view;
  const { bbox, level } = effView;

  /* ---------- 파라미터 ---------- */
  const range = mapPeriodRange(filters);
  const dailyRange = dailyRequestRange(filters);
  const { hs, he } = filters;
  const hourP = hourParams(hs, he);
  const dowsP = dowsParam(filters.dows);
  const subsP = subsParam(filters.subs);
  const subsNone = subsP.none;
  const dailyFrom = dailyRange.from;
  const dailyTo = dailyRange.to;

  /* ---------- 데이터 ---------- */
  const pointsLevel = level <= 7;
  const points = useTrashPoints({ bbox, from: range.from, to: range.to, enabled: pointsLevel && !mapFailed });
  const truncated = pointsLevel && !!points.data?.truncated;
  const mode: 'points' | 'grid' = pointsLevel && !truncated ? 'points' : 'grid';
  const grid = useTrashGrid({
    bbox, level, from: range.from, to: range.to,
    hourFrom: hourP.hourFrom, hourTo: hourP.hourTo, dows: dowsP, subCategories: subsP.value,
    enabled: mode === 'grid' && !subsNone && !mapFailed,
  });
  const daily = useDailyHourly({
    bbox, from: dailyRange.from, to: dailyRange.to, dows: dowsP, subCategories: subsP.value, enabled: !subsNone,
  });

  useEffect(() => applyServerNames(points.data?.categories), [points.data?.categories]);

  // 지도 아래 분석 패널 3종(서버 계산). 품목을 모두 끄면 요청하지 않고 0건으로 그린다
  const insights = useMapInsights({
    bbox, level, from: range.from, to: range.to,
    hourFrom: hourP.hourFrom, hourTo: hourP.hourTo, dows: dowsP, subCategories: subsP.value,
    enabled: !subsNone,
  });
  const insightsData = subsNone ? EMPTY_INSIGHTS : insights.data;

  // 공공 쓰레기통(레벨 1~6에서만 요청)
  const binsVisible = showBins && !mapFailed && level <= BIN_MAX_LEVEL;
  const bins = useTrashBins({ bbox, enabled: binsVisible });
  const binGroups = useMemo(() => (binsVisible && bins.data ? groupBins(bins.data.bins) : []), [binsVisible, bins.data]);

  /* ---------- 지도 이벤트 ---------- */
  const handleIdle = useCallback((m: kakao.maps.Map) => {
    const c = m.getCenter();
    saveMapView({ lat: c.getLat(), lng: c.getLng(), level: m.getLevel() });
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      const b = boundsToBbox(m);
      if (b) setView({ bbox: b, level: m.getLevel() });
    }, 300);
  }, []);
  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  const handleReady = useCallback((m: kakao.maps.Map) => {
    setMap(m);
    const b = boundsToBbox(m);
    if (b) setView({ bbox: b, level: m.getLevel() });
  }, []);

  // 컨테이너 크기가 바뀌면 지도 다시 배치(처음 생성 뒤 레이아웃이 잡히는 경우 포함)
  useEffect(() => {
    const el = wrapRef.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.relayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

  const closePopup = useCallback(() => setPopup(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  // 마커가 지도 위쪽 320px 안이면 팝업을 아래로 연다
  const opensBelow = useCallback(
    (lat: number, lng: number) =>
      !!map && map.getProjection().containerPointFromCoords(new kakao.maps.LatLng(lat, lng)).y < 320,
    [map],
  );
  const handleGroupClick = useCallback(
    (g: PointGroup) => setPopup({ kind: 'trash', lat: g.lat, lng: g.lng, points: g.points, below: opensBelow(g.lat, g.lng) }),
    [opensBelow],
  );
  const handleBinClick = useCallback(
    (g: BinGroup) => setPopup({ kind: 'bin', lat: g.lat, lng: g.lng, bins: g.bins, below: opensBelow(g.lat, g.lng) }),
    [opensBelow],
  );

  useEffect(() => {
    if (!popup || lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPopup(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popup, lightbox]);

  /* ---------- 프론트 필터(시간대·요일·품목) ---------- */
  const dowSet = useMemo(() => new Set(filters.dows), [filters.dows]);

  const baseFiltered = useMemo(() => {
    // 기간·지도 범위·시간대·요일 적용(품목 제외) — 팝오버 건수와 마커가 공유
    const list = points.data?.points ?? [];
    const allDows = dowSet.size === 7;
    const allHours = isFullHourRange(hs, he);
    return list.filter(
      (p) => (allHours || inHourRange(hourOfIso(p.collectedAt), hs, he)) && (allDows || dowSet.has(dowOf(dateOfIso(p.collectedAt)))),
    );
  }, [points.data, hs, he, dowSet]);

  const groups = useMemo<PointGroup[]>(() => {
    if (mode !== 'points') return [];
    const m = new Map<string, PointGroup>();
    for (const p of baseFiltered) {
      if (!filters.subs.has(subKeyOfPoint(p))) continue;
      const key = `${p.lng},${p.lat}`;
      const g = m.get(key);
      if (g) g.points.push(p);
      else m.set(key, { key, lat: p.lat, lng: p.lng, points: [p] });
    }
    return [...m.values()];
  }, [mode, baseFiltered, filters.subs]);

  // 쓰레기통이 부족한 곳: 지도에 점선 원으로 표시
  const deficitSpots = useMemo(
    () => (insightsData?.deficitSpots ?? []).map((s) => ({ key: `${s.lng},${s.lat}`, lat: s.lat, lng: s.lng })),
    [insightsData],
  );

  const focusSpot = useCallback(
    (lat: number, lng: number) => {
      if (!map) return;
      map.setLevel(3);
      map.setCenter(new kakao.maps.LatLng(lat, lng));
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [map],
  );

  const popoverCounts = useMemo(() => {
    if (mode !== 'points' || !points.data) return null;
    const counts = new Map<SubKey, number>();
    for (const p of baseFiltered) {
      const k = subKeyOfPoint(p);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [mode, points.data, baseFiltered]);

  /* ---------- 날짜×시간대 집계 ---------- */
  const agg = useDailyAggregate({
    days: daily.data?.days, empty: subsNone, from: dailyFrom, to: dailyTo, todayOnly: filters.period === 'today', hs, he,
  });

  /* ---------- 표시 문구 ---------- */
  const periodLabel =
    filters.period === 'custom' ? fmtPeriod(range.from, range.to) : MAP_PRESETS.find((p) => p.value === filters.period)?.label ?? '';
  const conditions = [periodLabel];
  if (!isFullHourRange(hs, he)) conditions.push(fmtHourRange(hs, he));
  if (filters.dows.length < 7) conditions.push(dowsText(filters.dows));
  if (filters.subs.size < ALL_SUB_KEYS.length) conditions.push(subsText(filters.subs));

  const loading = points.isFetching || grid.isFetching || daily.isFetching;
  const mapError = (mode === 'points' ? points.isError : grid.isError) && !mapFailed;

  const flags = dailyFlags(agg?.series.length ?? 0);
  const dailySub = ['지도에 보이는 범위', ...(flags.long ? ['진한 선은 7일 평균'] : [])].join(' · ');

  const onBarClick = useCallback(
    (h: number) => update((f) => (f.hs === h && f.he === h + 1 ? { hs: 0, he: 24 } : { hs: h, he: h + 1 })),
    [update],
  );

  return (
    <section className="card span-12 mapcard" aria-labelledby="map-title">
      <div className="card__head">
        <h2 id="map-title" className="card__title">
          수거 지도
        </h2>
        <p className="subtle">
          지역 검색으로 원하는 곳으로 이동할 수 있습니다. 끌어서 이동, 휠이나 +/−로 확대, 숫자 원을 누르면 확대, 마커를 누르면 상세가 열립니다.
        </p>
      </div>

      <FilterBar
        filters={filters}
        update={update}
        popoverCounts={popoverCounts}
        showBins={showBins}
        binsTooFar={level > BIN_MAX_LEVEL}
        onToggleBins={() => setShowBins((v) => !v)}
        showDeficit={showDeficit}
        onToggleDeficit={() => setShowDeficit((v) => !v)}
      />
      <ActiveFilterChips filters={filters} update={update} />

      <div className="map-layout">
        <div className="map-wrap" ref={wrapRef}>
          {loading && !mapFailed && <div className="map-progress" aria-hidden="true" />}
          {mapFailed ? (
            <div className="map-fallback" role="alert">
              <b>지도를 불러오지 못했습니다</b>
              <span>카카오 지도 JavaScript 키(VITE_KAKAO_JS_KEY)와 사이트 도메인 등록을 확인하세요.</span>
              <span>오른쪽 차트는 서울 서북권 범위로 집계합니다.</span>
            </div>
          ) : (
            <TrashMap
              initialView={initialView}
              mode={mode}
              groups={groups}
              cells={subsNone ? [] : grid.data?.cells ?? []}
              onReady={handleReady}
              onIdle={handleIdle}
              onMoveStart={closePopup}
              onMapClick={closePopup}
              onGroupClick={handleGroupClick}
              binGroups={binGroups}
              highlights={showDeficit ? deficitSpots : []}
              onBinClick={handleBinClick}
            >
              {popup && (
                <CustomOverlayMap
                  position={{ lat: popup.lat, lng: popup.lng }}
                  xAnchor={0.5}
                  yAnchor={popup.below ? 0 : 1}
                  clickable
                  zIndex={10}
                >
                  {popup.kind === 'trash' ? (
                    <MarkerPopup points={popup.points} below={popup.below} onClose={closePopup} onOpenPhoto={setLightbox} />
                  ) : (
                    <BinPopup bins={popup.bins} below={popup.below} onClose={closePopup} />
                  )}
                </CustomOverlayMap>
              )}
            </TrashMap>
          )}

          {!mapFailed && (
            <>
              <MapBadge count={agg ? agg.badge : null} conditions={conditions} loading={loading} />
              <ZoomControls map={map} />
              <MapLegend
                subs={filters.subs}
                onToggle={(c) => update((f) => ({ subs: toggleCategory(f.subs, c) }))}
              />
              <PlaceSearch map={map} />
            </>
          )}

          {mapError && (
            <div className="map-empty map-float" role="alert">
              데이터를 불러오지 못했습니다
              <button type="button" className="btn" onClick={() => (mode === 'points' ? points.refetch() : grid.refetch())}>
                다시 시도
              </button>
            </div>
          )}
        </div>

        <div className="side-charts">
          <div className="panel panel--hourly">
            <div className="panel__head">
              <h3 className="panel__title">시간대별 수거량</h3>
              <span className="subtle">지도에 보이는 범위</span>
            </div>
            {daily.isError && !subsNone ? (
              <ErrorBox error={daily.error} onRetry={() => daily.refetch()} height="100%" />
            ) : agg ? (
              <HourlyChart bars={agg.bars} hs={hs} he={he} onBarClick={onBarClick} />
            ) : (
              <Skeleton height="100%" />
            )}
          </div>
          <div className="panel panel--daily">
            <div className="panel__head">
              <h3 className="panel__title">일별 추이</h3>
              <span className="subtle num">{dailySub}</span>
            </div>
            {daily.isError && !subsNone ? (
              <ErrorBox error={daily.error} onRetry={() => daily.refetch()} height="100%" />
            ) : agg ? (
              <DailyTrendChart days={agg.series} />
            ) : (
              <Skeleton height="100%" />
            )}
          </div>
        </div>
      </div>

      <InsightPanels data={insightsData} error={insights.error} onRetry={() => insights.refetch()} onFocus={focusSpot} />

      {lightbox && <PhotoLightbox point={lightbox} onClose={closeLightbox} />}
    </section>
  );
}
