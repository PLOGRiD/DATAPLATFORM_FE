import ReactEChartsCore from 'echarts-for-react/esm/core';
import { useMemo } from 'react';
import { fmtCount, fmtHourRange, fmtPct } from '../../lib/format';
import { inHourRange } from '../../lib/time';
import { useTokens } from '../../lib/useTokens';
import { tooltipBase } from '../common/Tooltip';
import { echarts } from './echarts';

interface Props {
  bars: number[]; // 24개
  hs: number;
  he: number;
  onBarClick: (h: number) => void;
}

export function HourlyChart({ bars, hs, he, onBarClick }: Props) {
  const t = useTokens();
  const total = bars.reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...bars);

  const option = useMemo(() => {
    return {
      animation: false,
      textStyle: { fontFamily: t.font },
      grid: { left: 4, right: 4, top: 20, bottom: 24 },
      tooltip: {
        ...tooltipBase(t),
        trigger: 'item',
        formatter: (p: { dataIndex: number; value: number }) =>
          `<b>${fmtHourRange(p.dataIndex, p.dataIndex + 1)}</b><br/>${fmtCount(p.value)} · 전체의 ${
            total > 0 ? fmtPct(p.value / total) : '0.0%'
          }`,
      },
      xAxis: {
        type: 'category',
        data: bars.map((_, h) => h),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: t.lineStrong, width: 1 } },
        axisLabel: { interval: 2, color: t.fg3, fontSize: 11, formatter: (v: string) => `${v}시` },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: max > 0 ? max : 1,
        interval: max > 0 ? max / 2 : 0.5,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: t.line, width: 1 } },
      },
      series: [
        {
          type: 'bar',
          barCategoryGap: '35%',
          cursor: 'pointer',
          data: bars.map((v, h) => ({
            value: v,
            itemStyle: { color: inHourRange(h, hs, he) ? t.chart : t.mutedBar, borderRadius: [3, 3, 0, 0] },
            label: {
              show: total > 0 && v / total >= 0.07,
              position: 'top',
              color: t.fg2,
              fontSize: 11,
              formatter: () => `${Math.round((v / total) * 100)}%`,
            },
          })),
          emphasis: { disabled: true },
        },
      ],
    };
  }, [t, bars, hs, he, total, max]);

  const onEvents = useMemo(() => ({ click: (p: { dataIndex: number }) => onBarClick(p.dataIndex) }), [onBarClick]);

  return (
    <div
      className="chart"
      role="img"
      aria-label={`시간대별 수거량 막대 그래프, 합계 ${fmtCount(total)}`}
    >
      <ReactEChartsCore echarts={echarts} option={option} notMerge style={{ height: '100%', width: '100%' }} onEvents={onEvents} />
    </div>
  );
}
