'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { LogIn, User, Lock, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import classes from '../components/auth.module.css';

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={classes['password-wrapper']}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={id}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={classes.input}
      />
      <button
        type="button"
        className={classes['toggle-password']}
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

type View = 'sign-in' | 'forgot-request' | 'forgot-confirm';

function SignInForm() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const params = useSearchParams();
  const confirmed = params.get('confirmed') === '1';
  const passwordReset = params.get('reset') === '1';

  const [view, setView] = useState<View>('sign-in');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({
        username: identifier,
        password,
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      });
      await checkAuth();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await resetPassword({ username: forgotUsername });
      setView('forgot-confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await confirmResetPassword({
        username: forgotUsername,
        confirmationCode: resetCode,
        newPassword,
      });
      setView('sign-in');
      setIdentifier(forgotUsername);
      setPassword('');
      setResetCode('');
      setNewPassword('');
      router.replace('/sign-in?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view === 'forgot-request') {
    return (
      <div className={classes.page}>
        <div className={classes.card}>
          <div className={classes['icon-badge']}>
            <KeyRound size={28} />
          </div>
          <h1 className={classes.title}>Reset Password</h1>
          <p className={classes.subtitle}>Enter your username or email to receive a reset code.</p>

          <form onSubmit={handleForgotRequest}>
            <div className={classes['field-group']}>
              <div className={classes.field}>
                <label htmlFor="forgot-user" className={classes['field-label']}>
                  <User size={12} /> Username or Email
                </label>
                <input
                  id="forgot-user"
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={e => setForgotUsername(e.target.value)}
                  className={classes.input}
                />
              </div>
            </div>

            {error && <p className={classes.error}>{error}</p>}

            <button type="submit" disabled={isSubmitting} className={classes['primary-btn']}>
              {isSubmitting ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>

          <button
            className={classes['forgot-link']}
            style={{ marginTop: '1rem', display: 'block', textAlign: 'center', width: '100%' }}
            onClick={() => { setView('sign-in'); setError(''); }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'forgot-confirm') {
    return (
      <div className={classes.page}>
        <div className={classes.card}>
          <div className={classes['icon-badge']}>
            <KeyRound size={28} />
          </div>
          <h1 className={classes.title}>Enter Reset Code</h1>
          <p className={classes.hint} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            We sent a code to the email associated with <strong>{forgotUsername}</strong>.
          </p>

          <form onSubmit={handleForgotConfirm}>
            <div className={classes['field-group']}>
              <div className={classes.field}>
                <label htmlFor="reset-code" className={classes['field-label']}>
                  <Mail size={12} /> Verification Code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  required
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  className={classes.input}
                  autoComplete="one-time-code"
                />
              </div>
              <div className={classes.field}>
                <label htmlFor="new-password" className={classes['field-label']}>
                  <Lock size={12} /> New Password
                </label>
                <PasswordInput id="new-password" value={newPassword} onChange={setNewPassword} />
              </div>
            </div>

            {error && <p className={classes.error}>{error}</p>}

            <button type="submit" disabled={isSubmitting} className={classes['primary-btn']}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <button
            className={classes['forgot-link']}
            style={{ marginTop: '1rem', display: 'block', textAlign: 'center', width: '100%' }}
            onClick={() => { setView('forgot-request'); setError(''); }}
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <div className={classes['icon-badge']}>
          <LogIn size={28} />
        </div>
        <h1 className={classes.title}>Sign In</h1>
        {passwordReset
          ? <p className={classes.hint} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Password reset! Please sign in.</p>
          : confirmed
            ? <p className={classes.hint} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Account confirmed! Please sign in.</p>
            : <p className={classes.subtitle}>Welcome back</p>
        }

        <form onSubmit={handleSubmit}>
          <div className={classes['field-group']}>
            <div className={classes.field}>
              <label htmlFor="identifier" className={classes['field-label']}>
                <User size={12} /> Username or Email
              </label>
              <input
                id="identifier"
                type="text"
                name="identifier"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={classes.input}
              />
            </div>

            <div className={classes.field}>
              <label htmlFor="password" className={classes['field-label']}>
                <Lock size={12} /> Password
              </label>
              <PasswordInput id="password" value={password} onChange={setPassword} />
            </div>

            <div className={classes['forgot-row']}>
              <button
                type="button"
                className={classes['forgot-link']}
                onClick={() => { setView('forgot-request'); setError(''); setForgotUsername(identifier); }}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && <p className={classes.error}>{error}</p>}

          <button type="submit" disabled={isSubmitting} className={classes['primary-btn']}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={classes.divider}>
          <div className={classes['divider-line']} />
          <span className={classes['divider-text']}>or</span>
          <div className={classes['divider-line']} />
        </div>

        <div className={classes['switch-section']}>
          <p className={classes['switch-text']}>Don&apos;t have an account?</p>
          <Link href="/register" className={classes['secondary-btn']}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
