import { useEffect, useState } from 'react';

import { api } from '../api';
import { Badge, Empty, ErrorBox, Loading, Section, TableWrap } from '../components/ui';
import { ago, dateTime } from '../format';
import { href } from '../router';
import type { Errors, Monitoring, ServerError } from '../types';
import { useAsync } from '../useAsync';

// 모니터링 (결정 로그 87항): 서버 상태 · 오늘 수치 · 최근 60분 API · 주요 API · 서버 오류. 30초마다 새로 고친다.
// 최근 60분은 서버 메모리 통계라 서버를 다시 켜면 비어서 다시 모은다. 긴 기간 그래프는 Grafana(결정 로그 77항)

const REFRESH_MS = 30_000;

function uptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}일 ${h}시간` : h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

const ms = (v: number | null) => (v == null ? '-' : `${v.toLocaleString()} ms`);
const rate = (errors: number, requests: number) => (requests === 0 ? '-' : `${((errors / requests) * 100).toFixed(errors / requests < 0.01 ? 2 : 1)}%`);

export function MonitoringPage() {
  const mon = useAsync(() => api<Monitoring>('/api/v1/admin/monitoring'), []);
  const err = useAsync(() => api<Errors>('/api/v1/admin/errors?days=7'), []);
  const { reload: reloadMon } = mon;
  const { reload: reloadErr } = err;

  useEffect(() => {
    const t = setInterval(() => {
      reloadMon();
      reloadErr();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [reloadMon, reloadErr]);

  const m = mon.data;

  return (
    <div className="page">
      <header className="page-head">
        <h1>모니터링</h1>
        <p className="sub">{m ? `${dateTime(m.at)} 기준 · 30초마다 새로 고침` : null}</p>
      </header>

      {mon.error && !m ? <ErrorBox error={mon.error} onRetry={mon.reload} /> : null}
      {mon.loading && !m ? <Loading /> : null}

      {m ? (
        <>
          <div className="stats">
            <Health label="DB" ok={m.server.db.ok} detail={m.server.db.ok ? `${m.server.db.ms} ms` : (m.server.db.error ?? '연결 안 됨')} />
            <Health label="Redis" ok={m.server.redis.ok} detail={m.server.redis.ok ? `${m.server.redis.ms} ms` : (m.server.redis.error ?? '연결 안 됨')} />
            <Stat label="켜진 시간" value={uptime(m.server.uptimeSec)} sub={`${dateTime(m.server.startedAt)}부터`} />
            <Stat label="메모리" value={`${m.server.heapUsedMb} / ${m.server.heapMaxMb} MB`} sub={`스레드 ${m.server.threads} · Java ${m.server.javaVersion}`} />
          </div>

          <Section title="오늘 (한국 시간 0시부터)">
            <div className="stats flat">
              <Stat label="새 가입" value={`${m.today.signups}명`} />
              <Stat label="앱을 쓴 회원" value={`${m.today.activeUsers}명`} />
              <Stat label="완료한 달리기" value={`${m.today.finishedRuns}회`} />
              <Stat label="처리 대기 신고" value={`${m.today.pendingReports}개`} href={m.today.pendingReports > 0 ? href('/reports') : undefined} tone={m.today.pendingReports > 0 ? 'warn' : undefined} />
              <Stat label="서버 오류" value={`${m.today.serverErrors}건`} tone={m.today.serverErrors > 0 ? 'bad' : undefined} />
            </div>
          </Section>

          <Section title="최근 60분 API" action={<span className="muted small">{dateTime(m.api.since)}부터</span>}>
            <div className="stats flat">
              <Stat label="요청" value={m.api.total.requests.toLocaleString()} />
              <Stat label="응답 시간 p95" value={ms(m.api.total.p95Ms)} />
              <Stat label="5xx 오류" value={`${m.api.total.errors} (${rate(m.api.total.errors, m.api.total.requests)})`} tone={m.api.total.errors > 0 ? 'bad' : undefined} />
            </div>
            <MinuteChart minutes={m.api.minutes} />
            <TableWrap>
              <table className="table">
                <thead>
                  <tr>
                    <th>주요 API</th>
                    <th>경로</th>
                    <th className="num">요청</th>
                    <th className="num">p95</th>
                    <th className="num">5xx</th>
                  </tr>
                </thead>
                <tbody>
                  {m.api.keyApis.map((k) => (
                    <tr key={k.pattern}>
                      <td>{k.name}</td>
                      <td className="mono small">
                        {k.method} {k.pattern}
                      </td>
                      <td className="num">{k.requests.toLocaleString()}</td>
                      <td className="num">{ms(k.p95Ms)}</td>
                      <td className="num">{k.errors > 0 ? <b className="text-bad">{k.errors}</b> : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Section>
        </>
      ) : null}

      <ErrorsSection state={err} />
    </div>
  );
}

function Health({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        <Badge tone={ok ? 'ok' : 'bad'}>{ok ? '정상' : '오류'}</Badge>
      </span>
      <span className="stat-sub truncate" title={detail}>
        {detail}
      </span>
    </div>
  );
}

function Stat({ label, value, sub, href: link, tone }: { label: string; value: string; sub?: string; href?: string; tone?: 'warn' | 'bad' }) {
  const v = <span className={`stat-value ${tone ? `text-${tone}` : ''}`}>{value}</span>;
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      {link ? <a href={link}>{v}</a> : v}
      {sub ? <span className="stat-sub truncate">{sub}</span> : null}
    </div>
  );
}

/** 분당 요청 수 막대. 5xx가 있으면 그 분은 빨간 칸이 위에 겹친다 */
function MinuteChart({ minutes }: { minutes: Monitoring['api']['minutes'] }) {
  const W = 600;
  const H = 90;
  const max = Math.max(1, ...minutes.map((x) => x.requests));
  const bw = W / minutes.length;
  const first = minutes[0]?.at;
  const last = minutes[minutes.length - 1]?.at;
  return (
    <figure className="chart">
      <figcaption className="chart-top">분당 요청 (가장 많은 분 {max}건{minutes.some((x) => x.errors > 0) ? ' · 빨간 칸은 5xx' : ''})</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`최근 60분 분당 요청 수, 가장 많은 분 ${max}건`}>
        <line x1={0} x2={W} y1={H} y2={H} className="chart-axis" vectorEffect="non-scaling-stroke" />
        {minutes.map((x, i) => {
          const h = (x.requests / max) * (H - 4);
          const eh = (x.errors / max) * (H - 4);
          return (
            <g key={x.at}>
              <title>{`${dateTime(x.at)} · 요청 ${x.requests} · 5xx ${x.errors}${x.p95Ms != null ? ` · p95 ${x.p95Ms}ms` : ''}`}</title>
              {x.requests > 0 ? <rect x={i * bw + 1} y={H - h} width={bw - 2} height={h} className="chart-bar" rx={1} /> : null}
              {x.errors > 0 ? <rect x={i * bw + 1} y={H - Math.max(eh, 2)} width={bw - 2} height={Math.max(eh, 2)} className="chart-err" rx={1} /> : null}
            </g>
          );
        })}
      </svg>
      <div className="chart-axis-labels">
        <span>{first ? dateTime(first).slice(-5) : ''}</span>
        <span>{last ? dateTime(last).slice(-5) : ''}</span>
      </div>
    </figure>
  );
}

function ErrorsSection({ state }: { state: { data: Errors | null; error: Error | null; loading: boolean; reload: () => void } }) {
  const [open, setOpen] = useState<number | null>(null);
  const e = state.data;
  return (
    <Section title="서버 오류" count={e?.last24h} action={<span className="muted small">최근 24시간 · 30일 보관</span>}>
      {state.error && !e ? <ErrorBox error={state.error} onRetry={state.reload} /> : null}
      {state.loading && !e ? <Loading /> : null}
      {e && e.recent.length === 0 ? <Empty>처리하지 못한 서버 오류가 없어요.</Empty> : null}
      {e && e.groups.length > 0 ? (
        <>
          <h3 className="h3">최근 7일 종류별</h3>
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>오류</th>
                  <th>위치</th>
                  <th className="num">횟수</th>
                  <th>마지막</th>
                  <th>마지막 경로</th>
                </tr>
              </thead>
              <tbody>
                {e.groups.map((g) => (
                  <tr key={`${g.exception}-${g.location}`}>
                    <td className="mono small" title={g.lastMessage ?? ''}>
                      {short(g.exception)}
                    </td>
                    <td className="mono small">{g.location ?? '-'}</td>
                    <td className="num">
                      <b>{g.count}</b>
                    </td>
                    <td>{ago(g.lastAt)}</td>
                    <td className="mono small">{g.lastPath ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      ) : null}
      {e && e.recent.length > 0 ? (
        <>
          <h3 className="h3">최근 {e.recent.length}건</h3>
          <ul className="list">
            {e.recent.map((x) => (
              <li key={x.id}>
                <button type="button" className="row-button" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
                  <span className="list-main">
                    <Badge tone="bad">{short(x.exception)}</Badge>
                    <span className="mono small">
                      {x.method} {x.path}
                    </span>
                    <span className="muted small">{dateTime(x.createdAt)}</span>
                  </span>
                  {x.message ? <span className="list-sub truncate">{x.message}</span> : null}
                </button>
                {open === x.id ? <ErrorDetail e={x} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}

function ErrorDetail({ e }: { e: ServerError }) {
  return (
    <dl className="dl error-detail">
      <dt>오류</dt>
      <dd className="mono small">{e.exception}</dd>
      <dt>메시지</dt>
      <dd className="small">{e.message ?? '-'}</dd>
      <dt>위치</dt>
      <dd className="mono small">{e.location ?? '-'}</dd>
      <dt>요청 id</dt>
      <dd className="mono small">{e.requestId ?? '-'} (서버 로그에서 이 값으로 찾는다)</dd>
      <dt>회원</dt>
      <dd>{e.userId ? <a href={href(`/users/${e.userId}`)}>#{e.userId}</a> : '-'}</dd>
    </dl>
  );
}

const short = (cls: string) => cls.slice(cls.lastIndexOf('.') + 1);
