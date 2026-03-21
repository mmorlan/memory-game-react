'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';
import { UserPlus, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { isValidEmail } from '../util/validation';
import classes from '../components/auth.module.css';

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function PasswordInput({
  id,
  value,
  onChange,
  showStrength,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);

  return (
    <div>
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
      {showStrength && value.length > 0 && (
        <div className={classes['strength-bar']}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`${classes['strength-segment']} ${strength >= n ? classes['strength-active'] : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { checkAuth } = useAuth();

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

  if (needsConfirmation) {
    return (
      <div className={classes.page}>
        <div className={classes.card}>
          <div className={classes['icon-badge']}>
            <Mail size={28} />
          </div>
          <h1 className={classes.title}>Check Your Email</h1>
          <p className={classes.subtitle}>Enter the verification code we sent to {email}</p>

          <form onSubmit={handleConfirm}>
            <div className={classes['field-group']}>
              <div className={classes.field}>
                <label htmlFor="code" className={classes['field-label']}>
                  <Mail size={12} /> Confirmation Code
                </label>
                <input
                  id="code"
                  type="text"
                  name="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={classes.input}
                />
              </div>
            </div>

            {error && <p className={classes.error}>{error}</p>}

            <button type="submit" disabled={isSubmitting} className={classes['primary-btn']}>
              {isSubmitting ? 'Confirming...' : 'Confirm'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <div className={classes['icon-badge']}>
          <UserPlus size={28} />
        </div>
        <h1 className={classes.title}>Create Account</h1>
        <p className={classes.subtitle}>Join the game</p>

        <form onSubmit={handleSignUp}>
          <div className={classes['field-group']}>
            <div className={classes.field}>
              <label htmlFor="username" className={classes['field-label']}>
                <User size={12} /> Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={classes.input}
              />
              <span className={classes.hint}>This is how you&apos;ll appear on the leaderboard</span>
            </div>

            <div className={classes.field}>
              <label htmlFor="email" className={classes['field-label']}>
                <Mail size={12} /> Email Address
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
              <PasswordInput id="password" value={password} onChange={setPassword} showStrength />
            </div>

            <div className={classes.field}>
              <label htmlFor="confirmPassword" className={classes['field-label']}>
                <Lock size={12} /> Confirm Password
              </label>
              <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} />
            </div>
          </div>

          {error && <p className={classes.error}>{error}</p>}

          <button type="submit" disabled={isSubmitting} className={classes['primary-btn']}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={classes.divider}>
          <div className={classes['divider-line']} />
          <span className={classes['divider-text']}>or</span>
          <div className={classes['divider-line']} />
        </div>

        <div className={classes['switch-section']}>
          <p className={classes['switch-text']}>Already have an account?</p>
          <Link href="/sign-in" className={classes['secondary-btn']}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
