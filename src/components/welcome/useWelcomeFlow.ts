'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import type { CitizenView } from '@/lib/contracts';
import type { AgreementDocument } from '@/components/onboarding/CitizenPassport';
import { createWelcomeSessionReader } from '@/lib/welcome-session';

type Launch = 'loading' | 'ready' | 'outside' | 'failed';
type Progress = { verified: boolean; accepted: boolean };

/** Browser preview never creates a session or writes to the verification APIs. */
export function useWelcomeFlow(launch: Launch) {
  const [progress, setProgress] = useState<Progress>({ verified: false, accepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(false);
  const preview = launch === 'outside';
  const [readSession] = useState(() =>
    createWelcomeSessionReader(() => window.Telegram?.WebApp.initData),
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (launch !== 'ready') return;
    let active = true;
    const load = async () => {
      lock.current = true;
      setBusy(true);
      try {
        const citizen = await readSession();
        if (active) {
          setProgress({ verified: citizen.verified, accepted: citizen.agreementSigned });
          setError('');
        }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : 'Connection failed.');
      } finally {
        if (active) {
          lock.current = false;
          setBusy(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [launch, readSession]);

  async function perform(kind: 'verify' | 'agreement', agreement?: AgreementDocument) {
    if (lock.current || (launch !== 'ready' && !preview)) return false;
    if (kind === 'agreement' && (!progress.verified || !agreement)) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (preview) {
        // Intentional delay makes the simulated loading state visible; no server mutation.
        await new Promise((resolve) => setTimeout(resolve, 850));
        if (mounted.current)
          setProgress((current) => ({
            verified: kind === 'verify' || current.verified,
            accepted: kind === 'agreement' || current.accepted,
          }));
      } else {
        const initData = window.Telegram?.WebApp.initData;
        if (!initData) throw new Error('Telegram launch data is unavailable. Reopen the Mini App.');
        // Valid sessions are reused; consumed Telegram launch data cannot be exchanged twice.
        await readSession();
        await api(
          kind,
          kind === 'verify' ? { consent: true } : { accepted: true, textHash: agreement!.textHash },
        );
        const citizen = await api<CitizenView>('me');
        if (
          (kind === 'verify' && !citizen.verified) ||
          (kind === 'agreement' && (!citizen.verified || !citizen.agreementSigned))
        ) {
          throw new Error('Your confirmation could not be refreshed. Please retry.');
        }
        if (mounted.current)
          setProgress({ verified: citizen.verified, accepted: citizen.agreementSigned });
      }
      return mounted.current;
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Please retry.');
      return false;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return { ...progress, busy, error, preview, perform, clearError: () => setError('') };
}
