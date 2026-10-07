import { COURSE_STATUS, USER_STATUS, VERIFICATION, label } from '../labels';
import { Badge, type Tone } from './ui';

const USER_TONE: Record<string, Tone> = { ACTIVE: 'ok', SUSPENDED: 'bad', WITHDRAWN: 'muted' };
const COURSE_TONE: Record<string, Tone> = { NEW: 'muted', VERIFIED: 'ok', POPULAR: 'accent', HIDDEN: 'warn', BLOCKED: 'bad' };
const VERIFY_TONE: Record<string, Tone> = { VERIFIED: 'ok', PENDING: 'muted', UNVERIFIED: 'warn', REJECTED: 'bad' };

export function UserStatusBadge({ status }: { status: string }) {
  return <Badge tone={USER_TONE[status] ?? 'muted'}>{label(USER_STATUS, status)}</Badge>;
}

export function CourseStatusBadge({ status }: { status: string }) {
  return <Badge tone={COURSE_TONE[status] ?? 'muted'}>{label(COURSE_STATUS, status)}</Badge>;
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === 'NONE') return <span className="muted">-</span>;
  return <Badge tone={VERIFY_TONE[status] ?? 'muted'}>{label(VERIFICATION, status)}</Badge>;
}
