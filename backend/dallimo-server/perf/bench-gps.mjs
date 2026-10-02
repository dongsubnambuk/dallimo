// GPS 업로드 측정 (결정 로그 70항). 앱 Sync 정책(runSync.ts)과 같이 1초 1점 · 묶음 60점(1분).
// 러너 RUNNERS명이 동시에 2시간 러닝(묶음 BATCHES개)을 올린다. 오프라인으로 달린 뒤 한꺼번에 올리는 경우와 같다.
// 묶음 순서별 지연(앞 10개 vs 뒤 10개)으로 러닝이 길어질수록 느려지는지 본다. 결과는 perf/results/<label>-gps.json
//   node perf/bench-gps.mjs before
import { mkdirSync, writeFileSync } from 'node:fs';
import { api, pool, rng, SEED, stats, uuid } from './lib.mjs';

const LABEL = process.argv[2] ?? 'run';
const RUNNERS = Number(process.env.RUNNERS ?? 20);
const BATCHES = Number(process.env.BATCHES ?? 120);
const PER_BATCH = 60;

const r = rng(Date.now() % 100000);
const start = new Date(Date.now() - 3 * 3600_000);

async function runner(k) {
  const userId = SEED.userIdFrom + 5000 + k;
  const created = await api('POST', '/api/v1/runs', {
    user: userId,
    body: { clientRunUuid: uuid(r), mode: 'FREE', startedAt: start.toISOString() },
  });
  const runId = created.json.data.runId;
  const lat0 = 35.8284 + (r() - 0.5) * 0.01;
  const lng0 = 128.6213 + (r() - 0.5) * 0.01;
  const ms = [];
  for (let b = 0; b < BATCHES; b++) {
    const fromSeq = b * PER_BATCH + 1;
    const points = Array.from({ length: PER_BATCH }, (_, i) => {
      const seq = fromSeq + i;
      return {
        seq,
        latitude: +(lat0 + seq * 0.00002).toFixed(7),
        longitude: +(lng0 + Math.sin(seq / 50) * 0.001).toFixed(7),
        altitudeM: 30,
        accuracyM: 5,
        speedMps: 2.8,
        recordedAt: new Date(start.getTime() + seq * 1000).toISOString(),
      };
    });
    const batchUuid = uuid(r);
    const res = await api('POST', `/api/v1/runs/${runId}/points`, {
      user: userId,
      headers: { 'Idempotency-Key': batchUuid },
      body: { batchUuid, fromSeq, toSeq: fromSeq + PER_BATCH - 1, points },
    });
    if (res.json.data.lastAcceptedSeq !== fromSeq + PER_BATCH - 1) throw new Error(`seq mismatch ${JSON.stringify(res.json.data)}`);
    ms.push(res.ms);
  }
  return ms;
}

const t0 = performance.now();
const perRunner = await pool(Array.from({ length: RUNNERS }, (_, k) => () => runner(k)), RUNNERS);
const sec = (performance.now() - t0) / 1000;
const all = perRunner.flat();
const first = perRunner.flatMap((m) => m.slice(0, 10));
const last = perRunner.flatMap((m) => m.slice(-10));
const out = {
  label: LABEL,
  runners: RUNNERS,
  batches: BATCHES,
  pointsPerBatch: PER_BATCH,
  at: new Date().toISOString(),
  totalSeconds: +sec.toFixed(2),
  pointsPerSecond: Math.round((RUNNERS * BATCHES * PER_BATCH) / sec),
  all: stats(all),
  first10: stats(first),
  last10: stats(last),
};
console.log(JSON.stringify(out, null, 2));
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${LABEL}-gps.json`, import.meta.url), JSON.stringify(out, null, 2) + '\n');
