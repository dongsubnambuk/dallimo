import { useSyncExternalStore } from 'react';

import { getSession, logOut, subscribeSession } from './api';
import { LoginPage } from './pages/LoginPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersPage } from './pages/UsersPage';
import { href, useRoute } from './router';

// 달리모 관리 웹 (결정 로그 85항): 회원 조회 · 정지, 코스 신고 처리

export function App() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const route = useRoute();
  if (!session) return <LoginPage />;

  const section = route.name === 'reports' || route.name === 'report' ? 'reports' : 'users';

  return (
    <div className="shell">
      <aside className="nav">
        <a className="logo" href={href('/users')} aria-label="달리모 관리자 처음으로">
          달리<b>모</b>
          <span className="logo-tag">관리자</span>
        </a>
        <nav aria-label="메뉴">
          <a href={href('/users')} className={section === 'users' ? 'on' : ''} aria-current={section === 'users' ? 'page' : undefined}>
            회원
          </a>
          <a href={href('/reports')} className={section === 'reports' ? 'on' : ''} aria-current={section === 'reports' ? 'page' : undefined}>
            신고 처리
          </a>
        </nav>
        <div className="nav-foot">
          <span className="muted small">{session.nickname}</span>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => void logOut()}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        {route.name === 'users' ? <UsersPage params={route.params} /> : null}
        {route.name === 'user' ? <UserDetailPage key={route.id} id={route.id} /> : null}
        {route.name === 'reports' ? <ReportsPage params={route.params} /> : null}
        {route.name === 'report' ? <ReportDetailPage key={route.id} id={route.id} /> : null}
      </main>
    </div>
  );
}
