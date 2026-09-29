import { API_BASE_URL } from '@/shared/api/config';

import { createHttpRunApi } from './httpRunApi';
import { createHttpRunResultRepository } from './httpRunResultRepository';
import { createMockRunApi } from './mockRunApi';
import { createMockRunResultRepository } from './mockRunResultRepository';

// 앱 전체에서 하나만 쓴다. 서버 주소(EXPO_PUBLIC_API_URL)가 있으면 실제 서버, 없으면 mock.
export const runResultRepository = API_BASE_URL ? createHttpRunResultRepository() : createMockRunResultRepository();

// 42장 Run API (기록 동기화)
export const runApi = API_BASE_URL ? createHttpRunApi() : createMockRunApi();
