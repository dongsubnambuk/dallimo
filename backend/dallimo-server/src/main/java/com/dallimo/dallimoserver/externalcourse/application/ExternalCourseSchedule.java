package com.dallimo.dallimoserver.externalcourse.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 외부 추천 코스 주기 가져오기. dallimo.external-courses.schedule.cron이 "-"(기본)이면 돌지 않는다.
 * 설정한 OSM 박스를 차례로 읽고, 두루누비 인증키가 있으면 두루누비도 읽는다. 이미 가져온 원본은 건너뛴다.
 */
@Component
class ExternalCourseSchedule {

    private static final Logger log = LoggerFactory.getLogger(ExternalCourseSchedule.class);

    private final ExternalCourseImportService imports;
    private final ExternalCourseProperties props;

    ExternalCourseSchedule(ExternalCourseImportService imports, ExternalCourseProperties props) {
        this.imports = imports;
        this.props = props;
    }

    @Scheduled(cron = "${dallimo.external-courses.schedule.cron:-}")
    void run() {
        for (String box : props.schedule().boxes()) {
            try {
                String[] v = box.split(",");
                if (v.length != 4) throw new IllegalArgumentException("south,west,north,east 형식이 아니에요");
                imports.importOsm(Double.parseDouble(v[0].trim()), Double.parseDouble(v[1].trim()), Double.parseDouble(v[2].trim()),
                        Double.parseDouble(v[3].trim()));
            } catch (RuntimeException e) {
                log.warn("scheduled OSM import failed for box {}: {}", box, e.getMessage());
            }
        }
        if (props.durunubi().enabled()) {
            try {
                imports.importDurunubi();
            } catch (RuntimeException e) {
                log.warn("scheduled Durunubi import failed: {}", e.getMessage());
            }
        }
    }
}
