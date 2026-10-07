import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { ApiError } from '../api';

// 관리 웹 공통 조각: 상태 표시 · 칸 · 빈 상태 · 오류 · 사유 입력 창

export type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'accent';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>
          {title}
          {count != null ? <span className="count">{count}</span> : null}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{error instanceof ApiError ? error.message : '불러오지 못했어요.'}</p>
      {onRetry ? (
        <button type="button" className="btn btn-quiet" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export function Loading() {
  return (
    <p className="loading" aria-live="polite">
      불러오는 중…
    </p>
  );
}

/** 표가 화면보다 넓으면 표 안에서만 옆으로 민다 */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="table-wrap">{children}</div>;
}

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  // 사유를 꼭 적어야 하는지 (정지 · 해제는 필수, 코스 처리 메모는 선택)
  required?: boolean;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

/** 조치 확인 창. 사유는 조치 기록에 남는다 */
export function ReasonDialog({ open, title, description, confirmLabel, danger, required, placeholder, onClose, onConfirm }: ReasonDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setReason('');
      setError(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const canSubmit = !pending && (!required || reason.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby={`${id}-title`}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="dialog-body">{description}</div>
        <label className="field" htmlFor={`${id}-reason`}>
          <span>
            사유 {required ? <b className="req">필수</b> : <span className="muted">선택</span>}
          </span>
          <textarea
            id={`${id}-reason`}
            value={reason}
            maxLength={500}
            rows={3}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            취소
          </button>
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={!canSubmit}>
            {pending ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
