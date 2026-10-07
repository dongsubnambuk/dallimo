// 잠금 화면 · 다이내믹 아일랜드 라이브 액티비티 (ActivityKit, 결정 로그 83항). `npx expo prebuild`가 위젯 확장 타깃을 만든다.
// 달리는 동안 거리 · 시간 · 페이스 · 모드별 한 줄, 함께 달리기면 참가자 진행 상황을 보여 준다.
// 휴대폰 앱 쪽은 modules/dallimo-live-activity (같은 DallimoRunAttributes를 둔다)
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'DallimoLiveActivityWidget',
  displayName: '달리모 러닝',
  // 휴대폰 앱 번들 id 뒤에 붙는다 (com.dongseopseo.dallimo.liveactivity, app.json appExtensions와 같게)
  bundleIdentifier: '.liveactivity',
  // 다이내믹 아일랜드 · ActivityContent API
  deploymentTarget: '16.2',
  colors: {
    $accent: '#2BF0C0',
    $widgetBackground: '#0B0B0C',
  },
  frameworks: ['WidgetKit', 'SwiftUI', 'ActivityKit'],
};
