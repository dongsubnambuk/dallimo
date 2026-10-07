import { useEffect, useState } from 'react';

import { api } from '../api';
import { UserStatusBadge } from '../components/badges';
import { Empty, ErrorBox, Loading, TableWrap } from '../components/ui';
import { ago, date } from '../format';
import { go, href } from '../router';
import type { CursorPage, UserRow } from '../types';
import { useAsync } from '../useAsync';

// 회원 목록 · 검색 (결정 로그 85항). 최근 가입 순, 회원 id · 이메일 · 닉네임으로 찾는다

const FILTERS = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '이용 중' },
  { value: 'SUSPENDED', label: '정지' },
  { value: 'WITHDRAWN', label: '탈퇴' },
];

const PAGE = 30;

function query(q: string, status: string, cursor?: string) {
  const p = new URLSearchParams({ size: String(PAGE) });
  if (q) p.set('q', q);
  if (status) p.set('status', status);
  if (cursor) p.set('cursor', cursor);
  return api<CursorPage<UserRow>>(`/api/v1/admin/users?${p}`);
}

export function UsersPage({ params }: { params: URLSearchParams }) {
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const [text, setText] = useState(q);
  const first = useAsync(() => query(q, status), [q, status]);
  const [more, setMore] = useState<{ rows: UserRow[]; cursor: string | null }>({ rows: [], cursor: null });
  const [loadingMore, setLoadingMore] = useState(false);

  // 검색이 바뀌면 입력칸 · 더 불러온 줄을 맞춘다
  useEffect(() => {
    setText(q);
  }, [q]);
  useEffect(() => {
    setMore({ rows: [], cursor: first.data?.nextCursor ?? null });
  }, [first.data]);

  const rows = [...(first.data?.items ?? []), ...more.rows];

  const loadMore = async () => {
    if (!more.cursor) return;
    setLoadingMore(true);
    try {
      const page = await query(q, status, more.cursor);
      setMore((m) => ({ rows: [...m.rows, ...page.items], cursor: page.nextCursor }));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>회원</h1>
      </header>

      <form
        className="toolbar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go('/users', { q: text.trim(), status });
        }}
      >
        <input
          id="user-search"
          className="search"
          type="search"
          placeholder="회원 id · 이메일 · 닉네임"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="회원 검색"
        />
        <button type="submit" className="btn btn-primary">
          찾기
        </button>
        <div className="chips" role="group" aria-label="상태">
          {FILTERS.map((f) => (
            <a key={f.value} className={`chip ${status === f.value ? 'chip-on' : ''}`} href={href('/users', { q, status: f.value })} aria-current={status === f.value}>
              {f.label}
            </a>
          ))}
        </div>
      </form>

      {first.error ? <ErrorBox error={first.error} onRetry={first.reload} /> : null}
      {first.loading && !first.data ? <Loading /> : null}
      {first.data && rows.length === 0 ? <Empty>{q ? `"${q}"에 맞는 회원이 없어요.` : '회원이 없어요.'}</Empty> : null}

      {rows.length > 0 ? (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th className="num">id</th>
                <th>닉네임</th>
                <th>이메일</th>
                <th>상태</th>
                <th>가입일</th>
                <th>마지막 접속</th>
                <th className="num">달리기</th>
                <th>기기</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="row-link" onClick={() => go(`/users/${u.id}`)}>
                  <td className="num mono">{u.id}</td>
                  <td>
                    <a href={href(`/users/${u.id}`)} onClick={(e) => e.stopPropagation()}>
                      {u.nickname}
                    </a>
                  </td>
                  <td className="mono small">{u.email ?? <span className="muted">-</span>}</td>
                  <td>
                    <UserStatusBadge status={u.status} />
                  </td>
                  <td className="nowrap">{date(u.createdAt)}</td>
                  <td className="nowrap">{ago(u.lastActiveAt)}</td>
                  <td className="num">{u.runCount}</td>
                  <td className="small">{u.platforms.length ? u.platforms.join(' · ') : <span className="muted">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : null}

      {more.cursor ? (
        <button type="button" className="btn btn-quiet more" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? '불러오는 중…' : '더 보기'}
        </button>
      ) : null}
    </div>
  );
}
