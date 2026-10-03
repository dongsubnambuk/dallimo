import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

// OTA 업데이트 (EAS Update, 결정 로그 78항). 앱을 처음 켤 때는 expo-updates가 스스로 확인한다(app.json checkAutomatically ON_LOAD).
// iOS 앱은 며칠씩 메모리에 남아 있어서, 다시 앞으로 올 때도 확인해 미리 받아 둔다. 적용은 다음에 앱을 새로 켤 때 한다
// (달리는 중에 앱을 다시 시작하지 않도록 바로 reloadAsync 하지 않는다)

const CHECK_EVERY_MS = 60 * 60 * 1000;

export function useOtaUpdates() {
  useEffect(() => {
    // 개발 서버에서 띄운 앱 · 웹 · 업데이트를 끈 빌드에서는 하지 않는다
    if (__DEV__ || !Updates.isEnabled) return;
    let last = Date.now();
    let busy = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || busy || Date.now() - last < CHECK_EVERY_MS) return;
      last = Date.now();
      busy = true;
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {
          // 연결이 없거나 서버가 응답하지 않으면 다음에 다시 확인한다
        })
        .finally(() => {
          busy = false;
        });
    });
    return () => sub.remove();
  }, []);
}
