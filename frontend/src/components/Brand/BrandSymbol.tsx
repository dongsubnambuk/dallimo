import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { darkTheme, useTheme } from "@/design/theme";

import { MO } from "./brandGeometry";

export type BrandSymbolProps = {
  size: number;
  // signal: 형광 민트 글자(어두운 바탕용), ink: 기본 글자색(밝은 바탕용, 출발점만 민트)
  tone?: "signal" | "ink";
};

// 달리모 심볼: "모"의 ㅁ을 한 바퀴 코스 루프로, 그 위에 출발점을 둔 글자 (달리+모여).
// 83장 route signal의 선·출발점 언어를 브랜드 글자로 옮겼다.
export function BrandSymbol({ size, tone = "signal" }: BrandSymbolProps) {
  const { colors } = useTheme();
  const glyph = tone === "signal" ? colors.action.primary : colors.text.primary;
  // 출발점은 어두운 바탕에서 흰 점, 밝은 바탕에서 민트 점
  const dotFill =
    tone === "signal" ? darkTheme.colors.text.primary : colors.action.primary;
  const dotRing = tone === "signal" ? colors.route.casing : colors.text.primary;
  const b = MO.bounds;
  const side = Math.max(b.width, b.height);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={size}
        height={size}
        viewBox={`${b.x - (side - b.width) / 2} ${b.y - (side - b.height) / 2} ${side} ${side}`}
      >
        <MoGlyph glyph={glyph} dotFill={dotFill} dotRing={dotRing} />
      </Svg>
    </View>
  );
}

export function MoGlyph({
  glyph,
  dotFill,
  dotRing,
  x = 0,
  hideDot = false,
}: {
  glyph: string;
  dotFill: string;
  dotRing: string;
  x?: number;
  hideDot?: boolean;
}) {
  const { loop, stem, bar, dot } = MO;
  return (
    <G transform={`translate(${x} 0)`}>
      <Rect
        x={stem.x}
        y={stem.y}
        width={stem.width}
        height={stem.height}
        fill={glyph}
      />
      <Rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={glyph}
      />
      <Path d={loop} fill={glyph} fillRule="evenodd" />
      {hideDot ? null : (
        <Circle
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={dotFill}
          stroke={dotRing}
          strokeWidth={dot.ring}
        />
      )}
    </G>
  );
}
