import type { MouseEvent } from 'react';
import { useStats } from '../../api/hooks';
import logo from '../../assets/logo.svg';
import { fmtAsOf } from '../../lib/format';
import { presetRange } from '../../lib/time';
import { useFilters } from '../../state/filters';
import { navigate, ROUTES, useRoute } from '../../state/route';

/** 데이터 기준 시각(전국 현황 페이지에서만): 통계 섹션과 같은 쿼리라 캐시를 공유한다 */
function AsOf() {
  const [filters] = useFilters();
  const { from, to } = presetRange(filters.stat);
  const asOf = useStats(from, to).data?.asOf;
  return <div className="topnav__asof num">{asOf ? `데이터 기준 ${fmtAsOf(asOf)}` : ''}</div>;
}

/** 일반 클릭은 새로고침 없이 이동, Ctrl·가운데 클릭은 브라우저 기본 동작(새 탭) */
function onLinkClick(e: MouseEvent<HTMLAnchorElement>, path: string) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(path);
}

export function Header() {
  const route = useRoute();

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <a className="topnav__brand" href="/dashboard" onClick={(e) => onLinkClick(e, '/dashboard')}>
          <img className="topnav__logo" src={logo} alt="Plogrid 홈" />
        </a>
        <nav className="topnav__menu" aria-label="주요 메뉴">
          {ROUTES.map((r) => (
            <a
              key={r.id}
              href={r.path}
              className="topnav__link"
              aria-current={route === r.id ? 'page' : undefined}
              onClick={(e) => onLinkClick(e, r.path)}
            >
              {r.label}
            </a>
          ))}
        </nav>
        {route === 'dashboard' && <AsOf />}
      </div>
    </header>
  );
}
