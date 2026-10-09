import { useSyncExternalStore } from 'react';
import { URL_EVENT } from './filters';

export type RouteId = 'dashboard' | 'openapi';

export const ROUTES: { id: RouteId; path: string; label: string; title: string }[] = [
  { id: 'dashboard', path: '/dashboard', label: '전국 현황', title: 'Plogrid 전국 현황' },
  { id: 'openapi', path: '/openapi', label: 'OpenAPI', title: 'Plogrid OpenAPI' },
];

function routeOf(pathname: string): RouteId {
  return ROUTES.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`))?.id ?? 'dashboard';
}

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(URL_EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(URL_EVENT, cb);
  };
}

const getPath = () => window.location.pathname;

/** 지금 주소의 페이지 */
export function useRoute(): RouteId {
  return routeOf(useSyncExternalStore(subscribe, getPath, getPath));
}

/** 새로고침 없이 페이지 이동(쿼리스트링은 비운다) */
export function navigate(path: string) {
  if (window.location.pathname === path && !window.location.search) return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(URL_EVENT));
  window.scrollTo(0, 0);
}
