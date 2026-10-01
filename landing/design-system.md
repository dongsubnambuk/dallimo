# Design System — 달리모 소개 사이트
> 생성 2026-10-01 | 마지막 수정 2026-10-01

앱 디자인 시스템(`frontend/docs/ui/DESIGN-SYSTEM.md`, `frontend/src/design/tokens`)의 값을 그대로 쓴다. 이 파일은 웹 소개 사이트에서만 쓰는 배치 · 움직임 규칙을 더한다 (결정 로그 68항).

## 방향
- **Tone:** 다크 스포츠 + 실용(Industrial). 앱의 ROUTE SIGNAL 방향 그대로.
- **Style:** 검은 바탕 위 민트 경로 선 하나가 페이지를 이끈다. 숫자는 앱처럼 Pretendard Black 기울임.
- **차별점:** 스크롤하면 그려지는 민트 경로 선, 실제 앱 화면을 넣은 iPhone 목업, 앱과 같은 기록 숫자(10:08 · 0.50km).
- **피하는 것:** 보라 · 파랑 그라데이션, 글래스모피즘, 같은 크기 카드 3개 나열, 가짜 사용자 수 · 후기, 이모지.

## 색
| 역할 | Hex | 쓰는 곳 |
|------|-----|---------|
| ink (canvas dark) | #0B0B0C | 기본 바탕 |
| surface | #1B1C1E | 묶음 칸 |
| elevated | #242528 | 테두리 · 목업 테두리 |
| text | #F4F5F4 | 어두운 바탕 글자 |
| muted | #9A9E9C | 어두운 바탕 보조 글자 |
| signal | #2BF0C0 | 강조 · 경로 선 · 주 버튼 채움 (어두운 바탕에서만 글자로) |
| signal-deep | #0A6E5A | 경로 선 테두리 |
| paper | #F3F4F2 | 밝은 구간 바탕 |
| paper-text | #0B0B0C | 밝은 바탕 글자 |
| paper-muted | #5B5F5D | 밝은 바탕 보조 글자 |
| signal-ink | #007A62 | 밝은 바탕 강조 글자 |

### 대비 확인
| 쌍 | 비율 | 수준 |
|----|------|------|
| text / ink | 18.0:1 | AAA |
| muted / ink | 7.26:1 | AAA |
| muted / surface | 6.29:1 | AA |
| signal / ink | 13.42:1 | AAA |
| ink / signal (버튼) | 13.42:1 | AAA |
| paper-text / paper | 17.83:1 | AAA |
| paper-muted / paper | 5.87:1 | AA |
| signal-ink / paper | 4.81:1 | AA |

## 글꼴
- **전부 Pretendard Variable** (npm `pretendard`, dynamic subset 자체 호스팅). 앱과 같다.
- **숫자 · 큰 제목:** weight 900, 기록 숫자는 기울임(앱 metric 스타일).

| 토큰 | 크기 | weight | line-height | 쓰는 곳 |
|------|------|--------|-------------|---------|
| display | clamp(40px, 7vw, 84px) | 900 | 1.05 | 첫 화면 제목 |
| h2 | clamp(30px, 4.6vw, 52px) | 800 | 1.12 | 구간 제목 |
| h3 | 20px | 700 | 1.35 | 작은 제목 |
| lead | 18px | 500 | 1.6 | 설명 |
| body | 16px | 400 | 1.65 | 본문 |
| small | 14px | 500 | 1.5 | 라벨 |

## 간격 · 배치
- 기본 단위 4px. 구간 위아래 96~160px (모바일 72~96px).
- 최대 폭 1200px, 좌우 여백 20px(모바일) · 32px(데스크톱).
- 중단점 640 / 768 / 1024 / 1280. 768 아래는 한 열.
- z-index: 내용 0 / 고정 머리글 20.

## 움직임
- motion 라이브러리. 들어올 때 opacity · translateY(16px) 0.5s ease-out, 목록은 0.08s 간격.
- 경로 선은 pathLength 0→1로 그린다.
- 첫 화면 휴대폰은 스크롤에 따라 조금씩 움직인다(transform만).
- `prefers-reduced-motion`이면 모두 끄고 처음부터 보여 준다.

## 주요 컴포넌트
### DeviceFrame
- **쓰임:** 앱 화면을 iPhone 모양 틀에 넣는다. 화면 이미지는 상태 표시줄 · 홈 막대를 합성한 실제 앱 캡처(393×852pt, 780px 폭).
- **변형:** 크기는 부모 폭을 따른다. `tilt`로 기울임.
### StoreBadges
- **쓰임:** App Store · Google Play. 주소가 없으면 "출시 준비 중" 칸으로 보인다(`src/content.ts`의 `STORE`).
### Reveal
- **쓰임:** 화면에 들어올 때 나타나기. 동작 줄이기 설정을 따른다.
