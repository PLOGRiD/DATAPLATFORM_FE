import { fmtNum } from '../../lib/format';

export function MapBadge({ count, conditions, loading }: { count: number | null; conditions: string[]; loading: boolean }) {
  return (
    <div className="map-badge map-float" aria-live="polite">
      지도 범위 안 <b className="num">{count === null ? '–' : fmtNum(count)}</b>건
      {conditions.length > 0 && <span className="map-badge__cond"> {conditions.join(' · ')}</span>}
      {loading && <span className="sr-only"> 불러오는 중</span>}
    </div>
  );
}
