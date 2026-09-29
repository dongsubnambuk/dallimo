package com.dallimo.dallimoserver.course.infrastructure;

/**
 * REV-001 · CRS-102 완주자 평가를 모은 값. 평가가 없으면 평균은 null.
 * surface · signal · night · crowd는 1~3 평균, toilet · water는 "있었다"가 절반 이상인지 (답한 사람이 없으면 null).
 */
public record ReviewSummary(Double ratingAvg, int reviewCount, Double surface, Double signal, Double night, Double crowd, Boolean toilet, Boolean water) {

    public static final ReviewSummary EMPTY = new ReviewSummary(null, 0, null, null, null, null, null, null);
}
