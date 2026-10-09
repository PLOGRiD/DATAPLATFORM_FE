import { useEffect, useState } from 'react';

export interface PlaceName {
  /** 예: "마포구 서교동" */
  area: string;
  /** 예: "양화로 160 부근" (없으면 null) */
  detail: string | null;
}

// 같은 좌표(소수 4자리, 약 10m)는 다시 묻지 않는다
const cache = new Map<string, PlaceName | null>();
const pending = new Set<string>();
const keyOf = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

function lookup(lat: number, lng: number): Promise<PlaceName | null> {
  return new Promise((resolve) => {
    if (typeof kakao === 'undefined' || !kakao.maps?.services) return resolve(null);
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (res, status) => {
      if (status !== kakao.maps.services.Status.OK || !res[0]) return resolve(null);
      const a = res[0].address;
      const r = res[0].road_address;
      const area = [a?.region_2depth_name, a?.region_3depth_name].filter(Boolean).join(' ');
      const road = r ? [r.road_name, r.main_building_no].filter(Boolean).join(' ') : null;
      const detail = road ? `${road} 부근` : a ? `${[a.main_address_no, a.sub_address_no].filter(Boolean).join('-')}번지 부근` : null;
      resolve({ area: area || '이름 없는 곳', detail });
    });
  });
}

/** 좌표 목록의 동네 이름(카카오 주소 변환). 지도가 없으면 비어 있다 */
export function useReverseGeocode(spots: { lat: number; lng: number }[]) {
  const [, setTick] = useState(0);
  const sig = spots.map((s) => keyOf(s.lat, s.lng)).join('|');

  useEffect(() => {
    const todo = sig ? sig.split('|').filter((k) => !cache.has(k) && !pending.has(k)) : [];
    if (todo.length === 0) return;
    Promise.all(
      todo.map(async (k) => {
        const [lat, lng] = k.split(',').map(Number);
        pending.add(k);
        cache.set(k, await lookup(lat, lng));
        pending.delete(k);
      }),
    ).then(() => setTick((t) => t + 1));
  }, [sig]);

  return (lat: number, lng: number): PlaceName | undefined => cache.get(keyOf(lat, lng)) ?? undefined;
}
