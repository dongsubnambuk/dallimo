package com.dallimo.dallimoserver.running.domain;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 서버가 원본 point로 다시 계산하는 거리 · 스플릿 · 표시용 경로 (42.3장: 앱이 보낸 누적 거리를 믿지 않는다, 51장 파이프라인).
 * 판정 기준은 앱과 같은 PoC 시작값이다 (앱 entities/run/policy.ts). 실기기 PoC 뒤 함께 조정한다.
 */
public final class RunMetrics {

    // gps.required_accuracy_m: 이보다 정확도가 나쁘면 거리에서 뺀다
    public static final double REQUIRED_ACCURACY_M = 20;
    // 직전 정상 point에서 이 속도보다 빠르면 순간 이동으로 본다
    public static final double MAX_SPEED_MPS = 12;
    // 순간 이동이 이만큼 이어지면 새 위치를 기준으로 다시 잡는다
    static final int JUMP_REANCHOR_COUNT = 3;
    // point 사이가 이보다 벌어지면 일시정지 · 신호 끊김으로 보고 잇지 않는다 (서버는 일시정지 구간을 모른다)
    public static final Duration BREAK_GAP = Duration.ofSeconds(15);
    // 표시용 경로 최대 점 수 (77장: 원본 전체를 그리지 않는다)
    static final int PATH_MAX_POINTS = 400;
    // 이보다 짧으면 평균 페이스를 내지 않는다 (앱 minPaceSampleM)
    static final double MIN_PACE_SAMPLE_M = 50;

    public record Split(int km, int sec) {
    }

    public record Result(double distanceM, double movingSeconds, List<Split> splits, List<double[]> path) {
    }

    private RunMetrics() {
    }

    public static Result compute(List<RunPoint> points) {
        double distance = 0;
        double moving = 0;
        double splitStartMoving = 0;
        List<Split> splits = new ArrayList<>();
        List<RunPoint> accepted = new ArrayList<>();
        RunPoint last = null;
        int jumpStreak = 0;
        // 빠진 point 뒤의 첫 정상 point는 앞과 잇지 않는다 (앱 metrics.ts와 같은 방식)
        boolean broken = false;

        for (RunPoint p : points) {
            if (p.accuracyM() == null || p.accuracyM() > REQUIRED_ACCURACY_M) {
                broken = true;
                continue;
            }
            if (last != null && jumpStreak < JUMP_REANCHOR_COUNT) {
                double sec = Math.max(1, Duration.between(last.recordedAt(), p.recordedAt()).toMillis() / 1000.0);
                if (haversineM(last, p) / sec > MAX_SPEED_MPS) {
                    jumpStreak++;
                    broken = true;
                    continue;
                }
            }
            jumpStreak = 0;
            if (last != null && !broken) {
                double dtSec = Duration.between(last.recordedAt(), p.recordedAt()).toMillis() / 1000.0;
                if (dtSec > 0 && dtSec <= BREAK_GAP.toSeconds()) {
                    double dM = haversineM(last, p);
                    distance += dM;
                    moving += dtSec;
                    int doneKm = (int) Math.floor(distance / 1000);
                    if (doneKm > splits.size()) {
                        // 1km 경계를 넘은 시점을 구간 안에서 비율로 나눠 추정한다 (앱 metrics.ts와 같은 방식)
                        double over = distance - doneKm * 1000;
                        double crossMoving = moving - (dM > 0 ? (over / dM) * dtSec : 0);
                        splits.add(new Split(doneKm, (int) Math.round(crossMoving - splitStartMoving)));
                        splitStartMoving = crossMoving;
                    }
                }
            }
            broken = false;
            last = p;
            accepted.add(p);
        }
        return new Result(distance, moving, splits, decimate(accepted));
    }

    public static Integer avgPace(double distanceM, int elapsedSeconds) {
        if (distanceM < MIN_PACE_SAMPLE_M || elapsedSeconds <= 0) return null;
        return (int) Math.round(elapsedSeconds / (distanceM / 1000));
    }

    private static List<double[]> decimate(List<RunPoint> pts) {
        List<double[]> out = new ArrayList<>();
        if (pts.isEmpty()) return out;
        int step = Math.max(1, (int) Math.ceil(pts.size() / (double) PATH_MAX_POINTS));
        for (int i = 0; i < pts.size(); i += step) out.add(new double[]{pts.get(i).latitude(), pts.get(i).longitude()});
        RunPoint end = pts.get(pts.size() - 1);
        double[] tail = out.get(out.size() - 1);
        if (tail[0] != end.latitude() || tail[1] != end.longitude()) out.add(new double[]{end.latitude(), end.longitude()});
        return out;
    }

    static double haversineM(RunPoint a, RunPoint b) {
        double r = 6_371_000;
        double dLat = Math.toRadians(b.latitude() - a.latitude());
        double dLng = Math.toRadians(b.longitude() - a.longitude());
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(a.latitude())) * Math.cos(Math.toRadians(b.latitude())) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(h));
    }
}
