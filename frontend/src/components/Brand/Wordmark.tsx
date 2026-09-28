import { View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { useTheme } from "@/design/theme";

import { MoGlyph } from "./BrandSymbol";
import { WORDMARK } from "./brandGeometry";

export type WordmarkProps = {
  // 글자 높이 기준 크기(px). 폭은 비율대로 정해진다.
  height: number;
};

// 달리모 워드마크. "달리"는 Pretendard Black 윤곽, "모"는 코스 루프 전용 글자.
// light 컨텍스트: 검정 글자 + 민트 출발점, dark 컨텍스트: 흰 "달리" + 민트 "모" (117.1장: 사용자 화면 표기는 '달리모').
export function Wordmark({ height }: WordmarkProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === "dark";
  const ink = colors.text.primary;
  const mo = dark ? colors.action.primary : ink;
  const width = (height * WORDMARK.width) / WORDMARK.height;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="달리모">
      <Svg
        width={width}
        height={height}
        viewBox={`0 ${WORDMARK.top} ${WORDMARK.width} ${WORDMARK.height}`}
      >
        <G fill={ink}>
          <Path
            d={WORDMARK.dal}
            transform={`translate(0 ${WORDMARK.baseline}) scale(1 -1)`}
          />
          <Path
            d={WORDMARK.ri}
            transform={`translate(${WORDMARK.riX} ${WORDMARK.baseline}) scale(1 -1)`}
          />
        </G>
        <MoGlyph
          x={WORDMARK.moX}
          glyph={mo}
          dotFill={dark ? colors.text.primary : colors.action.primary}
          dotRing={dark ? colors.route.casing : ink}
        />
      </Svg>
    </View>
  );
}
