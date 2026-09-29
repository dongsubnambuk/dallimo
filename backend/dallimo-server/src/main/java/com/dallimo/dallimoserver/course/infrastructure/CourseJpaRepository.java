package com.dallimo.dallimoserver.course.infrastructure;

import com.dallimo.dallimoserver.course.domain.Course;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CourseJpaRepository extends JpaRepository<Course, Long> {

    // 이 사용자가 볼 수 있는 코스: 삭제 · HIDDEN · BLOCKED 제외, 공개 또는 내가 만든 것
    String VISIBLE = """
            c.deletedAt IS NULL
            AND c.status NOT IN (com.dallimo.dallimoserver.course.domain.CourseStatus.HIDDEN, com.dallimo.dallimoserver.course.domain.CourseStatus.BLOCKED)
            AND (c.visibility = com.dallimo.dallimoserver.course.domain.CourseVisibility.PUBLIC OR c.creatorId = :viewerId)""";

    /** 23.2장: 출발점이 bounding box 안인 후보. 실제 거리는 애플리케이션에서 계산한다 */
    @Query("SELECT c FROM Course c WHERE " + VISIBLE + """
             AND c.startLat BETWEEN :minLat AND :maxLat
             AND c.startLng BETWEEN :minLng AND :maxLng""")
    List<Course> findInBox(@Param("viewerId") Long viewerId,
                           @Param("minLat") java.math.BigDecimal minLat, @Param("maxLat") java.math.BigDecimal maxLat,
                           @Param("minLng") java.math.BigDecimal minLng, @Param("maxLng") java.math.BigDecimal maxLng);

    /** 이름 검색 (CRS-003). 최근 등록순, id cursor */
    @Query("SELECT c FROM Course c WHERE " + VISIBLE + """
             AND LOWER(c.name) LIKE :pattern ESCAPE '!'
             AND (:beforeId IS NULL OR c.id < :beforeId)
            ORDER BY c.id DESC""")
    List<Course> search(@Param("viewerId") Long viewerId, @Param("pattern") String pattern, @Param("beforeId") Long beforeId, Pageable page);

    @Query("SELECT c FROM Course c WHERE c.creatorId = :userId AND c.deletedAt IS NULL ORDER BY c.createdAt DESC, c.id DESC")
    List<Course> findCreatedBy(@Param("userId") long userId);

    @Query("SELECT c FROM Course c WHERE " + VISIBLE + " AND c.id IN :ids")
    List<Course> findVisible(@Param("viewerId") Long viewerId, @Param("ids") List<Long> ids);
}
