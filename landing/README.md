# 달리모 소개 사이트 (landing)

앱 소개 · 약관 · 문의 페이지를 담은 정적 사이트다. 빌드 과정 없이 이 폴더를 그대로 올린다 (결정 로그 68항).

| 주소 | 파일 | 만드는 방법 |
| --- | --- | --- |
| `/` | `index.html` | 직접 고친다 |
| `/terms/` | `terms/index.html` | 스크립트가 만든다 |
| `/location-terms/` | `location-terms/index.html` | 스크립트가 만든다 |
| `/privacy/` | `privacy/index.html` | 스크립트가 만든다 (스토어 개인정보 처리방침 URL) |
| `/support/` | `support/index.html` | 스크립트가 만든다 (App Store 지원 URL) |

## 약관을 고칠 때

1. 앱 코드 `frontend/src/features/settings/legal/`의 본문을 고친다.
2. `frontend`에서 `npm run legal:web`을 실행한다.
3. 바뀐 `landing/` 파일을 같이 커밋한다.

`terms` · `location-terms` · `privacy` · `support`의 `index.html`은 직접 고치지 않는다. 다음에 스크립트를 돌리면 덮어쓴다.

## 올리는 방법

정적 호스팅 서비스에서 이 저장소를 연결하고 아래처럼 설정한다.

| 항목 | 값 |
| --- | --- |
| 루트 폴더 (Root directory) | `landing` |
| 빌드 명령 (Build command) | 없음 |
| 출력 폴더 (Output directory) | `.` (루트 폴더 그대로) |
| 브랜치 | `main` |

Cloudflare Pages · Vercel · Netlify 모두 이 설정으로 된다. `main`에 머지하면 자동으로 다시 올라간다.

## 스토어 주소가 생기면

`index.html`의 스토어 칸 두 곳(첫 화면 · 마지막 안내)을 바꾼다.

```html
<!-- 지금 -->
<div class="store" aria-disabled="true"><b>App Store</b><span>출시 준비 중</span></div>
<!-- 출시 뒤 -->
<a class="store" href="https://apps.apple.com/..."><b>App Store</b><span>내려받기</span></a>
```

## 화면 이미지

`assets/screens/*.webp`는 웹(mock)에서 찍은 앱 화면이다. 실기기 화면을 찍으면 같은 이름으로 바꾼다 (가로 540px).
