import type { CourseDetail, NewCourseInput } from '../types';

// CREG-004 코스 등록 (POST /api/v1/courses). 서버가 source Run의 경로를 코스용으로 정규화해 불변 snapshot으로 만든다 (43.1장).
export interface CourseRegistrationRepository {
  create(input: NewCourseInput): Promise<CourseDetail>;
}

// 코스 이름 길이는 course.name VARCHAR(100)을 따른다. 명세에 따로 정한 길이 규칙은 없다.
export const COURSE_NAME_MAX = 100;
