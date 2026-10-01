// 영상 시간표: 배경 음악의 마디에 장면 전환을 맞춘다 (결정 로그 69항)
export const FPS = 30;
export const DURATION = 30 * FPS;
export const TRANSITION = 10; // 전환 10프레임이 끝나는 순간 박이 온다

type Track = {
  file: string;
  credit: string;
  bpm: number; // 킥을 재서 맞춘 실제 빠르기
  trackDrop: number; // 곡 안에서 드롭(크게 터지는 첫 박) 시각
  videoDrop: number; // 영상 안에서 드롭이 올 시각
  cutBars: number[]; // 드롭부터 센 마디. 이 마디 첫 박에 장면이 완전히 바뀐다 (7번)
  accentBar: number; // 끝 장면 출시 안내가 튀어나오는 마디
  fadeOut: number; // 마지막 몇 초 동안 줄인다
};

export const TRACKS = {
  // "Laserpack"(실측 128.02BPM, 한 마디 1.875초): 저음이 빠지는 브레이크다운 · 상승음 뒤 90.03초에 베이스가 다시 들어온다.
  // 드롭 뒤 8마디(105초)에서 펌핑 구간으로 넘어가 두 마디마다 장면을 바꾸면 8번째 마디에서 새 흐름과 장면이 같이 시작된다
  laserpack: {
    file: 'music/laserpack.mp3',
    credit: 'Music: "Laserpack" Kevin MacLeod (incompetech.com) · CC BY 4.0',
    bpm: 128.02,
    trackDrop: 90.03,
    videoDrop: 2.5,
    cutBars: [0, 2, 4, 6, 8, 10, 12],
    accentBar: 13,
    fadeOut: 2,
  },
  // "Shiny Tech"(실측 137.69BPM, 표기 138): 6.957초에 킥이 들어온다. 드롭 뒤 7 · 11번째 마디가 비는 마디(fill)라
  // 두 마디마다 장면을 바꾸면 8 · 12번째 마디에서 새 흐름과 장면이 같이 시작된다
  shinyTech: {
    file: 'music/shiny-tech.mp3',
    credit: 'Music: "Shiny Tech" Kevin MacLeod (incompetech.com) · CC BY 4.0',
    bpm: 137.69,
    trackDrop: 6.957,
    videoDrop: 2.5,
    cutBars: [0, 2, 4, 6, 8, 10, 12],
    accentBar: 14,
    fadeOut: 2,
  },
} satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;

export function timeline(id: TrackId) {
  const track: Track = TRACKS[id];
  // 곡을 자르는 위치는 프레임 단위(1/30초)라 반올림한다. 실제 드롭 시각은 그 값으로 다시 계산해 장면 전환을 맞춘다
  const trim = Math.round((track.trackDrop - track.videoDrop) * FPS);
  const drop = track.trackDrop - trim / FPS;
  const bar = (4 * 60) / track.bpm;
  const barFrame = (n: number) => Math.round((drop + n * bar) * FPS);

  const cutFrames = track.cutBars.map(barFrame);
  // TransitionSeries 장면 길이: 장면 i는 전환 i가 끝나는 프레임까지
  const starts = [0, ...cutFrames.map((e) => e - TRANSITION)];
  const sceneFrames = starts.map((s, i) => (i < cutFrames.length ? cutFrames[i] : DURATION) - s);
  const endStart = starts[starts.length - 1];

  // 장면 안 칩이 박에 맞춰 튀어나오도록 박 격자(프레임)를 넘긴다
  const beats = { drop: drop * FPS, beat: (bar / 4) * FPS };

  return { track, trim, starts, sceneFrames, beats, endAccent: barFrame(track.accentBar) - endStart };
}
