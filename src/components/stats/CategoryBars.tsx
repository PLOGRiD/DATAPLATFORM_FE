import { useMemo, useState } from 'react';
import type { CategoryCode, StatsResponse } from '../../api/types';
import { CATEGORY_BY_CODE, subCodeName } from '../../lib/categories';
import { fmtCount, fmtPct } from '../../lib/format';

/** 품목 구성에 필요한 값(전국 통계 또는 지도 범위 집계) */
export type CategoryBarsData = Pick<StatsResponse, 'byCategory' | 'bySubCategory'> & { total: { value: number } };

/** 품목 구성: 대분류 가로 막대 + 펼치면 세부 품목 (HTML/CSS) */
export function CategoryBars({ stats, emptyText = '통계 기간에 수거 기록이 없습니다.' }: { stats: CategoryBarsData; emptyText?: string }) {
  const [open, setOpen] = useState<Set<CategoryCode>>(new Set());
  const total = stats.total.value;
  const max = stats.byCategory[0]?.count ?? 0;

  const subsByCat = useMemo(() => {
    const m = new Map<CategoryCode, StatsResponse['bySubCategory']>();
    for (const s of stats.bySubCategory) {
      if (s.count <= 0) continue;
      const list = m.get(s.category) ?? [];
      list.push(s);
      m.set(s.category, list);
    }
    return m;
  }, [stats.bySubCategory]);

  const rows = stats.byCategory.filter((c) => c.count > 0);

  if (rows.length === 0) {
    return <p className="empty-text">{emptyText}</p>;
  }

  const toggle = (code: CategoryCode) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const width = (n: number) => `${max > 0 ? (n / max) * 100 : 0}%`;
  const ratio = (n: number) => (total > 0 ? fmtPct(n / total) : '–');

  return (
    <div className="catbars" role="list">
      {rows.map((c) => {
        const def = CATEGORY_BY_CODE[c.code];
        const isOpen = open.has(c.code);
        const subs = subsByCat.get(c.code) ?? [];
        const panelId = `catbars-${c.code}`;
        return (
          <div key={c.code} role="listitem">
            <button
              type="button"
              className="catbars__row"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(c.code)}
            >
              <span className="catbars__name">
                <span className="catbars__caret" aria-hidden="true">▸</span>
                <span className="catbars__label">{def?.name ?? c.code}</span>
              </span>
              <span className="catbars__track">
                <span className="catbars__fill" style={{ width: width(c.count), background: def?.color }} />
              </span>
              <span className="catbars__value num">
                {fmtCount(c.count)} · {ratio(c.count)}
              </span>
            </button>
            {isOpen && (
              <div className="catbars__subs" id={panelId}>
                {subs.length === 0 && <div className="catbars__subrow catbars__subrow--empty">세부 기록 없음</div>}
                {subs.map((s) => (
                  <div key={s.code ?? 'NONE'} className="catbars__subrow">
                    <span className="catbars__subname" title={subCodeName(s.code)}>
                      {subCodeName(s.code)}
                    </span>
                    <span className="catbars__track">
                      <span className="catbars__fill catbars__fill--sub" style={{ width: width(s.count), background: def?.color }} />
                    </span>
                    <span className="catbars__value num">
                      {fmtCount(s.count)} · {ratio(s.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
