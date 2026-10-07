import { LEGAL_CONTACT } from '@legal/types';

// App Store 주소 (결정 로그 89항). null이면 "출시 준비 중"으로 보인다 (landing/README.md).
// App Store에만 낸다 (사용자 결정, 결정 로그 71항)
export const STORE: { ios: string | null } = {
  ios: 'https://apps.apple.com/kr/app/%EB%8B%AC%EB%A6%AC%EB%AA%A8/id6818753247',
};

// 연락은 이메일 대신 문의 페이지(/support/)의 문의 양식으로 받는다 (결정 로그 71항)
export const CONTACT = {
  operator: LEGAL_CONTACT.operator,
  supportPath: '/support/',
};

// 실제 앱 화면 (웹 mock을 393×852pt iPhone 화면으로 찍고 상태 표시줄을 합성, scripts는 landing/README.md)
export const SCREENS = {
  explore: { src: '/screens/explore.webp', alt: '탐색 화면. 지도 위에 수성못 둘레길 코스가 그려져 있고 1.9km, 11분, 이번 주 128명이 달렸다고 보인다.' },
  course: { src: '/screens/course.webp', alt: '코스 상세 화면. 거리 1.9km, 예상 11분, 난이도 쉬움, 오르막 9m와 내 최고 기록 10분 12초가 보인다.' },
  ranking: { src: '/screens/ranking.webp', alt: '코스 랭킹 화면. 이번 주 내 순위 18위와 앞뒤 러너 기록, 코스 크라운과 로컬 레전드가 보인다.' },
  run: { src: '/screens/run.webp', alt: '달리는 중 화면. 0.50킬로미터, 2분 41초, 평균 페이스 5분 24초, 구간 1 내 최고보다 15초 빠르다는 안내, 코스 진행 26%가 보인다.' },
  result: { src: '/screens/result.webp', alt: '러닝 결과 화면. PB 갱신, 코스 기록 10분 08초, 공식 기록 인증됨, 이번 주 순위 18위에서 14위로 올랐다고 보인다.' },
  live: { src: '/screens/live.webp', alt: '함께 달리기 중 화면. 5km 레이스에서 3명의 진행 거리와 페이스, 선두와 5초 차이가 보인다.' },
  room: { src: '/screens/room.webp', alt: '함께 달리기 대기실 화면. 5km 레이스 참가자 4명의 준비 상태와 준비 완료 버튼이 보인다.' },
  together: { src: '/screens/together.webp', alt: '함께 달리기 목록 화면. 예정된 5km 레이스와 30분 타임 어택 방이 보인다.' },
  activity: { src: '/screens/activity.webp', alt: '친구 활동 화면. 친구가 내 기록을 넘었다는 소식과 코스 크라운, 로컬 레전드 소식이 보인다.' },
} as const;

export type ScreenKey = keyof typeof SCREENS;

export const NAV = [
  { href: '/#course', label: '코스' },
  { href: '/#compete', label: '겨루기' },
  { href: '/#together', label: '함께 · 기기' },
  { href: '/#faq', label: '자주 묻는 질문' },
];

export const FAQ = [
  {
    q: '무료인가요?',
    a: '네. 코스 찾기, 기록, 랭킹, 함께 달리기까지 모두 무료예요. 데이터 통신 요금만 통신사 요금제에 따라 나가요.',
  },
  {
    q: '어떤 기기에서 쓸 수 있나요?',
    a: 'iPhone에서 쓸 수 있어요. Apple Watch는 손목에서 거리 · 시간 · 페이스를 보여 주고, 휴대폰 없이 워치만 차고 달려도 기록해요. 블루투스 심박 밴드도 연결할 수 있어요. Android 휴대폰은 아직 지원하지 않아요.',
  },
  {
    q: '우리 동네에 코스가 없으면요?',
    a: '자유 달리기로 기록하면 돼요. 달린 기록으로 코스를 직접 등록하면 다른 러너도 그 코스를 달리고 순위를 겨룰 수 있어요.',
  },
  {
    q: '기록이 순위에 안 올라가요.',
    a: '코스 경로를 따라 끝까지 달린 기록만 순위에 올라가요. GPS가 약하거나 경로를 벗어나면 기록은 남고 순위에는 들어가지 않아요.',
  },
  {
    q: '내 위치는 언제 쓰나요?',
    a: '달리기를 기록하는 동안과 주변 코스를 찾을 때만 써요. 함께 달리기에서도 다른 사람에게 위치를 보내지 않고 거리와 순위만 보여 줘요. 기록을 공유하면 출발 · 도착 200m는 지도에서 가려요. 심박은 따로 동의한 경우에만 저장해요.',
  },
  {
    q: '탈퇴하면 기록은 어떻게 되나요?',
    a: '설정 > 계정 > 탈퇴하기에서 바로 탈퇴할 수 있어요. 계정 정보는 바로 지우고, 다른 러너의 순위가 깨지지 않도록 기록은 누구의 것인지 알 수 없게 바꿔 남겨요.',
  },
];
