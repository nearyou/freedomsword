'use client';
import { useCallback, useRef, useState } from 'react';
import { api, ClientApiError } from '@/lib/client-api';
import type { CitizenView } from '@/lib/contracts';
export const initialCitizen: CitizenView = {
  connected: false,
  verified: false,
  agreementSigned: false,
  provider: 'MOCK',
  signedPlatforms: [],
  votes: [],
};
export function useCitizen() {
  const [citizen, setCitizen] = useState(initialCitizen);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async (force = false) => {
    if (pending.current) {
      await pending.current;
      if (!force) return;
    }
    const revision = ++generation.current;
    const task = (async () => {
      try {
        const next = await api<CitizenView>('me');
        if (revision !== generation.current) return;
        setCitizen(next);
        setError('');
      } catch (failure) {
        if (revision !== generation.current) return;
        if (failure instanceof ClientApiError && failure.status === 401) {
          setCitizen(initialCitizen);
          setError(
            failure.code === 'SESSION_EXPIRED'
              ? 'Your session expired. Connect Telegram again.'
              : '',
          );
        } else {
          setError(
            'Your private ballot refresh was interrupted. Your last known state is preserved.',
          );
        }
      } finally {
        if (revision === generation.current) setLoading(false);
      }
    })();
    pending.current = task;
    await task;
    if (pending.current === task) pending.current = null;
  }, []);
  const clear = useCallback(() => {
    generation.current++;
    setCitizen(initialCitizen);
    setError('');
    setLoading(false);
  }, []);
  return { citizen, loading, error, refresh, clear };
}
