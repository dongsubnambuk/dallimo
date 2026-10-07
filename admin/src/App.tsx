import { useSyncExternalStore } from 'react';

import { getSession, logOut, subscribeSession } from './api';
import { LoginPage } from './pages/LoginPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { NoticesPage } from './pages/NoticesPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersPage } from './pages/UsersPage';
import { href, useRoute } from './router';

// 달리모 관리 웹 (결정 로그 85 · 87항): 모니터링, 회원 조회 · 정지, 코스 신고 처리, 공지 푸시

const MENU = [
  { key: 'monitoring', path: '/monitoring', label: '모니터링' },
  { key: 'users', path: '/users', label: '회원' },
  { key: 'reports', path: '/reports', label: '신고 처리' },
  { key: 'notices', path: '/notices', label: '공지 푸시' },
] as const;

export function App() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const route = useRoute();
  if (!session) return <LoginPage />;

  const section = route.name === 'report' ? 'reports' : route.name === 'user' ? 'users' : route.name;

  return (
    <div className="shell">
      <aside className="nav">
        <a className="logo" href={href('/monitoring')} aria-label="달리모 관리자 처음으로">
          달리<b>모</b>
          <span className="logo-tag">관리자</span>
        </a>
        <nav aria-label="메뉴">
          {MENU.map((m) => (
            <a key={m.key} href={href(m.path)} className={section === m.key ? 'on' : ''} aria-current={section === m.key ? 'page' : undefined}>
              {m.label}
            </a>
          ))}
        </nav>
        <div className="nav-foot">
          <span className="muted small">{session.nickname}</span>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => void logOut()}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        {route.name === 'monitoring' ? <MonitoringPage /> : null}
        {route.name === 'notices' ? <NoticesPage /> : null}
        {route.name === 'users' ? <UsersPage params={route.params} /> : null}
        {route.name === 'user' ? <UserDetailPage key={route.id} id={route.id} /> : null}
        {route.name === 'reports' ? <ReportsPage params={route.params} /> : null}
        {route.name === 'report' ? <ReportDetailPage key={route.id} id={route.id} /> : null}
      </main>
    </div>
  );
}
