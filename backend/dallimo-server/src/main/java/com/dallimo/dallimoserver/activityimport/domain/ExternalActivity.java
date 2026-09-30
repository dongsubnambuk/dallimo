package com.dallimo.dallimoserver.activityimport.domain;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunSource;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 122.2장 ExternalActivity DTO → Normalize. 기기의 건강 앱에서 읽은 달리기 하나.
 * 시각은 UTC Instant, 거리 m, 시간 초. 경로 point는 시각 순으로 줄 세우고 같은 시각은 하나만 남긴 뒤 seq를 1부터 붙인다.
 * 실내 달리기처럼 경로가 없으면 앱이 잰 거리(distanceM)를 쓴다.
 */
public record ExternalActivity(RunSource source, String externalId, String sourceProvider, String sourceDeviceName,
                               Instant startedAt, Instant endedAt, int activeSeconds, Integer distanceM, List<RunPoint> points) {

    public static final int MAX_POINTS = 20_000;
    public static final Duration MAX_DURATION = Duration.ofHours(24);
    // 원본 경로는 운동 시작 · 끝보다 조금 앞뒤로 찍힐 수 있다
    private static final Duration EDGE = Duration.ofMinutes(2);

    /** 확인하고 정규화한 값. 틀리면 VALIDATION_ERROR (가져오기 기록부에 사유를 남긴다) */
    public ExternalActivity normalized() {
        if (source == null || !source.importable()) throw invalid("아직 가져올 수 없는 기록이에요.");
        if (externalId == null || externalId.isBlank() || externalId.length() > 191) throw invalid("원본 기록 id가 올바르지 않아요.");
        if (startedAt == null || endedAt == null || !endedAt.isAfter(startedAt)) throw invalid("시작 · 끝 시각이 올바르지 않아요.");
        Duration wall = Duration.between(startedAt, endedAt);
        if (wall.compareTo(MAX_DURATION) > 0) throw invalid("24시간이 넘는 기록은 가져올 수 없어요.");
        if (activeSeconds < 0 || activeSeconds > wall.toSeconds() + 1) throw invalid("달린 시간이 시작~끝 시간보다 길어요.");
        if (distanceM != null && (distanceM < 0 || distanceM > 300_000)) throw invalid("거리가 범위를 벗어났어요.");
        List<RunPoint> raw = points == null ? List.of() : points;
        if (raw.size() > MAX_POINTS) throw invalid("경로 point는 %d개까지 가져올 수 있어요.".formatted(MAX_POINTS));
        List<RunPoint> sorted = new ArrayList<>(raw);
        sorted.sort(Comparator.comparing(RunPoint::recordedAt));
        List<RunPoint> out = new ArrayList<>(sorted.size());
        Instant last = null;
        for (RunPoint p : sorted) {
            if (p.recordedAt() == null || Math.abs(p.latitude()) > 90 || Math.abs(p.longitude()) > 180) throw invalid("경로 좌표가 올바르지 않아요.");
            if (p.recordedAt().isBefore(startedAt.minus(EDGE)) || p.recordedAt().isAfter(endedAt.plus(EDGE))) continue;
            if (p.recordedAt().equals(last)) continue;
            last = p.recordedAt();
            out.add(new RunPoint(out.size() + 1, p.latitude(), p.longitude(), p.altitudeM(), p.accuracyM(), p.speedMps(), p.recordedAt()));
        }
        if (out.isEmpty() && distanceM == null) throw invalid("경로도 거리도 없는 기록이에요.");
        String provider = trim(sourceProvider, 100);
        String device = trim(sourceDeviceName, 100);
        return new ExternalActivity(source, externalId.trim(), provider, device, startedAt, endedAt, activeSeconds, distanceM, List.copyOf(out));
    }

    private static String trim(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.strip();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static ApiException invalid(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }
}
