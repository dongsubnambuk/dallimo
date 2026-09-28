import { useMutation } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { BrandLoader } from '@/components/Brand';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { createMockShareRepository, type ShareScenario } from '@/entities/share/api/mockShareRepository';

import { availableTemplates, defaultTemplate, TEMPLATE_LABEL, type ShareCardData, type TemplateKey } from './cardModel';
import { CARD_BASE_H, CARD_BASE_W, ShareCard } from './components/ShareCard';
import { useShareSubject, type LinkTarget } from './useShareSubject';

// 공유 이미지 크기 (9:16, 스토리 · 메신저 세로 이미지)
const OUT_W = 1080;
const OUT_H = 1920;

// SCR-R05 공유 카드 (SHR-001, RST-005). 14.3장: 공유는 이미지 카드 + URL.
// 템플릿을 고르고 → 이미지로 공유하거나 → 링크만 보낸다. 과한 애니메이션 없음 (INTERACTION-SPECS Share).
export function ShareComposerScreen({ runId, roomId, scenario }: { runId: string | null; roomId: string | null; scenario: ShareScenario }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const subject = useShareSubject({ runId, roomId });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={close} accessibilityLabel="공유 닫기" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="close" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          공유 카드
        </AppText>
      </View>
      {subject.kind === 'loading' ? (
        <View style={styles.center}>
          <BrandLoader size={48} label="공유 카드 만드는 중" />
        </View>
      ) : subject.kind === 'notFound' ? (
        <View style={styles.pad}>
          <StateNotice icon="warning" title="공유할 기록을 찾을 수 없어요" body="기록이 지워졌거나 아직 결과가 나오지 않았어요." actions={<SecondaryButton label="닫기" size="sm" onPress={close} />} />
        </View>
      ) : (
        <Composer data={subject.data} live={subject.live} link={subject.link} linkBlocked={subject.linkBlocked} scenario={scenario} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function Composer({
  data,
  live,
  link,
  linkBlocked,
  scenario,
  bottomInset,
}: {
  data: ShareCardData;
  live: boolean;
  link: LinkTarget | null;
  linkBlocked: string | null;
  scenario: ShareScenario;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  const win = useWindowDimensions();
  const templates = availableTemplates(data);
  const [template, setTemplate] = useState<TemplateKey>(() => defaultTemplate(data, live));
  const cardRef = useRef<View>(null);
  const repo = useMemo(() => createMockShareRepository(scenario), [scenario]);
  const [imageError, setImageError] = useState<string | null>(null);

  // 미리보기는 화면에 맞춰 줄이고, 이미지는 같은 카드를 1080×1920으로 뽑는다
  const reserved = 56 + 64 + 150 + bottomInset;
  const width = Math.min(win.width - spacing.lg * 2, Math.max(200, ((win.height - reserved) * CARD_BASE_W) / CARD_BASE_H));

  const image = useMutation({
    mutationFn: async () => {
      setImageError(null);
      const web = Platform.OS === 'web';
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: OUT_W, height: OUT_H, result: web ? 'data-uri' : 'tmpfile' });
      if (web) {
        // 웹(개발 확인용)은 파일로 내려받는다
        const a = document.createElement('a');
        a.href = uri;
        a.download = 'dallimo-share.png';
        a.click();
        return;
      }
      if (!(await Sharing.isAvailableAsync())) throw new Error('unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: '공유 카드' });
    },
    onError: (e) => setImageError(e instanceof Error && e.message === 'unavailable' ? '이 기기에서는 이미지 공유를 쓸 수 없어요' : '이미지를 만들지 못했어요. 다시 시도해 주세요'),
  });

  const sendLink = useMutation({
    mutationFn: async () => {
      const l = await repo.create(link!.type, link!.referenceId, link!.courseId);
      await Share.share({ message: `${data.headline} · ${data.title}\n달리모에서 같이 달려요\n${l.url}` }).catch(() => undefined);
    },
  });

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + spacing.lg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.preview} accessible accessibilityRole="image" accessibilityLabel={`${TEMPLATE_LABEL[template]} 공유 카드 미리보기. ${data.headline}, ${data.title}, ${data.primary.label} ${data.primary.value}`}>
        <View style={[styles.cardFrame, { borderRadius: radius.card }]}>
          <ShareCard ref={cardRef} data={data} template={template} width={width} />
        </View>
      </View>

      <View style={styles.chips} accessibilityRole="tablist">
        {templates.map((t) => (
          <FilterChip key={t} label={TEMPLATE_LABEL[t]} selected={t === template} onPress={() => setTemplate(t)} />
        ))}
      </View>
      {template === 'map' && data.freePath ? (
        <View style={styles.note}>
          <AppIcon name="warning" size={14} color={colors.status.warning} />
          <AppText role="caption" tone="secondary" style={styles.flexShrink}>
            지도에 출발 지점이 그대로 보여요. 집 근처에서 시작했다면 기록 카드를 권해요.
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <SecondaryButton
          label={image.isPending ? '이미지 만드는 중' : Platform.OS === 'web' ? '이미지 저장' : '이미지 공유'}
          emphasized
          disabled={image.isPending}
          onPress={() => image.mutate()}
          style={styles.flex}
        />
        <SecondaryButton label={sendLink.isPending ? '링크 만드는 중' : '링크 보내기'} disabled={!link || sendLink.isPending} onPress={() => sendLink.mutate()} style={styles.flex} />
      </View>
      {imageError ? (
        <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
          {imageError}
        </AppText>
      ) : null}
      {sendLink.isError ? (
        <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
          링크를 만들지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요. 이미지는 지금도 공유할 수 있어요.
        </AppText>
      ) : linkBlocked ? (
        <AppText role="caption" tone="secondary">
          {linkBlocked}. 이미지는 지금 공유할 수 있어요.
        </AppText>
      ) : null}
    </ScrollView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: {
    padding: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  preview: {
    alignItems: 'center',
  },
  cardFrame: {
    overflow: 'hidden',
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
});
