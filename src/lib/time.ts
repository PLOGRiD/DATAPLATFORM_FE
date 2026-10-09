// 날짜는 모두 KST 기준 'YYYY-MM-DD' 문자열로 다룬다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StatPreset = 'today' | '7d' | '4w' | '3m';
export type MapPreset = StatPreset | '6m' | 'ytd' | 'custom';

export const STAT_PRESETS: { value: StatPreset; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '4w', label: '최근 4주' },
  { value: '3m', label: '최근 3개월' },
];

export const MAP_PRESETS: { value: MapPreset; label: string }[] = [
  ...STAT_PRESETS,
  { value: '6m', label: '6개월' },
  { value: 'ytd', label: '올해' },
  { value: 'custom', label: '직접 선택' },
];

export const MAX_RANGE_DAYS = 366;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toUtcDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 지금 KST 시각의 각 성분 */
export function nowKst() {
  const d = new Date(Date.now() + KST_OFFSET_MS);
  return { date: fromUtcDate(d), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

export function todayKst() {
  return nowKst().date;
}

export function addDays(date: string, n: number) {
  return fromUtcDate(new Date(toUtcDate(date).getTime() + n * DAY_MS));
}

/** 월을 더한다. 말일을 넘으면 그 달 말일로 맞춘다. */
export function addMonths(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUtcDate(target);
}

/** 양 끝 포함 일수 */
export function daysInclusive(from: string, to: string) {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_MS) + 1;
}

/** 1=월 … 7=일 */
export function dowOf(date: string) {
  const js = toUtcDate(date).getUTCDay(); // 0=일
  return js === 0 ? 7 : js;
}

export const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
export const DOW_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function isValidDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fromUtcDate(toUtcDate(s)) === s;
}

export function presetRange(preset: MapPreset, custom?: { from?: string; to?: string }) {
  const to = todayKst();
  switch (preset) {
    case 'today':
      return { from: to, to };
    case '7d':
      return { from: addDays(to, -6), to };
    case '4w':
      return { from: addDays(to, -27), to };
    case '3m':
      return { from: addDays(addMonths(to, -3), 1), to };
    case '6m':
      return { from: addDays(addMonths(to, -6), 1), to };
    case 'ytd':
      return { from: `${to.slice(0, 4)}-01-01`, to };
    case 'custom':
      if (custom?.from && custom?.to) return { from: custom.from, to: custom.to };
      return { from: addDays(to, -27), to };
  }
}

/** 시각 h(0~23)가 시간대 [hs, he) 안인지. hs > he면 자정을 넘는 범위. */
export function inHourRange(h: number, hs: number, he: number) {
  if (hs < he) return h >= hs && h < he;
  return h >= hs || h < he;
}

export function isFullHourRange(hs: number, he: number) {
  return hs === 0 && he === 24;
}

/** collectedAt 문자열(+09:00)에서 시·날짜를 그대로 뽑는다 */
export function hourOfIso(iso: string) {
  return Number(iso.slice(11, 13));
}

export function dateOfIso(iso: string) {
  return iso.slice(0, 10);
}
