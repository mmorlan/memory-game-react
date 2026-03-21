'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { User, Upload } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getUser, updateUser } from '../util/dynamodb';
import classes from './page.module.css';

const STATS = [
  { label: 'Total Games' },
  { label: 'Best Score' },
  { label: 'Avg. Time' },
  { label: 'Win Rate' },
] as const;

const GAMES_COLUMNS = ['Date', 'Mode', 'Score', 'Time'];

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchUserAttributes().then((attrs) => {
      setUsername(attrs.preferred_username ?? '');
    }).catch(() => {});
    getUser(user.userId).then((record) => {
      setBio((record?.bio as string) ?? '');
    }).catch(() => {});
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setErrorMsg('');
    setSaveStatus('idle');
    setIsSaving(true);
    try {
      await updateUser(user.userId, { bio });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !user) {
    return <div className={classes.loading}>Loading...</div>;
  }

  return (
    <main className={classes.page}>
      {/* Profile card */}
      <div className={classes.card}>
        <div className={classes['profile-section']}>
          <div className={classes['avatar-wrapper']}>
            <div className={classes.avatar}>
              <User size={48} color="#6b7280" />
            </div>
            <button className={classes['upload-btn']} aria-label="Upload avatar">
              <Upload size={16} />
            </button>
          </div>

          <div className={classes['profile-info']}>
            <div className={classes['username-display']}>{username}</div>

            <label className={classes['bio-label']}>Bio / Summary</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={classes['bio-input']}
              placeholder="Add a bio about yourself..."
            />

            {saveStatus === 'error' && <p className={classes.error}>{errorMsg}</p>}
            {saveStatus === 'success' && <p className={classes.success}>Saved!</p>}

            <button
              className={classes['save-btn']}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={classes['stats-grid']}>
        {STATS.map(({ label }) => (
          <div key={label} className={classes['stat-card']}>
            <div className={classes['stat-label']}>{label}</div>
            <div className={classes['stat-value']}>—</div>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <div className={classes['games-card']}>
        <div className={classes['games-header']}>Recent Games</div>
        <div className={classes['games-table-head']}>
          {GAMES_COLUMNS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>
        <div className={classes['games-empty']}>
          No games recorded yet.{' '}
          <a href="/" className={classes['play-link']}>Play now!</a>
        </div>
      </div>
    </main>
  );
}
