// 영상 시간표: 배경 음악의 마디에 장면 전환을 맞춘다 (결정 로그 69항)
// "Shiny Tech"(실측 137.69BPM)는 6.957초에 킥이 들어오고(드롭), 드롭 뒤 7 · 11번째 마디가 비는 마디(fill)라 8 · 12번째 마디에서 새 흐름이 시작된다.
// 그래서 두 마디마다 장면을 바꾸고, 영상 2.5초(첫 장면이 넘어가는 순간)에 드롭이 오도록 곡을 4.457초부터 튼다.
export const FPS = 30;
export const DURATION = 30 * FPS;

export const MUSIC = {
  file: 'music/shiny-tech.mp3',
  credit: 'Music: "Shiny Tech" Kevin MacLeod (incompetech.com) · CC BY 4.0',
  bpm: 137.69, // 표기는 138이지만 킥 55개로 잰 실제 빠르기
  trackDrop: 6.957, // 곡 안에서 드롭(첫 킥) 시각
  videoDrop: 2.5, // 영상 안에서 드롭이 올 시각
  fadeOut: 2, // 마지막 2초 동안 줄인다
};
// 곡을 자르는 위치는 프레임 단위(1/30초)라 반올림한다. 실제 드롭 시각은 그 값으로 다시 계산해 장면 전환을 맞춘다
export const MUSIC_TRIM = Math.round((MUSIC.trackDrop - MUSIC.videoDrop) * FPS);
const DROP = MUSIC.trackDrop - MUSIC_TRIM / FPS;

const BAR = (4 * 60) / MUSIC.bpm; // 1.743초
const barAt = (bar: number) => DROP + bar * BAR;

// 장면이 완전히 바뀌는 순간(전환 끝) = 마디 첫 박. 시작 → 탐색은 드롭에서
const CUT_BARS = [0, 2, 4, 6, 8, 10, 12];
export const TRANSITION = 10; // 전환 10프레임이 끝나는 순간 박이 온다
export const CUT_FRAMES = CUT_BARS.map((b) => Math.round(barAt(b) * FPS));

// TransitionSeries 장면 길이: 장면 i는 전환 i가 끝나는 프레임까지
export const SCENE_FRAMES = (() => {
  const starts = [0, ...CUT_FRAMES.map((e) => e - TRANSITION)];
  return starts.map((s, i) => (i < CUT_FRAMES.length ? CUT_FRAMES[i] : DURATION) - s);
})();

// 끝 장면 안에서 14번째 마디 첫 박 (출시 안내가 박에 맞춰 나온다)
export const END_START = CUT_FRAMES[CUT_FRAMES.length - 1] - TRANSITION;
export const END_ACCENT = Math.round(barAt(14) * FPS) - END_START;
