import { useEffect, useState } from 'react';

import { ApiError, api } from '../api';
import { Badge, Empty, ErrorBox, Loading, Section, TableWrap } from '../components/ui';
import { dateTime } from '../format';
import { NOTICE_STATUS, NOTICE_TARGET, label } from '../labels';
import type { Audience, Notice, NoticeTarget } from '../types';
import { useAsync } from '../useAsync';

// 공지 푸시 (결정 로그 87항). 서비스 공지(점검 · 업데이트 · 약관 변경)만. 광고성 정보는 별도 수신 동의가 있어야 해서 보내지 않는다.
// 순서: 쓰기 → 테스트 발송(회원 한 명) → 대상 수 확인 → 보내기. 받는 회원 알림함에도 남는다. 밤 10시~아침 8시에는 서버가 막는다

const LINKS = [
  { value: '', label: '열 화면 없음 (알림함)' },
  { value: '/', label: '탐색' },
  { value: '/run', label: '달리기' },
  { value: '/together', label: '함께' },
  { value: '/my', label: '마이' },
  { value: '/my/notifications', label: '알림함' },
  { value: '/settings', label: '설정' },
];

const TEST_USER_KEY = 'dallimo.admin.noticeTestUser';

function readTestUser() {
  try {
    return localStorage.getItem(TEST_USER_KEY) ?? '';
  } catch {
    return '';
  }
}

export function NoticesPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<NoticeTarget>('ALL');
  const [testUser, setTestUser] = useState(readTestUser);
  const [tested, setTested] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState<'test' | 'send' | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const audience = useAsync(() => api<Audience>(`/api/v1/admin/notices/audience?target=${target}`), [target]);
  const list = useAsync(() => api<Notice[]>('/api/v1/admin/notices'), []);
  const { reload: reloadList } = list;

  // 보내는 중인 공지가 있으면 3초마다 결과를 새로 본다
  const sending = list.data?.some((n) => n.status === 'SENDING');
  useEffect(() => {
    if (!sending) return;
    const t = setInterval(reloadList, 3000);
    return () => clearInterval(t);
  }, [sending, reloadList]);

  const content = JSON.stringify([title.trim(), body.trim(), link]);
  const filled = title.trim().length > 0 && body.trim().length > 0;
  const users = audience.data?.users ?? 0;
  const quiet = audience.data?.quietHours === true;
  const canSend = !quiet && filled && tested === content && users > 0 && confirm === String(users) && pending == null;

  const edit = (f: () => void) => {
    f();
    setConfirm('');
  };

  const test = async () => {
    const id = Number(testUser);
    if (!filled || !Number.isInteger(id) || id <= 0) return;
    setPending('test');
    setTestMsg(null);
    try {
      localStorage.setItem(TEST_USER_KEY, String(id));
    } catch {
      // 기억하지 못해도 보낼 수 있다
    }
    try {
      const r = await api<{ devices: number; ok: number; failed: number }>('/api/v1/admin/notices/test', {
        method: 'POST',
        body: JSON.stringify({ userId: id, title: title.trim(), body: body.trim(), link: link || null }),
      });
      setTested(content);
      setTestMsg({ ok: r.failed === 0, text: `회원 #${id}의 기기 ${r.devices}대로 보냈어요 (성공 ${r.ok} · 실패 ${r.failed}). 휴대폰에서 확인해 주세요.` });
    } catch (e) {
      setTestMsg({ ok: false, text: e instanceof ApiError ? e.message : '보내지 못했어요.' });
    } finally {
      setPending(null);
    }
  };

  const send = async () => {
    if (!canSend) return;
    setPending('send');
    setSendError(null);
    try {
      await api<Notice>('/api/v1/admin/notices', {
        method: 'POST',
        body: JSON.stringify({ target, title: title.trim(), body: body.trim(), link: link || null, expectedUsers: users }),
      });
      setTitle('');
      setBody('');
      setLink('');
      setTested(null);
      setTestMsg(null);
      setConfirm('');
      reloadList();
      audience.reload();
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : '보내지 못했어요.');
      audience.reload();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>공지 푸시</h1>
          <p className="sub">점검 · 업데이트 · 약관 변경 같은 서비스 공지만 보내요. 이벤트 · 홍보는 보내지 않아요.</p>
        </div>
      </header>

      {quiet ? (
        <div className="error-box warn" role="status">
          <p>지금은 밤(10시~아침 8시, 한국 시간)이라 알림을 보낼 수 없어요. 미리 써 두고 아침 8시 뒤에 보내 주세요.</p>
        </div>
      ) : null}

      <div className="grid-2 notice-grid">
        <Section title="1. 쓰기">
          <label className="field">
            <span>
              제목 <span className="muted">{title.length}/100</span>
            </span>
            <input id="notice-title" maxLength={100} value={title} onChange={(e) => edit(() => setTitle(e.target.value))} placeholder="예: 서버 점검 안내" />
          </label>
          <label className="field">
            <span>
              내용 <span className="muted">{body.length}/500</span>
            </span>
            <textarea id="notice-body" maxLength={500} rows={4} value={body} onChange={(e) => edit(() => setBody(e.target.value))} placeholder="예: 10월 8일 새벽 2시부터 30분 동안 점검해요. 그동안 기록이 올라가지 않아요." />
          </label>
          <label className="field">
            <span>누르면 열 화면</span>
            <select id="notice-link" value={link} onChange={(e) => edit(() => setLink(e.target.value))}>
              {LINKS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>받는 회원</span>
            <div className="chips" role="radiogroup" aria-label="받는 회원">
              {(['ALL', 'IOS', 'ANDROID'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={target === t}
                  className={`chip ${target === t ? 'chip-on' : ''}`}
                  onClick={() => edit(() => setTarget(t))}
                >
                  {t === 'ALL' ? '전체' : `${NOTICE_TARGET[t]} 기기 회원`}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="미리보기">
          <div className="push-preview" aria-label="잠금 화면 알림 미리보기">
            <div className="push-head">
              <span className="push-icon" aria-hidden />
              <span>달리모</span>
              <span className="muted">지금</span>
            </div>
            <b className="push-title">{title.trim() || '제목'}</b>
            <p className="push-body">{body.trim() || '내용'}</p>
          </div>
          <p className="muted small">누르면 {LINKS.find((l) => l.value === link)?.label ?? link}. 받는 회원 알림함에도 남아요.</p>
        </Section>
      </div>

      <Section title="2. 테스트 발송">
        <p className="muted small">내 앱 계정 같은 회원 한 명의 기기로만 보내요. 알림함에는 남지 않아요. 내용을 고치면 다시 보내야 해요.</p>
        <div className="toolbar">
          <input
            id="notice-test-user"
            className="search narrow"
            inputMode="numeric"
            placeholder="회원 id"
            value={testUser}
            onChange={(e) => setTestUser(e.target.value.replace(/\D/g, ''))}
            aria-label="테스트 받을 회원 id"
          />
          <button type="button" className="btn btn-quiet" onClick={() => void test()} disabled={quiet || !filled || !testUser || pending != null}>
            {pending === 'test' ? '보내는 중…' : '테스트 보내기'}
          </button>
          {tested === content ? <Badge tone="ok">이 내용으로 테스트함</Badge> : null}
        </div>
        {testMsg ? (
          <p className={testMsg.ok ? 'small' : 'form-error'} role="status">
            {testMsg.text}
          </p>
        ) : null}
      </Section>

      <Section title="3. 보내기">
        {audience.error ? <ErrorBox error={audience.error} onRetry={audience.reload} /> : null}
        <p>
          {label(NOTICE_TARGET, target)} 회원 <b>{audience.data ? `${users.toLocaleString()}명` : '…'}</b> 알림함에 남기고, 기기{' '}
          <b>{audience.data ? `${audience.data.devices.toLocaleString()}대` : '…'}</b>로 Push를 보내요.
        </p>
        <div className="toolbar">
          <input
            id="notice-confirm"
            className="search narrow"
            inputMode="numeric"
            placeholder={users ? `${users} 입력` : '대상 수'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            aria-label="확인을 위해 받는 회원 수 입력"
            disabled={tested !== content}
          />
          <button type="button" className="btn btn-danger" onClick={() => void send()} disabled={!canSend}>
            {pending === 'send' ? '보내는 중…' : '공지 보내기'}
          </button>
        </div>
        <p className="muted small">
          {tested !== content ? '먼저 이 내용으로 테스트 발송을 해 주세요.' : '실수로 보내지 않게 받는 회원 수를 그대로 입력해 주세요.'}
        </p>
        {sendError ? (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        ) : null}
      </Section>

      <Section title="보낸 공지" count={list.data?.length}>
        {list.error && !list.data ? <ErrorBox error={list.error} onRetry={list.reload} /> : null}
        {list.loading && !list.data ? <Loading /> : null}
        {list.data && list.data.length === 0 ? <Empty>보낸 공지가 없어요.</Empty> : null}
        {list.data && list.data.length > 0 ? (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>보낸 때</th>
                  <th>제목</th>
                  <th>대상</th>
                  <th>상태</th>
                  <th className="num">알림함</th>
                  <th className="num">기기</th>
                  <th className="num">성공</th>
                  <th className="num">실패</th>
                  <th className="num">정리된 기기</th>
                  <th>보낸 사람</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((n) => (
                  <tr key={n.id}>
                    <td>{dateTime(n.createdAt)}</td>
                    <td title={n.body}>{n.title}</td>
                    <td>{label(NOTICE_TARGET, n.target)}</td>
                    <td>
                      <Badge tone={n.status === 'SENT' ? 'ok' : n.status === 'FAILED' ? 'bad' : 'muted'}>{label(NOTICE_STATUS, n.status)}</Badge>
                    </td>
                    <td className="num">{n.targetUsers.toLocaleString()}</td>
                    <td className="num">{n.pushTokens.toLocaleString()}</td>
                    <td className="num">{n.pushOk.toLocaleString()}</td>
                    <td className="num">{n.pushFailed > 0 ? <b className="text-bad">{n.pushFailed}</b> : 0}</td>
                    <td className="num">{n.tokensRemoved}</td>
                    <td>{n.actorName ?? (n.actor === 'key' ? '관리 키' : n.actor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : null}
        <p className="muted small">정리된 기기: 앱을 지웠거나 알림 토큰이 바뀐 기기라 목록에서 지웠어요.</p>
      </Section>
    </div>
  );
}
