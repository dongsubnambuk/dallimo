import { useEffect, useState } from 'react';

import { useRunSnapshot } from '@/features/run/engine/activeRunSession';
import { activeMs, type RunningEngine } from '@/features/run/engine/runningEngine';

// active 경과(초). 초 단위 갱신을 이 hook을 쓰는 컴포넌트 안에만 가둔다 (VISUAL-QA: metric state 분리).
export function useElapsedSec(engine: RunningEngine) {
  const base = useRunSnapshot(engine, (s) => s.activeMsBase);
  const since = useRunSnapshot(engine, (s) => s.runningSince);
  const read = () => Math.floor(activeMs({ activeMsBase: base, runningSince: since }, engine.now()) / 1000);
  const [sec, setSec] = useState(read);

  useEffect(() => {
    const update = () => setSec(Math.floor(activeMs({ activeMsBase: base, runningSince: since }, engine.now()) / 1000));
    update();
    if (since == null) return;
    const t = setInterval(update, 250);
    return () => clearInterval(t);
  }, [base, since, engine]);

  return sec;
}
