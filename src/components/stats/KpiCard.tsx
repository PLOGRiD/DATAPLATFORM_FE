import type { ReactNode } from 'react';
import { InfoTip } from '../common/InfoTip';

interface Props {
  label: string;
  info?: string;
  value: ReactNode;
  unit?: ReactNode;
  dotColor?: string;
  sub?: ReactNode;
}

export function KpiCard({ label, info, value, unit, dotColor, sub }: Props) {
  return (
    <div className="kpi">
      <div className="kpi__label">
        {label}
        {info && <InfoTip text={info} label={`${label} 도움말`} />}
      </div>
      <div className="kpi__value">
        {dotColor && <span className="kpi__dot" style={{ background: dotColor }} aria-hidden="true" />}
        <span className="kpi__num num">{value}</span>
        {unit && <span className="kpi__unit num">{unit}</span>}
      </div>
      {sub && <div className="kpi__sub num">{sub}</div>}
    </div>
  );
}
