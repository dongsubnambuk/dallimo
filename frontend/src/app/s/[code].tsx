import { useLocalSearchParams } from 'expo-router';

import { ShareLinkScreen } from '@/features/share/ShareLinkScreen';

// App Link (SHR-004): 앱이 깔려 있으면 공유 페이지 주소 https://{공유 도메인}/s/{code}가 브라우저 대신 여기로 온다
export default function AppLinkShareRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <ShareLinkScreen code={code} />;
}
