// 코스 경로 미리보기 (지도 없이 선만). 공개 코스 경로라 관리 화면에 보여 줘도 된다 (결정 로그 85항: 회원 달리기 GPS는 보여 주지 않는다)

export function RouteSketch({ route, label }: { route: [number, number][]; label: string }) {
  if (route.length < 2) return <div className="route route-empty">경로 정보가 없어요</div>;
  const W = 320;
  const H = 200;
  const PAD = 16;
  // 위도에 따라 경도 간격이 줄어드는 만큼 맞춘다
  const midLat = route.reduce((s, [lat]) => s + lat, 0) / route.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = route.map(([, lng]) => lng * kx);
  const ys = route.map(([lat]) => lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((W - PAD * 2) / Math.max(maxX - minX, 1e-9), (H - PAD * 2) / Math.max(maxY - minY, 1e-9));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const pts = xs.map((x, i) => [ox + (x - minX) * scale, H - (oy + (ys[i] - minY) * scale)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg className="route" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <path d={d} fill="none" className="route-line" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r={5} className="route-end" />
      <circle cx={sx} cy={sy} r={5} className="route-start" />
    </svg>
  );
}
