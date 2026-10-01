// 홍보 영상 배경 음악을 코드로 만든다 (결정 로그 69항). 직접 만든 소리라 저작권 걱정이 없다.
// 120BPM, A단조(Am - F - C - G). 장면이 바뀌는 순간(src/Promo.tsx의 전환 시작)에 비트와 효과음을 맞춘다.
// 결과: public/music.wav (44.1kHz, 16bit, 스테레오, 30초)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 영상과 같은 장면 길이 · 전환 (src/timeline.json)
const here = dirname(fileURLToPath(import.meta.url));
const { fps: FPS, bpm: BPM, transition: TRANSITION, scenes: SCENES } = JSON.parse(readFileSync(join(here, '../src/timeline.json'), 'utf8'));

const SR = 44100;
const SEC = (SCENES.reduce((a, d) => a + d, 0) - TRANSITION * (SCENES.length - 1)) / FPS;
const N = Math.round(SR * SEC);
const BEAT = 60 / BPM; // 0.5초
const CUTS = [];
for (let i = 0, acc = 0; i < SCENES.length - 1; i++) {
  acc += SCENES[i];
  CUTS.push((acc - TRANSITION * (i + 1)) / FPS);
}
const DROP = CUTS[0]; // 첫 장면이 넘어가는 순간 비트가 들어온다
const END = CUTS[CUTS.length - 1]; // 마지막 장면: 큰 타격 뒤 잔향

const L = new Float32Array(N);
const R = new Float32Array(N);

// 같은 결과가 나오게 고정된 잡음
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const add = (i, l, r = l) => {
  if (i >= 0 && i < N) {
    L[i] += l;
    R[i] += r;
  }
};

// 한 극 저역 통과(간단한 필터)
function lowpass(cut) {
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  return (x) => (y += a * (x - y));
}

// ── 킥: 음이 빠르게 내려가는 사인 + 클릭
const kickEnv = new Float32Array(N); // 베이스 · 패드를 킥에 맞춰 눌러 주는 용도(사이드체인)
function kick(t0, gain = 1) {
  const s0 = Math.round(t0 * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.45; k++) {
    const t = k / SR;
    const f = 44 + 120 * Math.exp(-t * 32);
    ph += (2 * Math.PI * f) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 6.5) * gain * 0.9 + (k < 60 ? noise() * 0.25 * gain : 0);
    add(s0 + k, v);
    if (s0 + k < N) kickEnv[s0 + k] = Math.max(kickEnv[s0 + k], Math.exp(-t * 9));
  }
}

// ── 클랩: 짧은 잡음 세 번 + 꼬리
function clap(t0, gain = 0.5) {
  const s0 = Math.round(t0 * SR);
  const hp = lowpass(900);
  for (let k = 0; k < SR * 0.3; k++) {
    const t = k / SR;
    const burst = [0, 0.011, 0.022].some((b) => t >= b && t < b + 0.008) ? 1 : 0;
    const n = noise();
    const h = n - hp(n);
    const v = h * (burst * 0.9 + Math.exp(-t * 18) * 0.6) * gain;
    add(s0 + k, v * 0.9, v);
  }
}

// ── 하이햇: 고역 잡음
function hat(t0, open = false, gain = 0.16) {
  const s0 = Math.round(t0 * SR);
  const lp = lowpass(7000);
  const len = open ? 0.35 : 0.06;
  for (let k = 0; k < SR * len; k++) {
    const t = k / SR;
    const n = noise();
    const v = (n - lp(n)) * Math.exp(-t * (open ? 11 : 75)) * gain;
    add(s0 + k, v * 0.8, v);
  }
}

// ── 톱니 소리 (베이스 · 패드 · 아르페지오)
function saw(f, t) {
  const x = (f * t) % 1;
  return 2 * x - 1;
}

function bassNote(t0, dur, note, gain = 0.32) {
  const s0 = Math.round(t0 * SR);
  const lp = lowpass(320);
  const f = midi(note);
  for (let k = 0; k < SR * dur; k++) {
    const t = k / SR;
    const env = Math.min(1, t * 200) * Math.exp(-t * 2.2);
    const v = lp(saw(f, t) * 0.7 + Math.sin(2 * Math.PI * f * t) * 0.6) * env * gain;
    const duck = 1 - 0.7 * (kickEnv[s0 + k] ?? 0);
    add(s0 + k, v * duck);
  }
}

function padChord(t0, dur, notes, gain = 0.06, cutFrom = 1800, cutTo = 1800) {
  const s0 = Math.round(t0 * SR);
  const ys = new Float64Array(notes.length * 2); // 음마다 왼쪽 · 오른쪽 필터 상태
  let a = 0;
  for (let k = 0; k < SR * dur; k++) {
    const t = k / SR;
    // 차단 주파수는 256샘플마다 바꾼다 (열리거나 닫히는 패드)
    if (k % 256 === 0) a = 1 - Math.exp((-2 * Math.PI * (cutFrom + (cutTo - cutFrom) * (t / dur))) / SR);
    const env = Math.min(1, t * 6) * Math.min(1, (dur - t) * 8);
    let l = 0;
    let r = 0;
    notes.forEach((n, j) => {
      const f = midi(n);
      ys[2 * j] += a * (saw(f * 0.997, t + j * 0.13) - ys[2 * j]);
      ys[2 * j + 1] += a * (saw(f * 1.003, t + j * 0.29) - ys[2 * j + 1]);
      l += ys[2 * j];
      r += ys[2 * j + 1];
    });
    const duck = 1 - 0.45 * (kickEnv[s0 + k] ?? 0);
    add(s0 + k, l * env * gain * duck, r * env * gain * duck);
  }
}

function pluck(t0, note, gain = 0.07, pan = 0) {
  const s0 = Math.round(t0 * SR);
  const lp = lowpass(2600);
  const f = midi(note);
  for (let k = 0; k < SR * 0.4; k++) {
    const t = k / SR;
    const v = lp(saw(f, t) * 0.6 + (((f * t) % 1) < 0.5 ? 0.4 : -0.4)) * Math.exp(-t * 14) * gain;
    add(s0 + k, v * (1 - pan), v * (1 + pan));
    // 3/16박 뒤 메아리 두 번
    add(s0 + k + Math.round(BEAT * 0.75 * SR), v * 0.35 * (1 + pan), v * 0.35 * (1 - pan));
    add(s0 + k + Math.round(BEAT * 1.5 * SR), v * 0.15, v * 0.15);
  }
}

// ── 전환 효과음: 컷 직전 0.4초 동안 올라가는 잡음
function whoosh(tCut, gain = 0.22) {
  const len = 0.4;
  const s0 = Math.round((tCut - len) * SR);
  let lpState = 0;
  for (let k = 0; k < SR * len; k++) {
    const t = k / SR;
    const p = t / len;
    const a = 1 - Math.exp((-2 * Math.PI * (400 + 6000 * p * p)) / SR);
    const n = noise();
    lpState += a * (n - lpState);
    const v = lpState * p * p * gain;
    add(s0 + k, v * (1 - p * 0.5), v * (0.5 + p * 0.5));
  }
}

// ── 첫 장면: 올라가는 잡음 (킥이 들어오기 전 긴장)
function riser(t0, t1, gain = 0.12) {
  const s0 = Math.round(t0 * SR);
  let y = 0;
  for (let k = 0; k < SR * (t1 - t0); k++) {
    const p = k / (SR * (t1 - t0));
    const a = 1 - Math.exp((-2 * Math.PI * (300 + 5000 * p ** 2)) / SR);
    y += a * (noise() - y);
    add(s0 + k, y * p ** 1.5 * gain);
  }
}

// ── 끝 장면: 크래시 + 낮은 울림
function impact(t0) {
  kick(t0, 1.2);
  const s0 = Math.round(t0 * SR);
  const lp = lowpass(9000);
  for (let k = 0; k < SR * 2.8; k++) {
    const t = k / SR;
    const n = noise();
    const crash = (n - lp(n) * 0.3) * Math.exp(-t * 1.6) * 0.16;
    const sub = Math.sin(2 * Math.PI * 41.2 * t) * Math.exp(-t * 1.2) * 0.35;
    add(s0 + k, crash * 0.9 + sub, crash + sub);
  }
}

// ── 곡 구성 ──
const PROG = [
  { root: 33, pad: [57, 60, 64], arp: [69, 72, 76, 72] }, // Am
  { root: 29, pad: [53, 57, 60], arp: [65, 69, 72, 69] }, // F
  { root: 36, pad: [55, 60, 64], arp: [67, 72, 76, 72] }, // C
  { root: 31, pad: [55, 59, 62], arp: [67, 71, 74, 71] }, // G
];
const BAR = BEAT * 4;

// 처음: 열리는 패드 + 올라가는 잡음
padChord(0, DROP + 0.05, PROG[0].pad, 0.05, 300, 2400);
riser(0.4, DROP);
for (let b = 0; b < Math.floor(DROP / BEAT); b++) hat(b * BEAT + BEAT / 2, false, 0.08);

// 본편: 킥이 들어온 뒤 마지막 장면 직전까지
const bars = Math.round((END - DROP) / BAR);
for (let bar = 0; bar < bars; bar++) {
  const t = DROP + bar * BAR;
  const ch = PROG[bar % 4];
  const last = bar === bars - 1;
  padChord(t, BAR, ch.pad, bar < 4 ? 0.045 : 0.055);
  for (let beat = 0; beat < 4; beat++) {
    const tb = t + beat * BEAT;
    // 마지막 마디 뒤쪽은 비워 끝 장면의 타격을 살린다
    if (!(last && beat === 3)) kick(tb);
    if (bar >= 2 && (beat === 1 || beat === 3) && !(last && beat === 3)) clap(tb, 0.42);
    hat(tb + BEAT / 2, bar >= 8, bar >= 8 ? 0.12 : 0.15);
    if (bar >= 4) hat(tb + BEAT / 4, false, 0.07);
    if (bar >= 4) hat(tb + (BEAT * 3) / 4, false, 0.07);
    // 베이스: 8분음표, 엇박에 한 옥타브 위
    bassNote(tb, BEAT / 2 - 0.02, ch.root);
    bassNote(tb + BEAT / 2, BEAT / 2 - 0.02, ch.root + (beat % 2 ? 12 : 0), 0.26);
  }
  // 아르페지오: 4마디째부터 16분음표
  if (bar >= 3 && !last) {
    for (let s = 0; s < 16; s++) pluck(t + s * (BEAT / 4), ch.arp[s % 4] + (s >= 8 && bar >= 8 ? 12 : 0), 0.06, s % 2 ? 0.3 : -0.3);
  }
  // 마지막 마디 끝: 스네어 몰아치기
  if (last) for (let s = 0; s < 8; s++) clap(t + BEAT * 2 + s * (BEAT / 4), 0.18 + s * 0.04);
}

// 장면 전환마다 효과음
CUTS.slice(0, -1).forEach((c) => whoosh(c));
whoosh(END, 0.32);

// 끝: 타격 + Am 패드가 길게 남는다
impact(END);
padChord(END, SEC - END, [57, 60, 64, 69], 0.06, 2600, 600);

// ── 마스터: 부드럽게 눌러 주고 끝을 줄인다
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.1);
  R[i] = Math.tanh(R[i] * 1.1);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak; // -1dBFS
const fadeFrom = N - SR * 0.6;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = i > fadeFrom ? 1 - (i - fadeFrom) / (N - fadeFrom) : 1;
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm * fade)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm * fade)) * 32767), 46 + i * 4);
}

const out = join(here, '../public/music.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(`music: ${SEC}s, cuts ${CUTS.map((c) => c.toFixed(2)).join(' / ')}`);
