import type { CourseReview, ReportReason, ReviewScore } from '@/entities/course/types';

// 평가 질문 · 답 (1~3). 코스 상세 러닝 환경과 같은 말을 쓴다
export const REVIEW_QUESTIONS: { key: 'signalScore' | 'nightScore' | 'crowdScore' | 'surfaceScore'; label: string; answers: [string, string, string] }[] = [
  { key: 'signalScore', label: '신호', answers: ['적음', '보통', '많음'] },
  { key: 'nightScore', label: '야간 조명', answers: ['어두움', '보통', '밝음'] },
  { key: 'crowdScore', label: '혼잡', answers: ['한적함', '보통', '붐빔'] },
  { key: 'surfaceScore', label: '노면', answers: ['울퉁불퉁', '보통', '고름'] },
];

export const REPORT_REASONS: { key: ReportReason; label: string; hint: string }[] = [
  { key: 'DANGER', label: '위험해요', hint: '공사 · 차도 · 낙석처럼 달리기 위험한 곳이 있어요' },
  { key: 'PRIVATE_PROPERTY', label: '사유지예요', hint: '들어가면 안 되는 곳을 지나요' },
  { key: 'WRONG_INFO', label: '정보가 틀려요', hint: '이름 · 설명 · 경로가 실제와 달라요' },
  { key: 'OTHER', label: '그 밖의 문제', hint: '' },
];

/** 평가 한 줄 아래 환경 요약. 예: "신호 적음 · 야간 조명 밝음 · 화장실 있음" */
export function reviewFacts(r: CourseReview): string {
  const facts = REVIEW_QUESTIONS.filter((q) => r[q.key] != null).map((q) => `${q.label} ${q.answers[(r[q.key] as ReviewScore) - 1]}`);
  if (r.hasToilet != null) facts.push(`화장실 ${r.hasToilet ? '있음' : '없음'}`);
  if (r.hasWater != null) facts.push(`급수대 ${r.hasWater ? '있음' : '없음'}`);
  return facts.join(' · ');
}
