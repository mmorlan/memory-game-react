'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'aws-amplify/auth';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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

function SignInForm() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const params = useSearchParams();
  const confirmed = params.get('confirmed') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({
        username: email,
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

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <div className={classes['icon-badge']}>
          <LogIn size={28} />
        </div>
        <h1 className={classes.title}>Sign In</h1>
        {confirmed
          ? <p className={classes.hint} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Account confirmed! Please sign in.</p>
          : <p className={classes.subtitle}>Welcome back</p>
        }

        <form onSubmit={handleSubmit}>
          <div className={classes['field-group']}>
            <div className={classes.field}>
              <label htmlFor="email" className={classes['field-label']}>
                <Mail size={12} /> Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <a href="#" className={classes['forgot-link']}>Forgot password?</a>
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
