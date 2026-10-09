import type { SubKey } from './types';
import { ALL_SUB_KEYS } from '../lib/categories';
import { DOW_CODES, isFullHourRange, presetRange, addDays } from '../lib/time';
import type { Filters } from '../state/filters';

/** 지도 분석 기간 → from/to */
export function mapPeriodRange(f: Pick<Filters, 'period' | 'from' | 'to'>) {
  return presetRange(f.period, { from: f.from, to: f.to });
}

/** daily-hourly-counts 요청 기간: '오늘'이면 오늘−6일부터 */
export function dailyRequestRange(f: Pick<Filters, 'period' | 'from' | 'to'>) {
  const r = mapPeriodRange(f);
  return f.period === 'today' ? { from: addDays(r.to, -6), to: r.to } : r;
}

/** 시간대: 전체면 둘 다 생략 */
export function hourParams(hs: number, he: number) {
  if (isFullHourRange(hs, he)) return { hourFrom: undefined, hourTo: undefined };
  return { hourFrom: hs, hourTo: he };
}

/** 요일: 7개 모두면 생략 */
export function dowsParam(dows: number[]) {
  if (dows.length === 0 || dows.length >= 7) return undefined;
  return dows.map((d) => DOW_CODES[d - 1]).join(',');
}

/** 품목: 모두 켜졌으면 생략, 모두 꺼졌으면 none=true(요청하지 않음) */
export function subsParam(subs: Set<SubKey>): { value?: string; none: boolean } {
  if (subs.size === 0) return { none: true };
  if (subs.size >= ALL_SUB_KEYS.length) return { none: false };
  return { value: ALL_SUB_KEYS.filter((k) => subs.has(k)).join(','), none: false };
}

/** 지도 범위 → 'swLng,swLat,neLng,neLat' (소수 6자리) */
export function boundsToBbox(map: kakao.maps.Map): string | null {
  const b = map.getBounds();
  if (!b) return null;
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
  const vals = [clamp(sw.getLng(), 180), clamp(sw.getLat(), 90), clamp(ne.getLng(), 180), clamp(ne.getLat(), 90)];
  if (vals.some((v) => !Number.isFinite(v))) return null;
  if (vals[0] > vals[2] || vals[1] > vals[3]) return null;
  return vals.map((v) => v.toFixed(6)).join(',');
}
