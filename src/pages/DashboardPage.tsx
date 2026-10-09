import { MapSection } from '../components/map/MapSection';
import { StatsSection } from '../components/stats/StatsSection';

/** 전국 현황: 통계 + 수거 지도 */
export function DashboardPage() {
  return (
    <main className="grid12 page__main">
      <h1 className="sr-only">전국 현황</h1>
      <div className="span-12">
        <StatsSection />
      </div>
      <MapSection />
    </main>
  );
}
