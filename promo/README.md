# 달리모 홍보 영상 (promo)

인스타그램 릴스용 30초 세로 영상이다. Remotion(React로 영상을 만드는 라이브러리)으로 만든다 (결정 로그 69항).

- 규격: 1080×1920, 30fps, 900프레임(30초), H.264 · yuv420p · bt709, AAC 스테레오
- 음악: "Rising Forest" Diego Nava ([Mixkit](https://mixkit.co/free-stock-music/)). Mixkit Stock Music Free License로 소셜 미디어 영상 · 온라인 광고에 무료로 쓸 수 있고 저작권 표시는 필요 없다. CD · DVD, TV · 라디오 방송, 게임에는 쓸 수 없고 곡만 따로 리믹스하거나 배포할 수 없다. 저작권 신고(claim)가 오면 team@mixkit.co로 알린다
- 처음 버전 음악 "Shiny Tech" Kevin MacLeod (incompetech.com, CC BY 4.0)로 만든 영상도 `npm run render:shiny-tech`로 다시 만들 수 있다. 이 곡은 저작권 표시가 필요해서 끝 장면에 작게 넣었고, 그 영상을 올리면 인스타그램 설명에 아래 문구를 붙인다
- 화면: 랜딩과 같은 실제 앱 캡처(`landing/public/screens`)와 같은 iPhone 틀 · 민트 경로 선 · Pretendard

### Shiny Tech 버전을 올릴 때 설명에 붙일 문구

```
Music: "Shiny Tech" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

## 장면

| 시간 | 장면 | 문구 |
| --- | --- | --- |
| 0:00 | 시작 | 오늘 저녁, 어디 달리지? |
| 0:02.5 | 탐색 | 내 주변 코스를 지도에서 바로 |
| 0:06.4 | 코스 상세 | 달리기 전에 알아야 할 것만 (거리 · 오르막 · 내 PB) |
| 0:10.3 | 달리는 중 | 달리는 중엔 숫자 세 개만 (0.50km, 음성 안내, 화면 꺼도 기록) |
| 0:14.1 | 결과 | 멈추는 순간 공식 기록으로 (인증, PB 10:12 → 10:08) |
| 0:18 | 랭킹 | 코스마다 순위가 있어요 (18위 → 14위, 코스 크라운) |
| 0:21.9 | 함께 달리기 | 장소가 달라도 같은 시간에 출발 (위치 대신 거리 · 페이스) |
| 0:25.7 | 끝 | 달리모 · 코스를 찾고, 같이 달리고, 기록을 깨다. · 곧 App Store 출시 (0:26.7) |

릴스 화면의 위 220px · 아래 420px에는 인스타그램 버튼 · 설명이 겹쳐서 중요한 글을 두지 않았다.

## 만들기

```bash
cd promo
npm install
npm run studio     # 브라우저에서 미리 보기 · 수정
npm run render     # out/dallimo-promo.mp4 (Rising Forest)
npm run render:shiny-tech  # out/dallimo-promo-shiny-tech.mp4 (Shiny Tech)
npm run render:15s # out/dallimo-promo-15s.mp4 (15초 광고, Rising Forest)
npm run cover      # out/dallimo-promo-cover.png (릴스 커버)
```

- `npm run assets`가 앱 화면 · 아이콘 · 글꼴을 `public/`으로 복사하고 배경 음악을 Mixkit · incompetech에서 받는다(`public/music/`, 커밋하지 않는다). 앱 화면을 다시 찍으면 영상도 다시 만들면 된다.
- 장면 전환은 음악 마디에 맞춘다(`src/timeline.ts`). 시간은 Rising Forest 기준이다.
  - Rising Forest(123.99BPM, 한 마디 1.936초): 저음이 빠진 브레이크다운이 영상 시작이고, 킥 · 베이스가 들어오는 순간(46.447초)이 영상 2.5초에 온다. 두 마디(3.87초)마다 장면이 바뀌고, 곡의 다음 프레이즈가 시작되는 8번째 마디에 결과 → 랭킹 전환이 온다. 출시 안내는 12번째 마디 셋째 박(0:26.7)에 나온다.
  - Shiny Tech(137.69BPM): 드롭(6.957초)이 영상 2.5초에 오고 두 마디(약 3.5초)마다 장면이 바뀐다. 출시 안내는 14번째 마디 첫 박에 나온다.
- 장면 안 칩과 PB 갱신 칩은 음악 박에 맞춰 튀어나온다(`src/beat.tsx`의 `useOnBeat`). 장면에 적은 프레임을 가장 가까운 박으로 옮긴다.
- 컷마다 전환이 다르다(`src/Promo.tsx`의 `CUTS`, 길이는 `src/timeline.ts`의 `TRANSITIONS`). 모두 CSS로 그린다. WebGL 전환(zoomBlur · crossZoom 등)은 렌더 환경에 따라 깨질 수 있어 쓰지 않는다.

  | 컷 | 전환 | 길이 |
  | --- | --- | --- |
  | 시작 → 탐색 (드롭) | `pushCut` 민트 빛 펀치 줌 | 8프레임 |
  | 탐색 → 코스 상세 | `iris` 원형으로 열기 | 12프레임 |
  | 코스 상세 → 달리는 중 | `whip` 위로 휙 넘기며 흐리기 (`src/whip.tsx`) | 10프레임 |
  | 달리는 중 → 결과 | `clockWipe` 스톱워치처럼 돌며 지우기 | 14프레임 |
  | 결과 → 랭킹 (곡의 다음 흐름) | `flip` 카드 뒤집기 | 14프레임 |
  | 랭킹 → 함께 달리기 | `wipe` 비스듬히 쓸기 | 12프레임 |
  | 함께 달리기 → 끝 | `fade` | 16프레임 |

- 휴대폰이 들어오는 방식도 장면마다 다르다(`src/Scenes.tsx`의 `ScenePhone` `enter`): 탐색 올라오기, 코스 상세 확대, 달리는 중 3D로 기울며 올라오기, 결과 위에서 떨어져 튕기기, 랭킹 오른쪽에서, 함께 달리기 양옆에서.
- 15초 광고(`src/Promo15.tsx`)는 기능을 늘어놓지 않고 이야기 하나로 간다. 주인공은 휴대폰 앱이고 워치는 달리는 장면 옆에 작게만 나온다.
  - 0~2.5초: 알림 "민수님이 수성못 둘레길에서 9:58로 내 기록 10:12을 넘었어요" → "…그냥 둘 수 없지."
  - 2.5초(드롭): "다시, 수성못으로." 달리는 중 화면 + 손목 워치
  - 4.4초: "민수 9:58"을 긋고 "9:51 되찾았다."
  - 6.4초: "이번엔 민수 차례." 같은 알림이 민수에게
  - 8.3초: "다음엔 같이 붙자." 함께 달리기 레이스 화면 + 손목 워치
  - 10.2초부터 끝: 앱 아이콘 · 달리모 · 부제, 5마디 첫 박에 "곧 App Store 출시"
  - 알림 문구는 서버 `RecordBeatenNotifier`와 같다. 워치 숫자는 옆 휴대폰 화면과 맞춘다.
- Chrome이 없거나 headless shell을 써야 하면 `REMOTION_BROWSER=/path/to/headless_shell`을 붙인다.

## App Store 스크린샷

```bash
npm run store      # out/store/01.png ~ 08.png (6.9형 1320×2868), out/store/watch/01.png ~ 05.png (Apple Watch 410×502)
```

- 영상과 같은 휴대폰 틀 · 색 · 글꼴로 정지 화면을 만든다(`src/Store.tsx`). 1장 서비스 소개는 `StoreBrand`, 2~8장 문구 · 바탕 · 아이콘 · 크게 띄울 영역은 `STORE_SHOTS`. 올리는 순서와 글은 `docs/store/APP-STORE.md`.
- 화면은 원본 크기(1179×2556) 캡처에 상태 표시줄을 그린 `assets/store-screens/*.webp`다. 다시 찍으면 `landing/README.md` "화면 다시 찍기"의 캡처 뒤 아래처럼 만든다.

```bash
python3 ../landing/scripts/statusbar.py --full assets/store-screens <캡처 폴더> explore:explore course:course courserun:run result:result ranking:ranking live:live activity:activity
```

## 고칠 곳

| 무엇 | 어디 |
| --- | --- |
| 장면 문구 · 칩 · 숫자 | `src/Scenes.tsx` |
| 장면 전환 마디 · 음악 시작점 | `src/timeline.ts`의 `TRACKS` (`cutBars`, `videoDrop`) |
| 장면 순서 | `src/Promo.tsx`의 `SCENES` (끝 장면은 마지막에 붙는다) |
| 음악 파일 | `scripts/fetch-music.mjs` + `src/timeline.ts`의 `TRACKS` (곡을 더하면 빠르기 · 드롭 시각을 킥으로 다시 재고 `src/Root.tsx`에 영상을 더한다) |
| 마지막 출시 문구 (출시 뒤) | `src/Scenes.tsx`의 `End` |

## 올릴 때

- 설명에 위 음악 저작권 문구를 붙인다.
- 인스타그램 음악을 쓰고 싶으면 올릴 때 원래 소리를 0으로 줄이고 인스타그램 음악을 고른다.
- Remotion은 개인 · 3명 이하 회사는 무료로 쓸 수 있다.
