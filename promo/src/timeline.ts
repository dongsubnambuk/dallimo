// 영상 시간표: 배경 음악의 마디에 장면 전환을 맞춘다 (결정 로그 69항)
export const FPS = 30;
export const DURATION = 30 * FPS;
export const TRANSITION = 10; // 전환 10프레임이 끝나는 순간 박이 온다

type Track = {
  file: string;
  credit: string; // 끝 장면 아래 저작권 표시. 필요 없는 곡은 ''
  bpm: number; // 킥을 재서 맞춘 실제 빠르기
  trackDrop: number; // 곡 안에서 드롭(크게 터지는 첫 박) 시각
  videoDrop: number; // 영상 안에서 드롭이 올 시각
  cutBars: number[]; // 드롭부터 센 마디. 이 마디 첫 박에 장면이 완전히 바뀐다 (7번)
  accentBar: number; // 끝 장면 출시 안내가 튀어나오는 마디 (0.5는 마디 셋째 박)
  fadeOut: number; // 마지막 몇 초 동안 줄인다
};

export const TRACKS = {
  // "Rising Forest" Diego Nava (Mixkit, 실측 123.99BPM, 한 마디 1.936초): 저음이 빠진 브레이크다운 뒤 46.447초에 킥 · 베이스가 들어와
  // 16마디(31초) 동안 이어진다. 두 마디마다 장면을 바꾸면 8번째 마디(곡의 다음 프레이즈)에 결과 → 랭킹 전환이 온다.
  // 끝 장면이 짧아(4.3초) 출시 안내는 12번째 마디 셋째 박(킥)에 나온다
  risingForest: {
    file: 'music/rising-forest.mp3',
    credit: '', // Mixkit Stock Music Free License는 저작권 표시가 필요 없다
    bpm: 123.99,
    trackDrop: 46.447,
    videoDrop: 2.5,
    cutBars: [0, 2, 4, 6, 8, 10, 12],
    accentBar: 12.5,
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
