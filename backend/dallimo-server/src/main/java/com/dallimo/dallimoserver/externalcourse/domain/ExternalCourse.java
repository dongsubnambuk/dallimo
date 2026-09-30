package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;

import java.util.List;

/**
 * 외부 데이터에서 읽은 코스 후보 하나. 경로(line)는 원본 그대로이고, 저장할 때 코스용으로 다시 찍는다 (ExternalCoursePolicy).
 * sourceRef: 원본에서 이 코스를 가리키는 값. 같은 source · sourceRef는 한 번만 저장한다.
 */
public record ExternalCourse(CourseSource source, String sourceRef, String name, String description, String region, String difficulty,
                             List<String> tags, List<CourseRoute.Point> line, String attribution, String license, String sourceUrl) {

    static final int NAME_MAX = 100;
    static final int DESCRIPTION_MAX = 1000;
    static final int REGION_MAX = 50;

    public ExternalCourse {
        name = cut(clean(name), NAME_MAX);
        description = cut(clean(description), DESCRIPTION_MAX);
        region = cut(clean(region), REGION_MAX);
        tags = tags == null ? List.of() : List.copyOf(tags);
        line = List.copyOf(line);
    }

    /** HTML 태그 · 줄바꿈을 걷어 낸 한 줄 글. 비었으면 null */
    static String clean(String s) {
        if (s == null) return null;
        String t = s.replaceAll("(?i)<br\\s*/?>", " ").replaceAll("<[^>]*>", " ")
                .replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"")
                .replaceAll("\\s+", " ").trim();
        return t.isEmpty() ? null : t;
    }

    static String cut(String s, int max) {
        if (s == null || s.length() <= max) return s;
        return s.substring(0, max - 1).trim() + "…";
    }
}
