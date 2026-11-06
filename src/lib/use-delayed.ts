import { useEffect, useState } from 'preact/hooks';

/** `true` only after `active` has stayed true for `ms`: a fast load never flashes a skeleton. */
export function useDelayed(active: boolean, ms = 150): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) return setLate(false);
    const timer = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return active && late;
}
