import { useEffect, useRef } from 'react';

import type { AuthStatus } from '@/features/auth/session';

import { startPermissionsGuide } from './onboardingState';
import { permissionState } from './permissions';

// 로그인 · 자동 로그인 뒤 한 번 (결정 로그 82항): 이 기기에서 권한 안내를 본 적이 없고 알림을 아직 묻지 않았으면 권한 안내를 보여 준다.
// 가입한 사람은 가입 온보딩에서 이미 본다. 웹은 알림이 없어(unavailable) 보여 주지 않는다
export function usePermissionsGuide(auth: AuthStatus) {
  const checked = useRef(false);
  useEffect(() => {
    if (auth !== 'signedIn') {
      checked.current = false;
      return;
    }
    if (checked.current) return;
    checked.current = true;
    void permissionState('notification').then((s) => startPermissionsGuide(s === 'ask'));
  }, [auth]);
}
