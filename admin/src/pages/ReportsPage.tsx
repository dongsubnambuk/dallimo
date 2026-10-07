import { api } from '../api';
import { CourseStatusBadge } from '../components/badges';
import { Badge, Empty, ErrorBox, Loading, TableWrap } from '../components/ui';
import { ago } from '../format';
import { COURSE_SOURCE, REPORT_REASON, label } from '../labels';
import { go, href } from '../router';
import type { ReportedCourse } from '../types';
import { useAsync } from '../useAsync';

// 코스 신고 처리 목록 (결정 로그 53 · 85항). 검토 대기 = 열린 신고가 있거나 자동으로 숨겨진 코스

const TABS = [
  { value: '', label: '검토 대기' },
  { value: 'HIDDEN', label: '숨김' },
  { value: 'BLOCKED', label: '차단' },
];

export function ReportsPage({ params }: { params: URLSearchParams }) {
  const status = params.get('status') ?? '';
  const { data, error, loading, reload } = useAsync(
    () => api<ReportedCourse[]>(`/api/v1/admin/courses/reported?size=200${status ? `&status=${status}` : ''}`),
    [status],
  );

  return (
    <div className="page">
      <header className="page-head">
        <h1>신고 처리</h1>
      </header>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="목록">
          {TABS.map((t) => (
            <a key={t.value} className={`chip ${status === t.value ? 'chip-on' : ''}`} href={href('/reports', { status: t.value })} aria-current={status === t.value}>
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? <Empty>{status ? '해당하는 코스가 없어요.' : '검토할 신고가 없어요.'}</Empty> : null}

      {data && data.length > 0 ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>코스</th>
                <th>상태</th>
                <th>만든 사람</th>
                <th className="num">열린 신고</th>
                <th>열린 신고 사유</th>
                <th className="num">전체</th>
                <th>마지막 신고</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="row-link" onClick={() => go(`/reports/${c.id}`)}>
                  <td>
                    <a href={href(`/reports/${c.id}`)} onClick={(e) => e.stopPropagation()}>
                      {c.name}
                    </a>
                    {c.source !== 'USER' ? <span className="muted small"> · {label(COURSE_SOURCE, c.source)}</span> : null}
                  </td>
                  <td>
                    <CourseStatusBadge status={c.status} />
                  </td>
                  <td>
                    <a href={href(`/users/${c.creatorId}`)} onClick={(e) => e.stopPropagation()}>
                      {c.creatorName}
                    </a>
                  </td>
                  <td className="num">{c.openReports > 0 ? <b>{c.openReports}</b> : 0}</td>
                  <td>
                    <div className="tags">
                      {Object.entries(c.openReasons).map(([reason, n]) => (
                        <Badge key={reason} tone="warn">
                          {label(REPORT_REASON, reason)} {n}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="num">{c.totalReports}</td>
                  <td className="nowrap">{ago(c.lastReportedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : null}
    </div>
  );
}
