# 달리모 소개 사이트 (landing)

출시용 소개 사이트다. React + Vite + Tailwind CSS + motion으로 만들고, 빌드 때 페이지를 HTML로 미리 그려 정적 호스팅에 올린다 (결정 로그 68항). 디자인 규칙은 `design-system.md`.

| 주소 | 내용 |
| --- | --- |
| `/` | 랜딩 |
| `/privacy/` | 개인정보 처리방침 (스토어 개인정보 처리방침 URL) |
| `/terms/` | 서비스 이용약관 |
| `/location-terms/` | 위치기반서비스 이용약관 |
| `/support/` | 문의 (App Store 지원 URL) |
| `404.html` | 없는 주소 |

## 실행

```bash
cd landing
npm install
npm run dev        # 개발 서버 (Pretendard 대신 기본 글꼴로 보인다)
npm run build      # 타입 확인 → 빌드 → 미리 그리기 → 글꼴 줄이기. 결과는 dist/
npm run preview    # dist 확인
```

`npm run build`는 세 가지를 한다.

1. `vite build`로 페이지마다 HTML을 만든다.
2. `scripts/prerender.mjs`가 각 HTML에 화면을 미리 그려 넣는다. 자바스크립트가 오기 전에도 글과 화면이 보이고 검색 엔진이 읽는다.
3. 같은 스크립트가 Pretendard Variable에서 사이트에 나오는 글자만 남긴 글꼴 `dist/fonts/pretendard-site.woff2`를 만든다.

## 올리기 (정적 호스팅)

지금은 Netlify에 올려 `https://dallimo-landing.kro.kr`로 연다. 설정은 저장소 루트 `netlify.toml`에 있다(결정 로그 71항).

| 항목 | 값 |
| --- | --- |
| 루트 폴더 (Root directory) | `landing` |
| 빌드 명령 (Build command) | `npm run build` |
| 출력 폴더 (Output directory) | `dist` |
| Node | 20 이상 |
| 환경 변수 | `SITE_URL` = `https://dallimo-landing.kro.kr` (`netlify.toml`에 넣었다) |

- `SITE_URL`을 넣으면 canonical · og:url · og:image · `sitemap.xml`이 들어간다. 주소를 바꾸면 `netlify.toml`과 `LEGAL_CONTACT.support`(약관 속 문의 페이지 주소)를 같이 바꾼다.

### 문의 양식 (Netlify Forms)

`/support/`의 문의 양식은 Netlify Forms로 받는다. 이메일 주소를 공개하지 않는다(결정 로그 71항).

1. Netlify 사이트 설정 > Forms에서 **Enable form detection**을 켠다. 켠 뒤 한 번 다시 배포해야 `support` 양식이 잡힌다.
2. Forms > Form notifications에서 **Email notification**을 추가해 문의가 올 때 받을 메일을 넣는다. 이 메일은 사이트에 나오지 않는다.
3. 받은 문의는 Forms > `support`에서 본다. 답장은 적힌 이메일로 직접 보낸다. 처리 완료 후 1년이 지나면 지운다(개인정보 처리방침 3 · 6항).

- 양식 칸: 문의 종류(`topic`), 답변 받을 이메일(`email`), 내용(`message`), 수집 동의(`consent`). `bot-field`는 스팸 거름 칸이다.
- 미리 그린 `dist/support/index.html`에 `data-netlify="true"` 양식이 있어야 Netlify가 찾는다. 양식 칸을 바꾸면 빌드 결과에서 확인한다.
- 약관 본문은 앱 코드(`frontend/src/features/settings/legal`)에서 읽는다. 루트 폴더 밖 파일을 읽으므로 Vercel은 "Include files outside the root directory"를 켠다(기본값).

## 고칠 곳

| 무엇 | 어디 |
| --- | --- |
| App Store 주소 (출시 뒤) | `src/content.ts`의 `STORE.ios`. 넣으면 "출시 준비 중" 칸이 내려받기 버튼으로 바뀐다. App Store에만 낸다(결정 로그 71항) |
| 운영 주체 · 문의 페이지 주소 | 앱 코드 `frontend/src/features/settings/legal/types.ts`의 `LEGAL_CONTACT` (앱과 같이 바뀐다) |
| 약관 본문 | 앱 코드 `frontend/src/features/settings/legal/*.ts`. 따로 고칠 것 없다 |
| 자주 묻는 질문 · 메뉴 | `src/content.ts` |

## 화면 다시 찍기

`public/screens/*.webp`는 앱을 iPhone 15 Pro 크기(393×852pt, 3배)와 안전 영역으로 띄워 찍은 실제 앱 화면에 상태 표시줄 · 홈 막대를 그린 것이다. 지금은 mock 데이터(수성못 둘레길 등)로 찍었다.

```bash
# 1. 앱을 mock 모드 웹으로 띄운다
cd frontend && EXPO_PUBLIC_API_URL= npx expo start --web
# 2. 찍는다 (playwright가 있는 환경)
cd landing && node scripts/capture-screens.mjs /tmp/raw
# 3. 상태 표시줄을 그리고 public/screens에 저장한다
python3 scripts/statusbar.py /tmp/raw explore:explore course:course ranking:ranking together:together room:room live:live result:result activity:activity run:run interval:interval
```

실기기에서 찍은 화면으로 바꿀 때는 같은 비율(1179×2556)인지 확인하고 같은 이름으로 780px · 480px(`-480`) webp 두 개를 넣는다. 실기기 화면에는 상태 표시줄이 이미 있어 `statusbar.py`는 쓰지 않는다.
