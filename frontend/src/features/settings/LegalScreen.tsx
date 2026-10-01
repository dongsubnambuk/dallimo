import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';

import { PRIVACY_POLICY } from './legal/privacy';
import { TERMS_OF_SERVICE } from './legal/terms';
import type { LegalDocument } from './legal/types';

export type LegalKind = 'terms' | 'privacy';

const DOCS: Record<LegalKind, LegalDocument> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
};

// SCR-A01 약관 · 정책 진입, SCR-M07 개인정보. 본문은 통상적인 내용으로 썼다(사용자 결정, 결정 로그 66항). 법적 검토는 출시 전에 따로 한다(16장, OI-07).
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
            {section.paragraphs.map((p, i) =>
              p.startsWith('· ') ? (
                // 목록 한 줄: 점과 글을 나눠 줄이 바뀌어도 글끼리 맞춘다
                <View key={i} style={styles.item}>
                  <AppText role="body" tone="secondary">
                    ·
                  </AppText>
                  <AppText role="body" tone="secondary" style={styles.flex}>
                    {p.slice(2)}
                  </AppText>
                </View>
              ) : (
                <AppText key={i} role="body" tone="secondary">
                  {p}
                </AppText>
              ),
            )}
          </View>
        ))}
      </ScrollView>
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
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
