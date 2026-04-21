'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { User } from 'lucide-react';
import { GameRecord } from '../../util/dynamodb';
import { formatTime } from '../../util/scoring';
import classes from '../../profile/page.module.css';

type Tab = 'global' | 'freeplay' | 'survival';

interface ProfileData {
  username: string;
  bio: string;
  games: GameRecord[];
}

function mostCommon(values: string[]): string {
  const counts: Record<string, number> = {};
  values.forEach(v => { counts[v] = (counts[v] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function avgTimeToPair(games: GameRecord[]): string {
  const timed = games.filter(g => g.avgTimeToPairMs != null);
  if (timed.length === 0) return '—';
  const avg = timed.reduce((s, g) => s + g.avgTimeToPairMs!, 0) / timed.length;
  return formatTime(Math.round(avg));
}

function computeGlobalStats(games: GameRecord[]) {
  if (games.length === 0) return null;
  return {
    totalGames: games.length,
    totalPairs: games.reduce((s, g) => s + g.pairs, 0),
    totalScore: games.reduce((s, g) => s + g.score, 0),
    favoriteMode: mostCommon(games.map(g => g.mode === 'freeplay' ? 'Freeplay' : 'Survival')),
    favoriteGrid: mostCommon(games.map(g => `${g.rows}×${g.cols}`)),
    avgPairTime: avgTimeToPair(games),
  };
}

function computeFreeplayStats(games: GameRecord[]) {
  const fp = games.filter(g => g.mode === 'freeplay');
  if (fp.length === 0) return null;
  return {
    totalGames: fp.length,
    bestScore: Math.max(...fp.map(g => g.score)),
    bestTime: Math.min(...fp.map(g => g.timeMs)),
    favoriteGrid: mostCommon(fp.map(g => `${g.rows}×${g.cols}`)),
    avgPairTime: avgTimeToPair(fp),
  };
}

function computeSurvivalStats(games: GameRecord[]) {
  const sv = games.filter(g => g.mode === 'survival');
  if (sv.length === 0) return null;
  const stages = sv.map(g => g.stage ?? 1);
  const totalPairs = sv.reduce((s, g) => s + g.pairs, 0);
  const totalClutch = sv.reduce((s, g) => s + (g.clutchPairs ?? 0), 0);
  return {
    totalRuns: sv.length,
    highestStage: Math.max(...stages),
    bestScore: Math.max(...sv.map(g => g.score)),
    avgStage: stages.reduce((s, n) => s + n, 0) / stages.length,
    clutchPairs: totalClutch,
    clutchRate: totalPairs > 0 ? `${((totalClutch / totalPairs) * 100).toFixed(1)}%` : '—',
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className={classes['stat-card']}>
      <div className={classes['stat-label']}>{label}</div>
      <div className={classes['stat-value']}>{display}</div>
    </div>
  );
}

function EmptyStats({ tab }: { tab: Tab }) {
  const label = tab === 'survival' ? 'survival runs' : tab === 'freeplay' ? 'freeplay games' : 'games';
  return (
    <div className={classes['stats-empty-card']}>
      No {label} yet.
    </div>
  );
}

export default function PlayerProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('global');

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Player not found' : 'Failed to load profile');
        return res.json();
      })
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className={classes.loading}>Loading...</div>;
  if (error || !profile) {
    return (
      <main className={classes.page}>
        <div className={classes['stats-empty-card']}>{error ?? 'Player not found'}</div>
      </main>
    );
  }

  const { games } = profile;
  const globalStats = computeGlobalStats(games);
  const freeplayStats = computeFreeplayStats(games);
  const survivalStats = computeSurvivalStats(games);
  const filteredGames = activeTab === 'global' ? games : games.filter(g => g.mode === activeTab);

  function renderStats() {
    if (activeTab === 'global') {
      if (!globalStats) return <EmptyStats tab="global" />;
      return (
        <div className={classes['stats-grid']}>
          <StatCard label="Total Games" value={globalStats.totalGames} />
          <StatCard label="Total Pairs" value={globalStats.totalPairs} />
          <StatCard label="Lifetime Score" value={globalStats.totalScore} />
          <StatCard label="Favorite Mode" value={globalStats.favoriteMode} />
          <StatCard label="Favorite Grid" value={globalStats.favoriteGrid} />
          <StatCard label="Avg Pair Time" value={globalStats.avgPairTime} />
        </div>
      );
    }
    if (activeTab === 'freeplay') {
      if (!freeplayStats) return <EmptyStats tab="freeplay" />;
      return (
        <div className={classes['stats-grid']}>
          <StatCard label="Total Games" value={freeplayStats.totalGames} />
          <StatCard label="Best Score" value={freeplayStats.bestScore} />
          <StatCard label="Best Time" value={formatTime(freeplayStats.bestTime)} />
          <StatCard label="Favorite Grid" value={freeplayStats.favoriteGrid} />
          <StatCard label="Avg Pair Time" value={freeplayStats.avgPairTime} />
        </div>
      );
    }
    if (!survivalStats) return <EmptyStats tab="survival" />;
    return (
      <div className={classes['stats-grid']}>
        <StatCard label="Total Runs" value={survivalStats.totalRuns} />
        <StatCard label="Highest Stage" value={survivalStats.highestStage} />
        <StatCard label="Best Score" value={survivalStats.bestScore} />
        <StatCard label="Avg Stage" value={survivalStats.avgStage.toFixed(1)} />
        <StatCard label="Clutch Pairs" value={survivalStats.clutchPairs} />
        <StatCard label="Clutch Rate" value={survivalStats.clutchRate} />
      </div>
    );
  }

  return (
    <main className={classes.page}>
      <div className={classes.card}>
        <div className={classes['profile-section']}>
          <div className={classes['avatar-wrapper']}>
            <div className={classes.avatar}>
              <User size={48} color="#6b7280" />
            </div>
          </div>
          <div className={classes['profile-info']}>
            <div className={classes['username-display']}>{profile.username}</div>
            {profile.bio && (
              <p className={classes['bio-display']}>{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      <div className={classes['tab-toggle']}>
        {(['global', 'freeplay', 'survival'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`${classes['tab-btn']}${activeTab === tab ? ` ${classes['tab-btn-active']}` : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {renderStats()}

      <div className={classes['games-card']}>
        <div className={classes['games-header']}>Recent Games</div>
        <div className={classes['games-table-head']}>
          <span>Date</span>
          {activeTab === 'global' && <span>Mode</span>}
          {activeTab === 'freeplay' && <span>Grid</span>}
          {activeTab === 'survival' && <span>Stage</span>}
          <span>Score</span>
          <span>Time</span>
        </div>
        {filteredGames.length === 0 ? (
          <div className={classes['games-empty']}>No games recorded yet.</div>
        ) : (
          <div className={classes['games-rows']}>
            {filteredGames.map(g => (
              <div key={g.gameId} className={classes['games-row']}>
                <span>{new Date(g.completedAt).toLocaleDateString()}</span>
                {activeTab === 'global' && <span className={classes[`mode-${g.mode}`]}>{g.mode}</span>}
                {activeTab === 'freeplay' && <span>{g.rows}×{g.cols}</span>}
                {activeTab === 'survival' && <span>Stage {g.stage ?? 1}</span>}
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
