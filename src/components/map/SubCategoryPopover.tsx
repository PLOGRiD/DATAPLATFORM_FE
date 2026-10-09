import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CategoryCode, SubKey } from '../../api/types';
import { CATEGORY_BY_CODE, isNoneKey, subKeyName, subKeysOf } from '../../lib/categories';
import { fmtNum } from '../../lib/format';

interface Props {
  cat: CategoryCode;
  anchor: HTMLElement;
  subs: Set<SubKey>;
  counts: Map<SubKey, number> | null;
  onChange: (next: Set<SubKey>) => void;
  onClose: () => void;
}

const WIDTH = 268;

export function SubCategoryPopover({ cat, anchor, subs, counts, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // 열릴 때 ▾ 버튼 아래 6px에 고정(스크롤·리사이즈 시에는 닫힌다)
  const [pos] = useState(() => {
    const r = anchor.getBoundingClientRect();
    return { top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8)) };
  });
  const def = CATEGORY_BY_CODE[cat];
  const keys = subKeysOf(cat);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        anchor.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, onClose]);

  const setAll = (on: boolean) => {
    const next = new Set(subs);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange(next);
  };
  const only = () => onChange(new Set(keys));
  const toggle = (k: SubKey) => {
    const next = new Set(subs);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(next);
  };

  return createPortal(
    <div
      ref={ref}
      className="popover"
      role="dialog"
      aria-label={`${def.name} 세부 품목`}
      style={{ top: pos.top, left: pos.left, width: WIDTH }}
    >
      <div className="popover__head">
        <span className="popover__title">
          <span className="dot" style={{ background: def.color }} aria-hidden="true" />
          {def.name} 세부 품목
        </span>
        <span className="popover__links">
          <button type="button" className="link" onClick={() => setAll(true)}>모두</button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link" onClick={() => setAll(false)}>해제</button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link" onClick={only}>{def.name}만</button>
        </span>
      </div>
      <ul className="popover__list">
        {keys.map((k) => (
          <li key={k}>
            <label className="popover__row">
              <input type="checkbox" checked={subs.has(k)} onChange={() => toggle(k)} />
              <span className="popover__name">{isNoneKey(k) ? '미분류 (재질로만 분류된 건)' : subKeyName(k)}</span>
              <span className="popover__count num">{counts ? fmtNum(counts.get(k) ?? 0) : ''}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}
