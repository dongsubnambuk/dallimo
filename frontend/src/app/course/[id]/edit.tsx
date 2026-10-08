import { useLocalSearchParams } from 'expo-router';

import { CourseEditScreen } from '@/features/course-create/CourseEditScreen';

// 내 코스 고치기 (모달, 결정 로그 90항)
export default function CourseEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseEditScreen id={id} />;
}
