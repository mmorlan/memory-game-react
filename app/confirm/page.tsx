'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp } from 'aws-amplify/auth';
import { ShieldCheck, XCircle } from 'lucide-react';
import classes from '../components/auth.module.css';

function ConfirmHandler() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!email || !code) {
      setErrorMsg('Invalid confirmation link. Please request a new one.');
      setStatus('error');
      return;
    }

    confirmSignUp({ username: email, confirmationCode: code })
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Confirmation failed.';
        // Already confirmed counts as success
        if (msg.toLowerCase().includes('already confirmed')) {
          setStatus('success');
        } else {
          setErrorMsg(msg);
          setStatus('error');
        }
      });
  }, [email, code]);

  if (status === 'loading') {
    return (
      <div className={classes.page}>
        <div className={classes.card}>
          <div className={classes['icon-badge']}>
            <ShieldCheck size={28} />
          </div>
          <h1 className={classes.title}>Confirming…</h1>
          <p className={classes.subtitle}>Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={classes.page}>
        <div className={classes.card}>
          <div className={classes['icon-badge']}>
            <ShieldCheck size={28} />
          </div>
          <h1 className={classes.title}>Account Confirmed!</h1>
          <p className={classes.subtitle}>Your account is ready. Sign in to start playing.</p>
          <Link href="/sign-in?confirmed=1" className={classes['primary-btn']}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <div className={classes['icon-badge']}>
          <XCircle size={28} />
        </div>
        <h1 className={classes.title}>Confirmation Failed</h1>
        <p className={classes.subtitle}>{errorMsg}</p>
        <Link href="/register" className={classes['primary-btn']}>
          Back to Register
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmHandler />
    </Suspense>
  );
}
