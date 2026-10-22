import { useEffect, useState } from 'react';

/** Delays a fast-changing value (search input) so we do not call the API on every keystroke. */
export function useDebounce<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
