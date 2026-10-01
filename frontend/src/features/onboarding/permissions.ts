import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { getHealthProvider } from '@/entities/import/provider';
import { registerPush } from '@/features/notifications/push';
import { getPreferences, setPreference } from '@/shared/preferences';

// 온보딩 권한 안내 (결정 로그 64항). 휴대폰 권한 창을 띄우기 전에 왜 필요한지 먼저 보여 준다.
// granted: 허용됨, denied: 거절해서 다시 물을 수 없음(휴대폰 설정에서 켠다), ask: 아직 묻지 않음, unavailable: 이 기기에서 못 씀

export type PermissionState = 'granted' | 'denied' | 'ask' | 'unavailable';
export type PermissionKind = 'location' | 'notification' | 'health';

type Expo = { granted: boolean; canAskAgain: boolean };
const fromExpo = (p: Expo): PermissionState => (p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied');

export async function permissionState(kind: PermissionKind): Promise<PermissionState> {
  try {
    switch (kind) {
      case 'location':
        return fromExpo(await Location.getForegroundPermissionsAsync());
      case 'notification':
        // 웹은 Push를 받지 않는다
        if (Platform.OS === 'web') return 'unavailable';
        return fromExpo(await Notifications.getPermissionsAsync());
      case 'health': {
        const provider = getHealthProvider();
        if (!provider.available()) return 'unavailable';
        return getPreferences().healthImport ? 'granted' : 'ask';
      }
    }
  } catch {
    return 'unavailable';
  }
}

/** 휴대폰 권한 창을 띄운다. 끝난 뒤의 상태 */
export async function requestPermission(kind: PermissionKind): Promise<PermissionState> {
  try {
    switch (kind) {
      case 'location':
        return fromExpo(await Location.requestForegroundPermissionsAsync());
      case 'notification':
        // 허용하면 Push 토큰도 서버에 등록한다
        await registerPush(true);
        return fromExpo(await Notifications.getPermissionsAsync());
      case 'health': {
        // Apple 건강은 읽기 권한을 거절해도 알려 주지 않는다. 창이 닫히면 연결된 것으로 본다 (설정 > 외부 기록과 같다)
        const ok = await getHealthProvider().connect();
        if (ok) setPreference('healthImport', true);
        return ok ? 'granted' : 'denied';
      }
    }
  } catch {
    return 'unavailable';
  }
}

export function openPhoneSettings() {
  Linking.openSettings().catch(() => undefined);
}
