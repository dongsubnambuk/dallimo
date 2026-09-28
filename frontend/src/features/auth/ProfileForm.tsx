import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SecondaryButton } from '@/components/SecondaryButton';
import { AppIcon, AppPressable, AppText, type IconName } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing, touchTarget } from '@/design/tokens';
import { checkNicknameLocal, createMockUserRepository, NICKNAME_MAX } from '@/entities/user/api/mockUserRepository';
import type { MyProfile, NicknameCheck } from '@/entities/user/types';

// AUTH-002 프로필 설정: 프로필 이미지 선택, 닉네임 중복 확인. 처음 가입(SCR-A02)과 프로필 수정이 함께 쓴다.
export function ProfileForm({
  initial,
  submitLabel,
  onDone,
}: {
  initial: Pick<MyProfile, 'nickname' | 'profileImageUrl'>;
  submitLabel: string;
  onDone: (profile: MyProfile) => void;
}) {
  const { colors } = useTheme();
  const repo = useMemo(() => createMockUserRepository(), []);
  const [nickname, setNickname] = useState(initial.nickname);
  const [image, setImage] = useState<string | null>(initial.profileImageUrl);
  const [touched, setTouched] = useState(false);
  const [debounced, setDebounced] = useState(initial.nickname.trim());

  // 입력을 멈추면 서버에 중복을 물어본다
  useEffect(() => {
    const t = setTimeout(() => setDebounced(nickname.trim()), 400);
    return () => clearTimeout(t);
  }, [nickname]);

  const trimmed = nickname.trim();
  const unchanged = trimmed === initial.nickname.trim() && initial.nickname.trim() !== '';
  const local = checkNicknameLocal(nickname);
  const check = useQuery({
    queryKey: ['nickname', debounced],
    queryFn: () => repo.checkNickname(debounced),
    enabled: !local && !unchanged && debounced === trimmed,
    retry: false,
  });
  const result: NicknameCheck | 'checking' | 'unchanged' | null = local ?? (unchanged ? 'unchanged' : check.data && debounced === trimmed ? check.data : 'checking');

  const save = useMutation({
    mutationFn: () => repo.updateMe({ ...(unchanged ? {} : { nickname: trimmed }), profileImageUri: image }),
    onSuccess: onDone,
  });
  const failed = save.error instanceof Error ? (save.error.message === 'taken' ? 'taken' : 'error') : null;
  const canSave = (result === 'ok' || (result === 'unchanged' && image !== initial.profileImageUrl)) && !save.isPending;

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setImage(r.assets[0].uri);
  };

  const status = statusOf(failed === 'taken' ? 'taken' : result, touched);

  return (
    <View style={styles.root}>
      <View style={styles.avatarRow}>
        <AppPressable onPress={pick} accessibilityRole="button" accessibilityLabel={image ? '프로필 사진 바꾸기' : '프로필 사진 고르기'} style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.action.secondary }]}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImage} contentFit="cover" accessibilityIgnoresInvertColors />
            ) : (
              <AppText role="screenTitle" style={{ color: colors.action.onSecondary }}>
                {trimmed.slice(0, 1) || ' '}
              </AppText>
            )}
          </View>
          <View style={[styles.cameraBadge, { backgroundColor: colors.bg.elevated, borderColor: colors.bg.canvas }]}>
            <AppIcon name="camera" size={16} color={colors.text.primary} />
          </View>
        </AppPressable>
        <View style={styles.avatarActions}>
          <SecondaryButton label={image ? '사진 바꾸기' : '사진 고르기'} size="sm" onPress={pick} />
          {image ? <SecondaryButton label="사진 빼기" size="sm" onPress={() => setImage(null)} /> : null}
        </View>
      </View>

      <View style={styles.field}>
        <AppText role="label" tone="secondary" nativeID="nickname-label">
          닉네임
        </AppText>
        <TextInput
          value={nickname}
          onChangeText={(v) => {
            setNickname(v);
            setTouched(true);
            save.reset();
          }}
          placeholder="랭킹과 함께 달리기에서 보이는 이름"
          placeholderTextColor={colors.text.secondary}
          accessibilityLabel="닉네임"
          accessibilityLabelledBy="nickname-label"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { backgroundColor: colors.bg.surface, color: colors.text.primary, borderColor: status?.tone === 'warning' ? colors.status.warning : 'transparent' }]}
        />
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {status ? (
            <View style={styles.status}>
              {status.icon ? <AppIcon name={status.icon} size={14} color={status.tone === 'warning' ? colors.status.warning : status.tone === 'ok' ? colors.status.success : colors.text.secondary} /> : null}
              <AppText role="caption" tone={status.tone === 'neutral' ? 'secondary' : 'primary'}>
                {status.copy}
              </AppText>
            </View>
          ) : (
            <View />
          )}
          <AppText role="caption" tone={trimmed.length > NICKNAME_MAX ? 'primary' : 'secondary'} tabular>
            {trimmed.length}/{NICKNAME_MAX}
          </AppText>
        </View>
      </View>

      {failed === 'error' ? (
        <AppText role="label" style={{ color: colors.status.warning }} accessibilityLiveRegion="polite">
          저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.
        </AppText>
      ) : null}

      <SecondaryButton label={save.isPending ? '저장하는 중' : submitLabel} emphasized disabled={!canSave} onPress={() => save.mutate()} style={styles.submit} />
    </View>
  );
}

function statusOf(result: NicknameCheck | 'checking' | 'unchanged' | null, touched: boolean): { copy: string; icon: IconName | null; tone: 'ok' | 'warning' | 'neutral' } | null {
  switch (result) {
    case 'ok':
      return { copy: '쓸 수 있는 이름이에요', icon: 'check', tone: 'ok' };
    case 'taken':
      return { copy: '이미 다른 사람이 쓰고 있어요', icon: 'warning', tone: 'warning' };
    case 'tooLong':
      return { copy: `${NICKNAME_MAX}자까지 쓸 수 있어요`, icon: 'warning', tone: 'warning' };
    case 'empty':
      return touched ? { copy: '이름을 입력해 주세요', icon: 'warning', tone: 'warning' } : null;
    case 'checking':
      return { copy: '쓸 수 있는지 확인하는 중', icon: 'pending', tone: 'neutral' };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrap: {
    width: 88,
    height: 88,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: touchTarget.min + spacing.sm,
    borderRadius: radius.control,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.bold,
    // sectionTitle 크기. 입력한 이름이 본문보다 한 단계 크게 읽히게 한다
    fontSize: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 20,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  submit: {
    alignSelf: 'stretch',
  },
});
