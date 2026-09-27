import type { TextStyle } from 'react-native';

// 역할 이름은 COMPONENT-CONTRACTS.md 112.1 AppText API 초안을 따른다.
// 폰트는 88.1장 후보인 Pretendard (사용자 승인). 굵기별 정적 파일을 fontFamily 이름으로 지정하고 fontWeight는 쓰지 않는다.
// metricHero 64/68은 114장 후보값, 나머지 크기는 v0 후보값이다.
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  extrabold: 'Pretendard-ExtraBold',
} as const;

export const fontAssets = {
  [fontFamily.regular]: require('../../../assets/fonts/pretendard/Pretendard-Regular.otf'),
  [fontFamily.medium]: require('../../../assets/fonts/pretendard/Pretendard-Medium.otf'),
  [fontFamily.semibold]: require('../../../assets/fonts/pretendard/Pretendard-SemiBold.otf'),
  [fontFamily.extrabold]: require('../../../assets/fonts/pretendard/Pretendard-ExtraBold.otf'),
};

export type TextRole =
  | 'metricHero'
  | 'metricLarge'
  | 'screenTitle'
  | 'sectionTitle'
  | 'body'
  | 'label'
  | 'caption';

type RoleStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily' | 'letterSpacing'> & {
  // undefined면 시스템 글자 크기 설정을 제한 없이 따른다.
  maxFontSizeMultiplier?: number;
};

export const typography: Record<TextRole, RoleStyle> = {
  // 숫자는 좁은 자간으로 하나의 덩어리처럼 읽히게 한다.
  metricHero: { fontSize: 64, lineHeight: 68, fontFamily: fontFamily.extrabold, letterSpacing: -2, maxFontSizeMultiplier: 1.3 },
  metricLarge: { fontSize: 36, lineHeight: 40, fontFamily: fontFamily.extrabold, letterSpacing: -1, maxFontSizeMultiplier: 1.3 },
  screenTitle: { fontSize: 24, lineHeight: 32, fontFamily: fontFamily.extrabold, letterSpacing: -0.5, maxFontSizeMultiplier: 1.5 },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium, maxFontSizeMultiplier: 1.5 },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.regular },
};
