import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/shared/api/config';
import { apiRequest } from '@/shared/api/http';

// 강제 업데이트 (사용자 결정, 결정 로그 79항). 서버가 주는 최소 버전보다 앱(설치된 스토어 빌드) 버전이 낮으면 막는다.
// 서버에 닿지 못하거나 값이 없으면 막지 않는다 (달리기 기록을 못 하게 되는 쪽이 더 나쁘다)

export type ForceUpdate = { required: false } | { required: true; storeUrl: string | null };

/** "1.2.10" > "1.2.9". 숫자가 아닌 부분은 0으로 본다. a < b면 음수 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function needsUpdate(current: string | null, minVersion: string | null): boolean {
  if (!current || !minVersion) return false;
  return compareVersions(current, minVersion) < 0;
}

async function check(): Promise<ForceUpdate> {
  const current = Application.nativeApplicationVersion;
  if (!API_BASE_URL || !current || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return { required: false };
  const r = await apiRequest<{ minVersion: string | null; storeUrl: string | null }>('/api/v1/app/version', { auth: false, query: { platform: Platform.OS } });
  return needsUpdate(current, r.minVersion) ? { required: true, storeUrl: r.storeUrl } : { required: false };
}

/**
 * 앱을 새로 켤 때 한 번 확인한다. 앞으로 올 때마다 보지 않는 것은 달리는 중에 업데이트 화면이 러닝 화면을 가리지 않게 하려는 것이다
 */
export function useForceUpdate(): ForceUpdate {
  const [state, setState] = useState<ForceUpdate>({ required: false });
  useEffect(() => {
    check()
      .then(setState)
      .catch(() => {
        // 연결이 없으면 막지 않는다
      });
  }, []);
  return state;
}
