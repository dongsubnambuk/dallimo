import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';

import { LOCATION_TERMS } from './legal/location';
import { PRIVACY_POLICY } from './legal/privacy';
import { TERMS_OF_SERVICE } from './legal/terms';
import type { LegalDocument, LegalTable } from './legal/types';

export type LegalKind = 'terms' | 'location' | 'privacy';

const DOCS: Record<LegalKind, LegalDocument> = {
  terms: TERMS_OF_SERVICE,
  location: LOCATION_TERMS,
  privacy: PRIVACY_POLICY,
};

export function isLegalKind(v: string | undefined): v is LegalKind {
  return v === 'terms' || v === 'location' || v === 'privacy';
}

// 항(①) · 호(1.) · 목(가.) 머리. 번호를 내어 쓰고 글끼리 줄을 맞춘다
const CLAUSE = /^([\u2460-\u2473])\s*/;
const ITEM = /^(\d+\.)\s+/;
const SUB_ITEM = /^([가-힣]\.)\s+/;

// SCR-A01 약관 · 정책 진입, SCR-M07 개인정보. 정식 법률 문서 형식(제n조 · 항 · 호)으로 썼다(사용자 결정, 결정 로그 66항). 법적 검토는 출시 전에 따로 한다(16장, OI-07).
// 로그인 전(가입 화면)에도 연다.
export function LegalScreen({ kind }: { kind: LegalKind }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const doc = DOCS[kind];
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          {doc.title}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
        <AppText role="caption" tone="secondary">
          {doc.effectiveDate}부터 적용
        </AppText>
        <AppText role="body">{doc.intro}</AppText>
        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <AppText role="sectionTitle" accessibilityRole="header">
              {section.heading}
            </AppText>
            {section.blocks.map((b, i) => (typeof b === 'string' ? <Paragraph key={i} text={b} /> : <Table key={i} table={b} />))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Paragraph({ text }: { text: string }) {
  const clause = CLAUSE.exec(text);
  const item = clause ? null : ITEM.exec(text);
  const sub = clause || item ? null : SUB_ITEM.exec(text);
  const m = clause ?? item ?? sub;
  if (!m) {
    return (
      <AppText role="body" tone="secondary">
        {text}
      </AppText>
    );
  }
  const indent = item ? spacing.md : sub ? spacing.xl : 0;
  return (
    <View style={[styles.hang, { paddingLeft: indent }]}>
      <AppText role="body" tone="secondary">
        {m[1]}
      </AppText>
      <AppText role="body" tone="secondary" style={styles.flex}>
        {text.slice(m[0].length)}
      </AppText>
    </View>
  );
}

// 첫 열은 좁게, 나머지는 넓게. 줄 사이 선은 바탕색으로 긋는다(새 색 토큰 없이)
function Table({ table }: { table: LegalTable }) {
  const { colors } = useTheme();
  const flexOf = (col: number) => (col === 0 ? 1 : 1.6);
  return (
    <View style={[styles.table, { backgroundColor: colors.bg.surface }]}>
      {/* 머리글은 각 줄의 읽기 이름에 넣었으니 스크린 리더에서 따로 읽지 않는다 */}
      <View style={styles.tr} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {table.head.map((h, c) => (
          <AppText key={c} role="label" style={[styles.th, { flex: flexOf(c) }]}>
            {h}
          </AppText>
        ))}
      </View>
      {table.rows.map((row, r) => (
        <View
          key={r}
          style={[styles.tr, { borderTopColor: colors.bg.canvas }, styles.trLine]}
          accessible
          accessibilityLabel={row.map((cell, c) => `${table.head[c]} ${cell}`).join(', ')}
        >
          {row.map((cell, c) => (
            <AppText key={c} role="label" tone={c === 0 ? 'primary' : 'secondary'} style={[c === 0 && styles.th, { flex: flexOf(c) }]}>
              {cell}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: touchTarget.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  round: {
    width: touchTarget.min - 4,
    height: touchTarget.min - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  hang: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  table: {
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trLine: {
    borderTopWidth: 1,
  },
  th: {
    fontFamily: fontFamily.bold,
  },
  flex: {
    flex: 1,
  },
});
