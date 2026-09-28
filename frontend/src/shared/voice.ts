import * as Speech from 'expo-speech';

// 69장: Course deviation은 경고 햅틱 + 음성. 러닝 중 화면을 보지 않아도 상태 변화를 알 수 있게 한다 (62.2장).
// 음성 켜고 끄기는 설정 화면(SCR-M07 "음성", 72장 13번)에서 붙인다. 그 전까지 앱을 켜 둔 동안만 기억한다.
let enabled = true;

export function setVoiceEnabled(value: boolean) {
  enabled = value;
  if (!value) Speech.stop();
}

export function speak(text: string) {
  if (!enabled) return;
  try {
    // 앞 안내가 끝나지 않았으면 끊고 새 안내를 읽는다 (상태가 바뀐 최신 안내가 중요)
    Speech.stop();
    Speech.speak(text, { language: 'ko-KR' });
  } catch {
    // 음성 합성을 지원하지 않는 환경
  }
}
