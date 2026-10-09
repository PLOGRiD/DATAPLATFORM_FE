import { useStats } from '../../api/hooks';
import type { StatsResponse } from '../../api/types';
import { CATEGORY_BY_CODE, subCodeName } from '../../lib/categories';
import { fmtDelta, fmtHourRange, fmtKm, fmtNum, fmtPct } from '../../lib/format';
import { presetRange, STAT_PRESETS } from '../../lib/time';
import { useFilters } from '../../state/filters';
import { Segmented } from '../common/Segmented';
import { ErrorBox, Skeleton } from '../common/Status';
import { CategoryBars } from './CategoryBars';
import { KpiCard } from './KpiCard';

function Delta({ value, previous }: { value: number; previous: number }) {
  if (previous <= 0) return <span>직전 기간 기록 없음</span>;
  return (
    <>
      <b className="delta">{fmtDelta(value / previous - 1)}</b> 직전 같은 기간 대비
    </>
  );
}

function Kpis({ s }: { s: StatsResponse }) {
  const total = s.total.value;
  const p = s.participation;

  const top = s.byCategory[0];
  const topDef = top ? CATEGORY_BY_CODE[top.code] : undefined;
  const hasTop = !!top && top.count > 0;
  const topSubs = s.bySubCategory.filter((x) => x.code !== null).slice(0, 2);

  const hourSum = s.byHour.reduce((a, b) => a + b, 0);
  let peak = 0;
  s.byHour.forEach((v, h) => {
    if (v > s.byHour[peak]) peak = h;
  });

  return (
    <div className="kpis">
      <KpiCard
        label="총 수거량"
        value={fmtNum(total)}
        unit="개"
        sub={<Delta value={total} previous={s.total.previous} />}
      />
      <KpiCard
        label="플로깅 참여 규모"
        value={fmtNum(p.ploggings)}
        unit="회"
        sub={
          <>
            <div>
              참여자 {fmtNum(p.participants)}명 · {fmtKm(p.distanceKm)} · 1회당{' '}
              {p.ploggings > 0 ? `${(total / p.ploggings).toFixed(1)}개` : '–'}
            </div>
            <div>
              <Delta value={p.ploggings} previous={p.previousPloggings} />
            </div>
          </>
        }
      />
      <KpiCard
        label="최다 수거 품목"
        value={hasTop ? topDef?.name ?? top.code : '–'}
        dotColor={hasTop ? topDef?.color : undefined}
        unit={hasTop && total > 0 ? fmtPct(top.count / total) : undefined}
        sub={
          hasTop && topSubs.length > 0
            ? topSubs
                .map((x, i) => `${i === 0 ? '세부 1위' : '2위'} ${subCodeName(x.code)} ${fmtPct(x.count / total)}`)
                .join(' · ')
            : undefined
        }
      />
      <KpiCard
        label="수거가 가장 많은 시간대"
        value={hourSum > 0 ? fmtHourRange(peak, peak + 1).replace('시', '') : '–'}
        unit={hourSum > 0 ? '시' : undefined}
        sub={hourSum > 0 ? `전체의 ${fmtPct(s.byHour[peak] / hourSum)}` : undefined}
      />
    </div>
  );
}

export function StatsSection() {
  const [filters, update] = useFilters();
  const range = presetRange(filters.stat);
  const stats = useStats(range.from, range.to);

  return (
    <section className="stats grid12" aria-label="통계">
      <div className="section-head span-12">
        <div className="section-head__controls">
          <span className="filter-label">기간</span>
          <Segmented
            ariaLabel="통계 기간"
            options={STAT_PRESETS}
            value={filters.stat}
            onChange={(stat) => update({ stat })}
          />
        </div>
      </div>

      <div className="span-6 span-md-12">
        {stats.isError ? (
          <ErrorBox error={stats.error} onRetry={() => stats.refetch()} height={252} />
        ) : stats.data ? (
          <Kpis s={stats.data} />
        ) : (
          <div className="kpis">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={116} style={{ borderRadius: 8 }} />
            ))}
          </div>
        )}
      </div>

      <div className="card span-6 span-md-12">
        <div className="card__head">
          <h2 className="card__title">품목별 수거량</h2>
          <p className="subtle card__sub--down">선택한 기간 동안 많이 수거된 순서입니다. 품목을 누르면 세부 품목을 볼 수 있습니다.</p>
        </div>
        <div className="catbars-scroll">
          {stats.isError ? (
            <ErrorBox error={stats.error} onRetry={() => stats.refetch()} height={200} />
          ) : stats.data ? (
            <CategoryBars stats={stats.data} />
          ) : (
            <Skeleton height={220} />
          )}
        </div>
      </div>
    </section>
  );
}
