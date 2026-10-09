import { ALL_SUB_KEYS } from '../../lib/categories';
import { dowsText, subsText } from '../../lib/filterText';
import { fmtHourRange } from '../../lib/format';
import type { Filters } from '../../state/filters';

type Update = (patch: Partial<Filters>) => void;

function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="active-chip">
      <span className="active-chip__label">{label}</span>
      <b className="num">{value}</b>
      <button type="button" className="active-chip__x" aria-label={`${label} 필터 해제`} onClick={onClear}>
        ✕
      </button>
    </span>
  );
}

export function ActiveFilterChips({ filters, update }: { filters: Filters; update: Update }) {
  const hourOn = !(filters.hs === 0 && filters.he === 24);
  const dowOn = filters.dows.length < 7;
  const subsOn = filters.subs.size < ALL_SUB_KEYS.length;
  if (!hourOn && !dowOn && !subsOn) return null;

  return (
    <div className="active-chips" aria-label="적용된 필터">
      {hourOn && <FilterChip label="시간대" value={fmtHourRange(filters.hs, filters.he)} onClear={() => update({ hs: 0, he: 24 })} />}
      {dowOn && <FilterChip label="요일" value={dowsText(filters.dows)} onClear={() => update({ dows: [1, 2, 3, 4, 5, 6, 7] })} />}
      {subsOn && <FilterChip label="품목" value={subsText(filters.subs)} onClear={() => update({ subs: new Set(ALL_SUB_KEYS) })} />}
    </div>
  );
}
