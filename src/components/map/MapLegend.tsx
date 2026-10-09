import type { CategoryCode, SubKey } from '../../api/types';
import { CATEGORIES } from '../../lib/categories';
import { categoryOnCount } from '../../state/filters';

interface LegendProps {
  subs: Set<SubKey>;
  onToggle: (c: CategoryCode) => void;
}

export function MapLegend({ subs, onToggle }: LegendProps) {
  return (
    <div className="map-legend map-float" aria-label="범례">
      <div className="map-legend__grid">
        {CATEGORIES.map((c) => {
          const on = categoryOnCount(subs, c.code).on > 0;
          return (
            <button
              key={c.code}
              type="button"
              className={`map-legend__item ${on ? '' : 'is-off'}`}
              aria-pressed={on}
              onClick={() => onToggle(c.code)}
            >
              <span className="dot dot--10" style={{ background: on ? c.color : 'var(--muted-bar)' }} aria-hidden="true" />
              {c.name}
            </button>
          );
        })}
      </div>
      <div className="map-legend__note">
        <span className="num-circle num-circle--icon" aria-hidden="true">n</span>
        근처 수거 기록을 합친 건수
      </div>
    </div>
  );
}

export function ZoomControls({ map }: { map: kakao.maps.Map | null }) {
  const zoom = (d: number) => {
    if (!map) return;
    const lv = Math.max(1, Math.min(14, map.getLevel() + d));
    map.setLevel(lv, { animate: true });
  };
  return (
    <div className="map-zoom map-float" role="group" aria-label="확대·축소">
      <button type="button" aria-label="확대" onClick={() => zoom(-1)} disabled={!map}>
        +
      </button>
      <button type="button" aria-label="축소" onClick={() => zoom(1)} disabled={!map}>
        −
      </button>
    </div>
  );
}
