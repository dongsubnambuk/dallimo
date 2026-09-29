import type { RunPoint } from '@/entities/run/types';
import type { LocalRun, RunSegment } from '@/features/run/engine/localRunStore';

// GPS PoC 기록 내보내기. JSON은 원본 그대로(튜닝용), GPX는 지도 도구에서 경로를 볼 때 쓴다.
export type RunExport = { run: LocalRun; segments: RunSegment[]; points: RunPoint[] };

export function toJson(e: RunExport): string {
  return JSON.stringify({ format: 'dallimo-gps-poc', version: 1, ...e }, null, 1);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 달린 구간마다 trkseg 하나. 거리 계산에서 뺀 point도 원본이라 넣고 type으로 표시한다.
export function toGpx(e: RunExport): string {
  const segs = e.segments.length ? e.segments : [{ startedAt: -Infinity, endedAt: null }];
  const body = segs
    .map((s, i) => {
      const end = segs[i + 1]?.startedAt ?? Infinity;
      const pts = e.points.filter((p) => p.recordedAt >= s.startedAt && p.recordedAt < end);
      const trkpts = pts
        .map(
          (p) =>
            `<trkpt lat="${p.latitude.toFixed(7)}" lon="${p.longitude.toFixed(7)}">` +
            (p.altitude != null ? `<ele>${p.altitude.toFixed(1)}</ele>` : '') +
            `<time>${new Date(p.recordedAt).toISOString()}</time><type>${p.qualityFlag}</type>` +
            (Number.isFinite(p.accuracy) ? `<hdop>${p.accuracy.toFixed(1)}</hdop>` : '') +
            `</trkpt>`,
        )
        .join('\n');
      return `<trkseg>\n${trkpts}\n</trkseg>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DALLIMO GPS PoC" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${esc(`${e.run.mode} ${new Date(e.run.startedAt).toISOString()}`)}</name>
${body}
</trk>
</gpx>
`;
}

export function exportFileName(run: LocalRun, ext: 'json' | 'gpx'): string {
  const d = new Date(run.startedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dallimo-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
}
