// 서비스 이용약관 · 위치기반서비스 이용약관 · 개인정보 처리방침 본문 (사용자 결정: 정식 법률 문서 형식, 결정 로그 66항).
// 문단은 앞머리로 모양을 정한다.
//   "①" ~ "⑳"  항. 번호를 내어 쓴다
//   "1. "       호. 한 단 들여 쓴다
//   "가. "      소제목. 진하게 쓴다
//   "· "        목록. 한 단 들여 쓴다
//   그 밖       보통 문단
// 표는 { head, rows }로 쓴다. 휴대폰 폭에 맞게 열은 3개까지만 쓴다.
export type LegalTable = { head: string[]; rows: string[][] };
export type LegalBlock = string | LegalTable;
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = { title: string; effectiveDate: string; intro: string; sections: LegalSection[] };

// 운영 주체와 연락처 (사용자 결정: "달리모 운영팀"으로 쓴다, 결정 로그 67항).
// 운영팀이 개인정보 보호책임자 · 위치정보관리책임자를 맡는다.
// 연락은 이메일을 공개하지 않고 소개 사이트 문의 페이지의 문의 양식으로 받는다 (사용자 결정, 결정 로그 71항)
export const LEGAL_CONTACT = {
  operator: '달리모 운영팀',
  support: 'https://dallimo-landing.kro.kr/support/',
};

export const EFFECTIVE_DATE = '2026년 10월 1일';
