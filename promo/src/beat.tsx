import { createContext, useContext } from 'react';

// 장면 안 움직임을 배경 음악 박에 맞춘다. Promo가 장면마다 박 격자와 장면 시작 프레임을 넣어 준다
type Beat = { start: number; drop: number; beat: number };
export const BeatContext = createContext<Beat | null>(null);

// 장면 안 프레임 delay를 가장 가까운 박으로 옮긴다 (박 격자가 없으면 그대로)
export function useOnBeat(delay: number) {
  const b = useContext(BeatContext);
  if (!b) return delay;
  const k = Math.round((b.start + delay - b.drop) / b.beat);
  return Math.round(b.drop + k * b.beat) - b.start;
}
