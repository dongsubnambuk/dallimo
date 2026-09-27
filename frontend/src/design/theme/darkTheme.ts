import { colorRoles } from '../tokens';
import type { Theme } from './types';

// 러닝 컨텍스트 (Run Ready, Active Run, Together Live): focused / dark / metric-first
export const darkTheme: Theme = {
  scheme: 'dark',
  colors: colorRoles.dark,
};
