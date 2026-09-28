import { useEffect, useState } from 'react';

/** 현재 시각(ms)을 intervalMs마다 갱신한다. 렌더 중에 Date.now()를 직접 부르지 않기 위해 쓴다. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
