import { colorRoles } from '../tokens';
import type { Theme } from './types';

// 탐색 컨텍스트 (Explore, Course Detail, Result): calm / light / map-first
export const lightTheme: Theme = {
  scheme: 'light',
  colors: colorRoles.light,
};
