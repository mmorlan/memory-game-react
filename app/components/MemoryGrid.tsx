"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, Clock } from "lucide-react";
import "./MemoryGrid.css";
import { ChevronDown } from "./icons";
import { ICON_MAP } from "./icons";
import useMemoryGame from "../hooks/useMemoryGame";
import useSurvivalGame, { COMPLETIONS_PER_STAGE, MAX_LIVES } from "../hooks/useSurvivalGame";
import { Card } from "../hooks/useMemoryGame";
import useAuth from "../hooks/useAuth";
import useGameSettings from "../hooks/useGameSettings";
import { saveGame, getSurvivalLevelLeaderboard, SurvivalLevelEntry } from "../util/dynamodb";
import { formatTime, getTimeMultiplier } from "../util/scoring";

function LevelLeaderboard({ stage, level, currentUserId, currentUsername, currentScore }: {
  stage: number;
  level: number;
  currentUserId?: string;
  currentUsername?: string | null;
  currentScore?: number;
}) {
  const [entries, setEntries] = useState<SurvivalLevelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const levelId = `STAGE#${stage}#LEVEL#${level}`;
    getSurvivalLevelLeaderboard(levelId, 10)
      .then(setEntries)
      .catch((e) => console.error("LevelLeaderboard fetch failed:", e))
      .finally(() => setLoading(false));
  }, [stage, level]);

  // Merge current user's score optimistically so it shows immediately
  const merged: SurvivalLevelEntry[] = (() => {
    if (!currentUserId || currentScore === undefined) return entries;
    const withoutMe = entries.filter(e => e.userId !== currentUserId);
    const myEntry: SurvivalLevelEntry = {
      levelId: `STAGE#${stage}#LEVEL#${level}`,
      userId: currentUserId,
      score: currentScore,
      username: currentUsername ?? undefined,
      completedAt: new Date().toISOString(),
    };
    return [...withoutMe, myEntry].sort((a, b) => b.score - a.score).slice(0, 10);
  })();

  return (
    <div className="level-leaderboard">
      <div className="level-leaderboard-title">Stage {stage} · Level {level} — Top Scores</div>
      {loading ? (
        <div className="level-leaderboard-loading">Loading...</div>
      ) : merged.length === 0 ? (
        <div className="level-leaderboard-empty">No scores yet — you're first!</div>
      ) : (
        <ol className="level-leaderboard-list">
          {merged.map((e, i) => (
            <li key={e.userId} className={`level-leaderboard-row${e.userId === currentUserId ? " level-leaderboard-row-you" : ""}`}>
              <span className="level-lb-rank">#{i + 1}</span>
              <span className="level-lb-name">{e.username ?? "Anonymous"}</span>
              <span className="level-lb-score">{e.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function getTierLabels(totalPairs: number): { tm: number; label: string }[] {
  const t = 7.5 * totalPairs; // timer duration in seconds
  // Use floor for upper bounds so labels never over-promise a tier
  const lo = (n: number) => Math.ceil(t / n);
  const hi = (n: number) => Math.floor(t / n);
  return [
    { tm: 5,   label: `< ${hi(20)}s`               },
    { tm: 3,   label: `${lo(20)}–${hi(6)}s`         },
    { tm: 2,   label: `${lo(6)}–${hi(3)}s`          },
    { tm: 1.5, label: `${lo(3)}–${hi(1.5)}s`        },
    { tm: 1,   label: `> ${lo(1.5)}s`               },
  ];
}

function ScoreBreakdown({ pairTierCounts, timeBonus, pm, ldm, totalScore, totalPairs, totalLabel = "Level Total" }: {
  pairTierCounts: Record<string, number>;
  timeBonus: number;
  pm: number;
  ldm: number;
  totalScore: number;
  totalPairs: number;
  totalLabel?: string;
}) {
  const rows = getTierLabels(totalPairs).flatMap(({ tm, label }) => {
    const pairs = pairTierCounts[String(tm)] ?? 0;
    if (pairs === 0) return [];
    const ptsEach = Math.round(100 * pm * tm * ldm);
    return [{ label, tm, pairs, ptsEach, subtotal: pairs * ptsEach }];
  });
  const pairTotal = rows.reduce((sum, r) => sum + r.subtotal, 0);
  const secondsLeft = timeBonus / 10; // already floored at calculation time

  return (
    <div className="score-breakdown">
      <div className="score-breakdown-title">Score Breakdown</div>
      <table className="score-breakdown-table">
        <thead>
          <tr>
            <th className="sbt-label">Elapsed</th>
            <th className="sbt-mult">Mult</th>
            <th className="sbt-pairs">Pairs</th>
            <th className="sbt-pts">Pts ea.</th>
            <th className="sbt-sub">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td className="sbt-label">{r.label}</td>
              <td className="sbt-mult" style={{ color: getMultiplierColor(r.tm) }}>{r.tm}×</td>
              <td className="sbt-pairs">{r.pairs}</td>
              <td className="sbt-pts">{r.ptsEach.toLocaleString()}</td>
              <td className="sbt-sub">{r.subtotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="sbt-subtotal-row">
            <td colSpan={4}>Pair Score</td>
            <td>{pairTotal.toLocaleString()}</td>
          </tr>
          {timeBonus > 0 && (
            <tr className="sbt-bonus-row">
              <td colSpan={4}>Time Bonus (+{secondsLeft}s remaining)</td>
              <td>+{timeBonus.toLocaleString()}</td>
            </tr>
          )}
          <tr className="sbt-total-row">
            <td colSpan={4}>{totalLabel}</td>
            <td>{totalScore.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ConfirmAbandonModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="save-score-modal">
        <div className="modal-title">Abandon Game?</div>
        <p className="modal-body">Your progress will be lost. Are you sure you want to quit?</p>
        <button className="btn-danger modal-btn-full" onClick={onConfirm}>Yes, Abandon</button>
        <button className="modal-btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function SaveScoreModal({ score, onSkip }: { score: number; onSkip: () => void }) {
  const router = useRouter();
  return (
    <div className="modal-overlay">
      <div className="save-score-modal">
        <div className="modal-title">Save Your Score</div>
        <div className="modal-score">{score.toLocaleString()}</div>
        <p className="modal-body">
          Create a free account to save your score and compete on the leaderboard.
        </p>
        <button className="btn-start modal-btn-full" onClick={() => router.push('/register')}>
          Create Account
        </button>
        <button className="modal-btn-secondary" onClick={() => router.push('/sign-in')}>
          Sign In
        </button>
        <button className="modal-skip" onClick={onSkip}>No thanks</button>
      </div>
    </div>
  );
}

const GRID_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 4);
const MOBILE_ROW_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 4);
const MOBILE_COL_OPTIONS = Array.from({ length: 5 }, (_, i) => i + 4);

function getDevice(): "desktop" | "mobile" {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? "mobile" : "desktop";
}

function fmt(n: number) { return n % 1 === 0 ? String(n) : n.toFixed(1); }

function getMultiplierColor(tm: number): string {
  if (tm >= 5)   return '#facc15'; // gold
  if (tm >= 3)   return '#a855f7'; // purple
  if (tm >= 2)   return '#22d3ee'; // cyan
  if (tm >= 1.5) return '#00ff3c'; // lime (app theme)
  return '#ffffff';                 // white (1×)
}

function ScoringFormula({ terms }: { terms: { value: string; label: string; color?: string }[] }) {
  return (
    <div className="scoring-box">
      <div className="scoring-label">Scoring Formula</div>
      <div className="scoring-formula-row">
        {terms.flatMap((t, i) => [
          ...(i > 0 ? [<span key={`op-${i}`} className="scoring-op">×</span>] : []),
          <div key={t.label} className="scoring-term">
            <div className="scoring-value" style={t.color ? { color: t.color } : undefined}>{t.value}</div>
            <div className="scoring-term-label">{t.label}</div>
          </div>,
        ])}
      </div>
    </div>
  );
}

function GridSelect({ value, onChange, options = GRID_OPTIONS }: { value: number; onChange: (n: number) => void; options?: number[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="grid-select" ref={ref} onClick={() => setOpen((o) => !o)}>
      <span>{value}</span>
      <ChevronDown size={14} color="#9ca3af" className={open ? "chevron-open" : ""} />
      {open && (
        <div className="grid-select-dropdown">
          {options.map((n) => (
            <div
              key={n}
              className={`grid-select-option${n === value ? " grid-select-option-active" : ""}`}
              onClick={(e) => { e.stopPropagation(); onChange(n); setOpen(false); }}
            >
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GameGrid({
  board,
  cols,
  started,
  pendingCols,
  pendingRows,
  onCardClick,
  cardsHidden,
  revealAll = false,
}: {
  board: Card[];
  cols: number;
  started: boolean;
  pendingCols: number;
  pendingRows: number;
  onCardClick: (id: number) => void;
  cardsHidden: boolean;
  revealAll?: boolean;
}) {
  const activeCols = started ? cols : pendingCols;
  const iconSize = activeCols >= 8 ? 28 : 32;

  return (
    <div className="grid-container">
      <div
        className="memory-grid"
        style={{ "--cols": activeCols } as React.CSSProperties}
      >
        {!started
          ? Array.from({ length: pendingRows * pendingCols }, (_, i) => {
              const isCenter =
                (pendingRows * pendingCols) % 2 === 1 &&
                i === Math.floor((pendingRows * pendingCols) / 2);
              return <div key={i} className={`memory-card ${isCenter ? "blank-card" : "preview-card"}`} />;
            })
          : board.map((card) => {
              if (card.iconName === "__blank__") {
                return <div key={card.id} className="memory-card blank-card" />;
              }
              const IconComponent = ICON_MAP[card.iconName];
              if (cardsHidden) {
                const isFlipped = revealAll || card.clicked || card.matched;
                return (
                  <div
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    className={`memory-card memory-card-flip${card.matched ? " matched" : ""}`}
                  >
                    <div className={`card-inner${isFlipped ? " flipped" : ""}`}>
                      <div className="card-cover" />
                      <div className="card-face">
                        <IconComponent size={iconSize} />
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={card.id}
                  onClick={() => onCardClick(card.id)}
                  className={`memory-card${card.clicked ? " clicked" : ""}${card.matched ? " matched" : ""}`}
                >
                  <IconComponent size={iconSize} />
                </div>
              );
            })}
      </div>
    </div>
  );
}

function Lives({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="lives">
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          size={24}
          className={i < count ? "heart-filled" : "heart-empty"}
        />
      ))}
    </div>
  );
}

function FreeplayBoard({ onActiveChange }: { onActiveChange: (active: boolean) => void }) {
  const { user } = useAuth();
  const { cardsHidden } = useGameSettings();
  const { board, rows, cols, started, allMatched, score, gameId, pairTierCounts, handleCardClick, startGame, resetGame, elapsed, getAvgTimeToPairMs, devForceComplete } = useMemoryGame();
  const isMobile = getDevice() === "mobile";
  const rowOptions = isMobile ? MOBILE_ROW_OPTIONS : GRID_OPTIONS;
  const colOptions = isMobile ? MOBILE_COL_OPTIONS : GRID_OPTIONS;
  const [pendingRows, setPendingRows] = useState(rows);
  const [pendingCols, setPendingCols] = useState(cols);
  const savedRef = useRef(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  useEffect(() => {
    setPendingRows(rows);
    setPendingCols(cols);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onActiveChange(started && !allMatched);
  }, [started, allMatched, onActiveChange]);

  // Generate a stable game ID when a new game starts
  useEffect(() => {
    if (started) {
      savedRef.current = false;
    }
  }, [started]);

  // Save completed game to DynamoDB (authenticated)
  useEffect(() => {
    if (!allMatched || !started || !user || savedRef.current) return;
    savedRef.current = true;
    const pairs = Math.floor((rows * cols) / 2);
    const now = new Date().toISOString();
    saveGame(user.userId, {
      gameId: gameId || now,
      mode: "freeplay",
      score,
      timeMs: elapsed,
      rows,
      cols,
      pairs,
      completedAt: now,
      leaderboardkey: "freeplay",
      device: getDevice(),
      avgTimeToPairMs: getAvgTimeToPairMs(),
    }).catch(console.error);
  }, [allMatched, started, user, rows, cols, score, elapsed]);

  // Prompt unauthenticated user to save their score
  useEffect(() => {
    if (!allMatched || !started || user || savedRef.current) return;
    savedRef.current = true;
    const now = new Date().toISOString();
    const pairs = Math.floor((rows * cols) / 2);
    localStorage.setItem('pendingGame', JSON.stringify({
      gameId: now,
      mode: "freeplay",
      score,
      timeMs: elapsed,
      rows,
      cols,
      pairs,
      completedAt: now,
      leaderboardkey: "freeplay",
      device: getDevice(),
      avgTimeToPairMs: getAvgTimeToPairMs(),
    }));
    setShowSaveModal(true);
  }, [allMatched, started, user, rows, cols, score, elapsed]);

  const showStartGame = !started || pendingRows !== rows || pendingCols !== cols;
  const matchedCount = board.filter((c) => c.matched && c.iconName !== "__blank__").length / 2;
  const totalPairs = board.filter((c) => c.iconName !== "__blank__").length / 2;

  function handleNewGame() {
    resetGame();
    setPendingRows(rows);
    setPendingCols(cols);
  }

  function handleAbandon() {
    if (started && user && !savedRef.current) {
      savedRef.current = true;
      const pairs = Math.floor((rows * cols) / 2);
      const now = new Date().toISOString();
      saveGame(user.userId, {
        gameId: gameId || now,
        mode: "freeplay",
        score,
        timeMs: elapsed,
        rows,
        cols,
        pairs,
        completedAt: now,
        leaderboardkey: "freeplay",
        avgTimeToPairMs: getAvgTimeToPairMs(),
      }).catch(console.error);
    }
    handleNewGame();
  }

  if (allMatched && started) {
    const totalPairs = Math.floor((rows * cols) / 2);
    return (
      <>
        <div className="win-message">You won in {formatTime(elapsed)}!</div>
        <div className="win-score">Score: {score.toLocaleString()}</div>
        <div className="level-complete-panel">
          <ScoreBreakdown
            pairTierCounts={pairTierCounts}
            timeBonus={0}
            pm={totalPairs / 8}
            ldm={1}
            totalScore={score}
            totalPairs={totalPairs}
            totalLabel="Final Score"
          />
        </div>
        <button onClick={handleNewGame}>Play Again</button>
        {showSaveModal && <SaveScoreModal score={score} onSkip={() => setShowSaveModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div className={`grid-controls${started ? " grid-controls-disabled" : ""}`}>
        <span className="grid-controls-label">Grid Size:</span>
        <div className="grid-controls-selectors">
          <div className="grid-select-labeled">
            <GridSelect value={pendingRows} onChange={setPendingRows} options={rowOptions} />
            {isMobile && <span className="grid-controls-hint">rows 4–18</span>}
          </div>
          <span className="grid-controls-times">×</span>
          <div className="grid-select-labeled">
            <GridSelect value={pendingCols} onChange={setPendingCols} options={colOptions} />
            {isMobile && <span className="grid-controls-hint">cols 4–8</span>}
          </div>
        </div>
        {!isMobile && <span className="grid-controls-hint">(4–12 each)</span>}
      </div>

      <div className="sticky-bar">
        <div className="timer-row">
          <div className="timer-box">
            <Clock size={18} color="#00ff3c" />
            <div className="timer-value">{started ? formatTime(elapsed) : "0:00"}</div>
          </div>
          <ScoringFormula terms={[
            { value: "100", label: "Base" },
            { value: fmt(Math.floor((started ? rows * cols : pendingRows * pendingCols) / 2) / 8), label: "Grid" },
            { value: fmt(getTimeMultiplier(elapsed, Math.floor((started ? rows * cols : pendingRows * pendingCols) / 2))), label: "Time", color: getMultiplierColor(getTimeMultiplier(elapsed, Math.floor((started ? rows * cols : pendingRows * pendingCols) / 2))) },
          ]} />
        </div>
      </div>

      <div className="game-buttons">
        {showStartGame && (
          <button className="btn-start" onClick={() => startGame(pendingRows, pendingCols)}>
            Start Game
          </button>
        )}
      </div>

      <GameGrid
        board={board}
        cols={cols}
        started={started}
        pendingRows={pendingRows}
        pendingCols={pendingCols}
        onCardClick={handleCardClick}
        cardsHidden={cardsHidden}
      />

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Matches</div>
          <div className="stat-value">{matchedCount} / {totalPairs}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Current Score</div>
          <div className="stat-value stat-value-accent">{score.toLocaleString()}</div>
        </div>
      </div>

      {started && !allMatched && (
        <button className="btn-abandon" onClick={() => setShowAbandonModal(true)}>Abandon Game</button>
      )}
      {showAbandonModal && (
        <ConfirmAbandonModal onConfirm={() => { setShowAbandonModal(false); handleAbandon(); }} onCancel={() => setShowAbandonModal(false)} />
      )}
      {process.env.NODE_ENV === 'development' && started && !allMatched && (
        <button className="btn-dev" onClick={devForceComplete}>⚡ Force Win</button>
      )}
    </>
  );
}

function SurvivalBoard({ onActiveChange }: { onActiveChange: (active: boolean) => void }) {
  const { user, username } = useAuth();
  const { cardsHidden } = useGameSettings();
  const {
    board, rows, cols,
    stage, lives, completions, score, clutchPairs, livesPurchased,
    started, gameOver, survived, timeLeft, timerExpired, levelComplete, pendingStart,
    stageDurationMs, ldm, levelScore, lastLevelScore, survivalGameId, pairTierCounts, timeBonus,
    handleCardClick, startGame, resetGame, beginLevel, advanceLevel, continueAfterTimeout, buyLife, getAvgTimeToPairMs, devForceCompleteLevel,
  } = useSurvivalGame();

  const lifeCostFraction = 0.10 + livesPurchased * 0.05;
  const canBuyLife = lifeCostFraction <= 1.0;
  const lifeCostPct = Math.round(lifeCostFraction * 100);
  const lifeCost = Math.round(score * lifeCostFraction);
  const nextLifeCostPct = lifeCostPct + 5;

  const totalPairs = Math.floor((rows * cols) / 2);
  const pm = totalPairs / 8;
  const elapsed = stageDurationMs - timeLeft;
  const tm = getTimeMultiplier(elapsed, totalPairs);

  const startedAtRef = useRef<number>(0);
  const savedRef = useRef(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  useEffect(() => {
    onActiveChange(started && !gameOver && !pendingStart && !levelComplete);
  }, [started, gameOver, pendingStart, levelComplete, onActiveChange]);

  useEffect(() => {
    if (started) {
      startedAtRef.current = Date.now();
      savedRef.current = false;
    }
  }, [started]);

  function handleAbandon() {
    if (started && user && !savedRef.current) {
      savedRef.current = true;
      const pairs = Math.floor((rows * cols) / 2);
      const now = new Date().toISOString();
      saveGame(user.userId, {
        gameId: survivalGameId || now,
        mode: "survival",
        score,
        timeMs: Date.now() - startedAtRef.current,
        rows,
        cols,
        pairs,
        stage,
        completedAt: now,
        leaderboardkey: "survival",
        device: getDevice(),
        avgTimeToPairMs: getAvgTimeToPairMs(),
        clutchPairs,
        survived: false,
        remainingPairs: Math.floor(board.filter(c => !c.matched && c.iconName !== "__blank__").length / 2),
      }).catch(console.error);
    }
    resetGame();
  }

  // Save to main leaderboard on each level completion so in-progress games appear
  useEffect(() => {
    if (!levelComplete || !user || score <= 0 || !survivalGameId) return;
    const pairs = Math.floor((rows * cols) / 2);
    const now = new Date().toISOString();
    saveGame(user.userId, {
      gameId: survivalGameId,
      mode: "survival",
      score,
      timeMs: Date.now() - startedAtRef.current,
      rows, cols, pairs, stage,
      completedAt: now,
      leaderboardkey: "survival",
      device: getDevice(),
      avgTimeToPairMs: getAvgTimeToPairMs(),
      clutchPairs,
      survived: false,
      remainingPairs: 0,
    }, { allowOverwrite: true }).catch(console.error);
  }, [levelComplete, score, user, survivalGameId, stage, rows, cols, clutchPairs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prompt unauthenticated user to save their score
  useEffect(() => {
    if (!gameOver || user) return;
    const now = new Date().toISOString();
    const pairs = Math.floor((rows * cols) / 2);
    localStorage.setItem('pendingGame', JSON.stringify({
      gameId: now,
      mode: "survival",
      score,
      timeMs: Date.now() - startedAtRef.current,
      rows, cols, pairs, stage,
      completedAt: now,
      leaderboardkey: "survival",
      device: getDevice(),
      avgTimeToPairMs: getAvgTimeToPairMs(),
      clutchPairs,
      survived,
      remainingPairs: Math.floor(board.filter(c => !c.matched && c.iconName !== "__blank__").length / 2),
    }));
    setShowSaveModal(true);
  }, [gameOver, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save final survival run state to DynamoDB on game over
  useEffect(() => {
    if (!gameOver || !user || savedRef.current || score <= 0) return;
    savedRef.current = true;
    const pairs = Math.floor((rows * cols) / 2);
    const now = new Date().toISOString();
    saveGame(user.userId, {
      gameId: survivalGameId || now,
      mode: "survival",
      score,
      timeMs: Date.now() - startedAtRef.current,
      rows,
      cols,
      pairs,
      stage,
      completedAt: now,
      leaderboardkey: "survival",
      device: getDevice(),
      avgTimeToPairMs: getAvgTimeToPairMs(),
      clutchPairs,
      survived,
      remainingPairs: Math.floor(board.filter(c => !c.matched && c.iconName !== "__blank__").length / 2),
    }).catch(console.error);
  }, [gameOver, survived, user, rows, cols, score, stage, survivalGameId]);

  if (gameOver && survived) {
    return (
      <div className="game-over">
        <div className="game-over-title" style={{ color: "#00ff3c" }}>You Survived!</div>
        <div className="game-over-info">You cleared all 9 stages</div>
        <div className="game-over-info">Final Score: {score.toLocaleString()}</div>
        <button className="btn-start" onClick={resetGame}>Play Again</button>
        {showSaveModal && <SaveScoreModal score={score} onSkip={() => setShowSaveModal(false)} />}
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-over">
        <div className="game-over-title">Game Over</div>
        <div className="game-over-info">You reached Stage {stage}</div>
        <div className="game-over-info">Final Score: {score.toLocaleString()}</div>
        <button className="btn-start" onClick={resetGame}>Play Again</button>
        {showSaveModal && <SaveScoreModal score={score} onSkip={() => setShowSaveModal(false)} />}
      </div>
    );
  }

  const isLow = timeLeft <= 15_000;

  return (
    <>
      <div className="survival-info">
        <div className="survival-stat">
          <div className="survival-stat-label">Stage</div>
          <div className="survival-stat-stage">{stage}</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Level</div>
          <div className="survival-stat-stage">{completions + 1}</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Lives</div>
          <Lives count={lives} max={Math.max(MAX_LIVES, lives)} />
        </div>
      </div>

      <div className="sticky-bar">
        <div className="timer-row">
          <div className={`timer-box${isLow ? " timer-box-danger" : ""}`}>
            <Clock size={18} color={isLow ? "#ef4444" : "#00ff3c"} />
            <div>
              <div className={`timer-value${isLow ? " timer-value-danger" : ""}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          <ScoringFormula terms={[
            { value: "100", label: "Base" },
            { value: fmt(pm), label: "Grid" },
            { value: fmt(tm), label: "Time", color: getMultiplierColor(tm) },
            { value: fmt(ldm), label: "Level", color: getMultiplierColor(ldm) },
          ]} />
        </div>
      </div>

      <div className="game-buttons">
        {(!started || pendingStart) && !timerExpired && !levelComplete && (
          <button className="btn-start" onClick={pendingStart ? beginLevel : startGame}>
            Start Game
          </button>
        )}
        {levelComplete && (
          <button className="btn-start" onClick={advanceLevel}>
            {completions + 1 >= COMPLETIONS_PER_STAGE ? "Next Stage →" : "Next Level →"}
          </button>
        )}
        {timerExpired && lives > 1 && (
          <button className="btn-danger" onClick={continueAfterTimeout}>
            Continue ({lives - 1} {lives - 1 === 1 ? "life" : "lives"} left)
          </button>
        )}
        {timerExpired && lives <= 1 && (
          <button className="btn-danger" onClick={continueAfterTimeout}>
            Game Over
          </button>
        )}
      </div>

      {levelComplete ? (
        <div className="level-complete-panel">
          {!user && (
            <div className="level-auth-prompt">
              <div className="level-auth-prompt-text level-auth-prompt-signin"><a href="/sign-in"> Sign in</a> to save your score to the leaderboard!</div>
              <div className="level-auth-prompt-text level-auth-prompt-signup"> Don't have an account yet?<a href="/register"> Sign up</a></div>
            </div>
          )}
          <ScoreBreakdown
            pairTierCounts={pairTierCounts}
            timeBonus={timeBonus}
            pm={Math.floor((rows * cols) / 2) / 8}
            ldm={ldm}
            totalScore={lastLevelScore}
            totalPairs={Math.floor((rows * cols) / 2)}
          />
          <LevelLeaderboard stage={stage} level={completions + 1} currentUserId={user?.userId} currentUsername={username} currentScore={lastLevelScore} />
        </div>
      ) : (
        <GameGrid
          board={board}
          cols={cols}
          started={started}
          pendingRows={rows}
          pendingCols={cols}
          onCardClick={handleCardClick}
          cardsHidden={cardsHidden}
          revealAll={timerExpired}
        />
      )}

      <div className="stats-bar">
        <div className="stat stat-mobile-only">
          <div className="stat-label">Stage</div>
          <div className="stat-value">{stage}</div>
        </div>
        <div className="stat stat-mobile-only">
          <div className="stat-label">Level</div>
          <div className="stat-value">{completions + 1}</div>
        </div>
        <div className="stat stat-mobile-only">
          <div className="stat-label">Lives</div>
          <div className="stat-value">{lives}</div>
        </div>
        {started && !levelComplete && (
          <div className="stat">
            <div className="stat-label">Level Score</div>
            <div className="stat-value">{levelScore.toLocaleString()}</div>
          </div>
        )}
        <div className="stat">
          <div className="stat-label">Total Score</div>
          <div className="stat-value stat-value-accent">{score.toLocaleString()}</div>
        </div>
      </div>

      {started && !gameOver && !pendingStart && canBuyLife && lives < MAX_LIVES && (
        <div className="buy-life-row">
          <button className="btn-buy-life" onClick={buyLife}>
            Buy Life — {lifeCostPct}% of score ({lifeCost.toLocaleString()} pts)
          </button>
          {nextLifeCostPct <= 100 && (
            <div className="buy-life-warning">Next life costs {nextLifeCostPct}%</div>
          )}
        </div>
      )}

      {started && !timerExpired && (
        <button className="btn-abandon" onClick={() => setShowAbandonModal(true)}>Abandon Game</button>
      )}
      {showAbandonModal && (
        <ConfirmAbandonModal onConfirm={() => { setShowAbandonModal(false); handleAbandon(); }} onCancel={() => setShowAbandonModal(false)} />
      )}
      {process.env.NODE_ENV === 'development' && started && !gameOver && !levelComplete && !timerExpired && !pendingStart && (
        <button className="btn-dev" onClick={devForceCompleteLevel}>⚡ Force Level</button>
      )}
    </>
  );
}

export default function MemoryGrid() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"freeplay" | "survival">("freeplay");
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gameMode");
    if (saved === "survival") setMode("survival");
    setMounted(true);
  }, []);

  function handleModeChange(next: "freeplay" | "survival") {
    setMode(next);
    setGameActive(false);
    localStorage.setItem("gameMode", next);
  }

  if (!mounted) return null;

  return (
    <div className="game-board">
      {!gameActive && (
        <div className="mode-toggle">
          <div className="mode-toggle-track">
            <button
              className={`mode-btn${mode === "freeplay" ? " mode-btn-active" : ""}`}
              onClick={() => handleModeChange("freeplay")}
            >
              Freeplay
            </button>
            <button
              className={`mode-btn${mode === "survival" ? " mode-btn-active" : ""}`}
              onClick={() => handleModeChange("survival")}
            >
              Survival
            </button>
          </div>
        </div>
      )}

      {mode === "freeplay"
        ? <FreeplayBoard onActiveChange={setGameActive} />
        : <SurvivalBoard onActiveChange={setGameActive} />}
    </div>
  );
}
