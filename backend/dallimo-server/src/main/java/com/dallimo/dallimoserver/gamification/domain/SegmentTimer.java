package com.dallimo.dallimoserver.gamification.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 인증된 코스 러닝에서 구간 기록(초)을 잰다 (124장 Segment Attack).
 * 정상 point를 코스 경로에 붙여 "코스 위 어디까지 왔는지"를 앞으로만 늘리고, 구간 시작 · 끝 거리를 지난 시각을 point 사이로 나눠 구한다.
 * 시간은 공식 기록과 같이 point 사이가 15초 넘게 비면(일시정지) 빼고 센다. 같은 입력이면 같은 결과다.
 */
public final class SegmentTimer {

    // 경로에서 이만큼 안이면 코스 위로 본다 (검증 매칭 폭과 같은 값)
    static final double BUFFER_M = 50;
    // 출발은 코스 앞 이 거리 안에서 잡는다
    static final double START_WINDOW_M = 100;
    // 한 point 사이에 코스 위를 앞으로 갈 수 있는 거리 = 이 여유 + 초당 12m (순간 이동 기준). 루프 코스에서 출발하자마자 끝으로 붙지 않게
    static final double ADVANCE_SLACK_M = 60;
    // 조금 뒤로 붙는 것은 GPS 흔들림으로 본다
    static final double BACKTRACK_M = 30;
    // 마지막 구간은 코스 끝 이 거리 안까지 오면 끝낸 것으로 본다 (검증도 도착점 반경 안 가장 가까운 point에서 끝낸다)
    static final double END_TOLERANCE_M = 50;

    private SegmentTimer() {
    }

    /** 구간마다 기록(초, 반올림). 끝까지 가지 못한 구간은 null */
    public static List<Integer> time(List<CourseRoute.Point> route, List<RunPoint> raw, List<CourseSegments.Segment> segments) {
        List<Integer> out = new ArrayList<>();
        if (route.size() < 2 || segments.isEmpty()) {
            segments.forEach(s -> out.add(null));
            return out;
        }
        Track track = track(route, RunMetrics.compute(raw).accepted());
        // 구간은 코스 길이로 나눴다. 여기서 잰 경로 길이(평면 근사)에 맞춰 늘이거나 줄인다
        double scale = track.total() / segments.get(segments.size() - 1).endM();
        for (CourseSegments.Segment s : segments) {
            double end = s.endM() * scale;
            boolean last = s.index() == segments.size() - 1;
            if (last && track.max() >= end - END_TOLERANCE_M) end = Math.min(end, track.max());
            Double a = track.secondsAt(s.startM() * scale);
            Double b = track.secondsAt(end);
            out.add(a == null || b == null || b <= a ? null : (int) Math.round(b - a));
        }
        return out;
    }

    /** 코스 위 진행 거리와 그때까지 움직인 시간 (진행이 늘어난 point만) */
    record Track(double[] progress, double[] seconds, double total) {
        double max() {
            return progress.length == 0 ? -1 : progress[progress.length - 1];
        }

        /** 진행 거리 at을 처음 지난 때의 움직인 시간. 거기까지 가지 못했으면 null */
        Double secondsAt(double at) {
            for (int k = 0; k < progress.length; k++) {
                if (progress[k] < at) continue;
                if (k == 0) return seconds[0];
                double span = progress[k] - progress[k - 1];
                double f = span <= 0 ? 1 : (at - progress[k - 1]) / span;
                return seconds[k - 1] + (seconds[k] - seconds[k - 1]) * f;
            }
            return null;
        }
    }

    static Track track(List<CourseRoute.Point> route, List<RunPoint> pts) {
        double lat0 = route.get(0).latitude();
        double cos = Math.cos(Math.toRadians(lat0));
        int n = route.size();
        double[] rx = new double[n], ry = new double[n], cum = new double[n];
        for (int j = 0; j < n; j++) {
            rx[j] = x(route.get(j).longitude(), route.get(0).longitude(), cos);
            ry[j] = y(route.get(j).latitude(), lat0);
            if (j > 0) cum[j] = cum[j - 1] + Math.hypot(rx[j] - rx[j - 1], ry[j] - ry[j - 1]);
        }
        List<double[]> kept = new ArrayList<>();
        double moving = 0;
        double progress = -1;
        RunPoint prev = null;
        for (RunPoint p : pts) {
            double dt = prev == null ? 0 : Duration.between(prev.recordedAt(), p.recordedAt()).toMillis() / 1000.0;
            if (prev != null && dt > 0 && dt <= RunMetrics.BREAK_GAP.toSeconds()) moving += dt;
            prev = p;
            double px = x(p.longitude(), route.get(0).longitude(), cos);
            double py = y(p.latitude(), lat0);
            double lo = progress < 0 ? 0 : progress - BACKTRACK_M;
            double hi = progress < 0 ? START_WINDOW_M : progress + ADVANCE_SLACK_M + Math.max(0, dt) * RunMetrics.MAX_SPEED_MPS;
            double best = Double.MAX_VALUE, at = -1;
            for (int j = 1; j < n; j++) {
                if (cum[j] < lo) continue;
                if (cum[j - 1] > hi) break;
                double sx = rx[j] - rx[j - 1], sy = ry[j] - ry[j - 1];
                double len2 = sx * sx + sy * sy;
                double t = len2 == 0 ? 0 : Math.max(0, Math.min(1, ((px - rx[j - 1]) * sx + (py - ry[j - 1]) * sy) / len2));
                double d = Math.hypot(px - (rx[j - 1] + t * sx), py - (ry[j - 1] + t * sy));
                double q = cum[j - 1] + t * (cum[j] - cum[j - 1]);
                if (d < best && q >= lo && q <= hi) {
                    best = d;
                    at = q;
                }
            }
            if (best > BUFFER_M || at <= progress) continue;
            progress = at;
            kept.add(new double[]{progress, moving});
        }
        double[] pr = new double[kept.size()], sec = new double[kept.size()];
        for (int k = 0; k < kept.size(); k++) {
            pr[k] = kept.get(k)[0];
            sec[k] = kept.get(k)[1];
        }
        return new Track(pr, sec, cum[n - 1]);
    }

    private static double x(double lng, double lng0, double cos) {
        return (lng - lng0) * 111_320 * cos;
    }

    private static double y(double lat, double lat0) {
        return (lat - lat0) * 111_320;
    }
}
