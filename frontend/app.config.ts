import type { ConfigContext, ExpoConfig } from 'expo/config';

// App Link · Universal Link (SHR-004): 공유 페이지 주소 https://{APP_LINK_DOMAIN}/s/{code}를 앱이 바로 연다.
// 도메인 · 앱 id는 배포 단계에서 정하므로 환경 변수로 받는다. 없으면 app.json 그대로 (dallimo:// 링크와 공유 페이지만).
// 서버는 같은 값으로 /.well-known/apple-app-site-association · assetlinks.json을 준다 (backend README "App Link").
export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.APP_LINK_DOMAIN;
  // 앱 id (결정 로그 63항). 개발 · 배포 빌드가 같은 id를 쓴다. 환경 변수로 바꿀 수 있다.
  // Apple Watch 앱(targets/watch)은 휴대폰 앱 번들 id 뒤에 .watchkitapp을 붙인다. 바꾸면 app.json의 appExtensions도 같이 바꾼다
  const iosBundle = process.env.IOS_BUNDLE_ID ?? 'com.dongseopseo.dallimo';
  const androidPackage = process.env.ANDROID_PACKAGE ?? 'com.dongseopseo.dallimo';
  // Xcode 서명 팀 (휴대폰 · 워치 타깃 모두)
  const teamId = process.env.APPLE_TEAM_ID ?? 'Q336TS439T';
  const base = {
    ...(config as ExpoConfig),
    ios: { ...config.ios, bundleIdentifier: iosBundle, appleTeamId: teamId },
    android: { ...config.android, package: androidPackage },
  };
  if (!domain) return base;
  return {
    ...base,
    ios: { ...base.ios, associatedDomains: [`applinks:${domain}`] },
    android: {
      ...base.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: domain, pathPrefix: '/s/' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
