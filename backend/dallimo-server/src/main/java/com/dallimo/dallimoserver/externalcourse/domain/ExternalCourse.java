package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 외부 데이터에서 읽은 코스 후보 하나. 경로(line)는 원본 그대로이고, 저장할 때 코스용으로 다시 찍는다 (ExternalCoursePolicy).
 * sourceRef: 원본에서 이 코스를 가리키는 값. 같은 source · sourceRef는 한 번만 저장한다.
 */
public record ExternalCourse(CourseSource source, String sourceRef, String name, String description, String region, String difficulty,
                             List<String> tags, List<CourseRoute.Point> line, String attribution, String license, String sourceUrl) {

    static final int NAME_MAX = 100;
    static final int DESCRIPTION_MAX = 1000;
    static final int REGION_MAX = 50;
    // 코스 태그 최대 길이 · 개수 (tbl_course_tag, 사용자 코스와 같다)
    static final int TAG_MAX = 20;
    static final int TAGS_MAX = 6;

    public ExternalCourse {
        name = cut(oneLine(clean(name)), NAME_MAX);
        description = cut(clean(description), DESCRIPTION_MAX);
        region = cut(oneLine(clean(region)), REGION_MAX);
        tags = tags == null ? List.of() : tags.stream().map(ExternalCourse::tag).filter(t -> t != null).distinct().limit(TAGS_MAX).toList();
        line = List.copyOf(line);
    }

    /** 태그로 쓸 수 있게 한 줄 · 20자 */
    public static String tag(String s) {
        String t = oneLine(clean(s));
        return t == null ? null : t.length() <= TAG_MAX ? t : t.substring(0, TAG_MAX).trim();
    }

    /** HTML 태그를 걷어 낸 글. 줄바꿈(br · p)은 줄로 남기고 빈 줄은 뺀다. 비었으면 null */
    static String clean(String s) {
        if (s == null) return null;
        String t = s.replaceAll("(?i)<br\\s*/?>|</p>", "\n").replaceAll("<[^>]*>", " ")
                .replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"");
        String joined = t.lines().map(l -> l.replaceAll("\\s+", " ").trim()).filter(l -> !l.isEmpty()).collect(Collectors.joining("\n"));
        return joined.isEmpty() ? null : joined;
    }

    static String oneLine(String s) {
        return s == null ? null : s.replace('\n', ' ');
    }

    static String cut(String s, int max) {
        if (s == null || s.length() <= max) return s;
        return s.substring(0, max - 1).trim() + "…";
    }
}
