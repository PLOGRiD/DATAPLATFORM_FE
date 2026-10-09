import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { OpenApiPage } from './pages/OpenApiPage';
import { ROUTES, useRoute } from './state/route';

function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = ROUTES.find((r) => r.id === route)?.title ?? 'Plogrid';
  }, [route]);

  return (
    <>
      <Header />
      <div className="page">{route === 'openapi' ? <OpenApiPage /> : <DashboardPage />}</div>
    </>
  );
}

export default App;
