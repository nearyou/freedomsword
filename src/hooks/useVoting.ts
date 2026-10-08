'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
export type Action = { path: string; payload: Record<string, unknown>; success: string };
export function useVoting(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const [retry, setRetry] = useState<Action | null>(null);
  useEffect(() => {
    if (!notice?.success) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function execute(action: Action) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    setRetry(null);
    try {
      await api(action.path, action.payload);
      setNotice({ message: action.success, success: true });
      await refresh();
      return true;
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Connection interrupted. Please retry.',
        success: false,
      });
      if (action.path === 'vote' || action.path === 'recall') setRetry(action);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    notice,
    retry,
    execute,
    reportError: (message: string) => setNotice({ message, success: false }),
    dismiss: () => {
      setNotice(null);
      setRetry(null);
    },
  };
}
