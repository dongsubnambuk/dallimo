import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLoader } from '@/components/Brand';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StateNotice } from '@/components/StateNotice';
import { AppIcon, AppPressable, AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { radius, spacing, touchTarget } from '@/design/tokens';
import { SettingRow, SettingSection } from '@/features/settings/components/SettingRow';
import { heartSensor, type HeartSensorDevice, type HeartSensorState } from '@/shared/heart/heartSensorTransport';
import { setPreference, usePreferences } from '@/shared/preferences';

// 설정 > 심박 센서 (결정 로그 80항). 심박 벨트나 심박수 브로드캐스트를 켠 워치를 찾아 하나를 저장한다.
// 저장한 센서는 달리기를 시작하면 연결된다. 이 화면에서는 연결해서 심박이 들어오는지 바로 보여 준다.
// 상태: 지원 안 함 · 블루투스 꺼짐 · 권한 없음 · 찾는 중 · 찾음 · 못 찾음 · 연결 중 · 연결됨

// 이만큼 찾고 멈춘다 (배터리). 못 찾으면 다시 찾기
const SCAN_MS = 15_000;

function signal(rssi?: number): string | undefined {
  if (rssi == null) return '이미 휴대폰에 연결됨';
  if (rssi >= -65) return '가까이 있어요';
  if (rssi >= -80) return '조금 떨어져 있어요';
  return '멀리 있어요';
}

export function HeartSensorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const saved = usePreferences().heartSensor;
  const [state, setState] = useState<HeartSensorState>(() => heartSensor.state());
  const [devices, setDevices] = useState<HeartSensorDevice[]>([]);
  // 마지막으로 받은 심박과 그 센서 (센서를 바꾸면 이전 값을 보이지 않게)
  const [reading, setReading] = useState<{ id: string; bpm: number } | null>(null);
  // 찾기 횟수. 바뀌면 다시 찾는다
  const [round, setRound] = useState(0);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  useEffect(() => heartSensor.onState(setState), []);

  // 찾기 (처음 열 때 iOS가 블루투스 권한을 묻는다)
  useEffect(() => {
    if (!heartSensor.supported) return;
    const off = heartSensor.onDevice((d) => setDevices((list) => [...list.filter((x) => x.id !== d.id), d]));
    heartSensor.startScan();
    const timer = setTimeout(() => heartSensor.stopScan(), SCAN_MS);
    return () => {
      clearTimeout(timer);
      off();
      heartSensor.stopScan();
    };
  }, [round]);

  // 저장한 센서에 연결해 심박이 들어오는지 보여 준다. 나가면 끊는다 (달리기를 시작하면 다시 연결)
  const savedId = saved?.id ?? null;
  useEffect(() => {
    if (!savedId || !heartSensor.supported) return;
    const off = heartSensor.onHeartRate((bpm) => setReading({ id: savedId, bpm }));
    heartSensor.connect(savedId);
    return () => {
      off();
      heartSensor.disconnect();
    };
  }, [savedId]);

  const choose = (d: HeartSensorDevice) => setPreference('heartSensor', { id: d.id, name: d.name || '이름 없는 센서' });
  const rescan = () => {
    setDevices([]);
    setRound((r) => r + 1);
  };
  const forget = () => setPreference('heartSensor', null);

  const bpm = reading && reading.id === savedId ? reading.bpm : null;
  const others = devices.filter((d) => d.id !== savedId);
  const connected = saved != null && state.connection === 'connected' && state.deviceId === savedId;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={back} accessibilityLabel="뒤로" style={[styles.round, { backgroundColor: colors.bg.surface }]}>
          <AppIcon name="back" size={20} color={colors.text.primary} />
        </AppPressable>
        <AppText role="sectionTitle" accessibilityRole="header">
          심박 센서
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <AppText role="body" tone="secondary">
          심박 벨트나 심박수 브로드캐스트를 켠 워치를 연결하면 달리는 동안 심박을 보여 줘요. 달리기를 시작하면 저장한 센서에 자동으로 연결돼요.
        </AppText>

        {!heartSensor.supported ? (
          <StateNotice icon="health" title="심박 센서는 아이폰에서 쓸 수 있어요" body="아이폰 달리모 앱에서 연결해 주세요." />
        ) : state.bluetooth === 'unauthorized' ? (
          <StateNotice
            icon="warning"
            tone="warning"
            title="블루투스 권한이 없어요"
            body="휴대폰 설정 › 달리모에서 블루투스를 허용하면 심박 센서를 찾을 수 있어요."
            actions={<SecondaryButton label="휴대폰 설정 열기" size="sm" onPress={() => Linking.openSettings().catch(() => undefined)} />}
          />
        ) : state.bluetooth === 'off' ? (
          <StateNotice icon="warning" tone="warning" title="블루투스가 꺼져 있어요" body="제어 센터나 설정에서 블루투스를 켜 주세요." />
        ) : (
          <>
            {saved ? (
              <SettingSection title="연결한 센서" footer="달리는 중에 연결이 끊기면 다시 연결해요. 심박이 안 보여도 거리 · 시간 기록은 그대로예요.">
                <View style={styles.saved} accessible accessibilityLabel={`${saved.name}, ${connected ? (bpm != null ? `심박 ${bpm}` : '연결됨') : '연결 중'}`}>
                  <AppIcon name="health" size={20} color={connected ? colors.status.danger : colors.text.secondary} />
                  <View style={styles.flex}>
                    <AppText role="body" numberOfLines={1}>
                      {saved.name}
                    </AppText>
                    <AppText role="caption" tone="secondary">
                      {connected ? '연결됨' : '연결 중 · 센서를 착용하고 켜 주세요'}
                    </AppText>
                  </View>
                  {connected && bpm != null ? (
                    <AppText role="sectionTitle" tabular>
                      {bpm}
                      <AppText role="caption" tone="secondary">
                        {' '}
                        bpm
                      </AppText>
                    </AppText>
                  ) : (
                    <BrandLoader size={20} label="연결 중" />
                  )}
                </View>
                <SettingRow kind="link" label="이 센서 연결 해제" tone="danger" onPress={forget} />
              </SettingSection>
            ) : null}

            <SettingSection
              title={saved ? '다른 센서로 바꾸기' : '주변 센서'}
              footer="워치는 '심박수 브로드캐스트' 같은 심박 공유 기능을 켜야 보여요. 메뉴 이름은 기종마다 달라요."
            >
              {others.map((d) => (
                <SettingRow key={d.id} kind="link" label={d.name || '이름 없는 센서'} caption={signal(d.rssi)} onPress={() => choose(d)} />
              ))}
              {state.scanning ? (
                <View style={styles.scanning} accessibilityLiveRegion="polite">
                  <BrandLoader size={18} label="찾는 중" />
                  <AppText role="caption" tone="secondary">
                    주변 센서를 찾는 중
                  </AppText>
                </View>
              ) : (
                <View style={styles.rescan}>
                  {others.length === 0 ? (
                    <AppText role="body" tone="secondary" style={styles.flex}>
                      {saved ? '다른 센서를 찾지 못했어요.' : '센서를 찾지 못했어요. 센서를 착용하고 켠 뒤 다시 찾아 주세요.'}
                    </AppText>
                  ) : (
                    <View style={styles.flex} />
                  )}
                  <SecondaryButton label="다시 찾기" size="sm" onPress={rescan} />
                </View>
              )}
            </SettingSection>
          </>
        )}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  saved: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scanning: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rescan: {
    minHeight: touchTarget.min + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
