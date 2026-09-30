package com.dallimo.dallimoserver.common.observability;

import org.slf4j.MDC;

import java.util.regex.Pattern;

/**
 * 명세 21.1장 관측성 · 34장: 요청과 Run 흐름(생성 → 업로드 → Finish → 검증)을 로그에서 이어 볼 수 있게 MDC에 식별자를 둔다.
 * 로그 줄마다 [req=… user=… run=…]로 찍힌다 (application.yaml logging.pattern.correlation).
 * 위치 · 닉네임 · 이메일 같은 개인정보는 넣지 않는다. user는 내부 id만.
 */
public final class Correlation {

    public static final String HEADER = "X-Request-Id";
    public static final String REQUEST_ID = "requestId";
    public static final String USER_ID = "userId";
    public static final String RUN_ID = "runId";

    // 앱이 보낸 요청 id는 이 모양일 때만 쓴다 (로그를 어지럽히지 않게)
    private static final Pattern VALID = Pattern.compile("[A-Za-z0-9._-]{8,64}");

    private Correlation() {
    }

    public static boolean validRequestId(String id) {
        return id != null && VALID.matcher(id).matches();
    }

    public static void run(long runId) {
        MDC.put(RUN_ID, Long.toString(runId));
    }
}
