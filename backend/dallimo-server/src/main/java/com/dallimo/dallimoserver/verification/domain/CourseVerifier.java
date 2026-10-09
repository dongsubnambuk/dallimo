package com.dallimo.dallimoserver.verification.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 코스 완주 검증 (26.1장 파이프라인, 10.4장).
 * quality filtering → start proximity → end proximity → distance sanity → route coverage → speed anomaly → 판정.
 * 같은 입력이면 항상 같은 결과다 (26.4장 재현성). 원본 point는 바꾸지 않는다.
 */
public final class CourseVerifier {

    // 경로 매칭 격자 한 칸 = 매칭 허용 폭. 코스 점마다 주변 칸의 달린 선분만 본다 (26.3장: O(N×M) 전체 비교를 피한다)
    private static final double METERS_PER_DEGREE = 111_320;

    private CourseVerifier() {
    }

    public static VerificationResult verify(List<CourseRoute.Point> course, List<RunPoint> raw, VerificationPolicy policy) {
        if (course.size() < 2) {
            return fail(VerificationOutcome.UNVERIFIED, FailureReason.COURSE_UNAVAILABLE, CheckResult.SKIPPED, CheckResult.SKIPPED, null, null, null);
        }
        // 1. quality filtering: 거리 계산과 같은 판정(정확도 · 순간 이동)을 통과한 point만 쓴다. 가져온 경로는 정확도로 거르지 않는다
        List<RunPoint> pts = RunMetrics.compute(raw, policy.checkAccuracy()).accepted();
        if (pts.size() < 2) {
            return fail(VerificationOutcome.UNVERIFIED, FailureReason.GPS_INSUFFICIENT, CheckResult.SKIPPED, CheckResult.SKIPPED, null, null, null);
        }
        CourseRoute.Point courseStart = course.get(0);
        CourseRoute.Point courseEnd = course.get(course.size() - 1);
        double courseLength = CourseRoute.lengthM(course);

        // 2. start proximity: 처음 출발점 반경에 들어온 구간에서 출발점에 가장 가까운 point
        int startIdx = closestInFirstWindow(pts, 0, courseStart, policy.startRadiusM(), 0, null);
        CheckResult start = startIdx >= 0 ? CheckResult.PASS : CheckResult.FAIL;

        // 3. end proximity: 출발 뒤 코스 거리의 일정 비율 이상 달린 다음 처음 도착점 반경에 들어온 구간에서 가장 가까운 point
        int endIdx = -1;
        if (startIdx >= 0) {
            double[] along = cumulative(pts, startIdx);
            endIdx = closestInFirstWindow(pts, startIdx + 1, courseEnd, policy.endRadiusM(), courseLength * policy.endMinProgress(), along);
        }
        CheckResult end = startIdx < 0 ? CheckResult.SKIPPED : endIdx >= 0 ? CheckResult.PASS : CheckResult.FAIL;

        // 비교할 구간: 출발~도착. 도착을 못 찾으면 출발부터 끝까지, 출발도 못 찾으면 전체
        int from = Math.max(0, startIdx);
        int to = endIdx >= 0 ? endIdx : pts.size() - 1;
        List<RunPoint> segment = pts.subList(from, to + 1);
        Moving moving = moving(segment);

        // 4. distance sanity
        CheckResult distance = endIdx < 0 ? CheckResult.SKIPPED
                : moving.distance[moving.distance.length - 1] >= courseLength * policy.minDistanceRatio() ? CheckResult.PASS : CheckResult.FAIL;

        // 5. route coverage: 코스 점 중 달린 선 가까이(허용 폭 안)에 있는 비율
        double matchRate = Math.round(coverage(course, segment, policy.matchBufferM()) * 10000) / 100.0;
        CheckResult route = matchRate >= policy.minMatchRate() ? CheckResult.PASS : CheckResult.FAIL;

        // 6. speed anomaly: 일정 시간 이상 이어진 평균 속도
        CheckResult speed = sustainedTooFast(moving, policy) ? CheckResult.FAIL : CheckResult.PASS;

        int segmentDistance = (int) Math.round(moving.distance[moving.distance.length - 1]);
        Integer record = endIdx >= 0 ? (int) Math.round(moving.seconds[moving.seconds.length - 1]) : null;

        // 7. policy aggregation: 비정상 속도는 거부, 나머지 실패는 미인증
        FailureReason reason = null;
        VerificationOutcome outcome = VerificationOutcome.VERIFIED;
        boolean sparse = medianGapSec(segment) > policy.maxMedianGapSec();
        if (speed == CheckResult.FAIL) {
            outcome = VerificationOutcome.REJECTED;
            reason = FailureReason.SPEED_ANOMALY;
        } else if (start == CheckResult.FAIL) {
            reason = FailureReason.START_NOT_NEAR;
        } else if (end == CheckResult.FAIL) {
            reason = FailureReason.END_NOT_REACHED;
        } else if (distance == CheckResult.FAIL) {
            reason = FailureReason.DISTANCE_SHORT;
        } else if (route == CheckResult.FAIL) {
            reason = FailureReason.ROUTE_MISMATCH;
        } else if (sparse) {
            reason = FailureReason.GPS_SPARSE;
        }
        if (reason != null && outcome == VerificationOutcome.VERIFIED) outcome = VerificationOutcome.UNVERIFIED;
        return new VerificationResult(outcome, start, end, distance, route, speed, matchRate, reason,
                outcome == VerificationOutcome.VERIFIED ? record : null, segmentDistance);
    }

    /** point 간격(초)의 가운데 값. point가 둘보다 적으면 0 */
    static double medianGapSec(List<RunPoint> pts) {
        if (pts.size() < 2) return 0;
        double[] gaps = new double[pts.size() - 1];
        for (int i = 1; i < pts.size(); i++) gaps[i - 1] = Duration.between(pts.get(i - 1).recordedAt(), pts.get(i).recordedAt()).toMillis() / 1000.0;
        java.util.Arrays.sort(gaps);
        return gaps[gaps.length / 2];
    }

    private static VerificationResult fail(VerificationOutcome outcome, FailureReason reason, CheckResult start, CheckResult end,
                                           Double matchRate, Integer record, Integer segmentDistance) {
        return new VerificationResult(outcome, start, end, CheckResult.SKIPPED, CheckResult.SKIPPED, CheckResult.SKIPPED,
                matchRate, reason, record, segmentDistance);
    }

    /**
     * from부터 보면서 (along이 있으면 minAlong 이상 달린 뒤) 처음 반경 안에 들어온 연속 구간을 찾고, 그 안에서 target에 가장 가까운 point.
     * 없으면 -1
     */
    private static int closestInFirstWindow(List<RunPoint> pts, int from, CourseRoute.Point target, double radius, double minAlong, double[] along) {
        int best = -1;
        double bestD = Double.MAX_VALUE;
        for (int i = from; i < pts.size(); i++) {
            if (along != null && along[i] < minAlong) continue;
            double d = distance(pts.get(i), target);
            if (d <= radius) {
                if (d < bestD) {
                    bestD = d;
                    best = i;
                }
            } else if (best >= 0) {
                break;
            }
        }
        return best;
    }

    /** startIdx부터 이어 달린 거리 (startIdx 앞은 0) */
    private static double[] cumulative(List<RunPoint> pts, int startIdx) {
        double[] out = new double[pts.size()];
        for (int i = startIdx + 1; i < pts.size(); i++) out[i] = out[i - 1] + distance(pts.get(i - 1), pts.get(i));
        return out;
    }

    /** 구간 안에서 움직인 누적 거리 · 시간. point 사이가 끊김 기준(15초)보다 벌어지면 일시정지로 보고 더하지 않는다 */
    private record Moving(List<RunPoint> points, double[] distance, double[] seconds) {
    }

    private static Moving moving(List<RunPoint> segment) {
        double[] dist = new double[segment.size()];
        double[] sec = new double[segment.size()];
        for (int i = 1; i < segment.size(); i++) {
            RunPoint a = segment.get(i - 1);
            RunPoint b = segment.get(i);
            double dt = Duration.between(a.recordedAt(), b.recordedAt()).toMillis() / 1000.0;
            boolean paused = dt <= 0 || dt > RunMetrics.BREAK_GAP.toSeconds();
            dist[i] = dist[i - 1] + (paused ? 0 : distance(a, b));
            sec[i] = sec[i - 1] + (paused ? 0 : dt);
        }
        return new Moving(segment, dist, sec);
    }

    /** 움직인 시간 기준 window 이상 구간의 평균 속도가 기준을 넘는 곳이 있는가 */
    private static boolean sustainedTooFast(Moving m, VerificationPolicy policy) {
        double window = policy.speedWindow().toSeconds();
        int j = 0;
        for (int i = 0; i < m.seconds.length; i++) {
            if (j < i) j = i;
            while (j < m.seconds.length && m.seconds[j] - m.seconds[i] < window) j++;
            if (j >= m.seconds.length) return false;
            double speed = (m.distance[j] - m.distance[i]) / (m.seconds[j] - m.seconds[i]);
            if (speed > policy.maxSustainedSpeedMps()) return true;
        }
        return false;
    }

    /**
     * 코스 점 중 달린 선분(끊긴 곳 제외)과 buffer 안인 점의 비율 (26.3장 점-선분 거리 기반 coverage).
     * 달린 선분을 buffer 크기 격자에 넣고 코스 점마다 주변 9칸만 본다.
     */
    static double coverage(List<CourseRoute.Point> course, List<RunPoint> run, double buffer) {
        double lat0 = course.get(0).latitude();
        double lng0 = course.get(0).longitude();
        double kx = METERS_PER_DEGREE * Math.cos(Math.toRadians(lat0));
        double ky = METERS_PER_DEGREE;
        Map<Long, List<double[]>> grid = new HashMap<>();
        for (int i = 1; i < run.size(); i++) {
            RunPoint a = run.get(i - 1);
            RunPoint b = run.get(i);
            double dt = Duration.between(a.recordedAt(), b.recordedAt()).toMillis() / 1000.0;
            if (dt <= 0 || dt > RunMetrics.BREAK_GAP.toSeconds()) continue;
            double[] seg = {(a.longitude() - lng0) * kx, (a.latitude() - lat0) * ky, (b.longitude() - lng0) * kx, (b.latitude() - lat0) * ky};
            long cx0 = cell(Math.min(seg[0], seg[2]), buffer), cx1 = cell(Math.max(seg[0], seg[2]), buffer);
            long cy0 = cell(Math.min(seg[1], seg[3]), buffer), cy1 = cell(Math.max(seg[1], seg[3]), buffer);
            for (long cx = cx0; cx <= cx1; cx++) {
                for (long cy = cy0; cy <= cy1; cy++) grid.computeIfAbsent(key(cx, cy), k -> new ArrayList<>()).add(seg);
            }
        }
        // 한 점만 있는 경우(선분 없음)도 점으로 매칭한다
        if (run.size() == 1) {
            RunPoint a = run.get(0);
            double x = (a.longitude() - lng0) * kx, y = (a.latitude() - lat0) * ky;
            grid.computeIfAbsent(key(cell(x, buffer), cell(y, buffer)), k -> new ArrayList<>()).add(new double[]{x, y, x, y});
        }
        int covered = 0;
        for (CourseRoute.Point p : course) {
            double x = (p.longitude() - lng0) * kx;
            double y = (p.latitude() - lat0) * ky;
            long cx = cell(x, buffer), cy = cell(y, buffer);
            boolean hit = false;
            for (long dx = -1; dx <= 1 && !hit; dx++) {
                for (long dy = -1; dy <= 1 && !hit; dy++) {
                    List<double[]> segs = grid.get(key(cx + dx, cy + dy));
                    if (segs == null) continue;
                    for (double[] s : segs) {
                        if (pointToSegment(x, y, s) <= buffer) {
                            hit = true;
                            break;
                        }
                    }
                }
            }
            if (hit) covered++;
        }
        return covered / (double) course.size();
    }

    private static long cell(double v, double size) {
        return (long) Math.floor(v / size);
    }

    private static long key(long cx, long cy) {
        return (cx << 32) ^ (cy & 0xffffffffL);
    }

    private static double pointToSegment(double px, double py, double[] s) {
        double dx = s[2] - s[0], dy = s[3] - s[1];
        double len2 = dx * dx + dy * dy;
        double t = len2 == 0 ? 0 : Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / len2));
        double qx = s[0] + t * dx - px, qy = s[1] + t * dy - py;
        return Math.sqrt(qx * qx + qy * qy);
    }

    private static double distance(RunPoint a, RunPoint b) {
        return CourseRoute.haversineM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }

    private static double distance(RunPoint a, CourseRoute.Point b) {
        return CourseRoute.haversineM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }
}
