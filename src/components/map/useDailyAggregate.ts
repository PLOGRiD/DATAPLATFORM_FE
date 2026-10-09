import { useMemo } from 'react';
import type { DailyHourlyCountsResponse } from '../../api/types';
import { addDays, daysInclusive, inHourRange } from '../../lib/time';

interface Args {
  days: DailyHourlyCountsResponse['days'] | undefined;
  /** 품목이 모두 꺼져 요청하지 않은 경우: 0으로 채운 날짜를 쓴다 */
  empty: boolean;
  from: string;
  to: string;
  todayOnly: boolean;
  hs: number;
  he: number;
}

/**
 * daily-hourly-counts → 시간대별 막대(시간대 필터 무시), 지도 배지 합계, 일별 추이(시간대 필터 적용).
 * 기간이 '오늘'이면 막대·배지는 마지막 날만 쓴다.
 */
export function useDailyAggregate({ days, empty, from, to, todayOnly, hs, he }: Args) {
  const source = useMemo(() => {
    if (!empty) return days ?? null;
    const n = daysInclusive(from, to);
    return Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), hours: new Array<number>(24).fill(0) }));
  }, [days, empty, from, to]);

  return useMemo(() => {
    if (!source) return null;
    const scope = todayOnly ? source.slice(-1) : source;
    const bars = new Array<number>(24).fill(0);
    for (const d of scope) d.hours.forEach((v, h) => (bars[h] += v));
    const badge = bars.reduce((s, v, h) => (inHourRange(h, hs, he) ? s + v : s), 0);
    const series = source.map((d) => ({
      date: d.date,
      value: d.hours.reduce((s, v, h) => (inHourRange(h, hs, he) ? s + v : s), 0),
    }));
    return { bars, badge, series };
  }, [source, todayOnly, hs, he]);
}
