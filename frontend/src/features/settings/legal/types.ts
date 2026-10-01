// 서비스 이용약관 · 위치기반서비스 이용약관 · 개인정보 처리방침 본문 (사용자 결정: 정식 법률 문서 형식, 결정 로그 66항).
// 문단은 앞머리로 모양을 정한다.
//   "①" ~ "⑳"  항. 번호를 내어 쓴다
//   "1. "       호. 한 단 들여 쓴다
//   "가. "      목. 두 단 들여 쓴다
//   그 밖       보통 문단
// 표는 { head, rows }로 쓴다. 휴대폰 폭에 맞게 열은 3개까지만 쓴다.
export type LegalTable = { head: string[]; rows: string[][] };
export type LegalBlock = string | LegalTable;
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = { title: string; effectiveDate: string; intro: string; sections: LegalSection[] };

// 운영자 · 개인정보 보호책임자. 출시 전에 실제 값으로 바꾼다 (법정 기재 사항)
export const LEGAL_CONTACT = {
  operator: '달리모 운영자',
  officer: '[개인정보 보호책임자 이름]',
  email: '[문의 이메일]',
  // 위치기반서비스사업자 신고에 쓴 주소와 같게
  address: '[사업장 주소]',
};

export const EFFECTIVE_DATE = '2026년 10월 1일';
