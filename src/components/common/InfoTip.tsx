import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** ⓘ 도움말: 호버·포커스 시 아래로 말풍선 */
export function InfoTip({ text, label = '도움말' }: { text: string; label?: string }) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !bubbleRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = bubbleRef.current.offsetWidth;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    setPos({ top: r.bottom + 6, left });
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="infotip"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            id={id}
            role="tooltip"
            className="infotip__bubble"
            style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: 0 }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
