import { useEffect, useRef, useState } from 'react';
import { useTrashImage } from '../../api/hooks';
import type { TrashPoint } from '../../api/types';
import { CATEGORY_BY_CODE, itemLabel } from '../../lib/categories';
import { fmtDateTime } from '../../lib/format';

function Photo({ point, small, onOpen }: { point: TrashPoint; small?: boolean; onOpen?: () => void }) {
  const img = useTrashImage(point.id);
  const [broken, setBroken] = useState(false);
  const cls = small ? 'photo photo--small' : 'photo';
  if (img.isPending) return <div className={`${cls} photo--loading`} aria-hidden="true" />;
  if (img.isError || broken || !img.data) {
    return <div className={`${cls} photo--error`}>{small ? '' : '사진을 불러올 수 없습니다'}</div>;
  }
  const el = (
    <img
      className={cls}
      src={img.data.thumbnailUrl}
      alt={`${itemLabel(point.category, point.subCategory)} 수거 사진`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
  if (!onOpen) return el;
  return (
    <button type="button" className="photo-btn" onClick={onOpen} aria-label="사진 크게 보기">
      {el}
    </button>
  );
}

function ItemLine({ p }: { p: TrashPoint }) {
  return (
    <div className="popup__item">
      <span className="dot dot--9" style={{ background: CATEGORY_BY_CODE[p.category]?.color }} aria-hidden="true" />
      {itemLabel(p.category, p.subCategory)}
    </div>
  );
}

interface Props {
  points: TrashPoint[];
  below: boolean;
  onClose: () => void;
  onOpenPhoto: (p: TrashPoint) => void;
}

export function MarkerPopup({ points, below, onClose, onOpenPhoto }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 팝업 위 휠·드래그가 지도로 전달되지 않게 막는다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const evs = ['wheel', 'mousedown', 'touchstart', 'dblclick', 'pointerdown'];
    evs.forEach((ev) => el.addEventListener(ev, stop));
    return () => evs.forEach((ev) => el.removeEventListener(ev, stop));
  }, []);

  const single = points.length === 1;
  const shown = points.slice(0, 10);

  return (
    <div ref={ref} className={`popup ${below ? 'popup--below' : 'popup--above'}`} role="dialog" aria-label="수거 기록 상세">
      <button type="button" className="popup__close" aria-label="닫기" onClick={onClose}>
        ✕
      </button>
      {single ? (
        <div className="popup__single">
          <Photo point={points[0]} onOpen={() => onOpenPhoto(points[0])} />
          <ItemLine p={points[0]} />
          <div className="popup__time num">{fmtDateTime(points[0].collectedAt)}</div>
          {points[0].dongName && <div className="popup__dong">{points[0].dongName}</div>}
        </div>
      ) : (
        <>
          <div className="popup__stackhead">같은 자리 {points.length}건 · 최신순</div>
          <ul className="popup__list">
            {shown.map((p) => (
              <li key={p.id} className="popup__row">
                <Photo point={p} small onOpen={() => onOpenPhoto(p)} />
                <div className="popup__rowtext">
                  <ItemLine p={p} />
                  <div className="popup__time num">{fmtDateTime(p.collectedAt)}</div>
                </div>
              </li>
            ))}
          </ul>
          {points.length > 10 && <div className="popup__more">외 {points.length - 10}건</div>}
        </>
      )}
      {!below && <span className="popup__tail" aria-hidden="true" />}
    </div>
  );
}
