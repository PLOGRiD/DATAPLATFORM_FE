import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTrashImage } from '../../api/hooks';
import type { TrashPoint } from '../../api/types';
import { itemLabel } from '../../lib/categories';
import { fmtDateTime } from '../../lib/format';

export function PhotoLightbox({ point, onClose }: { point: TrashPoint; onClose: () => void }) {
  const img = useTrashImage(point.id); // 팝업에서 받은 응답 재사용
  const closeRef = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);

  const label = itemLabel(point.category, point.subCategory);
  const meta = [fmtDateTime(point.collectedAt), point.dongName].filter(Boolean).join(' · ');

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${label} 사진`} onClick={onClose}>
      <div className="lightbox__card" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox__photo">
          {img.data && !broken ? (
            <img src={img.data.imageUrl} alt={`${label} 수거 사진`} onError={() => setBroken(true)} />
          ) : (
            <span className="lightbox__msg">{img.isPending ? '' : '사진을 불러올 수 없습니다'}</span>
          )}
        </div>
        <div className="lightbox__caption">
          <div>
            <b>{label}</b>
            <div className="lightbox__meta num">{meta}</div>
          </div>
          <button ref={closeRef} type="button" className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
