import { useLocalSearchParams } from 'expo-router';

import { CourseReviewScreen } from '@/features/course/CourseReviewScreen';

// REV-001 코스 평가 쓰기 (모달)
export default function CourseReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseReviewScreen id={id} />;
}
