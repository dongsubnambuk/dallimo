// 이용약관 · 개인정보 처리방침 본문 (사용자 결정: 통상적인 내용으로, 결정 로그 66항).
// 문단이 "· "로 시작하면 목록 한 줄로 보여 준다.
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = { title: string; effectiveDate: string; intro: string; sections: LegalSection[] };

// 운영자 · 개인정보 보호책임자. 출시 전에 실제 값으로 바꾼다 (법정 기재 사항)
export const LEGAL_CONTACT = {
  operator: '달리모 운영자',
  officer: '[개인정보 보호책임자 이름]',
  email: '[문의 이메일]',
};

export const EFFECTIVE_DATE = '2026년 10월 1일';
