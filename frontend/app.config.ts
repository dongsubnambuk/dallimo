import type { ConfigContext, ExpoConfig } from 'expo/config';

// App Link · Universal Link (SHR-004): 공유 페이지 주소 https://{APP_LINK_DOMAIN}/s/{code}를 앱이 바로 연다.
// 도메인 · 앱 id는 배포 단계에서 정하므로 환경 변수로 받는다. 없으면 app.json 그대로 (dallimo:// 링크와 공유 페이지만).
// 서버는 같은 값으로 /.well-known/apple-app-site-association · assetlinks.json을 준다 (backend README "App Link").
export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.APP_LINK_DOMAIN;
  const iosBundle = process.env.IOS_BUNDLE_ID;
  const androidPackage = process.env.ANDROID_PACKAGE;
  const base = config as ExpoConfig;
  if (!domain) return base;
  return {
    ...base,
    ios: { ...base.ios, ...(iosBundle ? { bundleIdentifier: iosBundle } : {}), associatedDomains: [`applinks:${domain}`] },
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
