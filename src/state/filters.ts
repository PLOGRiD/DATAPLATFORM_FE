import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { CategoryCode, SubKey } from '../api/types';
import { ALL_SUB_KEYS, isSubKey, subKeysOf } from '../lib/categories';
import { isValidDate, type MapPreset, type StatPreset } from '../lib/time';

/** URL 쿼리스트링이 원본인 화면 상태 */
export interface Filters {
  stat: StatPreset;
  period: MapPreset;
  from?: string; // period=custom일 때만
  to?: string;
  hs: number; // 0~23 (전체면 0)
  he: number; // 1~24 (전체면 24)
  dows: number[]; // 1=월 … 7=일, 정렬됨. 비면 안 된다
  subs: Set<SubKey>; // 켜진 세부 품목
}

const STAT_VALUES: StatPreset[] = ['today', '7d', '4w', '3m'];
const PERIOD_VALUES: MapPreset[] = ['today', '7d', '4w', '3m', '6m', 'ytd', 'custom'];
const ALL_DOWS = [1, 2, 3, 4, 5, 6, 7];

export const DEFAULT_MAP_FILTERS = {
  period: '4w' as MapPreset,
  hs: 0,
  he: 24,
  dows: ALL_DOWS,
  subs: new Set<SubKey>(ALL_SUB_KEYS),
};

function parseHour(v: string | null, fallback: number) {
  if (v === null || !/^\d{1,2}$/.test(v)) return fallback;
  const n = Number(v);
  return n >= 0 && n <= 24 ? n : fallback;
}

export function parseFilters(search: string): Filters {
  const q = new URLSearchParams(search);

  const statRaw = q.get('stat') as StatPreset | null;
  const stat = statRaw && STAT_VALUES.includes(statRaw) ? statRaw : '4w';

  const periodRaw = q.get('period') as MapPreset | null;
  let period: MapPreset = periodRaw && PERIOD_VALUES.includes(periodRaw) ? periodRaw : '4w';
  let from: string | undefined;
  let to: string | undefined;
  if (period === 'custom') {
    const f = q.get('from');
    const t = q.get('to');
    if (isValidDate(f) && isValidDate(t) && f <= t) {
      from = f;
      to = t;
    } else {
      period = '4w';
    }
  }

  let hs = parseHour(q.get('hs'), 0);
  let he = parseHour(q.get('he'), 24);
  if (hs === 24) hs = 0;
  if (he === 0) he = 24;
  if (hs === he) {
    hs = 0;
    he = 24;
  }

  let dows = ALL_DOWS;
  const dowsRaw = q.get('dows');
  if (dowsRaw) {
    const parsed = [...new Set(dowsRaw.split(',').map(Number).filter((n) => n >= 1 && n <= 7))].sort();
    if (parsed.length > 0) dows = parsed;
  }

  let subs = new Set<SubKey>(ALL_SUB_KEYS);
  const subsRaw = q.get('subs');
  if (subsRaw === 'none') subs = new Set();
  else if (subsRaw) {
    const parsed = subsRaw.split(',').filter(isSubKey);
    if (parsed.length > 0) subs = new Set(parsed);
  }

  return { stat, period, from, to, hs, he, dows, subs };
}

export function serializeFilters(f: Filters, base: string): string {
  const q = new URLSearchParams(base);
  for (const k of ['stat', 'period', 'from', 'to', 'hs', 'he', 'dows', 'subs']) q.delete(k);

  if (f.stat !== '4w') q.set('stat', f.stat);
  if (f.period !== '4w') q.set('period', f.period);
  if (f.period === 'custom' && f.from && f.to) {
    q.set('from', f.from);
    q.set('to', f.to);
  }
  if (!(f.hs === 0 && f.he === 24)) {
    q.set('hs', String(f.hs));
    q.set('he', String(f.he));
  }
  if (f.dows.length > 0 && f.dows.length < 7) q.set('dows', f.dows.join(','));
  if (f.subs.size === 0) q.set('subs', 'none');
  else if (f.subs.size < ALL_SUB_KEYS.length) q.set('subs', ALL_SUB_KEYS.filter((k) => f.subs.has(k)).join(','));

  const s = q.toString().replaceAll('%2C', ',').replaceAll('%3A', ':');
  return s ? `?${s}` : '';
}

export const URL_EVENT = 'plogrid:urlchange';

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(URL_EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(URL_EVENT, cb);
  };
}

const getSearch = () => window.location.search;

export function useFilters() {
  const search = useSyncExternalStore(subscribe, getSearch, getSearch);
  const filters = useMemo(() => parseFilters(search), [search]);

  const update = useCallback((patch: Partial<Filters> | ((f: Filters) => Partial<Filters>)) => {
    const current = parseFilters(window.location.search);
    const p = typeof patch === 'function' ? patch(current) : patch;
    const next = { ...current, ...p };
    if (next.dows.length === 0) next.dows = ALL_DOWS; // 모두 끄면 전체로
    const qs = serializeFilters(next, window.location.search);
    if (qs === window.location.search) return;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}${window.location.hash}`);
    window.dispatchEvent(new Event(URL_EVENT));
  }, []);

  return [filters, update] as const;
}

/* ---------- 품목 상태 도우미 ---------- */

export function categoryOnCount(subs: Set<SubKey>, cat: CategoryCode) {
  const keys = subKeysOf(cat);
  return { on: keys.filter((k) => subs.has(k)).length, total: keys.length };
}

/** 대분류 칩/범례 클릭: 모두 켜져 있으면 모두 끄고, 아니면 모두 켠다 */
export function toggleCategory(subs: Set<SubKey>, cat: CategoryCode): Set<SubKey> {
  const keys = subKeysOf(cat);
  const next = new Set(subs);
  const allOn = keys.every((k) => subs.has(k));
  for (const k of keys) {
    if (allOn) next.delete(k);
    else next.add(k);
  }
  return next;
}
