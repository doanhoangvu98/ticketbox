import { useEffect, useState } from 'react';

/**
 * Seconds remaining until `deadline` (ISO string). Recomputed from the clock every second,
 * not decremented, so it stays correct if the tab was in the background.
 */
export function useCountdown(deadline: string | undefined): number {
  const compute = () => (deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    setSeconds(compute());
    if (!deadline) return;
    const timer = setInterval(() => setSeconds(compute()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return seconds;
}

export function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
