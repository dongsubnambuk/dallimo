// WATCH-001~004 Apple Watch 달리모 앱 (@bacons/apple-targets). `npx expo prebuild`가 Xcode 워치 타깃을 만든다.
// 휴대폰이 기록하고 워치는 보여 주기 · 조작 · 심박을 맡는다 (결정 로그 48항). 휴대폰 쪽은 modules/dallimo-watch
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'DallimoWatch',
  displayName: '달리모',
  // 휴대폰 앱 번들 id 뒤에 붙는다 (com.dongseopseo.dallimo.watchkitapp, app.json appExtensions와 같게)
  bundleIdentifier: '.watchkitapp',
  deploymentTarget: '10.0',
  icon: '../../assets/images/icon.png',
  colors: {
    $accent: '#2BF0C0',
  },
  frameworks: ['HealthKit', 'WatchConnectivity'],
  entitlements: {
    'com.apple.developer.healthkit': true,
  },
};
