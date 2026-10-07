import { useState } from 'react';

import { api } from '../api';
import { CourseStatusBadge, UserStatusBadge } from '../components/badges';
import { RouteSketch } from '../components/RouteSketch';
import { Badge, Empty, ErrorBox, Loading, ReasonDialog, Section } from '../components/ui';
import { dateTime, km } from '../format';
import { COURSE_STATUS, MODERATION_ACTION, REPORT_REASON, label } from '../labels';
import { href } from '../router';
import type { CourseReports } from '../types';
import { useAsync } from '../useAsync';

// 코스 신고 검토 (결정 로그 53 · 85항): 경로 · 신고 · 처리 기록을 보고 숨김 · 차단 · 다시 공개.
// 처리하면 그때까지의 신고가 닫힌다. 만든 회원은 회원 화면에서 정지한다

type Action = 'HIDE' | 'BLOCK' | 'RESTORE';

const ACTIONS: { action: Action; label: string; description: string; danger?: boolean }[] = [
  { action: 'HIDE', label: '숨기기', description: '탐색 · 검색 · 상세에서 빠져요. 만든 회원의 내 코스에는 숨김으로 남아요.' },
  { action: 'BLOCK', label: '차단하기', description: '숨김처럼 보이지 않게 하고, 확인된 문제 코스(위험 · 사유지 등)로 남겨요.', danger: true },
  { action: 'RESTORE', label: '다시 공개', description: '숨기기 전 상태로 돌려요. 신고가 근거 없으면 공개를 유지한 채 신고만 닫아요.' },
];

export function ReportDetailPage({ id }: { id: number }) {
  const { data, error, loading, reload } = useAsync(() => api<CourseReports>(`/api/v1/admin/courses/${id}/reports`), [id]);
  const [dialog, setDialog] = useState<Action | null>(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const open = data.reports.filter((r) => r.open);
  const current = ACTIONS.find((a) => a.action === dialog);
  const hidden = data.status === 'HIDDEN' || data.status === 'BLOCKED';

  return (
    <div className="page">
      <a className="back" href={href('/reports')}>
        ← 신고 처리
      </a>
      <header className="page-head">
        <div>
          <h1>{data.name}</h1>
          <p className="sub">
            <span className="mono">#{data.courseId}</span>
            <span>{km(data.distanceM)}</span>
            <CourseStatusBadge status={data.status} />
          </p>
        </div>
        <div className="actions">
          {ACTIONS.filter((a) => (hidden ? a.action !== (data.status === 'HIDDEN' ? 'HIDE' : 'BLOCK') : a.action !== 'RESTORE' || open.length > 0)).map((a) => (
            <button
              key={a.action}
              type="button"
              className={`btn ${a.danger ? 'btn-danger' : a.action === 'RESTORE' ? 'btn-primary' : 'btn-quiet'}`}
              onClick={() => setDialog(a.action)}
            >
              {a.action === 'RESTORE' && !hidden ? '신고만 닫기' : a.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid-2">
        <Section title="경로">
          <RouteSketch route={data.route} label={`${data.name} 경로`} />
        </Section>
        <Section title="만든 회원">
          <div className="creator">
            <a href={href(`/users/${data.creatorId}`)}>{data.creatorName}</a>
            <UserStatusBadge status={data.creatorStatus} />
          </div>
          <p className="muted small">같은 회원이 문제 코스를 반복해서 올리면 회원 화면에서 이용을 정지해 주세요.</p>
        </Section>
      </div>

      <Section title="신고" count={data.reports.length} action={open.length ? <Badge tone="warn">열린 신고 {open.length}</Badge> : undefined}>
        {data.reports.length === 0 ? (
          <Empty>신고가 없어요.</Empty>
        ) : (
          <ul className="list">
            {data.reports.map((r) => (
              <li key={r.id} className={r.open ? '' : 'closed'}>
                <div className="list-main">
                  <Badge tone={r.open ? 'warn' : 'muted'}>{label(REPORT_REASON, r.reason)}</Badge>
                  <a href={href(`/users/${r.userId}`)}>{r.nickname}</a>
                  <span className="muted small">{dateTime(r.createdAt)}</span>
                  {r.open ? null : <span className="muted small">처리됨</span>}
                </div>
                {r.content ? <div className="list-sub">{r.content}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="처리 기록" count={data.history.length}>
        {data.history.length === 0 ? (
          <Empty>처리 기록이 없어요.</Empty>
        ) : (
          <ul className="list">
            {data.history.map((h, i) => (
              <li key={`${h.createdAt}-${i}`}>
                <div className="list-main">
                  <b>{label(MODERATION_ACTION, h.action)}</b>
                  <span className="small">
                    {label(COURSE_STATUS, h.fromStatus)} → {label(COURSE_STATUS, h.toStatus)}
                  </span>
                  <span className="muted small">
                    {dateTime(h.createdAt)} · 열린 신고 {h.reportCount}건
                  </span>
                </div>
                {h.note ? <div className="list-sub">{h.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ReasonDialog
        open={current != null}
        title={current ? `${data.name} ${current.action === 'RESTORE' && !hidden ? '신고 닫기' : current.label}` : ''}
        description={<p>{current?.description}</p>}
        confirmLabel={current?.action === 'RESTORE' && !hidden ? '신고 닫기' : (current?.label ?? '')}
        danger={current?.danger}
        placeholder="예: 공사 구간 확인"
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          await api(`/api/v1/admin/courses/${id}/moderation`, { method: 'POST', body: JSON.stringify({ action: dialog, note: note || null }) });
          reload();
        }}
      />
    </div>
  );
}
