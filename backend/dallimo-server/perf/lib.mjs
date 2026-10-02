// 성능 측정 공용 도구 (결정 로그 70항). 의존성 없이 Node 22로 돈다
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
// application-dev.yaml의 개발 전용 JWT 키 · MySQL 접속 (측정 DB는 dallimo_perf)
const JWT_SECRET = process.env.JWT_SECRET ?? 'AERm8GKK5VfBavXhoYdDqF87u1fDPcnLAxE7OjjFLoE=';
export const DB = { user: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '123456', name: process.env.DB_NAME ?? 'dallimo_perf' };

// 시드 규모 (seed.mjs · bench-*.mjs가 같이 쓴다)
export const SEED = {
  users: 20_000,
  userIdFrom: 10_001, // 사용자 id = userIdFrom + i, 세션(tbl_refresh_token) id도 같은 값
  courses: 10_000,
  courseIdFrom: 100_001,
  rankingCourseId: 100_001, // 기록이 몰린 인기 코스
  rankingRecords: 100_000,
  otherCourseRecords: 200_000, // 다른 코스 50개에 나눠 넣는다
  routePointsPerCourse: 100,
};

// 서버 TokenIssuer와 같은 HS256 Access Token (sub = 사용자 id, sid = 세션 id)
export function token(userId, sessionId = userId) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'HS256' })}.${b64({ iss: 'dallimo', sub: String(userId), iat: now, exp: now + 6 * 3600, sid: sessionId })}`;
  const sig = createHmac('sha256', Buffer.from(JWT_SECRET, 'base64')).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// 고정 시드 난수 (같은 데이터가 매번 나오게)
export function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mysql(sql, { db = DB.name } = {}) {
  const r = spawnSync('mysql', ['--default-character-set=utf8mb4', `-u${DB.user}`, `-p${DB.password}`, '-N', '-B', db], { input: sql, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
}

export async function api(method, path, { user, body, headers = {} } = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return { ms, json: text ? JSON.parse(text) : null };
}

export function stats(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, mean: +mean.toFixed(2), p50: +q(50).toFixed(2), p95: +q(95).toFixed(2), p99: +q(99).toFixed(2), max: +s[s.length - 1].toFixed(2) };
}

// 동시에 workers개씩 job을 돌린다
export async function pool(jobs, workers) {
  let i = 0;
  const out = new Array(jobs.length);
  await Promise.all(Array.from({ length: workers }, async () => {
    while (i < jobs.length) {
      const k = i++;
      out[k] = await jobs[k]();
    }
  }));
  return out;
}

export const uuid = (r) => {
  const h = () => Math.floor(r() * 16).toString(16);
  const s = (n) => Array.from({ length: n }, h).join('');
  return `${s(8)}-${s(4)}-4${s(3)}-a${s(3)}-${s(12)}`;
};
