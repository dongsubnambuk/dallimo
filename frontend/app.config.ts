import type { ConfigContext, ExpoConfig } from 'expo/config';

// App Link · Universal Link (SHR-004): 공유 페이지 주소 https://{APP_LINK_DOMAIN}/s/{code}를 앱이 바로 연다.
// 도메인 · 앱 id는 배포 단계에서 정하므로 환경 변수로 받는다. 없으면 app.json 그대로 (dallimo:// 링크와 공유 페이지만).
// 서버는 같은 값으로 /.well-known/apple-app-site-association · assetlinks.json을 준다 (backend README "App Link").
export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.APP_LINK_DOMAIN;
  // Apple Watch 앱(targets/watch)은 휴대폰 앱 번들 id 뒤에 .watchkitapp을 붙이므로 번들 id가 늘 있어야 한다.
  // 배포 때 IOS_BUNDLE_ID로 바꾸고, 없으면 개발용 id를 쓴다 (결정 로그 48항)
  const iosBundle = process.env.IOS_BUNDLE_ID ?? 'com.dallimo.dev';
  const androidPackage = process.env.ANDROID_PACKAGE;
  // Xcode 서명 팀 (휴대폰 · 워치 타깃 모두). 없으면 Xcode에서 고른다
  const teamId = process.env.APPLE_TEAM_ID;
  const base = {
    ...(config as ExpoConfig),
    ios: { ...config.ios, bundleIdentifier: config.ios?.bundleIdentifier ?? iosBundle, ...(teamId ? { appleTeamId: teamId } : {}) },
  };
  if (!domain) return base;
  return {
    ...base,
    ios: { ...base.ios, bundleIdentifier: iosBundle, associatedDomains: [`applinks:${domain}`] },
    android: {
      ...base.android,
      ...(androidPackage ? { package: androidPackage } : {}),
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
