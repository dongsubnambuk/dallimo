import type { TextStyle } from 'react-native';

// 역할 이름은 COMPONENT-CONTRACTS.md 112.1 AppText API 초안을 따른다.
// 폰트는 88.1장 후보인 Pretendard (사용자 승인). 굵기별 정적 파일을 fontFamily 이름으로 지정하고 fontWeight는 쓰지 않는다.
// 88.1장 "숫자를 위해 별도 장식 font를 추가하지 않음"에 따라 기록 숫자도 같은 family의 Black(900)을 쓴다.
// 크기는 v0.3 후보값이다 (레퍼런스: NRC·플랜핏의 큰 화면 제목, 굵은 기울임 숫자).
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
  black: 'Pretendard-Black',
} as const;

export const fontAssets = {
  [fontFamily.regular]: require('../../../assets/fonts/pretendard/Pretendard-Regular.otf'),
  [fontFamily.medium]: require('../../../assets/fonts/pretendard/Pretendard-Medium.otf'),
  [fontFamily.bold]: require('../../../assets/fonts/pretendard/Pretendard-Bold.otf'),
  [fontFamily.extrabold]: require('../../../assets/fonts/pretendard/Pretendard-ExtraBold.otf'),
  [fontFamily.black]: require('../../../assets/fonts/pretendard/Pretendard-Black.otf'),
};

export type TextRole =
  | 'metricGiant'
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
  // 기록 숫자를 기울임꼴로 (레퍼런스 P4). Pretendard에는 italic이 없어 skew로 만든다.
  oblique?: boolean;
};

export const OBLIQUE_SKEW = '-9deg';

export const typography: Record<TextRole, RoleStyle> = {
  // 숫자는 좁은 자간으로 하나의 덩어리처럼 읽히게 한다.
  // 92장 Active Run 가운데 giant metric(거리). 89장 "화면 중심에 2~3개 giant metrics" (FOUNDATION-DECISION-LOG 15항)
  metricGiant: { fontSize: 112, lineHeight: 116, fontFamily: fontFamily.black, letterSpacing: -4, maxFontSizeMultiplier: 1.1, oblique: true },
  metricHero: { fontSize: 72, lineHeight: 76, fontFamily: fontFamily.black, letterSpacing: -2.5, maxFontSizeMultiplier: 1.3, oblique: true },
  metricLarge: { fontSize: 40, lineHeight: 44, fontFamily: fontFamily.black, letterSpacing: -1.2, maxFontSizeMultiplier: 1.3, oblique: true },
  screenTitle: { fontSize: 28, lineHeight: 36, fontFamily: fontFamily.extrabold, letterSpacing: -0.8, maxFontSizeMultiplier: 1.4 },
  sectionTitle: { fontSize: 18, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular, letterSpacing: -0.1 },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium, maxFontSizeMultiplier: 1.5 },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.regular },
};
