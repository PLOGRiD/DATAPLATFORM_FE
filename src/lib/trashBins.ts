import type { TrashBin } from '../api/types';

/** 같은 좌표의 쓰레기통 묶음 */
export interface BinGroup {
  key: string;
  lat: number;
  lng: number;
  bins: TrashBin[];
}

/** 쓰레기통을 보여주는 가장 먼 지도 레벨(이보다 멀리 보면 숨기고 요청도 안 함) */
export const BIN_MAX_LEVEL = 6;

export function binAddress(b: TrashBin) {
  return b.roadAddress ?? b.jibunAddress;
}

/** 서버가 준 목록을 같은 좌표끼리 묶는다 */
export function groupBins(bins: TrashBin[]): BinGroup[] {
  const m = new Map<string, BinGroup>();
  for (const b of bins) {
    const key = `${b.lng},${b.lat}`;
    const g = m.get(key);
    if (g) g.bins.push(b);
    else m.set(key, { key, lat: b.lat, lng: b.lng, bins: [b] });
  }
  return [...m.values()];
}
