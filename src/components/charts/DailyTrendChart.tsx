import ReactEChartsCore from 'echarts-for-react/esm/core';
import { useMemo } from 'react';
import { dailyFlags, movingAverage } from '../../lib/chart';
import { fmtAxisDate, fmtCount, fmtDateDow, fmtNum } from '../../lib/format';
import { dowOf, nowKst } from '../../lib/time';
import { useTokens, withAlpha } from '../../lib/useTokens';
import { tooltipBase } from '../common/Tooltip';
import { echarts } from './echarts';

export interface DailyPoint {
  date: string;
  value: number;
}

/** 0 / 중간 / 최댓값 눈금이 깔끔하게 나오는 최댓값 */
function niceMax(v: number) {
  if (v <= 2) return 2;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    const c = m * p;
    if (c >= v && Number.isInteger(c / 2)) return c;
  }
  return Math.ceil(v / 2) * 2;
}

export function DailyTrendChart({ days }: { days: DailyPoint[] }) {
  const t = useTokens();

  const option = useMemo(() => {
    const n = days.length;
    const { long, weekends, dots } = dailyFlags(n);
    const values = days.map((d) => d.value);
    const today = nowKst();
    const lastIsToday = n > 0 && days[n - 1].date === today.date;
    const dashedTail = lastIsToday && n >= 2;

    let maxIdx = -1;
    values.forEach((v, i) => {
      if (v > 0 && (maxIdx < 0 || v > values[maxIdx])) maxIdx = i;
    });
    const vMax = Math.max(0, ...values);
    const yMax = niceMax(vMax * 1.18); // 최고값 라벨이 잘리지 않게 위쪽 여유

    // X축 라벨: 최대 6개(7일 이하면 전부)
    const shown = new Set<number>();
    if (n <= 7) for (let i = 0; i < n; i++) shown.add(i);
    else for (let k = 0; k < 6; k++) shown.add(Math.round((k * (n - 1)) / 5));

    const lineColor = long ? withAlpha(t.chart, 0.4) : t.chart;
    const symbolStyle = { color: t.surface, borderColor: t.chart, borderWidth: 1.5 };
    const area = { color: withAlpha(t.chart, 0.1) };

    const series: object[] = [];

    if (weekends) {
      series.push({
        type: 'bar',
        yAxisIndex: 1,
        silent: true,
        z: 0,
        barWidth: '100%',
        barCategoryGap: '0%',
        itemStyle: { color: t.surface2 },
        data: days.map((d) => (dowOf(d.date) >= 6 ? 1 : 0)),
        tooltip: { show: false },
        emphasis: { disabled: true },
      });
    }

    series.push({
      type: 'line',
      name: '일별',
      z: 2,
      smooth: false,
      data: values.map((v, i) => (dashedTail && i === n - 1 ? '-' : v)),
      lineStyle: { color: lineColor, width: long ? 1.2 : 2 },
      areaStyle: area,
      symbol: 'circle',
      showSymbol: dots,
      symbolSize: 5.2,
      itemStyle: { ...symbolStyle, opacity: long ? 0.4 : 1 },
      emphasis: { disabled: true },
    });

    if (dashedTail) {
      series.push({
        type: 'line',
        name: '오늘',
        z: 2,
        smooth: false,
        data: values.map((v, i) => (i >= n - 2 ? v : '-')),
        lineStyle: { color: lineColor, width: long ? 1.2 : 2, type: [4, 4] },
        areaStyle: area,
        symbol: 'circle',
        showSymbol: dots,
        symbolSize: 5.2,
        itemStyle: { ...symbolStyle, opacity: long ? 0.4 : 1 },
        label: {
          show: true,
          position: 'top',
          align: 'right',
          distance: 8,
          color: t.fg3,
          fontSize: 11,
          formatter: (p: { dataIndex: number }) => (p.dataIndex === n - 1 ? '오늘 · 집계 중' : ''),
        },
        emphasis: { disabled: true },
      });
    }

    if (long) {
      series.push({
        type: 'line',
        name: '7일 평균',
        z: 3,
        smooth: false,
        data: movingAverage(values).map((v) => Math.round(v * 10) / 10),
        lineStyle: { color: t.chart, width: 2.2 },
        symbol: 'none',
        emphasis: { disabled: true },
      });
    }

    if (maxIdx >= 0) {
      series.push({
        type: 'scatter',
        z: 4,
        silent: true,
        data: values.map((v, i) => (i === maxIdx ? v : '-')),
        symbolSize: 9,
        itemStyle: { color: t.chart },
        label: {
          show: true,
          position: 'top',
          distance: 6,
          // 양 끝에 가까우면 그래프 안쪽으로 붙여 잘리지 않게
          align: maxIdx < n * 0.15 ? 'left' : maxIdx > n * 0.85 ? 'right' : 'center',
          color: t.fg,
          fontSize: 11.5,
          fontWeight: 600,
          formatter: () => `최고 ${fmtCount(values[maxIdx])}`,
        },
        tooltip: { show: false },
      });
    }

    return {
      animation: false,
      textStyle: { fontFamily: t.font },
      // 위 시간대별 그래프와 같은 가로폭(좌우 4px). Y축 숫자는 그래프 안쪽, 보조선 바로 위에 둔다
      grid: { left: 4, right: 4, top: 14, bottom: 26, containLabel: false },
      tooltip: {
        ...tooltipBase(t),
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: t.lineStrong, width: 1 } },
        formatter: (params: { dataIndex: number }[]) => {
          const i = params[0]?.dataIndex ?? 0;
          const d = days[i];
          if (!d) return '';
          const suffix = d.date === today.date ? ` · ${String(today.hour).padStart(2, '0')}시까지` : '';
          return `<b>${fmtDateDow(d.date)}</b><br/>${fmtCount(d.value)}${suffix}`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: days.map((d) => d.date),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: t.lineStrong, width: 1 } },
        axisLabel: {
          color: t.fg3,
          fontSize: 11,
          interval: (i: number) => shown.has(i),
          formatter: (v: string) => fmtAxisDate(v),
          hideOverlap: true,
          alignMinLabel: 'left',
          alignMaxLabel: 'right',
        },
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: yMax,
          interval: yMax / 2,
          axisLabel: {
            inside: true,
            verticalAlign: 'bottom',
            margin: 2,
            padding: [0, 0, 2, 0],
            color: t.fg3,
            fontSize: 11,
            formatter: (v: number) => fmtNum(v),
          },
          z: 5,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: t.line, width: 1 } },
        },
        { type: 'value', min: 0, max: 1, show: false },
      ],
      series,
    };
  }, [t, days]);

  const total = days.reduce((a, d) => a + d.value, 0);

  return (
    <div className="chart" role="img" aria-label={`일별 수거량 추이 선 그래프, ${days.length}일, 합계 ${fmtCount(total)}`}>
      <ReactEChartsCore echarts={echarts} option={option} notMerge style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
