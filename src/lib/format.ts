import { DOW_LABELS, dowOf } from './time';

const nf = new Intl.NumberFormat('ko-KR');

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function fmtNum(n: number) {
  return nf.format(Math.round(n));
}

/** 12,438개 */
export function fmtCount(n: number, unit = '개') {
  return `${fmtNum(n)}${unit}`;
}

/** 비율(0~1) → 25.2% */
export function fmtPct(ratio: number) {
  if (!Number.isFinite(ratio)) return '–';
  return `${(ratio * 100).toFixed(1)}%`;
}

/** 증감 비율(value/previous − 1) → ▲ 12.4% / ▼ 3.0% / 변동 없음 */
export function fmtDelta(ratio: number) {
  if (Math.abs(ratio) < 0.005) return '변동 없음';
  return `${ratio > 0 ? '▲' : '▼'} ${Math.abs(ratio * 100).toFixed(1)}%`;
}

/** 5,522km */
export function fmtKm(km: number) {
  return `${fmtNum(km)}km`;
}

/** '2026-10-07' → '2026.10.07' */
export function fmtDate(date: string) {
  return date.replaceAll('-', '.');
}

/** '2026-10-07' → '2026.10.07 (수)' */
export function fmtDateDow(date: string) {
  return `${fmtDate(date)} (${DOW_LABELS[dowOf(date) - 1]})`;
}

/** '2026-10-07T21:14:00+09:00' → '2026.10.07 (수) 21:14' (문자열 그대로, 시간대 변환 없음) */
export function fmtDateTime(iso: string) {
  return `${fmtDateDow(iso.slice(0, 10))} ${iso.slice(11, 16)}`;
}

/** '2026-10-09T09:00:12+09:00' → '2026.10.09 09:00' */
export function fmtAsOf(iso: string) {
  return `${fmtDate(iso.slice(0, 10))} ${iso.slice(11, 16)}`;
}

/** 기간: 2026.09.12~10.09 (같은 해면 끝의 연도 생략), 같은 날이면 하나만 */
export function fmtPeriod(from: string, to: string) {
  if (from === to) return fmtDate(from);
  const end = from.slice(0, 4) === to.slice(0, 4) ? fmtDate(to.slice(5)) : fmtDate(to);
  return `${fmtDate(from)}~${end}`;
}

/** 시간대: 18~24시, 07~08시, 22~02시 */
export function fmtHourRange(hs: number, he: number) {
  return `${pad2(hs)}~${pad2(he)}시`;
}

/** 숫자 원: 1,000 이상 '1.2천' */
export function fmtCluster(n: number) {
  if (n < 1000) return String(n);
  const v = (n / 1000).toFixed(1).replace(/\.0$/, '');
  return `${v}천`;
}

/** 차트 날짜 축: 09.12 */
export function fmtAxisDate(date: string) {
  return date.slice(5).replace('-', '.');
}

/** 거리: 1,000m 미만은 10m 단위, 이상은 km 소수 1자리. null = 1km 안에 없음 */
export function fmtDistance(m: number | null) {
  if (m === null) return '1km 안에 없음';
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m / 10) * 10}m`;
}
