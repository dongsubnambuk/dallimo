package com.dallimo.dallimoserver.common.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 메일 발송 설정 (dallimo.mail). 사용자 결정: 이메일 인증 메일은 Resend로 보낸다 (FOUNDATION-DECISION-LOG 58항).
 *
 * @param provider      resend: Resend API로 보낸다, log: 보내지 않고 로그만 (로컬 · 테스트)
 * @param resendApiKey  Resend API 키(re_…, 환경변수 RESEND_API_KEY. 저장소에 넣지 않는다)
 * @param resendUrl     Resend 메일 보내기 주소
 * @param from          보내는 사람. Resend에서 인증한 도메인의 주소여야 한다 (예: 달리모 &lt;no-reply@dallimo.app&gt;)
 */
@ConfigurationProperties("dallimo.mail")
public record MailProperties(String provider, String resendApiKey, String resendUrl, String from) {

    public MailProperties {
        if (provider == null || provider.isBlank()) provider = "resend";
        if (resendUrl == null || resendUrl.isBlank()) resendUrl = "https://api.resend.com/emails";
        if (from == null || from.isBlank()) from = "달리모 <onboarding@resend.dev>";
    }
}
