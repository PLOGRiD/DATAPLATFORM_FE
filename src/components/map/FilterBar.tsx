import { useCallback, useState } from 'react';
import type { CategoryCode, SubKey } from '../../api/types';
import { mapPeriodRange } from '../../api/params';
import { CATEGORIES } from '../../lib/categories';
import { fmtHourRange, fmtPeriod } from '../../lib/format';
import { daysInclusive, DOW_LABELS, MAP_PRESETS, MAX_RANGE_DAYS, todayKst, type MapPreset } from '../../lib/time';
import { categoryOnCount, toggleCategory, type Filters } from '../../state/filters';
import { Chip } from '../common/Chip';
import { Segmented } from '../common/Segmented';
import { HourSlider } from './HourSlider';
import { SubCategoryPopover } from './SubCategoryPopover';
import { BIN_ICON_URI } from './markerImages';

type Update = (patch: Partial<Filters> | ((f: Filters) => Partial<Filters>)) => void;

const HOUR_PRESETS = [
  { label: '전체', hs: 0, he: 24 },
  { label: '새벽', hs: 0, he: 6 },
  { label: '오전', hs: 6, he: 12 },
  { label: '오후', hs: 12, he: 18 },
  { label: '저녁', hs: 18, he: 24 },
];

function CustomRange({ from, to, onApply }: { from: string; to: string; onApply: (from: string, to: string) => void }) {
  const [draft, setDraft] = useState({ from, to });
  const [synced, setSynced] = useState({ from, to });
  if (synced.from !== from || synced.to !== to) {
    // URL이 바뀌면 입력값도 맞춘다
    setSynced({ from, to });
    setDraft({ from, to });
  }
  const today = todayKst();

  let error = '';
  if (!draft.from || !draft.to) error = '날짜를 모두 입력하세요';
  else if (draft.from > draft.to) error = '시작일이 종료일보다 늦습니다';
  else if (daysInclusive(draft.from, draft.to) > MAX_RANGE_DAYS) error = '최대 1년까지 볼 수 있습니다';

  const change = (next: { from: string; to: string }) => {
    setDraft(next);
    if (next.from && next.to && next.from <= next.to && daysInclusive(next.from, next.to) <= MAX_RANGE_DAYS) {
      onApply(next.from, next.to);
    }
  };

  return (
    <span className="date-range">
      <input
        type="date"
        className="date-input num"
        aria-label="시작일"
        value={draft.from}
        max={today}
        onChange={(e) => change({ ...draft, from: e.target.value })}
      />
      <span aria-hidden="true">~</span>
      <input
        type="date"
        className="date-input num"
        aria-label="종료일"
        value={draft.to}
        max={today}
        onChange={(e) => change({ ...draft, to: e.target.value })}
      />
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

interface Props {
  filters: Filters;
  update: Update;
  popoverCounts: Map<SubKey, number> | null;
  showBins: boolean;
  /** 지금 너무 멀리 보고 있어 쓰레기통이 숨겨진 상태 */
  binsTooFar: boolean;
  onToggleBins: () => void;
  /** 지도에 "쓰레기통이 부족한 곳" 원 표시 */
  showDeficit: boolean;
  onToggleDeficit: () => void;
}

export function FilterBar({ filters, update, popoverCounts, showBins, binsTooFar, onToggleBins, showDeficit, onToggleDeficit }: Props) {
  const [popover, setPopover] = useState<{ cat: CategoryCode; anchor: HTMLElement } | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const range = mapPeriodRange(filters);
  const { hs, he } = filters;

  const setPeriod = (period: MapPreset) => {
    if (period === 'custom') update({ period, from: range.from, to: range.to });
    else update({ period, from: undefined, to: undefined });
  };

  const toggleDow = (d: number) =>
    update((f) => ({ dows: f.dows.includes(d) ? f.dows.filter((x) => x !== d) : [...f.dows, d].sort() }));

  return (
    <div className="filterbar" role="group" aria-label="지도 분석 필터">
      <div className="filterbar__group">
        <span className="filter-label">기간</span>
        <Segmented ariaLabel="지도 분석 기간" options={MAP_PRESETS} value={filters.period} onChange={setPeriod} />
        {filters.period === 'custom' ? (
          <CustomRange from={range.from} to={range.to} onApply={(from, to) => update({ period: 'custom', from, to })} />
        ) : (
          <span className="period-text num">{fmtPeriod(range.from, range.to)}</span>
        )}
      </div>

      <div className="filterbar__group">
        <span className="filter-label">시간대</span>
        <span className="chips">
          {HOUR_PRESETS.map((p) => (
            <Chip key={p.label} variant="select" pressed={hs === p.hs && he === p.he} onClick={() => update({ hs: p.hs, he: p.he })}>
              {p.label}
            </Chip>
          ))}
        </span>
        <HourSlider hs={hs} he={he} onChange={(a, b) => update({ hs: a, he: b })} />
        <span className="hour-text num">{fmtHourRange(hs, he)}</span>
      </div>

      <div className="filterbar__group">
        <span className="filter-label">요일</span>
        <span className="chips">
          {DOW_LABELS.map((label, i) => (
            <Chip
              key={label}
              variant="select"
              pressed={filters.dows.includes(i + 1)}
              onClick={() => toggleDow(i + 1)}
              ariaLabel={`${label}요일`}
            >
              {label}
            </Chip>
          ))}
        </span>
      </div>

      <div className="filterbar__group">
        <span className="filter-label">품목</span>
        <span className="chips">
          {CATEGORIES.map((c) => {
            const { on, total } = categoryOnCount(filters.subs, c.code);
            const isOpen = popover?.cat === c.code;
            return (
              <span key={c.code} className={`catchip ${on === 0 ? 'is-off' : ''}`}>
                <button
                  type="button"
                  className="catchip__main"
                  aria-pressed={on > 0}
                  onClick={() => update((f) => ({ subs: toggleCategory(f.subs, c.code) }))}
                >
                  <span className="dot dot--9" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                  {on > 0 && on < total && (
                    <span className="catchip__frac num">
                      {on}/{total}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="catchip__more"
                  aria-label={`${c.name} 세부 품목 선택`}
                  aria-expanded={isOpen}
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    const anchor = e.currentTarget;
                    setPopover((p) => (p?.cat === c.code ? null : { cat: c.code, anchor }));
                  }}
                >
                  ▾
                </button>
              </span>
            );
          })}
        </span>
      </div>

      <div className="filterbar__group">
        <span className="filter-label">표시</span>
        <Chip pressed={showBins} onClick={onToggleBins} className="bin-chip">
          <img src={BIN_ICON_URI} width={14} height={14} alt="" aria-hidden="true" />
          공공 쓰레기통
        </Chip>
        <Chip pressed={showDeficit} onClick={onToggleDeficit} className="bin-chip">
          <span className="deficit-chip-icon" aria-hidden="true" />
          쓰레기통 부족한 곳
        </Chip>
        {(showBins || showDeficit) && binsTooFar && <span className="period-text">지도를 확대하면 보여요</span>}
      </div>

      {popover && (
        <SubCategoryPopover
          key={popover.cat}
          cat={popover.cat}
          anchor={popover.anchor}
          subs={filters.subs}
          counts={popoverCounts}
          onChange={(subs) => update({ subs })}
          onClose={closePopover}
        />
      )}
    </div>
  );
}
