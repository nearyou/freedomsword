'use client';
import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import type { ElectionView } from '@/lib/contracts';
import { previewElections } from '@/lib/preview';
export function useElections() {
  const [elections, setElections] = useState<ElectionView[]>(previewElections);
  const [source, setSource] = useState<'preview' | 'database'>('preview');
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
        const data = await api<{ elections: ElectionView[] }>('elections');
        if (revision !== generation.current) return;
        setElections(data.elections);
        setSource('database');
        setError('');
      } catch {
        if (revision === generation.current)
          setError('Election refresh interrupted. Displayed totals may be out of date.');
      } finally {
        if (revision === generation.current) setLoading(false);
      }
    })();
    pending.current = task;
    await task;
    if (pending.current === task) pending.current = null;
  }, []);
  return { elections, source, loading, error, refresh };
}
