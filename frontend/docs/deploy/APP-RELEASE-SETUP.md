# 앱 출시 준비: 등록 · 빌드 설정 (Codex 작업 문서)

앱을 실제 서버에 붙여 스토어 빌드를 만들기 위해 남은 등록과 설정이다.

**App Store에만 낸다 (사용자 결정, 결정 로그 71항).** Google Play 등록, Firebase · FCM(Android Push), Android 서명 키 · App Link 값은 하지 않는다. 아래 Android 항목은 Google Play에 낼 때를 위해 남겨 둔다.
기능 코드는 다 되어 있다. 여기 적힌 것은 계정 · 키 · 빌드 설정뿐이다.
서버 쪽 설정은 `backend/README.md` "배포 환경변수" · `backend/dallimo-server/.env.example`에 있다.

## 0. 먼저 읽을 것 · 지킬 것

- 저장소 규칙 `CLAUDE.md`, 앱 규칙 `frontend/CLAUDE.md`, Expo 규칙 `frontend/AGENTS.md`를 먼저 읽는다.
- Expo SDK는 57이다. Expo · EAS 명령과 설정은 기억으로 쓰지 말고 `https://docs.expo.dev/versions/v57.0.0/` 문서를 확인한다(AGENTS.md).
- `ios/` · `android/` 폴더를 만들거나 고치지 않는다. 네이티브 설정은 `app.json` · `app.config.ts` · 설정 플러그인으로만 한다.
- 비밀 값(API 키 · 인증서 · `google-services.json` 원본 등)은 저장소에 올리지 않는다. EAS 환경변수 · EAS 파일 변수 · EAS credentials에 넣는다.
- 브랜치는 `main`에서 만든다. 이 작업은 `feat/` 또는 `docs/` prefix. PR 제목 · 본문은 한국어.
- 명세 · UI 문서에 없는 화면이나 기능을 새로 넣지 않는다.

## 1. 사람이 직접 해야 하는 것 (계정 로그인 · 결제)

Codex는 아래가 끝났는지 사용자에게 확인하고, 안 된 것은 사용자에게 요청한다.

| 할 일 | 어디서 | 결과로 받는 값 |
| --- | --- | --- |
| Apple Developer Program 가입 (유료) | developer.apple.com | Apple 팀 ID (10자리) |
| App Store Connect에 앱 등록 | appstoreconnect.apple.com | iOS 번들 ID `com.dongseopseo.dallimo` (팀 `Q336TS439T`) |
| Expo 계정 로그인 | `npx eas-cli@latest login` | Expo 계정 이름 |
| ~~Google Play Console 가입 · 앱 등록~~ (하지 않음) | play.google.com/console | Android 패키지 이름 `com.dongseopseo.dallimo` |
| ~~Firebase 프로젝트 · Android 앱 등록~~ (하지 않음) | console.firebase.google.com | `google-services.json`, FCM V1 서비스 계정 키(JSON) |
| 서버 공개 도메인 | 사용자 인프라 | 예: `dallimo.app` (서버 `https://dallimo.app`) |

## 2. Codex 작업

### 2.1 EAS 프로젝트 연결

- `cd frontend && npx eas-cli@latest init`을 실행한다(사용자 로그인 필요).
- `app.json`에 `expo.extra.eas.projectId`와 `expo.owner`가 생긴다. 이 변경은 커밋한다.
- 왜: `src/shared/notifications/notifier.ts`가 이 `projectId`로 Expo Push 토큰을 받는다. 없으면 토큰을 받지 않아 Push가 오지 않는다.

### 2.2 빌드 환경변수

`app.config.ts`와 앱 코드가 읽는 값이다. production 빌드에 모두 들어가야 한다.
서버 주소처럼 비밀이 아닌 값은 `eas.json`의 `build.production.env`에 넣어도 되고, EAS 환경변수(`eas env:create`)로 넣어도 된다. 어느 쪽이든 한 곳으로 정해 문서에 적는다.

| 이름 | 값 | 읽는 곳 | 없으면 |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | 서버 주소. 반드시 `https://`. **`eas.json` production에 `https://dallimo.gamjabox.cloud`로 넣었다** | `src/shared/api/config.ts` | 앱이 서버 없이 mock 데이터로만 돈다 |
| `IOS_BUNDLE_ID` | App Store Connect의 번들 ID. **기본값 `com.dongseopseo.dallimo`(`app.config.ts`)** | `app.config.ts` | 기본값으로 빌드된다 |
| `APPLE_TEAM_ID` | Apple 팀 ID. **기본값 `Q336TS439T`(`app.config.ts`)** | `app.config.ts` (휴대폰 · 워치 서명) | 기본값으로 빌드된다 |
| `ANDROID_PACKAGE` | Play Console 패키지 이름. **기본값 `com.dongseopseo.dallimo`(`app.config.ts`)** | `app.config.ts` | 기본값으로 빌드된다 |
| `APP_LINK_DOMAIN` | 서버 도메인만(`https://` 없이). **`eas.json` production에 `dallimo.gamjabox.cloud`로 넣었다** | `app.config.ts` | 공유 링크 `https://{도메인}/s/{code}`를 눌러도 앱이 바로 열리지 않는다 |

- 실시간 연결 주소는 `EXPO_PUBLIC_API_URL`에서 만든다(`https` → `wss`, `/ws`). 따로 넣을 값은 없다.
- `development` · `gps-poc` 프로필은 지금처럼 둔다. 개발(`npx expo start`)은 `frontend/.env.development`의 배포 서버에 붙는다. 다른 서버나 mock은 `frontend/.env.local`의 `EXPO_PUBLIC_API_URL`로 바꾼다(`.env.example` 참고).

### 2.3 Android Push (FCM) — 하지 않음 (App Store만 낸다)

- Expo Push는 Android에서 FCM을 거친다. SDK 57 문서("Push notifications setup", "FCM credentials")를 확인해 아래를 한다.
  - `google-services.json`을 앱 설정(`android.googleServicesFile`)에 연결한다. 파일 원본은 커밋하지 않고 EAS 파일 환경변수로 넣는다.
  - FCM V1 서비스 계정 키를 `npx eas-cli@latest credentials`로 EAS에 올린다(사용자 로그인 필요).
- 확인: 실기기 개발 빌드에서 알림 권한을 허용하면 서버 `tbl_push_token`에 토큰이 생긴다.

### 2.4 iOS 서명 · 권한

- 첫 `eas build --platform ios` 때 EAS가 인증서 · 프로비저닝 · APNs 키를 만든다(사용자 로그인 필요).
- App ID에 HealthKit이 켜져 있어야 한다(`app.json` `ios.entitlements`에 이미 있다). EAS가 capability를 맞추는지 빌드 로그로 확인한다.
- Apple Watch 앱(`targets/watch`, `@bacons/apple-targets`)의 번들 ID는 `{IOS_BUNDLE_ID}.watchkitapp`이다. 이 번들 ID도 등록 · 서명되어야 한다. EAS가 워치 타깃 서명을 어떻게 다루는지 문서로 확인하고, 필요하면 사용자에게 Apple Developer에서 등록을 요청한다.
- 확인: production 빌드가 TestFlight에 올라가고, 휴대폰 앱 · 워치 앱이 함께 설치된다.

### 2.5 이용약관 · 위치기반서비스 이용약관 · 개인정보 처리방침 본문

- 본문은 `src/features/settings/legal/`(terms.ts · location.ts · privacy.ts)에 있고 `LegalScreen`이 보여 준다(결정 로그 66 · 67항).
- 운영 주체는 "달리모 운영팀"이다. 개인정보 보호책임자 · 위치정보관리책임자도 운영팀이다(결정 로그 67항).
- 연락처는 이메일 대신 소개 사이트 문의 페이지(`LEGAL_CONTACT.support` = `https://dallimo-landing.kro.kr/support/`)의 문의 양식이다(사용자 결정, 결정 로그 71항). 양식 설정은 `landing/README.md`.
- 본문 내용을 Codex가 바꾸지 않는다. 기능이 바뀌어 처리하는 정보가 달라지면 사용자에게 알린다.
- 소개 사이트(`landing/`)의 약관 페이지는 이 본문을 빌드 때 그대로 읽는다. 따로 고칠 것 없다(결정 로그 68항).
- App Store Connect에 넣는 URL은 소개 사이트 주소다.
  - 개인정보 처리방침 URL: `https://dallimo-landing.kro.kr/privacy/`
  - 지원 URL: `https://dallimo-landing.kro.kr/support/` (문의 양식이 있어 App Store 심사 지침 1.5의 연락 수단이 된다)
  - 마케팅 URL: `https://dallimo-landing.kro.kr/`

### 2.6 OTA 업데이트 (EAS Update, 결정 로그 78항)

JS · 화면만 고친 것은 스토어 심사 없이 바로 내보낸다. 앱이 켜질 때(또는 1시간 넘게 뒤로 갔다가 다시 앞으로 올 때) 새 업데이트를 받아 두고, **다음에 앱을 새로 켤 때** 바뀐다.

```bash
cd frontend
npx eas-cli@latest update --channel production --environment production --message "무엇을 고쳤는지"
```

- `expo-updates`가 들어간 빌드부터 받는다. 그 전에 올린 빌드에는 OTA가 오지 않으니 한 번은 새로 빌드해 올린다.
- production 빌드는 `production` 채널, 개발 빌드는 `development` 채널을 본다(`eas.json`).
- 서버 주소는 `frontend/.env.production`에서 읽는다. `eas update`는 `eas.json` build 프로필의 `env`를 읽지 않기 때문이다. 이 파일이 없으면 업데이트한 앱이 서버 없이 mock으로 돈다.
- **OTA로 못 내는 것** — 아래가 바뀌면 `app.json`의 `version`을 올리고(예: 1.0.0 → 1.0.1) 스토어 빌드를 새로 올린다. `runtimeVersion`이 `version`을 따라가서(`policy: appVersion`) 예전 앱에는 새 JS가 가지 않는다.
  - 새 네이티브 패키지 설치(`npx expo install`로 네이티브 코드가 있는 패키지), Expo SDK 올리기
  - `app.json` · `app.config.ts`의 네이티브 설정(권한 문구 · 플러그인 · entitlements · 아이콘 · 스플래시)
  - `modules/`(Swift) · `targets/watch`(워치 앱)
- 잘못 내보냈으면 `npx eas-cli@latest update:rollback`으로 이전 업데이트로 돌린다.

### 2.7 강제 업데이트 (결정 로그 79항)

설치된 앱 버전이 서버의 최소 버전보다 낮으면 앱을 켤 때 "업데이트가 필요해요" 화면이 모든 화면을 가리고 App Store로 보낸다.

1. 새 스토어 빌드(`app.json` `version`을 올린 것)가 App Store에 출시된 뒤에
2. 서버 환경변수 `APP_MIN_VERSION_IOS`를 그 버전으로, `APP_STORE_URL_IOS`를 `https://apps.apple.com/app/id{Apple ID}`로 넣고 서버를 다시 띄운다 (`backend/README.md` "앱 버전").

- 앱 버전은 설치된 스토어 빌드의 버전(`expo-application`)이다. OTA로는 바뀌지 않는다.
- `expo-application`이 들어간 빌드부터 동작한다.
- 앱을 새로 켤 때만 확인한다. 달리는 중에 화면이 가려지지 않게 하려는 것이다.

## 3. 서버와 반드시 같게 맞출 값

앱 값과 서버 환경변수가 다르면 공유 링크가 앱을 열지 못한다. 사용자에게 서버 쪽 값도 같이 넣도록 알린다.

| 앱 (빌드) | 서버 (환경변수) | 예 |
| --- | --- | --- |
| `APP_LINK_DOMAIN` | `SHARE_PUBLIC_BASE_URL` | `dallimo.gamjabox.cloud` ↔ `https://dallimo.gamjabox.cloud` (둘 다 넣었다) |
| `APPLE_TEAM_ID` + `IOS_BUNDLE_ID` | `APP_LINK_IOS_APP_IDS` | `Q336TS439T` + `com.dongseopseo.dallimo` ↔ `Q336TS439T.com.dongseopseo.dallimo` (둘 다 넣었다) |
| `ANDROID_PACKAGE` | `APP_LINK_ANDROID_PACKAGE` | `com.dongseopseo.dallimo` (둘 다 넣었다) |
| Play Console 앱 서명 키 SHA-256 | `APP_LINK_ANDROID_SHA256` | `AA:BB:…` |
| `EXPO_PUBLIC_API_URL` | 서버 공개 주소 | `https://dallimo.gamjabox.cloud` |

서버는 이 값으로 `/.well-known/apple-app-site-association` · `/.well-known/assetlinks.json`을 준다.

## 4. 끝났는지 확인

- [ ] `app.json`에 `extra.eas.projectId`가 있다
- [ ] production 빌드 설정에 2.2의 다섯 값이 모두 있다
- [ ] `npx tsc --noEmit` · `npx expo lint` 통과
- [ ] production 빌드 앱이 실제 서버로 로그인된다(mock 계정 `runner@dallimo.app`으로는 로그인되지 않아야 한다)
- [ ] 실기기에서 Push 토큰이 서버에 등록된다 (iOS)
- [ ] 공유 링크 `https://{도메인}/s/{code}`를 누르면 앱이 열린다 (iOS)
- [ ] 워치 앱이 함께 설치된다
- [ ] 약관 · 개인정보 처리방침 본문이 들어갔다(사용자가 본문을 준 경우)
