// 자동 생성 파일. 직접 고치지 않는다 (FOUNDATION-DECISION-LOG 11항).
// 달리모 워드마크·심볼 geometry. 단위는 Pretendard Black의 글꼴 단위(UPM 2048), y는 아래로 증가.
// "달", "리"는 Pretendard Black(SIL OFL 1.1) 글리프 윤곽이고, "모"는 ㅁ을 코스 루프 + 출발점으로 다시 그린 전용 글자다.
export const WORDMARK = {
  width: 5172,
  height: 2170,
  top: -20,
  // 글리프 윤곽(dal, ri)은 y가 위로 증가하는 글꼴 좌표라 baseline에서 뒤집어 그린다
  baseline: 1950,
  dal: "M932 1562H94V764H256C666 764 890 768 1114 824L1082 1068C888 1027 709 1014 414 1010V1312H932ZM1522 1652H1200V738H1522V1068H1752V1328H1522ZM1522 674H266V422H1202V364H266V-182H1566V74H584V130H1522Z",
  ri: "M1606 1652H1286V-204H1606ZM1026 1506H136V1250H698V1008H136V220H310C660 220 930 230 1210 282L1184 540C949 500 732 485 468 482V758H1026Z",
  riX: 1700,
  moX: 3400,
} as const;

// "모" 한 글자 (심볼). 기준 x=0
export const MO = {
  loop: { x: 353, y: 569, width: 1060, height: 640, radius: 95, stroke: 290 },
  stem: { x: 726, y: 1354, width: 318, height: 372 },
  bar: { x: 42, y: 1686, width: 1690, height: 260 },
  dot: { x: 1190, y: 569, r: 150, ring: 80 },
  // 심볼 외곽 (점 포함)
  bounds: { x: 42, y: 379, width: 1690, height: 1567 },
} as const;
