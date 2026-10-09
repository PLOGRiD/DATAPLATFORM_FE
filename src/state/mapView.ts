export interface MapView {
  lat: number;
  lng: number;
  level: number;
}

const KEY = 'plogrid.map';
export const DEFAULT_VIEW: MapView = { lat: 36.3, lng: 127.8, level: 13 };

export function loadMapView(): MapView {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_VIEW;
    const v = JSON.parse(raw) as Partial<MapView>;
    if (
      typeof v.lat === 'number' && typeof v.lng === 'number' && typeof v.level === 'number' &&
      Math.abs(v.lat) <= 90 && Math.abs(v.lng) <= 180 && v.level >= 1 && v.level <= 14
    ) {
      return { lat: v.lat, lng: v.lng, level: Math.round(v.level) };
    }
  } catch {
    /* 저장소를 쓸 수 없으면 기본값 */
  }
  return DEFAULT_VIEW;
}

export function saveMapView(v: MapView) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
}
