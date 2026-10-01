# 달리모 홍보 영상 (promo)

인스타그램 릴스용 30초 세로 영상이다. Remotion(React로 영상을 만드는 라이브러리)으로 만든다 (결정 로그 69항).

- 규격: 1080×1920, 30fps, 900프레임(30초), H.264 · yuv420p · bt709, 소리 없음
- 화면: 랜딩과 같은 실제 앱 캡처(`landing/public/screens`)와 같은 iPhone 틀 · 민트 경로 선 · Pretendard

## 장면

| 시간 | 장면 | 문구 |
| --- | --- | --- |
| 0:00 | 시작 | 오늘 저녁, 어디 달리지? |
| 0:02 | 탐색 | 내 주변 코스를 지도에서 바로 |
| 0:06 | 코스 상세 | 달리기 전에 알아야 할 것만 (거리 · 오르막 · 내 PB) |
| 0:10 | 달리는 중 | 달리는 중엔 숫자 세 개만 (0.50km, 음성 안내, 화면 꺼도 기록) |
| 0:14 | 결과 | 멈추는 순간 공식 기록으로 (인증, PB 10:12 → 10:08) |
| 0:18 | 랭킹 | 코스마다 순위가 있어요 (18위 → 14위, 코스 크라운) |
| 0:21 | 함께 달리기 | 장소가 달라도 같은 시간에 출발 (위치 대신 거리 · 페이스) |
| 0:25 | 끝 | 달리모 · 코스를 찾고, 같이 달리고, 기록을 깨다. · 곧 App Store · Google Play 출시 |

릴스 화면의 위 220px · 아래 420px에는 인스타그램 버튼 · 설명이 겹쳐서 중요한 글을 두지 않았다.

## 만들기

```bash
cd promo
npm install
npm run studio     # 브라우저에서 미리 보기 · 수정
npm run render     # out/dallimo-promo.mp4
npm run cover      # out/dallimo-promo-cover.png (릴스 커버)
```

- `npm run assets`가 앱 화면 · 아이콘 · 글꼴을 `public/`으로 복사한다(원본은 `landing/public/screens`, `frontend/assets`). 앱 화면을 다시 찍으면 영상도 다시 만들면 된다.
- Chrome이 없거나 headless shell을 써야 하면 `REMOTION_BROWSER=/path/to/headless_shell`을 붙인다.

## 고칠 곳

| 무엇 | 어디 |
| --- | --- |
| 장면 문구 · 칩 · 숫자 | `src/Scenes.tsx` |
| 장면 길이 · 순서 · 전환 | `src/Promo.tsx`의 `SCENES` |
| 마지막 출시 문구 (출시 뒤) | `src/Scenes.tsx`의 `End` |

## 올릴 때

- 소리가 없다. 인스타그램에서 올릴 때 음악을 고른다(저작권이 정리된 음악이라 안전하다).
- Remotion은 개인 · 3명 이하 회사는 무료로 쓸 수 있다.
