import { useEffect } from 'react';
import { AppState } from 'react-native';

import { watchTransport } from '@/shared/watch/watchTransport';

import { importWatchRuns } from './watchRunImport';

// 워치 단독 기록을 받는 때 (결정 로그 81항): 로그인한 뒤 탭이 뜰 때 · 앱으로 돌아올 때 · 워치가 새 기록을 보냈을 때.
// 워치는 휴대폰이 꺼져 있거나 멀리 있으면 파일을 쥐고 있다가 다시 연결되면 보낸다. 받은 파일은 앱이 켜질 때까지 편지함에 남는다
export function useWatchRunImport() {
  useEffect(() => {
    void importWatchRuns();
    const offMessage = watchTransport.onMessage((m) => {
      if (m.t === 'watchRun') void importWatchRuns();
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void importWatchRuns();
    });
    return () => {
      offMessage();
      sub.remove();
    };
  }, []);
}
