import type { ReactNode } from 'react';
import type { MapInsightsResponse } from '../../api/types';
import { fmtCount, fmtDistance, fmtPct } from '../../lib/format';
import { InfoTip } from '../common/InfoTip';
import { ErrorBox, Skeleton } from '../common/Status';
import { CategoryBars } from '../stats/CategoryBars';
import { useReverseGeocode, type PlaceName } from './useReverseGeocode';

interface Props {
  /** GET /dashboards/map-insights 결과(아직 없으면 undefined) */
  data: MapInsightsResponse | undefined;
  error: unknown;
  onRetry: () => void;
  onFocus: (lat: number, lng: number) => void;
}

function Place({ name, lat, lng, coarse }: { name: PlaceName | undefined; lat: number; lng: number; coarse?: boolean }) {
  return (
    <span className="insight__place">
      <span className="insight__area">{name?.area ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>
      {!coarse && name?.detail && <span className="insight__detail">{name.detail}</span>}
    </span>
  );
}

function Panel({ title, sub, info, children }: { title: string; sub?: string; info?: string; children: ReactNode }) {
  return (
    <section className="insight">
      <div className="panel__head">
        <h3 className="panel__title insight__title">
          {title}
          {info && <InfoTip text={info} label={`${title} 도움말`} />}
        </h3>
        {sub && <span className="subtle">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="insight__empty">{children}</p>;
}

export function InsightPanels({ data, error, onRetry, onFocus }: Props) {
  const deficit = data?.deficitSpots ?? [];
  const top = data?.topSpots.spots ?? [];
  const nameOf = useReverseGeocode([...deficit, ...top]);
  // 칸이 1km 이상이면 번지까지는 의미가 없어 동네 이름만 보인다
  const coarse = (data?.topSpots.cellM ?? 0) >= 1000;

  const body = (render: (d: MapInsightsResponse) => ReactNode) =>
    error && !data ? <ErrorBox error={error} onRetry={onRetry} height={176} /> : data ? render(data) : <Skeleton height={176} />;

  return (
    <div className="insights">
      <Panel title="쓰레기통이 부족한 곳" info="30건 이상 나왔는데 100m 안에 쓰레기통이 없는 곳입니다.">
        {body(() =>
          deficit.length === 0 ? (
            <Empty>지도 범위 안에서는 쓰레기통이 부족한 곳이 없습니다.</Empty>
          ) : (
            <ol className="insight__list">
              {deficit.map((s, i) => (
                <li key={`${s.lng},${s.lat}`}>
                  <button type="button" className="insight__row" onClick={() => onFocus(s.lat, s.lng)}>
                    <span className="insight__rank insight__rank--warn num">{i + 1}</span>
                    <Place name={nameOf(s.lat, s.lng)} lat={s.lat} lng={s.lng} />
                    <span className="insight__meta num">
                      <b>{fmtCount(s.count, '건')}</b>
                      <span>쓰레기통 {fmtDistance(s.nearestBinM)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ),
        )}
      </Panel>

      <Panel title="많이 나온 곳 Top 5" sub="지도에 보이는 범위">
        {body((d) =>
          top.length === 0 ? (
            <Empty>지도 범위 안에 수거 기록이 없습니다.</Empty>
          ) : (
            <ol className="insight__list">
              {top.map((s, i) => (
                <li key={`${s.lng},${s.lat}`}>
                  <button type="button" className="insight__row" onClick={() => onFocus(s.lat, s.lng)}>
                    <span className="insight__rank num">{i + 1}</span>
                    <Place name={nameOf(s.lat, s.lng)} lat={s.lat} lng={s.lng} coarse={coarse} />
                    <span className="insight__meta num">
                      <b>{fmtCount(s.count, '건')}</b>
                      <span>{d.total > 0 ? fmtPct(s.count / d.total) : '–'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ),
        )}
      </Panel>

      <Panel title="이 지역 품목 구성" sub="지도에 보이는 범위">
        {body((d) => (
          <div className="catbars-scroll">
            <CategoryBars
              stats={{ total: { value: d.total }, byCategory: d.byCategory, bySubCategory: d.bySubCategory }}
              emptyText="지도 범위 안에 수거 기록이 없습니다."
            />
          </div>
        ))}
      </Panel>
    </div>
  );
}
