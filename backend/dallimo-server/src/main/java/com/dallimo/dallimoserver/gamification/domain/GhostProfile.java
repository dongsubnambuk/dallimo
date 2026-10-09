package com.dallimo.dallimoserver.gamification.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;

import java.util.ArrayList;
import java.util.List;

/**
 * 124장 Ghost / Pace Chase: 공식 기록 하나를 "코스 위 거리 → 그때까지 걸린 초"로 줄인다.
 * 앱은 이 값으로 같은 거리에서 고스트보다 몇 초 앞섰는지, 지금 고스트가 코스 어디쯤인지 안다.
 * 원래 GPS 좌표는 내보내지 않는다 (129장: 다른 사람의 정확한 위치를 보여주지 않는다). 구간 기록과 같은 투영(SegmentTimer)을 쓴다.
 */
public final class GhostProfile {

    // 이 간격(m)마다 한 점
    public static final double STEP_M = 50;

    private GhostProfile() {
    }

    /**
     * [코스 위 거리(m), 걸린 초] 목록. 0m에서 0초, 코스 끝에서 공식 기록(recordSec)이 되게 맞춘다.
     * 경로를 따라가지 못하면(point가 코스 밖) 빈 목록
     */
    public static List<double[]> of(List<CourseRoute.Point> route, List<RunPoint> raw, int courseLengthM, int recordSec) {
        return of(route, raw, courseLengthM, recordSec, true);
    }

    /** checkAccuracy: false면 point를 정확도로 거르지 않는다 (가져온 경로, RunMetrics.checksAccuracy) */
    public static List<double[]> of(List<CourseRoute.Point> route, List<RunPoint> raw, int courseLengthM, int recordSec, boolean checkAccuracy) {
        List<double[]> out = new ArrayList<>();
        if (route.size() < 2 || courseLengthM <= 0 || recordSec <= 0) return out;
        SegmentTimer.Track track = SegmentTimer.track(route, RunMetrics.compute(raw, checkAccuracy).accepted());
        if (track.progress().length < 2) return out;
        // 평면 근사 경로 길이와 코스 길이를 맞춘다
        double scale = track.total() / courseLengthM;
        Double start = track.secondsAt(0);
        double reached = track.max() / scale;
        Double end = reached >= courseLengthM - SegmentTimer.END_TOLERANCE_M ? track.secondsAt(Math.min(track.total(), track.max())) : null;
        if (start == null || end == null || end <= start) return out;
        // 걸린 시간을 공식 기록에 맞춘다 (공식 기록은 출발 · 도착 반경 안 가장 가까운 point 사이)
        double fit = recordSec / (end - start);
        for (double m = 0; m < courseLengthM; m += STEP_M) {
            Double s = track.secondsAt(Math.min(m * scale, track.max()));
            if (s == null) break;
            out.add(new double[]{Math.round(m), Math.round((s - start) * fit * 10) / 10.0});
        }
        out.add(new double[]{courseLengthM, recordSec});
        // 앞으로만 늘게 (보간 오차로 줄어드는 곳이 없게)
        for (int i = 1; i < out.size(); i++) out.get(i)[1] = Math.max(out.get(i)[1], out.get(i - 1)[1]);
        return out;
    }
}
