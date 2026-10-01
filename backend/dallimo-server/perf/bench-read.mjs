// 조회 API 측정: 코스 랭킹 · 내 순위 · 코스 상세(주간 랭킹 미리보기 포함) · 주변 코스 (결정 로그 70항)
// 예열 뒤 동시 CONCURRENCY명이 REQUESTS번 요청하고 p50/p95/p99 · 처리량을 낸다. 결과는 perf/results/<label>-read.json
//   node perf/bench-read.mjs before [scenario...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { api, pool, rng, SEED, stats } from './lib.mjs';

const LABEL = process.argv[2] ?? 'run';
const ONLY = process.argv.slice(3);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);
const REQUESTS = Number(process.env.REQUESTS ?? 500);
const WARMUP = Number(process.env.WARMUP ?? 100);

const r = rng(7);
const user = () => SEED.userIdFrom + Math.floor(r() * SEED.users);
const C = SEED.rankingCourseId;
// 수성못 주변 3km 안 임의 지점
const here = () => `lat=${(35.8284 + (r() - 0.5) * 0.04).toFixed(5)}&lng=${(128.6213 + (r() - 0.5) * 0.05).toFixed(5)}`;

const SCENARIOS = {
  'ranking-all': () => `/api/v1/courses/${C}/rankings?size=20`,
  'ranking-weekly': () => `/api/v1/courses/${C}/rankings?period=WEEKLY&size=20`,
  'ranking-me': () => `/api/v1/courses/${C}/rankings/me`,
  'course-detail': () => `/api/v1/courses/${C}`,
  'nearby-3km': () => `/api/v1/courses/nearby?${here()}&radius=3000&size=20`,
  'nearby-10km': () => `/api/v1/courses/nearby?${here()}&radius=10000&size=20`,
};

const out = { label: LABEL, concurrency: CONCURRENCY, requests: REQUESTS, warmup: WARMUP, at: new Date().toISOString(), results: {} };
for (const [name, path] of Object.entries(SCENARIOS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  await pool(Array.from({ length: WARMUP }, () => () => api('GET', path(), { user: user() })), CONCURRENCY);
  const t0 = performance.now();
  const ms = await pool(Array.from({ length: REQUESTS }, () => async () => (await api('GET', path(), { user: user() })).ms), CONCURRENCY);
  const sec = (performance.now() - t0) / 1000;
  out.results[name] = { ...stats(ms), rps: +(REQUESTS / sec).toFixed(1) };
  console.log(name.padEnd(16), JSON.stringify(out.results[name]));
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${LABEL}-read.json`, import.meta.url), JSON.stringify(out, null, 2) + '\n');
