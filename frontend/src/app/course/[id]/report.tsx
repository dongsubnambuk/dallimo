import { useLocalSearchParams } from 'expo-router';

import { CourseReportScreen } from '@/features/course/CourseReportScreen';

// CREG-005 코스 신고 (모달)
export default function CourseReportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseReportScreen id={id} />;
}
