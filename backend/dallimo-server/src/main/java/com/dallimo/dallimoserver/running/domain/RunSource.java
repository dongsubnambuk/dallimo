package com.dallimo.dallimoserver.running.domain;

/**
 * 122.1장 RunSource. 어디서 기록한 러닝인가, 얼마나 믿는가(trust_level), 지금 가져올 수 있는가.
 * 1.5차는 APPLE_HEALTH · HEALTH_CONNECT만 가져온다. GARMIN · COROS는 필드만 먼저 두고, GPX는 공식 기록에서 뺀다.
 */
public enum RunSource {
    DALLIMO("HIGH"),
    APPLE_HEALTH("MEDIUM"),
    HEALTH_CONNECT("MEDIUM"),
    GARMIN("MEDIUM"),
    COROS("MEDIUM"),
    GPX_IMPORT("LOW");

    private final String trustLevel;

    RunSource(String trustLevel) {
        this.trustLevel = trustLevel;
    }

    public String trustLevel() {
        return trustLevel;
    }

    /** 지금 가져오기를 받는 source (122.1장 1.5차) */
    public boolean importable() {
        return this == APPLE_HEALTH || this == HEALTH_CONNECT;
    }

    /** 공식 코스 기록이 될 수 있는가 (GPX는 기본 제외) */
    public boolean rankable() {
        return this != GPX_IMPORT;
    }
}
