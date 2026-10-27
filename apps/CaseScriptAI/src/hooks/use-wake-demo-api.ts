import { useCallback, useEffect, useState } from 'react';

import { wakeDemoApi } from '@/services/api/wake-demo-api';

type WakeState = {
  isWaking: boolean;
  isReady: boolean;
  wasColdStart: boolean;
  error: string | null;
  retry: () => void;
};

export const useWakeDemoApi = (): WakeState => {
  const [isWaking, setIsWaking] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [wasColdStart, setWasColdStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsWaking(true);
    setIsReady(false);
    setError(null);

    void (async () => {
      const result = await wakeDemoApi();
      if (cancelled) return;
      setIsWaking(false);
      if (!result.success) {
        setError(result.error);
        setIsReady(false);
        return;
      }
      setWasColdStart(result.data.wasColdStart);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { isWaking, isReady, wasColdStart, error, retry };
};
