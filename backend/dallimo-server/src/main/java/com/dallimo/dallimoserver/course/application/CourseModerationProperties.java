package com.dallimo.dallimoserver.course.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 코스 신고 처리 (FOUNDATION-DECISION-LOG 53항). 값은 명세에 없어 정한 시작값 (backend/README 결정 사항).
 *
 * @param autoHideReports 만든 사람이 아닌 서로 다른 사람의 열린 신고가 이만큼 쌓이면 자동으로 숨긴다
 */
@ConfigurationProperties("dallimo.moderation")
public record CourseModerationProperties(Integer autoHideReports) {

    public CourseModerationProperties {
        autoHideReports = autoHideReports == null ? 3 : autoHideReports;
    }
}
