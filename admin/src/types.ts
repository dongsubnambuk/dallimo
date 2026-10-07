// 서버 응답 모양 (docs/api/openapi.yaml "관리 · 회원" · "관리 · 코스 신고 검토")

export type CursorPage<T> = { items: T[]; nextCursor: string | null; hasNext: boolean };

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export type UserRow = {
  id: number;
  email: string | null;
  nickname: string;
  status: UserStatus;
  createdAt: string;
  lastActiveAt: string | null;
  runCount: number;
  platforms: string[];
};

export type Account = {
  id: number;
  email: string | null;
  nickname: string;
  friendCode: string;
  status: UserStatus;
  createdAt: string;
  deletedAt: string | null;
  runnerDistance: string | null;
  runnerExperience: string | null;
  runnerTime: string | null;
};

export type Device = {
  deviceId: string;
  signedInAt: string;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt: string | null;
  pushPlatform: string | null;
  pushUpdatedAt: string | null;
};

export type RunRow = {
  id: number;
  startedAt: string;
  mode: string;
  status: string;
  distanceM: number;
  elapsedSeconds: number;
  avgPaceSecPerKm: number | null;
  courseId: number | null;
  courseName: string | null;
  verificationStatus: string;
  failureReason: string | null;
  source: string;
};

export type CourseRow = { id: number; name: string; status: string; distanceM: number; createdAt: string; totalReports: number };

export type ReportRow = {
  courseId: number;
  courseName: string;
  reporterNickname: string | null;
  reporterId: number | null;
  reason: string;
  content: string | null;
  createdAt: string;
};

export type AuditEntry = { id: number; actor: string; actorName: string | null; action: string; reason: string | null; createdAt: string };

export type UserDetail = {
  account: Account;
  stats: { finishedRuns: number; totalDistanceM: number; verifiedRuns: number; createdCourses: number; reviews: number };
  devices: Device[];
  runs: RunRow[];
  courses: CourseRow[];
  reportsMade: ReportRow[];
  reportsReceived: ReportRow[];
  actions: AuditEntry[];
};

export type CourseStatus = 'NEW' | 'VERIFIED' | 'POPULAR' | 'HIDDEN' | 'BLOCKED';

export type ReportedCourse = {
  id: number;
  name: string;
  status: CourseStatus;
  source: string;
  creatorId: number;
  creatorName: string;
  openReports: number;
  totalReports: number;
  openReasons: Record<string, number>;
  lastReportedAt: string | null;
  moderatedAt: string | null;
};

export type CourseReport = {
  id: number;
  userId: number;
  nickname: string;
  reason: string;
  content: string | null;
  createdAt: string;
  open: boolean;
};

export type ModerationLog = {
  action: string;
  fromStatus: CourseStatus;
  toStatus: CourseStatus;
  reportCount: number;
  note: string | null;
  createdAt: string;
};

export type CourseReports = {
  courseId: number;
  name: string;
  distanceM: number;
  creatorId: number;
  creatorName: string;
  creatorStatus: UserStatus;
  status: CourseStatus;
  moderatedAt: string | null;
  route: [number, number][];
  reports: CourseReport[];
  history: ModerationLog[];
};
