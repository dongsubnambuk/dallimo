// 서버와 주고받는 공통 모양. 실제 API 클라이언트(백엔드 착수 뒤)가 이 타입으로 응답을 풀고 repository 오류로 바꾼다.

// 7.1장 공통 응답
export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  // ISO-8601 offset 포함 (7.4장)
  timestamp: string;
};

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details: unknown;
};

// 27장 오류 코드 표 (HTTP → 대표 코드)
export type ApiErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'AUTH_REQUIRED' // 401
  | 'TOKEN_EXPIRED' // 401
  | 'RESOURCE_FORBIDDEN' // 403
  // 이메일 로그인(사용자 결정, 명세 41장 변경)
  | 'INVALID_CREDENTIALS' // 401
  // 관리자가 정지한 계정 (결정 로그 85항). 비밀번호가 맞을 때만
  | 'ACCOUNT_SUSPENDED' // 403
  | 'EMAIL_ALREADY_EXISTS' // 409
  | 'NICKNAME_ALREADY_EXISTS' // 409
  // 비밀번호 변경 (결정 로그 58항). 401이면 앱이 로그아웃하므로 400
  | 'PASSWORD_MISMATCH' // 400
  | 'RESOURCE_NOT_FOUND' // 404 (명세 표에 없음: 도메인 코드가 없는 404. backend/README 결정 사항)
  | 'RUN_NOT_FOUND' // 404
  | 'COURSE_NOT_FOUND' // 404
  | 'RUN_INVALID_STATE' // 409
  | 'IDEMPOTENCY_CONFLICT' // 409
  | 'RUN_POINT_INVALID' // 422
  | 'RATE_LIMITED' // 429
  | 'INTERNAL_ERROR'; // 500

// 27.3장 cursor pagination 응답. 앱 모델은 { items | entries, nextCursor }로 받고 hasNext는 nextCursor 유무와 같다.
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};

// 7.4장: 시간은 ISO-8601, 앱 안에서는 epoch ms
export const toIso = (ms: number) => new Date(ms).toISOString();
export const fromIso = (iso: string) => Date.parse(iso);
