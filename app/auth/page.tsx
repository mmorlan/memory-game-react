'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';
import { isValidEmail } from '../util/validation';
import useAuth from '../hooks/useAuth';
import classes from './page.module.css';

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <span className={classes.passwordWrapper}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          name={id}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={classes.togglePassword}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </p>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { checkAuth } = useAuth();
  const mode = searchParams.get('mode') || 'signup';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            preferred_username: username,
          },
        },
      });
      setNeedsConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
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

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

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

  if (needsConfirmation) {
    return (
      <form className={classes.form} onSubmit={handleConfirm}>
        <h1>Confirm your email</h1>
        <p>Check your email for a verification code.</p>
        <p>
          <label htmlFor="code">Confirmation Code</label>
          <input
            id="code"
            type="text"
            name="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </p>
        {error && <p className={classes.error}>{error}</p>}
        <div className={classes.actions}>
          <button disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </form>
    );
  }

  const isLogin = mode === 'login';

  return (
    <form className={classes.form} onSubmit={isLogin ? handleLogin : handleSignUp}>
      <h1>{isLogin ? 'Log in' : 'Create a new user'}</h1>
      {!isLogin && (
        <p>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </p>
      )}
      <p>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </p>
      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
      />
      {!isLogin && (
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      )}
      {error && <p className={classes.error}>{error}</p>}
      <div className={classes.actions}>
        <Link href={`?mode=${isLogin ? 'signup' : 'login'}`}>
          {isLogin ? 'Create new user' : 'Login'}
        </Link>
        <button disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </div>
    </form>
  );
}
