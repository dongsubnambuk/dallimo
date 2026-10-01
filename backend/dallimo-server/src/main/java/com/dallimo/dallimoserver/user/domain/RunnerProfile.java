package com.dallimo.dallimoserver.user.domain;

/**
 * 온보딩 러너 정보 (FOUNDATION-DECISION-LOG 64항). 고르지 않은 값은 null.
 * 앱이 탐색 추천 코스(CRS-005)에 쓴다. 서버는 저장해서 돌려주기만 한다
 */
public record RunnerProfile(Distance distance, Experience experience, PreferredTime preferredTime) {

    public static final RunnerProfile EMPTY = new RunnerProfile(null, null, null);

    /** 평소 달리는 거리 */
    public enum Distance {
        UNDER_3K, K3_TO_5, K5_TO_10, OVER_10K
    }

    /** 러닝 경험: 이제 시작 · 가끔 · 꾸준히 */
    public enum Experience {
        BEGINNER, OCCASIONAL, REGULAR
    }

    /** 주로 달리는 시간 */
    public enum PreferredTime {
        MORNING, DAYTIME, EVENING, NIGHT
    }
}
