import { useEffect, useRef } from 'react';
import { fmtDate } from '../../lib/format';
import type { TrashBin } from '../../api/types';
import { binAddress } from '../../lib/trashBins';
import { BIN_ICON_URI } from './markerImages';

interface Props {
  bins: TrashBin[];
  below: boolean;
  onClose: () => void;
}

/** 같은 자리에 같은 정보가 반복되면 한 줄로 합친다 */
function uniqueInfo(bins: TrashBin[]) {
  const m = new Map<string, { bin: TrashBin; count: number }>();
  for (const b of bins) {
    const key = [binAddress(b), b.managingOrg, b.managingOrgPhone, b.dataDate].join('|');
    const e = m.get(key);
    if (e) e.count++;
    else m.set(key, { bin: b, count: 1 });
  }
  return [...m.values()];
}

export function BinPopup({ bins, below, onClose }: Props) {
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

  const rows = uniqueInfo(bins);

  return (
    <div ref={ref} className={`popup ${below ? 'popup--below' : 'popup--above'}`} role="dialog" aria-label="쓰레기통 정보">
      <button type="button" className="popup__close" aria-label="닫기" onClick={onClose}>
        ✕
      </button>
      <div className="bin-popup__head">
        <img src={BIN_ICON_URI} width={16} height={16} alt="" aria-hidden="true" />
        {bins.length > 1 ? `쓰레기통 ${bins.length}개` : '쓰레기통'}
      </div>
      <ul className="bin-popup__list">
        {rows.map(({ bin, count }) => (
          <li key={bin.id} className="bin-popup__row">
            <dl className="bin-popup__info">
              <dt>주소</dt>
              <dd>
                {binAddress(bin) ?? '–'}
                {!bin.roadAddress && bin.jibunAddress && <span className="bin-popup__tag">지번</span>}
                {count > 1 && <span className="bin-popup__tag">{count}개</span>}
              </dd>
              {bin.managingOrg && (
                <>
                  <dt>관리기관</dt>
                  <dd>{bin.managingOrg}</dd>
                </>
              )}
              {bin.managingOrgPhone && (
                <>
                  <dt>전화</dt>
                  <dd>
                    <a className="link num" href={`tel:${bin.managingOrgPhone.replace(/[^0-9+]/g, '')}`}>
                      {bin.managingOrgPhone}
                    </a>
                  </dd>
                </>
              )}
              {bin.dataDate && (
                <>
                  <dt>기준일</dt>
                  <dd className="num">{fmtDate(bin.dataDate)}</dd>
                </>
              )}
            </dl>
          </li>
        ))}
      </ul>
      {!below && <span className="popup__tail" aria-hidden="true" />}
    </div>
  );
}
