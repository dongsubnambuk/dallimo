import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RatingStars } from '@/components/RatingStars';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AppText } from '@/design/primitives';
import { useTheme } from '@/design/theme';
import { fontFamily, radius, spacing } from '@/design/tokens';
import { getCourseRepository } from '@/entities/course/api';
import type { CourseDetail } from '@/entities/course/types';
import { agoLabel } from '@/features/friends/labels';

import { reviewFacts } from '../reviewLabels';

// REV-001 완주자 평가 (61.1장 4차 "리뷰"). 평균 · 수 → 평가하기(인증 완주한 사람만) → 최근 평가.
export function ReviewsSection({ course }: { course: CourseDetail }) {
  const { colors } = useTheme();
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const list = useInfiniteQuery({
    queryKey: ['course', course.id, 'reviews'],
    queryFn: ({ pageParam }) => repo.getReviews(course.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const reviews = list.data?.pages.flatMap((p) => p.items) ?? [];
  const r = course.rating;
  const write = () => router.push({ pathname: '/course/[id]/review', params: { id: course.id } });

  return (
    <View style={styles.root}>
      {r.count > 0 && r.avg != null ? (
        <View style={styles.summary} accessible accessibilityLabel={`평점 5점 만점에 ${r.avg}점, 평가 ${r.count}개`}>
          <AppText role="metricLarge" tabular style={styles.avg}>
            {r.avg.toFixed(1)}
          </AppText>
          <View style={styles.summaryText}>
            <RatingStars value={r.avg} size={18} />
            <AppText role="caption" tone="secondary" tabular>
              완주자 {r.count}명의 평가
            </AppText>
          </View>
        </View>
      ) : (
        <AppText role="body" tone="secondary">
          아직 평가가 없어요.{r.canReview ? ' 이 코스를 완주했으니 첫 평가를 남겨 보세요.' : ''}
        </AppText>
      )}

      {r.canReview ? (
        <SecondaryButton label={r.mine ? '내 평가 고치기' : '평가하기'} size="sm" emphasized={!r.mine} onPress={write} style={styles.write} />
      ) : (
        <AppText role="caption" tone="secondary">
          이 코스를 인증 완주하면 평가할 수 있어요
        </AppText>
      )}

      {reviews.map((v) => (
        <View key={v.id} style={[styles.review, { borderTopColor: colors.border.subtle }]}>
          <View style={styles.reviewHead}>
            <AppText role="label" style={styles.bold} numberOfLines={1}>
              {v.isMine ? `${v.nickname} (나)` : v.nickname}
            </AppText>
            <View accessible accessibilityLabel={`${v.rating}점`}>
              <RatingStars value={v.rating} size={12} />
            </View>
            <AppText role="caption" tone="secondary" style={styles.ago}>
              {agoLabel(v.createdAt)}
            </AppText>
          </View>
          {v.content ? <AppText role="body">{v.content}</AppText> : null}
          {reviewFacts(v) ? (
            <AppText role="caption" tone="secondary">
              {reviewFacts(v)}
            </AppText>
          ) : null}
        </View>
      ))}
      {list.hasNextPage ? (
        <SecondaryButton label={list.isFetchingNextPage ? '불러오는 중' : '평가 더 보기'} size="sm" onPress={() => list.fetchNextPage()} style={styles.write} />
      ) : null}
      {list.isError ? (
        <AppText role="caption" tone="secondary">
          평가를 불러오지 못했어요.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avg: {
    fontFamily: fontFamily.extrabold,
  },
  summaryText: {
    gap: spacing.xs,
  },
  write: {
    alignSelf: 'flex-start',
  },
  review: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.control,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ago: {
    marginLeft: 'auto',
  },
  bold: {
    fontFamily: fontFamily.bold,
    flexShrink: 1,
  },
});
