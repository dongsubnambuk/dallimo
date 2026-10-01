# 달리모 홍보 영상 (promo)

인스타그램 릴스용 30초 세로 영상이다. Remotion(React로 영상을 만드는 라이브러리)으로 만든다 (결정 로그 69항).

- 규격: 1080×1920, 30fps, 900프레임(30초), H.264 · yuv420p · bt709, AAC 스테레오
- 음악: "Laserpack" Kevin MacLeod (incompetech.com), Creative Commons BY 4.0. 무료로 상업 · 홍보에 쓸 수 있고 **저작권 표시(credit)를 꼭 단다**. 영상 끝 장면에 작게 넣었고, 인스타그램 설명에도 아래 문구를 붙인다
- 처음 버전 음악 "Shiny Tech"(같은 작곡가 · 같은 라이선스)로 만든 영상도 `npm run render:shiny-tech`로 다시 만들 수 있다. 그 영상을 올리면 설명 문구의 곡 이름을 "Shiny Tech"로 바꾼다
- 화면: 랜딩과 같은 실제 앱 캡처(`landing/public/screens`)와 같은 iPhone 틀 · 민트 경로 선 · Pretendard

### 인스타그램 설명에 붙일 문구

```
Music: "Laserpack" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

## 장면

| 시간 | 장면 | 문구 |
| --- | --- | --- |
| 0:00 | 시작 | 오늘 저녁, 어디 달리지? |
| 0:02.5 | 탐색 | 내 주변 코스를 지도에서 바로 |
| 0:06.2 | 코스 상세 | 달리기 전에 알아야 할 것만 (거리 · 오르막 · 내 PB) |
| 0:10 | 달리는 중 | 달리는 중엔 숫자 세 개만 (0.50km, 음성 안내, 화면 꺼도 기록) |
| 0:13.7 | 결과 | 멈추는 순간 공식 기록으로 (인증, PB 10:12 → 10:08) |
| 0:17.5 | 랭킹 | 코스마다 순위가 있어요 (18위 → 14위, 코스 크라운) |
| 0:21.2 | 함께 달리기 | 장소가 달라도 같은 시간에 출발 (위치 대신 거리 · 페이스) |
| 0:25 | 끝 | 달리모 · 코스를 찾고, 같이 달리고, 기록을 깨다. · 곧 App Store · Google Play 출시 (0:26.9) |

릴스 화면의 위 220px · 아래 420px에는 인스타그램 버튼 · 설명이 겹쳐서 중요한 글을 두지 않았다.

## 만들기

```bash
cd promo
npm install
npm run studio     # 브라우저에서 미리 보기 · 수정
npm run render     # out/dallimo-promo.mp4 (Laserpack)
npm run render:shiny-tech  # out/dallimo-promo-shiny-tech.mp4 (Shiny Tech)
npm run cover      # out/dallimo-promo-cover.png (릴스 커버)
```

- `npm run assets`가 앱 화면 · 아이콘 · 글꼴을 `public/`으로 복사하고 배경 음악을 incompetech에서 받는다(`public/music/`, 커밋하지 않는다). 앱 화면을 다시 찍으면 영상도 다시 만들면 된다.
- 장면 전환은 음악 마디에 맞춘다(`src/timeline.ts`). 시간은 Laserpack 기준이다.
  - Laserpack(128.02BPM, 한 마디 1.875초): 저음이 빠지는 브레이크다운 · 상승음이 영상 시작이고, 드롭(90.03초)이 영상 2.5초에 온다. 두 마디(3.75초)마다 장면이 바뀌고, 곡이 펌핑 구간으로 넘어가는 8번째 마디에 결과 → 랭킹 전환이 온다. 출시 안내는 13번째 마디 첫 박(0:26.9)에 나온다.
  - Shiny Tech(137.69BPM): 드롭(6.957초)이 영상 2.5초에 오고 두 마디(약 3.5초)마다 장면이 바뀐다. 출시 안내는 14번째 마디 첫 박에 나온다.
- 장면 안 칩과 PB 갱신 칩은 음악 박에 맞춰 튀어나온다(`src/beat.tsx`의 `useOnBeat`). 장면에 적은 프레임을 가장 가까운 박으로 옮긴다.
- Chrome이 없거나 headless shell을 써야 하면 `REMOTION_BROWSER=/path/to/headless_shell`을 붙인다.

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
