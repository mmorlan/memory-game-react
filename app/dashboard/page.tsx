'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAuth from '../hooks/useAuth';
import { GameRecord } from '../util/dynamodb';
import { formatTime } from '../util/scoring';
import classes from './page.module.css';

const COLORS = ['#00ff3c', '#facc15', '#a855f7', '#22d3ee', '#f97316', '#ef4444', '#6366f1', '#ec4899'];

interface DashboardData {
  games: GameRecord[];
  users: { userID: string; username?: string }[];
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={classes.stat}>
      <div className={classes['stat-value']}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className={classes['stat-label']}>{label}</div>
    </div>
  );
}

function percentile(sorted: number[], p: number): number {
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function computeMetrics(data: DashboardData) {
  const { games, users } = data;
  const freeplay = games.filter(g => g.mode === 'freeplay');
  const survival = games.filter(g => g.mode === 'survival');

  const uniquePlayers = new Set(games.map(g => g.userId));
  const authedGames = games.filter(g => users.some(u => u.userID === g.userId));
  const anonGames = games.length - authedGames.length;

  // Score distribution by grid size (freeplay)
  const gridScores: Record<string, number[]> = {};
  freeplay.forEach(g => {
    const key = `${g.rows}×${g.cols}`;
    (gridScores[key] ??= []).push(g.score);
  });
  const scoreDistribution = Object.entries(gridScores)
    .map(([grid, scores]) => {
      const sorted = [...scores].sort((a, b) => a - b);
      return {
        grid,
        count: scores.length,
        p25: Math.round(percentile(sorted, 25)),
        p50: Math.round(percentile(sorted, 50)),
        p75: Math.round(percentile(sorted, 75)),
        p90: Math.round(percentile(sorted, 90)),
      };
    })
    .sort((a, b) => b.count - a.count);

  // Grid size popularity (freeplay)
  const gridPopularity = Object.entries(gridScores)
    .map(([grid, scores]) => ({ name: grid, value: scores.length }))
    .sort((a, b) => b.value - a.value);

  // Survival stage distribution
  const stageCounts: Record<number, number> = {};
  survival.forEach(g => {
    const s = g.stage ?? 1;
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  });
  const stageDistribution = Object.entries(stageCounts)
    .map(([stage, count]) => ({ stage: `Stage ${stage}`, count }))
    .sort((a, b) => parseInt(a.stage.split(' ')[1]) - parseInt(b.stage.split(' ')[1]));

  // Device split
  const desktop = games.filter(g => g.device === 'desktop').length;
  const mobile = games.filter(g => g.device === 'mobile').length;
  const unknown = games.length - desktop - mobile;
  const deviceSplit = [
    { name: 'Desktop', value: desktop },
    { name: 'Mobile', value: mobile },
    ...(unknown > 0 ? [{ name: 'Unknown', value: unknown }] : []),
  ];

  // Mode split
  const modeSplit = [
    { name: 'Freeplay', value: freeplay.length },
    { name: 'Survival', value: survival.length },
  ];

  // Clutch pair stats (survival)
  const clutchGames = survival.filter(g => g.clutchPairs != null && g.clutchPairs > 0);
  const totalSurvivalPairs = survival.reduce((s, g) => s + g.pairs, 0);
  const totalClutchPairs = survival.reduce((s, g) => s + (g.clutchPairs ?? 0), 0);
  const clutchRate = totalSurvivalPairs > 0
    ? `${((totalClutchPairs / totalSurvivalPairs) * 100).toFixed(1)}%`
    : '—';

  // Time multiplier distribution (using avgTimeToPairMs as proxy)
  // Games per player
  const gamesPerPlayer: Record<string, number> = {};
  games.forEach(g => {
    gamesPerPlayer[g.userId] = (gamesPerPlayer[g.userId] ?? 0) + 1;
  });
  const gppValues = Object.values(gamesPerPlayer).sort((a, b) => a - b);
  const avgGamesPerPlayer = gppValues.length > 0
    ? (gppValues.reduce((s, n) => s + n, 0) / gppValues.length).toFixed(1)
    : '0';

  // Top players by total score
  const playerScores: Record<string, number> = {};
  games.forEach(g => {
    playerScores[g.userId] = (playerScores[g.userId] ?? 0) + g.score;
  });
  const usernameMap: Record<string, string> = {};
  users.forEach(u => { if (u.username) usernameMap[u.userID] = u.username; });
  const topPlayers = Object.entries(playerScores)
    .map(([userId, total]) => ({ name: usernameMap[userId] ?? 'Anonymous', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Completion rate by grid (freeplay) — games with score > 0 = completed
  const gridCompletion = Object.entries(gridScores).map(([grid, scores]) => {
    const completed = scores.filter(s => s > 0).length;
    return { grid, rate: `${((completed / scores.length) * 100).toFixed(0)}%`, completed, total: scores.length };
  }).sort((a, b) => b.total - a.total);

  // Avg time to pair by grid size
  const gridAvgPairTime: Record<string, number[]> = {};
  games.filter(g => g.avgTimeToPairMs != null).forEach(g => {
    const key = `${g.rows}×${g.cols}`;
    (gridAvgPairTime[key] ??= []).push(g.avgTimeToPairMs!);
  });
  const avgPairTimeByGrid = Object.entries(gridAvgPairTime)
    .map(([grid, times]) => ({
      grid,
      avg: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
      count: times.length,
    }))
    .sort((a, b) => b.count - a.count);

  const allPairTimes = games.filter(g => g.avgTimeToPairMs != null).map(g => g.avgTimeToPairMs!);
  const overallAvgPairTime = allPairTimes.length > 0
    ? formatTime(Math.round(allPairTimes.reduce((s, t) => s + t, 0) / allPairTimes.length))
    : '—';
  const medianPairTime = allPairTimes.length > 0
    ? formatTime(Math.round(percentile([...allPairTimes].sort((a, b) => a - b), 50)))
    : '—';

  // Average time per game by mode
  const avgFreeplayTime = freeplay.length > 0
    ? formatTime(Math.round(freeplay.reduce((s, g) => s + g.timeMs, 0) / freeplay.length))
    : '—';
  const avgSurvivalTime = survival.length > 0
    ? formatTime(Math.round(survival.reduce((s, g) => s + g.timeMs, 0) / survival.length))
    : '—';

  return {
    totalGames: games.length,
    totalPlayers: uniquePlayers.size,
    registeredUsers: users.length,
    authedGames: authedGames.length,
    anonGames,
    freeplayCount: freeplay.length,
    survivalCount: survival.length,
    avgGamesPerPlayer,
    avgFreeplayTime,
    avgSurvivalTime,
    clutchRate,
    clutchGamesCount: clutchGames.length,
    scoreDistribution,
    gridPopularity,
    stageDistribution,
    deviceSplit,
    modeSplit,
    topPlayers,
    gridCompletion,
    avgPairTimeByGrid,
    overallAvgPairTime,
    medianPairTime,
  };
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetch('/api/dashboard', { headers: { 'x-user-id': user.userId } })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to load');
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (authLoading) return <main className={classes.page}><div className={classes.loading}>Loading...</div></main>;
  if (!user) return <main className={classes.page}><div className={classes.error}>Sign in to access the dashboard.</div></main>;
  if (loading) return <main className={classes.page}><div className={classes.loading}>Loading dashboard data...</div></main>;
  if (error || !data) return <main className={classes.page}><div className={classes.error}>{error}</div></main>;

  const m = computeMetrics(data);

  return (
    <main className={classes.page}>
      <h1 className={classes.title}>Analytics Dashboard</h1>

      {/* Overview stats */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Overview</h2>
        <div className={classes['stats-grid']}>
          <StatCard label="Total Games" value={m.totalGames} />
          <StatCard label="Unique Players" value={m.totalPlayers} />
          <StatCard label="Registered Users" value={m.registeredUsers} />
          <StatCard label="Avg Games/Player" value={m.avgGamesPerPlayer} />
          <StatCard label="Authenticated Games" value={m.authedGames} />
          <StatCard label="Anonymous Games" value={m.anonGames} />
          <StatCard label="Avg Freeplay Time" value={m.avgFreeplayTime} />
          <StatCard label="Avg Survival Time" value={m.avgSurvivalTime} />
        </div>
      </section>

      {/* Mode & Device Split */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Mode & Device Split</h2>
        <div className={classes['chart-row']}>
          <div className={classes.chart}>
            <h3 className={classes['chart-title']}>Game Mode</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={m.modeSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {m.modeSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={classes.chart}>
            <h3 className={classes['chart-title']}>Device</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={m.deviceSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {m.deviceSplit.map((_, i) => <Cell key={i} fill={COLORS[i + 2]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Score Distribution */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Freeplay Score Percentiles by Grid</h2>
        {m.scoreDistribution.length > 0 ? (
          <div className={classes['table-wrap']}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Grid</th>
                  <th>Games</th>
                  <th>P25</th>
                  <th>P50</th>
                  <th>P75</th>
                  <th>P90</th>
                </tr>
              </thead>
              <tbody>
                {m.scoreDistribution.map(r => (
                  <tr key={r.grid}>
                    <td>{r.grid}</td>
                    <td>{r.count}</td>
                    <td>{r.p25.toLocaleString()}</td>
                    <td>{r.p50.toLocaleString()}</td>
                    <td>{r.p75.toLocaleString()}</td>
                    <td>{r.p90.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={classes.empty}>No freeplay data yet.</p>}
      </section>

      {/* Avg Time to Pair */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Average Time to Pair</h2>
        <div className={classes['stats-grid']} style={{ marginBottom: '1rem' }}>
          <StatCard label="Overall Avg" value={m.overallAvgPairTime} />
          <StatCard label="Median" value={m.medianPairTime} />
        </div>
        {m.avgPairTimeByGrid.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={m.avgPairTimeByGrid}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="grid" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(v: number) => formatTime(v)} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v) => [formatTime(Number(v)), 'Avg Pair Time']}
              />
              <Bar dataKey="avg" name="Avg Pair Time" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className={classes.empty}>No pair time data yet.</p>}
      </section>

      {/* Grid Size Popularity */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Freeplay Grid Popularity</h2>
        {m.gridPopularity.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={m.gridPopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="value" name="Games" fill="#00ff3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className={classes.empty}>No freeplay data yet.</p>}
      </section>

      {/* Survival Stage Distribution */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Survival Stage Distribution</h2>
        {m.stageDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={m.stageDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="stage" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="count" name="Games" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className={classes.empty}>No survival data yet.</p>}
      </section>

      {/* Completion Rate */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Freeplay Completion Rate by Grid</h2>
        {m.gridCompletion.length > 0 ? (
          <div className={classes['table-wrap']}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Grid</th>
                  <th>Completed</th>
                  <th>Total</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {m.gridCompletion.map(r => (
                  <tr key={r.grid}>
                    <td>{r.grid}</td>
                    <td>{r.completed}</td>
                    <td>{r.total}</td>
                    <td>{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={classes.empty}>No freeplay data yet.</p>}
      </section>

      {/* Clutch Stats */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Survival Clutch Stats</h2>
        <div className={classes['stats-grid']}>
          <StatCard label="Clutch Rate" value={m.clutchRate} />
          <StatCard label="Games with Clutch Pairs" value={m.clutchGamesCount} />
        </div>
      </section>

      {/* Top Players */}
      <section className={classes.section}>
        <h2 className={classes['section-title']}>Top Players by Lifetime Score</h2>
        {m.topPlayers.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={m.topPlayers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="total" name="Total Score" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className={classes.empty}>No player data yet.</p>}
      </section>
    </main>
  );
}
