// 측정용 데이터를 dallimo_perf DB에 넣는다 (결정 로그 70항). 서버를 한 번 띄워 Flyway로 스키마를 만든 뒤 실행한다.
// 같은 시드 난수라 매번 같은 데이터가 들어간다. 이미 들어 있으면 지우고 다시 넣는다.
//   node perf/seed.mjs
import { mysql, rng, SEED, uuid } from './lib.mjs';

const r = rng(20261001);
const BATCH = 2000;
const ts = (d) => d.toISOString().replace('T', ' ').replace('Z', '');
const NOW = new Date('2026-10-01T00:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 86_400_000);

function insert(table, cols, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows.slice(i, i + BATCH).map((v) => `(${v.join(',')})`).join(',\n');
    mysql(`SET foreign_key_checks = 0; SET unique_checks = 0;\nINSERT INTO ${table} (${cols}) VALUES\n${values};`);
  }
  console.log(`${table}: ${rows.length.toLocaleString()} rows`);
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const t0 = Date.now();
// 지난 시드 지우기 (개발 시드 코스 1~3 · 사용자 1은 둔다)
mysql(`SET foreign_key_checks = 0;
DELETE FROM tbl_course_record WHERE user_id >= ${SEED.userIdFrom};
DELETE FROM tbl_run WHERE user_id >= ${SEED.userIdFrom};
DELETE FROM tbl_course_route_point WHERE course_id >= ${SEED.courseIdFrom};
DELETE FROM tbl_course WHERE id >= ${SEED.courseIdFrom};
DELETE FROM tbl_refresh_token WHERE user_id >= ${SEED.userIdFrom};
DELETE FROM tbl_user WHERE id >= ${SEED.userIdFrom};`);

// 사용자 + 살아 있는 세션 (Access Token sid 확인용)
const users = [];
const sessions = [];
for (let i = 0; i < SEED.users; i++) {
  const id = SEED.userIdFrom + i;
  users.push([id, q('EMAIL'), q(`perf${i}@dallimo.test`), q(`러너${i}`), q(`P${id}`), q(ts(daysAgo(200))), q(ts(daysAgo(200)))]);
  sessions.push([id, id, q('perf'), q('x'), q('2030-01-01 00:00:00'), q(ts(daysAgo(1)))]);
}
insert('tbl_user', 'id, provider, provider_user_id, nickname, friend_code, created_at, updated_at', users);
insert('tbl_refresh_token', 'id, user_id, device_id, token_hash, expires_at, created_at', sessions);

// 코스: 대구 시내에 퍼뜨리되 절반은 수성못 주변 3km에 몰린다 (도시 공원 · 강변에 코스가 몰리는 모양)
const courses = [];
const routes = [];
const CENTER = { lat: 35.8284, lng: 128.6213 };
for (let i = 0; i < SEED.courses; i++) {
  const id = SEED.courseIdFrom + i;
  const near = i === 0 || r() < 0.5;
  const lat = near ? CENTER.lat + (r() - 0.5) * 0.054 : 35.75 + r() * 0.2;
  const lng = near ? CENTER.lng + (r() - 0.5) * 0.066 : 128.45 + r() * 0.3;
  const dist = 1000 + Math.floor(r() * 9000);
  const creator = SEED.userIdFrom + Math.floor(r() * SEED.users);
  courses.push([id, creator, q(`코스 ${i}`), q('측정용 코스'), q('대구 수성구'), dist, lat.toFixed(7), lng.toFixed(7), lat.toFixed(7), lng.toFixed(7), q(i % 10 === 0 ? 'VERIFIED' : 'NEW'), q('PUBLIC'), q(ts(daysAgo(r() * 300))), q(ts(daysAgo(1)))]);
  // 경로: 출발점에서 원을 그리는 점 100개
  const radius = dist / (2 * Math.PI) / 111_320;
  for (let k = 0; k < SEED.routePointsPerCourse; k++) {
    const a = (2 * Math.PI * k) / SEED.routePointsPerCourse;
    routes.push([id, k + 1, (lat + radius * Math.sin(a)).toFixed(7), (lng + radius * (1 - Math.cos(a))).toFixed(7), '30.00']);
  }
}
insert('tbl_course', 'id, creator_id, name, description, region, distance_m, start_lat, start_lng, end_lat, end_lng, status, visibility, created_at, updated_at', courses);
insert('tbl_course_route_point', 'course_id, seq, latitude, longitude, altitude_m', routes);

// 공식 기록: 인기 코스 10만 건(사용자 2만 명이 평균 5번) + 다른 코스 50개에 20만 건. 기록마다 Run이 있다
let runId = 0;
const runs = [];
const records = [];
function record(courseId, userId) {
  const id = ++runId;
  const started = daysAgo(r() * 180);
  const duration = 600 + Math.floor(r() * 1800);
  const ended = new Date(started.getTime() + duration * 1000);
  runs.push([id, userId, courseId, q(uuid(r)), q('COURSE'), q('FINISHED'), q(ts(started)), q(ts(ended)), duration, 3000, q('VERIFIED'), q(ts(started)), q(ts(ended))]);
  records.push([courseId, id, userId, duration, Math.round(duration / 3), '97.50', q(ts(ended)), q(ts(ended))]);
}
for (let i = 0; i < SEED.rankingRecords; i++) record(SEED.rankingCourseId, SEED.userIdFrom + Math.floor(r() * SEED.users));
for (let i = 0; i < SEED.otherCourseRecords; i++) record(SEED.courseIdFrom + 1 + Math.floor(r() * 50), SEED.userIdFrom + Math.floor(r() * SEED.users));
const runBase = Number(mysql('SELECT COALESCE(MAX(id), 0) FROM tbl_run;').trim()) + 1_000_000;
for (const row of runs) row[0] += runBase;
for (const row of records) row[1] += runBase;
insert('tbl_run', 'id, user_id, course_id, client_run_uuid, mode, status, started_at, ended_at, elapsed_seconds, distance_m, verification_status, created_at, updated_at', runs);
insert('tbl_course_record', 'course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at', records);

mysql('ANALYZE TABLE tbl_user, tbl_course, tbl_course_route_point, tbl_run, tbl_course_record;');
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
