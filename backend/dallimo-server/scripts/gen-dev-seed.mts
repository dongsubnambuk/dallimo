// 개발용 코스 seed SQL을 만든다 (dev 프로필에서만 적용, 운영 · 테스트 DB에는 들어가지 않음).
// 파일 이름(R__local_seed_courses)은 그대로 둔다. 바꾸면 이미 적용한 개발 DB에서 Flyway 검증이 실패한다
// 경로는 앱 mock 코스와 같은 OpenStreetMap 경로(frontend/src/entities/course/api/mockCourseRoutes.ts)를
// 서버 코스 등록과 같은 10m 간격으로 다시 찍고, 고도는 mock 고도 그래프에서 보간한다.
// 실행: node --experimental-strip-types scripts/gen-dev-seed.mts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { MOCK_COURSE_ROUTES } = await import(resolve(here, '../../../frontend/src/entities/course/api/mockCourseRoutes.ts'));
const OUT = resolve(here, '../src/main/resources/db/seed/dev/R__local_seed_courses.sql');

// 앱 mock 코스(mockCourseRepository.ts)와 같은 이름 · 설명 · 태그 · 난이도
const COURSES = [
  {
    key: 'c-suseongmot',
    name: '수성못 둘레길',
    description: '수성못을 한 바퀴 도는 평지 루프. 호숫가 산책로라 신호가 없고, 밤에도 조명이 밝아 퇴근 후 달리기 좋아요.',
    tags: ['평지', '야간 밝음'],
    difficulty: 'EASY',
  },
  {
    key: 'c-sincheon',
    name: '신천 강변 왕복',
    description: '신천 동쪽 강변을 따라 남쪽으로 내려갔다 돌아오는 왕복. 자전거 도로와 나뉘어 있어요.',
    tags: ['평지', '강변'],
    difficulty: 'MODERATE',
  },
  {
    key: 'c-deuran',
    name: '들안로 왕복',
    description: '수성못 북쪽에서 들안로를 따라 올라갔다 돌아오는 왕복 코스. 인도가 넓고 오르막이 거의 없어요.',
    tags: ['신호 적음'],
    difficulty: 'EASY',
  },
];

const STEP_M = 10; // CourseRoute.SAMPLE_M
type P = { lat: number; lng: number };
const hav = (a: P, b: P) => {
  const r = 6_371_000, rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};

// CourseRoute.resample과 같은 방식
function resample(line: P[]): P[] {
  const out = [line[0]];
  let carried = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], seg = hav(a, b);
    if (seg === 0) continue;
    let at = STEP_M - carried;
    for (; at <= seg; at += STEP_M) out.push({ lat: a.lat + (b.lat - a.lat) * (at / seg), lng: a.lng + (b.lng - a.lng) * (at / seg) });
    carried = seg - (at - STEP_M);
  }
  const last = line[line.length - 1];
  if (hav(out[out.length - 1], last) > 0.5) out.push(last);
  return out;
}

function altitudeAt(profile: [number, number][], d: number) {
  if (d <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const [d1, a1] = profile[i];
    if (d <= d1) {
      const [d0, a0] = profile[i - 1];
      return a0 + ((a1 - a0) * (d - d0)) / (d1 - d0);
    }
  }
  return profile[profile.length - 1][1];
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const f7 = (n: number) => n.toFixed(7);
const lines: string[] = [
  '-- 자동 생성 파일. 직접 고치지 않는다 (scripts/gen-dev-seed.mts).',
  '-- 개발용 코스 3개. application-dev.yaml에서만 이 위치를 읽는다. 여러 번 적용해도 한 번만 들어간다.',
  '-- 경로: © OpenStreetMap contributors (ODbL 1.0). 고도: Open-Meteo Elevation API (Copernicus DEM 90m).',
  '',
  "INSERT IGNORE INTO tbl_user (provider, provider_user_id, nickname, friend_code, status, created_at, updated_at)",
  "VALUES ('SYSTEM', 'local-seed', '달리모', 'LOCALSEED', 'ACTIVE', NOW(3), NOW(3));",
  "SET @creator := (SELECT id FROM tbl_user WHERE provider = 'SYSTEM' AND provider_user_id = 'local-seed');",
];

for (const c of COURSES) {
  const data = MOCK_COURSE_ROUTES[c.key];
  const points = resample(data.route.map(([lat, lng]: [number, number]) => ({ lat, lng })));
  let dist = 0;
  const rows = points.map((p, i) => {
    if (i > 0) dist += hav(points[i - 1], p);
    return `(@course, ${i + 1}, ${f7(p.lat)}, ${f7(p.lng)}, ${altitudeAt(data.profile, dist).toFixed(2)})`;
  });
  const length = Math.round(dist);
  const start = points[0], end = points[points.length - 1];
  lines.push(
    '',
    `-- ${c.name}: ${length}m, 경로 point ${points.length}개`,
    'INSERT INTO tbl_course (creator_id, name, description, distance_m, start_lat, start_lng, end_lat, end_lng, elevation_gain_m, difficulty, status, visibility, created_at, updated_at)',
    `SELECT @creator, ${q(c.name)}, ${q(c.description)}, ${length}, ${f7(start.lat)}, ${f7(start.lng)}, ${f7(end.lat)}, ${f7(end.lng)}, ${data.elevationGainM.toFixed(2)}, '${c.difficulty}', 'VERIFIED', 'PUBLIC', NOW(3), NOW(3) FROM DUAL`,
    `WHERE NOT EXISTS (SELECT 1 FROM tbl_course WHERE creator_id = @creator AND name = ${q(c.name)});`,
    `SET @course := (SELECT id FROM tbl_course WHERE creator_id = @creator AND name = ${q(c.name)});`,
    'INSERT IGNORE INTO tbl_course_route_point (course_id, seq, latitude, longitude, altitude_m) VALUES',
    rows.join(',\n') + ';',
    `INSERT IGNORE INTO tbl_course_tag (course_id, tag, seq) VALUES ${c.tags.map((t, i) => `(@course, ${q(t)}, ${i + 1})`).join(', ')};`,
  );
  console.log(c.name, length, points.length);
}
writeFileSync(OUT, lines.join('\n') + '\n');
console.log('wrote', OUT);
