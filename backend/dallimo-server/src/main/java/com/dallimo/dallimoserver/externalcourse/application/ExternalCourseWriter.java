package com.dallimo.dallimoserver.externalcourse.application;

import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseJpaRepository;
import com.dallimo.dallimoserver.externalcourse.domain.ExternalCourse;
import com.dallimo.dallimoserver.externalcourse.infrastructure.ExternalCourseJdbcRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/** 코스 하나를 한 트랜잭션으로 저장한다 (외부 호출은 트랜잭션 밖에서) */
@Component
class ExternalCourseWriter {

    private final CourseJpaRepository courses;
    private final CourseJdbcRepository store;
    private final ExternalCourseJdbcRepository external;
    private final Clock clock;

    ExternalCourseWriter(CourseJpaRepository courses, CourseJdbcRepository store, ExternalCourseJdbcRepository external, Clock clock) {
        this.courses = courses;
        this.store = store;
        this.external = external;
        this.clock = clock;
    }

    @Transactional
    public long insert(ExternalCourse c, CourseRoute.Normalized route) {
        Instant now = clock.instant();
        long creator = external.systemUserId(now);
        Course course = courses.saveAndFlush(Course.createExternal(creator, c.name(), c.description(), c.region(), c.difficulty(), route,
                c.source(), c.sourceRef(), c.attribution(), c.license(), c.sourceUrl(), now));
        store.insertRoute(course.getId(), route.points());
        store.insertTags(course.getId(), c.tags());
        return course.getId();
    }
}
