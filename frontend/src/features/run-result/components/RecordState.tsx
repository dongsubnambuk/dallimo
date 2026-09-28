import { StyleSheet, View } from 'react-native';

import { BrandLoader } from '@/components/Brand';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AppIcon, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import type { RunResult } from '@/entities/run/result';

// 기록의 동기화 · 공식 검증 상태 (SCREEN-SPECS Result: local-only, syncing, verification pending, verified, unverified).
// 결과 화면과 러닝 상세(SCR-M03)가 함께 쓴다.
export function RecordState({ result: r }: { result: RunResult }) {
  const { colors } = useTheme();
  if (r.sync === 'localOnly') {
    return (
      <Row icon="offline" title="휴대폰에만 저장됨" body={r.course ? '인터넷에 연결되면 올리고 공식 기록 검증을 받아요' : '인터넷에 연결되면 자동으로 올려요'} />
    );
  }
  if (r.sync === 'syncing') {
    return <Row loading title="기록 올리는 중" body="다 올리면 공식 기록 검증이 시작돼요" />;
  }
  if (r.verification === 'none') return null;
  return (
    <View style={styles.stateBlock} accessibilityLiveRegion="polite">
      <VerificationBadge status={r.verification} />
      {r.verification === 'pending' ? (
        <AppText role="caption" tone="secondary">
          검증이 끝나면 PB와 순위에 반영돼요
        </AppText>
      ) : null}
      {r.verificationReason ? (
        <View style={[styles.reason, { backgroundColor: colors.bg.surface }]}>
          <AppText role="label">{r.verificationReason}</AppText>
          <AppText role="caption" tone="secondary">
            이번 기록은 랭킹에 반영되지 않아요
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function Row({ icon, loading, title, body }: { icon?: IconName; loading?: boolean; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.bg.surface }]} accessible accessibilityLabel={`${title}. ${body}`} accessibilityLiveRegion="polite">
      {loading ? <BrandLoader size={24} label={title} /> : icon ? <AppIcon name={icon} size={20} color={colors.text.primary} /> : null}
      <View style={styles.flexShrink}>
        <AppText role="label" style={styles.bold}>
          {title}
        </AppText>
        <AppText role="caption" tone="secondary">
          {body}
        </AppText>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  stateBlock: {
    gap: spacing.sm,
  },
  reason: {
    borderRadius: radius.control,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  flexShrink: {
    flexShrink: 1,
  },
  bold: {
    fontFamily: fontFamily.bold,
  },
});
