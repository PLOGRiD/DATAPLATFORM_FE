import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'pretendard/dist/web/static/pretendard-dynamic-subset.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// 단일 페이지: '/'로 들어오면 '/dashboard'로 맞춘다
if (window.location.pathname === '/' || window.location.pathname === '') {
  window.history.replaceState(null, '', `/dashboard${window.location.search}${window.location.hash}`);
}

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
