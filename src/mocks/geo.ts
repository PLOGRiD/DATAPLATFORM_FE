// 목업 서버용 거리·격자 계산 (map-insights 명세의 계산 규칙을 그대로 따른다)

export interface LatLng { lat: number; lng: number }
export interface Cell extends LatLng { count: number }

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/** 하버사인 거리(m) */
export function haversineM(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 약 sizeM 칸으로 묶어 칸마다 건수·평균 좌표(많은 순). 경도 칸은 centerLat로 보정 */
export function bucket(points: LatLng[], sizeM: number, centerLat: number): Cell[] {
  const dLat = sizeM / M_PER_DEG_LAT;
  const dLng = sizeM / mPerDegLng(centerLat);
  const m = new Map<string, Cell>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / dLat)}:${Math.floor(p.lng / dLng)}`;
    const c = m.get(key);
    if (c) {
      c.lat += p.lat;
      c.lng += p.lng;
      c.count++;
    } else m.set(key, { lat: p.lat, lng: p.lng, count: 1 });
  }
  return [...m.values()]
    .map((c) => ({ lat: c.lat / c.count, lng: c.lng / c.count, count: c.count }))
    .sort((a, b) => b.count - a.count);
}

/** 쓰레기통 최근접 검색용 약 1km 칸 색인 */
const IDX_DEG = 0.01;
export type BinIndex = Map<string, LatLng[]>;

export function buildIndex(bins: LatLng[]): BinIndex {
  const idx: BinIndex = new Map();
  for (const b of bins) {
    const key = `${Math.floor(b.lat / IDX_DEG)}:${Math.floor(b.lng / IDX_DEG)}`;
    const list = idx.get(key);
    if (list) list.push(b);
    else idx.set(key, [b]);
  }
  return idx;
}

/** 1km 안 가장 가까운 쓰레기통까지 거리(m), 없으면 null */
export function nearestM(idx: BinIndex, p: LatLng): number | null {
  const cy = Math.floor(p.lat / IDX_DEG);
  const cx = Math.floor(p.lng / IDX_DEG);
  let best = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const b of idx.get(`${cy + dy}:${cx + dx}`) ?? []) best = Math.min(best, haversineM(p, b));
    }
  }
  return best <= 1000 ? best : null;
}

/** map-insights topSpots 칸 크기(m) */
export function topCellM(level: number) {
  if (level <= 4) return 150;
  if (level <= 6) return 400;
  if (level === 7) return 800;
  if (level <= 10) return 1000;
  if (level <= 12) return 5000;
  return 20000;
}
