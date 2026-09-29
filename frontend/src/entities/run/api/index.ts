import { createMockRunApi } from './mockRunApi';
import { createMockRunResultRepository } from './mockRunResultRepository';

// 앱 전체에서 하나만 쓴다. 실제 API가 생기면 구현만 바꾼다.
export const runResultRepository = createMockRunResultRepository();

// 42장 Run API (기록 동기화). 백엔드가 생기면 실제 클라이언트로 바꾼다.
export const runApi = createMockRunApi();
