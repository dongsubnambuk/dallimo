import type { TextStyle } from 'react-native';

// 역할 이름은 COMPONENT-CONTRACTS.md 112.1 AppText API 초안을 따른다.
// metricHero 64/68 extra-bold는 DESIGN-SYSTEM.md 114장 후보값, 나머지 크기는 v0 후보값이다.
// 폰트 family는 확정 전이므로 시스템 폰트를 쓴다 (115.1: 새 font family 임의 결정 금지).
export type TextRole =
  | 'metricHero'
  | 'metricLarge'
  | 'screenTitle'
  | 'sectionTitle'
  | 'body'
  | 'label'
  | 'caption';

type RoleStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'> & {
  // undefined면 시스템 글자 크기 설정을 제한 없이 따른다.
  maxFontSizeMultiplier?: number;
};

export const typography: Record<TextRole, RoleStyle> = {
  metricHero: { fontSize: 64, lineHeight: 68, fontWeight: '800', letterSpacing: -1, maxFontSizeMultiplier: 1.3 },
  metricLarge: { fontSize: 36, lineHeight: 40, fontWeight: '700', maxFontSizeMultiplier: 1.3 },
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', maxFontSizeMultiplier: 1.5 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', maxFontSizeMultiplier: 1.5 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};
