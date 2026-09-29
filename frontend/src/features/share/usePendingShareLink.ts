import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';

import type { AuthStatus } from '@/features/auth/session';

// 로그인하지 않은 사람이 공유 · 초대 링크를 열면 로그인 화면만 보인다(Stack.Protected).
// 링크의 share_code를 기억해 두었다가 로그인(가입)하면 그 링크를 이어서 연다.
let pendingCode: string | null = null;
// 로그인 화면을 거쳤는가. 이미 로그인된 채로 링크를 열면 라우터가 바로 그 화면을 연다
let sawSignedOut = false;

/** dallimo://share/{code} · https://…/share/{code} 에서 code */
export function shareCodeOf(url: string | null): string | null {
  if (!url) return null;
  const { hostname, path } = Linking.parse(url);
  const full = [hostname, path].filter(Boolean).join('/');
  const m = /(?:^|\/)share\/([a-z0-9]{4,32})\/?$/.exec(full);
  return m ? m[1] : null;
}

export function usePendingShareLink(auth: AuthStatus) {
  const url = Linking.useURL();

  // 세션 확인 중 · 로그아웃 상태에서 연 링크를 기억한다 (로그인 화면으로 바뀌기 전 주소)
  useEffect(() => {
    if (auth === 'signedIn') return;
    const code = shareCodeOf(url);
    if (code) pendingCode = code;
  }, [auth, url]);

  useEffect(() => {
    if (auth === 'signedOut') sawSignedOut = true;
    // 이미 로그인된 채로 링크를 열었으면 라우터가 그 화면을 바로 연다. 기억할 필요가 없다
    if (auth === 'signedIn' && !sawSignedOut) pendingCode = null;
  }, [auth]);
}

/** 로그인 화면을 거쳐 들어왔을 때만 한 번 꺼낸다 */
export function takePendingShareCode(): string | null {
  const code = sawSignedOut ? pendingCode : null;
  pendingCode = null;
  sawSignedOut = false;
  return code;
}

/** 탭 화면에서: 로그인 전에 연 공유 · 초대 링크가 있으면 이어서 연다 */
export function useOpenPendingShareLink() {
  useEffect(() => {
    const code = takePendingShareCode();
    if (code) router.push({ pathname: '/share/[code]', params: { code } });
  }, []);
}
