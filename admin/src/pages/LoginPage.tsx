import { useEffect, useState } from 'react';

import { ApiError, adminSetup, apiBase, logIn, setUp, type AdminSetup } from '../api';

// 관리 웹 로그인 (결정 로그 86항). 관리자 계정(admin@naver.com)은 서버가 만든다.
// 비밀번호를 아직 정하지 않았으면 처음 한 번 "관리자 비밀번호 정하기", 그 뒤에는 로그인

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;

export function LoginPage() {
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminSetup().then(
      (s) => {
        setSetup(s);
        setEmail(s.email);
      },
      (e) => setLoadError(e instanceof ApiError ? e.message : '서버에 연결하지 못했어요.'),
    );
  }, []);

  const first = setup?.needed === true;
  const ruleOk = PASSWORD_RULE.test(password);
  const canSubmit = !pending && !!setup && password.length > 0 && (first ? ruleOk && password === confirm : email.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      if (first) await setUp(password);
      else await logIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '로그인하지 못했어요.');
      setPending(false);
      // 다른 곳에서 먼저 정했으면 로그인 화면으로
      if (first && e instanceof ApiError && e.status === 409) setSetup({ ...setup!, needed: false });
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
        {loadError ? (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        ) : !setup ? (
          <p className="muted">확인 중…</p>
        ) : first ? (
          <p className="muted">
            처음 한 번 관리자 비밀번호를 정해 주세요. 정한 뒤에는 이 비밀번호로 로그인해요.
          </p>
        ) : (
          <p className="muted">관리자 계정으로 로그인해 주세요.</p>
        )}
        <label className="field">
          <span>이메일</span>
          <input
            id="email"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            value={email}
            readOnly={first}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{first ? '새 비밀번호' : '비밀번호'}</span>
          <input
            id="password"
            type="password"
            autoComplete={first ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {first ? <span className={`hint ${password && !ruleOk ? 'hint-bad' : ''}`}>8~64자, 영문과 숫자를 함께 써 주세요.</span> : null}
        </label>
        {first ? (
          <label className="field">
            <span>새 비밀번호 확인</span>
            <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && confirm !== password ? <span className="hint hint-bad">비밀번호가 서로 달라요.</span> : null}
          </label>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {pending ? '확인 중…' : first ? '비밀번호 정하고 시작하기' : '로그인'}
        </button>
        <p className="server">
          서버 <code>{apiBase}</code>
        </p>
      </form>
    </main>
  );
}
