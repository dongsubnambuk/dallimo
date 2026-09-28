import { createMockRunResultRepository } from './mockRunResultRepository';

// 앱 전체에서 하나만 쓴다. 실제 API가 생기면 구현만 바꾼다.
export const runResultRepository = createMockRunResultRepository();
