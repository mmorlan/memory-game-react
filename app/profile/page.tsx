'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { User, Upload } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getUser, updateUser, getUserGames, GameRecord } from '../util/dynamodb';
import { formatTime } from '../util/scoring';
import classes from './page.module.css';

const GAMES_COLUMNS = ['Date', 'Mode', 'Score', 'Time'];

function computeStats(games: GameRecord[]) {
  if (games.length === 0) return null;
  const bestScore = Math.max(...games.map((g) => g.score));
  const avgTimeMs = games.reduce((sum, g) => sum + g.timeMs, 0) / games.length;
  return { totalGames: games.length, bestScore, avgTimeMs };
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [games, setGames] = useState<GameRecord[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

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
    getUserGames(user.userId).then((records) => {
      setGames(records);
    }).catch(() => {}).finally(() => setGamesLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setErrorMsg('');
    setSaveStatus('idle');
    setIsSaving(true);
    try {
      await updateUser(user.userId, { bio });
      setIsEditing(false);
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

  const stats = computeStats(games);

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

            {isEditing ? (
              <>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={classes['bio-input']}
                  placeholder="Add a bio about yourself..."
                  autoFocus
                />
                {saveStatus === 'error' && <p className={classes.error}>{errorMsg}</p>}
                <div className={classes['bio-actions']}>
                  <button className={classes['save-btn']} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button className={classes['cancel-link']} onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={classes['bio-display']}>
                  {bio || <span className={classes['bio-placeholder']}>No bio yet.</span>}
                </p>
                {saveStatus === 'success' && <p className={classes.success}>Saved!</p>}
                <button className={classes['edit-link']} onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={classes['stats-grid']}>
        <div className={classes['stat-card']}>
          <div className={classes['stat-label']}>Total Games</div>
          <div className={classes['stat-value']}>{gamesLoading ? '—' : (stats?.totalGames ?? 0)}</div>
        </div>
        <div className={classes['stat-card']}>
          <div className={classes['stat-label']}>Best Score</div>
          <div className={classes['stat-value']}>
            {gamesLoading ? '—' : stats ? stats.bestScore.toLocaleString() : '—'}
          </div>
        </div>
        <div className={classes['stat-card']}>
          <div className={classes['stat-label']}>Avg. Time</div>
          <div className={classes['stat-value']}>
            {gamesLoading ? '—' : stats ? formatTime(stats.avgTimeMs) : '—'}
          </div>
        </div>
        <div className={classes['stat-card']}>
          <div className={classes['stat-label']}>Win Rate</div>
          <div className={classes['stat-value']}>—</div>
        </div>
      </div>

      {/* Recent games */}
      <div className={classes['games-card']}>
        <div className={classes['games-header']}>Recent Games</div>
        <div className={classes['games-table-head']}>
          {GAMES_COLUMNS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>
        {gamesLoading ? (
          <div className={classes['games-empty']}>Loading...</div>
        ) : games.length === 0 ? (
          <div className={classes['games-empty']}>
            No games recorded yet.{' '}
            <a href="/" className={classes['play-link']}>Play now!</a>
          </div>
        ) : (
          <div className={classes['games-rows']}>
            {games.map((g) => (
              <div key={g.gameId} className={classes['games-row']}>
                <span>{new Date(g.completedAt).toLocaleDateString()}</span>
                <span className={classes[`mode-${g.mode}`]}>{g.mode}</span>
                <span>{g.score.toLocaleString()}</span>
                <span>{formatTime(g.timeMs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
