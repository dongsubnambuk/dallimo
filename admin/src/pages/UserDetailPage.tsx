import { useState } from 'react';

import { api } from '../api';
import { CourseStatusBadge, UserStatusBadge, VerificationBadge } from '../components/badges';
import { Badge, Empty, ErrorBox, Loading, ReasonDialog, Section, TableWrap } from '../components/ui';
import { ago, date, dateTime, duration, km, pace } from '../format';
import {
  AUDIT_ACTION,
  FAILURE_REASON,
  REPORT_REASON,
  RUN_MODE,
  RUN_SOURCE,
  RUN_STATUS,
  RUNNER_DISTANCE,
  RUNNER_EXPERIENCE,
  RUNNER_TIME,
  label,
} from '../labels';
import { href } from '../router';
import type { ReportRow, UserDetail } from '../types';
import { useAsync } from '../useAsync';

// 회원 상세 (결정 로그 85항): 계정 · 기기 · 최근 달리기 · 코스 · 신고 · 조치 기록. 조치는 정지 · 해제뿐.
// 달리기 경로(GPS)는 보여 주지 않는다

export function UserDetailPage({ id }: { id: number }) {
  const { data, error, loading, reload } = useAsync(() => api<UserDetail>(`/api/v1/admin/users/${id}`), [id]);
  const [dialog, setDialog] = useState<'suspend' | 'unsuspend' | null>(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const { account: a, stats } = data;
  const act = (kind: 'suspend' | 'unsuspend') => async (reason: string) => {
    await api(`/api/v1/admin/users/${id}/${kind}`, { method: 'POST', body: JSON.stringify({ reason }) });
    reload();
  };

  return (
    <div className="page">
      <a className="back" href={href('/users')}>
        ← 회원
      </a>
      <header className="page-head">
        <div>
          <h1>
            {a.nickname} {data.admin ? <Badge tone="accent">관리자</Badge> : null}
          </h1>
          <p className="sub">
            <span className="mono">#{a.id}</span>
            {a.email ? <span className="mono">{a.email}</span> : null}
            <UserStatusBadge status={a.status} />
          </p>
        </div>
        {a.status === 'ACTIVE' && !data.admin ? (
          <button type="button" className="btn btn-danger" onClick={() => setDialog('suspend')}>
            이용 정지
          </button>
        ) : null}
        {a.status === 'SUSPENDED' ? (
          <button type="button" className="btn btn-primary" onClick={() => setDialog('unsuspend')}>
            정지 해제
          </button>
        ) : null}
      </header>

      <div className="stats">
        <Stat label="완료한 달리기" value={`${stats.finishedRuns}회`} />
        <Stat label="누적 거리" value={km(stats.totalDistanceM)} />
        <Stat label="인증 기록" value={`${stats.verifiedRuns}회`} />
        <Stat label="만든 코스" value={`${stats.createdCourses}개`} />
        <Stat label="쓴 리뷰" value={`${stats.reviews}개`} />
      </div>

      <div className="grid-2">
        <Section title="계정">
          <dl className="dl">
            <dt>가입</dt>
            <dd>{dateTime(a.createdAt)}</dd>
            {a.deletedAt ? (
              <>
                <dt>탈퇴</dt>
                <dd>{dateTime(a.deletedAt)}</dd>
              </>
            ) : null}
            <dt>친구 코드</dt>
            <dd className="mono">{a.friendCode}</dd>
            <dt>평소 거리</dt>
            <dd>{label(RUNNER_DISTANCE, a.runnerDistance)}</dd>
            <dt>경험</dt>
            <dd>{label(RUNNER_EXPERIENCE, a.runnerExperience)}</dd>
            <dt>주로 달리는 때</dt>
            <dd>{label(RUNNER_TIME, a.runnerTime)}</dd>
          </dl>
        </Section>

        <Section title="로그인 기기" count={data.devices.length}>
          {data.devices.length === 0 ? (
            <Empty>로그인한 기기가 없어요.</Empty>
          ) : (
            <ul className="list">
              {data.devices.map((d) => {
                const active = !d.revokedAt && new Date(d.expiresAt) > new Date();
                return (
                  <li key={d.deviceId}>
                    <div className="list-main">
                      <span className="mono small truncate" title={d.deviceId}>
                        {d.deviceId}
                      </span>
                      {active ? <Badge tone="ok">로그인 중</Badge> : <Badge tone="muted">로그아웃</Badge>}
                    </div>
                    <div className="list-sub">
                      마지막 사용 {ago(d.lastActiveAt)} · 로그인 {date(d.signedInAt)} · 알림{' '}
                      {d.pushPlatform ? `${d.pushPlatform} (${ago(d.pushUpdatedAt)})` : '꺼짐'}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Section title="최근 달리기" count={data.runs.length}>
        {data.runs.length === 0 ? (
          <Empty>달리기 기록이 없어요.</Empty>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>시작</th>
                  <th>방식</th>
                  <th>코스</th>
                  <th className="num">거리</th>
                  <th className="num">시간</th>
                  <th className="num">페이스</th>
                  <th>상태</th>
                  <th>인증</th>
                  <th>실패 사유</th>
                  <th>출처</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{dateTime(r.startedAt)}</td>
                    <td>{label(RUN_MODE, r.mode)}</td>
                    <td>{r.courseName ?? <span className="muted">-</span>}</td>
                    <td className="num">{km(r.distanceM)}</td>
                    <td className="num">{duration(r.elapsedSeconds)}</td>
                    <td className="num">{pace(r.avgPaceSecPerKm)}</td>
                    <td>{label(RUN_STATUS, r.status)}</td>
                    <td>
                      <VerificationBadge status={r.verificationStatus} />
                    </td>
                    <td className="small">{r.failureReason ? label(FAILURE_REASON, r.failureReason) : <span className="muted">-</span>}</td>
                    <td className="small">{label(RUN_SOURCE, r.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>

      <Section title="만든 코스" count={data.courses.length}>
        {data.courses.length === 0 ? (
          <Empty>만든 코스가 없어요.</Empty>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>상태</th>
                  <th className="num">거리</th>
                  <th>등록</th>
                  <th className="num">받은 신고</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <a href={href(`/reports/${c.id}`)}>{c.name}</a>
                    </td>
                    <td>
                      <CourseStatusBadge status={c.status} />
                    </td>
                    <td className="num">{km(c.distanceM)}</td>
                    <td className="nowrap">{date(c.createdAt)}</td>
                    <td className="num">{c.totalReports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>

      <div className="grid-2">
        <Section title="이 회원 코스에 들어온 신고" count={data.reportsReceived.length}>
          <Reports rows={data.reportsReceived} showReporter />
        </Section>
        <Section title="이 회원이 한 신고" count={data.reportsMade.length}>
          <Reports rows={data.reportsMade} />
        </Section>
      </div>

      <Section title="조치 기록" count={data.actions.length}>
        {data.actions.length === 0 ? (
          <Empty>조치 기록이 없어요.</Empty>
        ) : (
          <ul className="list">
            {data.actions.map((x) => (
              <li key={x.id}>
                <div className="list-main">
                  <b>{label(AUDIT_ACTION, x.action)}</b>
                  <span className="muted small">
                    {dateTime(x.createdAt)} · {x.actorName ?? (x.actor === 'key' ? '관리 키' : x.actor)}
                  </span>
                </div>
                {x.reason ? <div className="list-sub">{x.reason}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ReasonDialog
        open={dialog === 'suspend'}
        title={`${a.nickname} 이용 정지`}
        description={
          <ul className="bullets">
            <li>모든 기기에서 바로 로그아웃되고 다시 로그인할 수 없어요.</li>
            <li>알림을 더 받지 않아요.</li>
            <li>기록 · 코스 · 랭킹은 그대로 남아요. 문제 코스는 신고 처리에서 따로 숨겨 주세요.</li>
          </ul>
        }
        confirmLabel="정지하기"
        danger
        required
        placeholder="예: 허위 코스를 반복해서 등록함"
        onClose={() => setDialog(null)}
        onConfirm={act('suspend')}
      />
      <ReasonDialog
        open={dialog === 'unsuspend'}
        title={`${a.nickname} 정지 해제`}
        description={<p>다시 로그인할 수 있어요. 알림은 회원이 앱에 다시 로그인하면 켜져요.</p>}
        confirmLabel="해제하기"
        required
        placeholder="예: 소명 확인"
        onClose={() => setDialog(null)}
        onConfirm={act('unsuspend')}
      />
    </div>
  );
}

function Stat({ label: l, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{l}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function Reports({ rows, showReporter }: { rows: ReportRow[]; showReporter?: boolean }) {
  if (rows.length === 0) return <Empty>신고가 없어요.</Empty>;
  return (
    <ul className="list">
      {rows.map((r, i) => (
        <li key={`${r.courseId}-${r.createdAt}-${i}`}>
          <div className="list-main">
            <a href={href(`/reports/${r.courseId}`)}>{r.courseName}</a>
            <Badge tone="warn">{label(REPORT_REASON, r.reason)}</Badge>
          </div>
          <div className="list-sub">
            {dateTime(r.createdAt)}
            {showReporter && r.reporterId ? (
              <>
                {' · '}
                <a href={href(`/users/${r.reporterId}`)}>{r.reporterNickname}</a>
              </>
            ) : null}
            {r.content ? <> · {r.content}</> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
