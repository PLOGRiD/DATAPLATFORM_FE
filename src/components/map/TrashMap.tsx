import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Map as KakaoMap } from 'react-kakao-maps-sdk';
import type { TrashGridResponse, TrashPoint } from '../../api/types';
import { CATEGORY_BY_CODE } from '../../lib/categories';
import { BIN_MAX_LEVEL, type BinGroup } from '../../lib/trashBins';
import { fmtCluster } from '../../lib/format';
import { useTokens } from '../../lib/useTokens';
import type { MapView } from '../../state/mapView';
/** 지도에 강조할 지점 */
export interface Spot { key: string; lat: number; lng: number }
import { binMarkerImage, circleSize, markerImage, stackedMarkerImage } from './markerImages';

export interface PointGroup {
  key: string;
  lat: number;
  lng: number;
  points: TrashPoint[]; // 최신순
}

interface Props {
  initialView: MapView;
  mode: 'points' | 'grid';
  groups: PointGroup[];
  cells: TrashGridResponse['cells'];
  onReady: (map: kakao.maps.Map) => void;
  onIdle: (map: kakao.maps.Map) => void;
  onMoveStart: () => void;
  onMapClick: () => void;
  onGroupClick: (g: PointGroup) => void;
  /** 지금 범위의 쓰레기통(같은 자리끼리 묶음). 가까이 볼 때만 그린다 */
  binGroups: BinGroup[];
  onBinClick: (g: BinGroup) => void;
  /** 쓰레기통이 부족한 곳: 반경 100m 점선 원 + 순위 */
  highlights: Spot[];
  children?: ReactNode;
}

export function TrashMap({ initialView, mode, groups, cells, onReady, onIdle, onMoveStart, onMapClick, onGroupClick, binGroups, onBinClick, highlights, children }: Props) {
  const t = useTokens();
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [zoom, setZoom] = useState(initialView.level);
  const [center] = useState({ lat: initialView.lat, lng: initialView.lng });
  const readyRef = useRef<kakao.maps.Map | null>(null);
  const groupClickRef = useRef(onGroupClick);
  const binClickRef = useRef(onBinClick);
  useEffect(() => {
    groupClickRef.current = onGroupClick;
    binClickRef.current = onBinClick;
  }, [onGroupClick, onBinClick]);

  // 개별 마커(레벨 1~4) / 클러스터(레벨 5~7)
  const individual = zoom <= 4;
  const clusterZoom = individual ? 0 : zoom; // 레벨 5~7에서는 확대 단계마다 칸 크기가 달라 다시 묶는다
  useEffect(() => {
    if (!map || mode !== 'points') return;
    const listeners: (() => void)[] = [];
    const makeMarker = (lat: number, lng: number, image: kakao.maps.MarkerImage, g: PointGroup) => {
      const m = new kakao.maps.Marker({ position: new kakao.maps.LatLng(lat, lng), image, clickable: true });
      const handler = () => groupClickRef.current(g);
      kakao.maps.event.addListener(m, 'click', handler);
      listeners.push(() => kakao.maps.event.removeListener(m, 'click', handler));
      return m;
    };

    if (individual) {
      const markers = groups.map((g) => {
        const color = CATEGORY_BY_CODE[g.points[0].category]?.color ?? '#888';
        const img =
          g.points.length > 1 ? stackedMarkerImage(color, t.markerRing, g.points.length, t.fg, t.bg) : markerImage(color, t.markerRing);
        const m = makeMarker(g.lat, g.lng, img, g);
        m.setZIndex(2); // 쓰레기통 마커보다 위
        m.setMap(map);
        return m;
      });
      return () => {
        listeners.forEach((off) => off());
        markers.forEach((m) => m.setMap(null));
      };
    }

    // 클러스터(레벨 5~7): 화면 약 60px 칸으로 직접 묶는다.
    // 카카오 MarkerClusterer에 기록마다 마커를 넣으면(최대 5,000개) 지도를 움직일 때마다 수 초씩 멈춰서 쓰지 않는다.
    const proj = map.getProjection();
    const b = map.getBounds();
    const p1 = proj.containerPointFromCoords(b.getSouthWest());
    const p2 = proj.containerPointFromCoords(b.getNorthEast());
    const dLng = ((b.getNorthEast().getLng() - b.getSouthWest().getLng()) / Math.max(1, p2.x - p1.x)) * 60;
    const dLat = ((b.getNorthEast().getLat() - b.getSouthWest().getLat()) / Math.max(1, p1.y - p2.y)) * 60;
    const cells = new Map<string, { groups: PointGroup[]; count: number; lat: number; lng: number }>();
    for (const g of groups) {
      const key = `${Math.floor(g.lat / dLat)}:${Math.floor(g.lng / dLng)}`;
      const n = g.points.length;
      const c = cells.get(key);
      if (c) {
        c.groups.push(g);
        c.count += n;
        c.lat += g.lat * n;
        c.lng += g.lng * n;
      } else cells.set(key, { groups: [g], count: n, lat: g.lat * n, lng: g.lng * n });
    }
    const markers: kakao.maps.Marker[] = [];
    const overlays: kakao.maps.CustomOverlay[] = [];
    for (const c of cells.values()) {
      if (c.groups.length === 1) {
        // 떨어진 한 자리는 개별 마커
        const g = c.groups[0];
        const color = CATEGORY_BY_CODE[g.points[0].category]?.color ?? '#888';
        const img = g.points.length > 1 ? stackedMarkerImage(color, t.markerRing, g.points.length, t.fg, t.bg) : markerImage(color, t.markerRing);
        const m = makeMarker(g.lat, g.lng, img, g);
        m.setZIndex(2);
        m.setMap(map);
        markers.push(m);
        continue;
      }
      const pos = new kakao.maps.LatLng(c.lat / c.count, c.lng / c.count);
      const el = document.createElement('button');
      el.type = 'button';
      const size = circleSize(c.count);
      el.className = 'num-circle num';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.textContent = fmtCluster(c.count);
      el.setAttribute('aria-label', `${c.count}건, 눌러서 확대`);
      el.addEventListener('click', () => {
        map.setCenter(pos);
        map.setLevel(Math.max(1, map.getLevel() - 1), { animate: true });
      });
      const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, clickable: true, xAnchor: 0.5, yAnchor: 0.5, zIndex: 2 });
      ov.setMap(map);
      overlays.push(ov);
    }
    return () => {
      listeners.forEach((off) => off());
      markers.forEach((m) => m.setMap(null));
      overlays.forEach((o) => o.setMap(null));
    };
  }, [map, mode, groups, individual, clusterZoom, t.markerRing, t.fg, t.bg]);

  // 쓰레기통(레벨 1~6에서만)
  const showBins = zoom <= BIN_MAX_LEVEL;
  useEffect(() => {
    if (!map || !showBins || binGroups.length === 0) return;
    const offs: (() => void)[] = [];
    const markers = binGroups.map((g) => {
      const m = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(g.lat, g.lng),
        image: binMarkerImage(t.markerRing, g.bins.length, t.fg, t.bg),
        clickable: true,
        zIndex: 1,
      });
      const handler = () => binClickRef.current(g);
      kakao.maps.event.addListener(m, 'click', handler);
      offs.push(() => kakao.maps.event.removeListener(m, 'click', handler));
      m.setMap(map);
      return m;
    });
    return () => {
      offs.forEach((off) => off());
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, showBins, binGroups, t.markerRing, t.fg, t.bg]);

  // 쓰레기통이 부족한 곳(가까이 볼 때만)
  const showHighlights = zoom <= 7;
  useEffect(() => {
    if (!map || !showHighlights || highlights.length === 0) return;
    const objs: { setMap: (m: kakao.maps.Map | null) => void }[] = [];
    highlights.forEach((h, i) => {
      const center = new kakao.maps.LatLng(h.lat, h.lng);
      const circle = new kakao.maps.Circle({
        center,
        radius: 100,
        strokeWeight: 1,
        strokeColor: '#C2410C',
        strokeOpacity: 1,
        strokeStyle: 'dash',
        fillColor: '#C2410C',
        fillOpacity: 0.25,
      });
      circle.setMap(map);
      const el = document.createElement('span');
      el.className = 'deficit-rank num';
      el.textContent = String(i + 1);
      const ov = new kakao.maps.CustomOverlay({ position: center, content: el, xAnchor: 0.5, yAnchor: 0.5, zIndex: 3 });
      ov.setMap(map);
      objs.push(circle, ov);
    });
    return () => objs.forEach((o) => o.setMap(null));
  }, [map, showHighlights, highlights]);

  // 서버 격자 숫자 원
  useEffect(() => {
    if (!map || mode !== 'grid') return;
    const overlays = cells.map((c) => {
      const pos = new kakao.maps.LatLng(c.lat, c.lng);
      const el = document.createElement('button');
      el.type = 'button';
      const s = circleSize(c.count);
      el.className = 'num-circle num';
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.textContent = fmtCluster(c.count);
      el.setAttribute('aria-label', `${c.count}건, 눌러서 확대`);
      el.addEventListener('click', () => {
        map.setCenter(pos);
        map.setLevel(Math.max(1, map.getLevel() - 1), { animate: true });
      });
      const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, clickable: true, xAnchor: 0.5, yAnchor: 0.5, zIndex: 2 });
      ov.setMap(map);
      return ov;
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, mode, cells]);

  return (
    <KakaoMap
      center={center}
      level={initialView.level}
      style={{ width: '100%', height: '100%' }}
      onCreate={(m) => {
        if (readyRef.current === m) return;
        readyRef.current = m;
        setMap(m);
        onReady(m);
      }}
      onIdle={onIdle}
      onZoomChanged={(m) => setZoom(m.getLevel())}
      onDragStart={onMoveStart}
      onZoomStart={onMoveStart}
      onClick={onMapClick}
    >
      {children}
    </KakaoMap>
  );
}
