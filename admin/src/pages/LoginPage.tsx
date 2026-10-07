import { useState } from 'react';

import { ApiError, apiBase, logIn } from '../api';

// 관리 웹 로그인. 앱과 같은 달리모 계정이고, 서버 ADMIN_EMAILS에 있는 계정만 들어온다

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await logIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '로그인하지 못했어요.');
      setPending(false);
    }
  };

  return (
    <main className="login">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="login-brand">
          <span className="logo" aria-hidden>
            달리<b>모</b>
          </span>
          <span className="login-tag">관리자</span>
        </div>
        <p className="muted">관리자로 등록된 달리모 계정으로 로그인해 주세요.</p>
        <label className="field">
          <span>이메일</span>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {pending ? '확인 중…' : '로그인'}
        </button>
        <p className="server">
          서버 <code>{apiBase}</code>
        </p>
      </form>
    </main>
  );
}
