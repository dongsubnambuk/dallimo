import { API_BASE_URL } from '@/shared/api/config';

import { createHttpImportRepository } from './httpImportRepository';
import type { ImportRepository } from './importRepository';
import { createMockImportRepository } from './mockImportRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock
export const importRepository: ImportRepository = API_BASE_URL ? createHttpImportRepository() : createMockImportRepository();
