"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Clock } from "lucide-react";
import "./MemoryGrid.css";
import { ChevronDown } from "./icons";
import { ICON_MAP } from "./icons";
import useMemoryGame from "../hooks/useMemoryGame";
import useSurvivalGame, { COMPLETIONS_PER_STAGE } from "../hooks/useSurvivalGame";
import { Card } from "../hooks/useMemoryGame";
import useAuth from "../hooks/useAuth";
import useGameSettings from "../hooks/useGameSettings";
import { saveGame } from "../util/dynamodb";
import { formatTime, getTimeMultiplier } from "../util/scoring";

const GRID_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 4);

function GridSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
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
          {GRID_OPTIONS.map((n) => (
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
  return (
    <div className="grid-container">
      <div
        className="memory-grid"
        style={{ gridTemplateColumns: `repeat(${started ? cols : pendingCols}, 1fr)` }}
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
                        <IconComponent size={32} />
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
                  <IconComponent size={32} />
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

function FreeplayBoard() {
  const { user } = useAuth();
  const { cardsHidden } = useGameSettings();
  const { board, rows, cols, started, allMatched, score, handleCardClick, startGame, resetGame, elapsed, getAvgTimeToPairMs } = useMemoryGame();
  const [pendingRows, setPendingRows] = useState(rows);
  const [pendingCols, setPendingCols] = useState(cols);
  const savedRef = useRef(false);

  useEffect(() => {
    setPendingRows(rows);
    setPendingCols(cols);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset save guard when a new game starts
  useEffect(() => {
    if (started) savedRef.current = false;
  }, [started]);

  // Save completed game to DynamoDB
  useEffect(() => {
    if (!allMatched || !started || !user || savedRef.current) return;
    savedRef.current = true;
    const pairs = Math.floor((rows * cols) / 2);
    const now = new Date().toISOString();
    saveGame(user.userId, {
      gameId: now,
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
        gameId: now,
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
    return (
      <>
        <div className="win-message">You won in {formatTime(elapsed)}!</div>
        <div className="win-score">Score: {score.toLocaleString()}</div>
        <button onClick={handleNewGame}>Play Again</button>
      </>
    );
  }

  return (
    <>
      <div className={`grid-controls${started ? " grid-controls-disabled" : ""}`}>
        <span className="grid-controls-label">Grid Size:</span>
        <div className="grid-controls-selectors">
          <GridSelect value={pendingRows} onChange={setPendingRows} />
          <span className="grid-controls-times">×</span>
          <GridSelect value={pendingCols} onChange={setPendingCols} />
        </div>
        <span className="grid-controls-hint">(4–12 each)</span>
      </div>

      <div className="timer-row">
        <div className="timer-box">
          <Clock size={18} color="#84cc16" />
          <div className="timer-value">{started ? formatTime(elapsed) : "0:00"}</div>
        </div>
        <div className="scoring-box">
          <div className="scoring-label">Scoring Formula</div>
          <div className="scoring-formula">100 pts × Grid Multiplier × Time Multiplier</div>
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
        <button className="btn-abandon" onClick={handleAbandon}>Abandon Game</button>
      )}
    </>
  );
}

function SurvivalBoard() {
  const { user } = useAuth();
  const { cardsHidden } = useGameSettings();
  const {
    board, rows, cols,
    stage, lives, completions, score, clutchPairs,
    started, gameOver, timeLeft, timerExpired, levelComplete, pendingStart,
    stageDurationMs, ldm,
    handleCardClick, startGame, resetGame, beginLevel, advanceLevel, continueAfterTimeout, getAvgTimeToPairMs,
  } = useSurvivalGame();

  const totalPairs = Math.floor((rows * cols) / 2);
  const pm = totalPairs / 8;
  const elapsed = stageDurationMs - timeLeft;
  const tm = getTimeMultiplier(elapsed);
  function fmt(n: number) { return n % 1 === 0 ? String(n) : n.toFixed(1); }

  const startedAtRef = useRef<number>(0);
  const savedRef = useRef(false);

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
        gameId: now,
        mode: "survival",
        score,
        timeMs: Date.now() - startedAtRef.current,
        rows,
        cols,
        pairs,
        stage,
        completedAt: now,
        leaderboardkey: "survival",
        avgTimeToPairMs: getAvgTimeToPairMs(),
        clutchPairs,
        survived: false,
        remainingPairs: Math.floor(board.filter(c => !c.matched && c.iconName !== "__blank__").length / 2),
      }).catch(console.error);
    }
    resetGame();
  }

  // Save completed survival run to DynamoDB
  useEffect(() => {
    if (!gameOver || !user || savedRef.current) return;
    savedRef.current = true;
    const pairs = Math.floor((rows * cols) / 2);
    const now = new Date().toISOString();
    saveGame(user.userId, {
      gameId: now,
      mode: "survival",
      score,
      timeMs: Date.now() - startedAtRef.current,
      rows,
      cols,
      pairs,
      stage,
      completedAt: now,
      leaderboardkey: "survival",
      avgTimeToPairMs: getAvgTimeToPairMs(),
      clutchPairs,
      survived: false,
      remainingPairs: Math.floor(board.filter(c => !c.matched && c.iconName !== "__blank__").length / 2),
    }).catch(console.error);
  }, [gameOver, user, rows, cols, score, stage]);

  if (gameOver) {
    return (
      <div className="game-over">
        <div className="game-over-title">Game Over</div>
        <div className="game-over-info">You reached Stage {stage}</div>
        <div className="game-over-info">Final Score: {score.toLocaleString()}</div>
        <button className="btn-start" onClick={resetGame}>Play Again</button>
      </div>
    );
  }

  const isLow = timeLeft <= 15_000;

  return (
    <>
      <div className="survival-info">
        <div className="survival-stat">
          <div className="survival-stat-label">Current Stage</div>
          <div className="survival-stat-stage">{stage}</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Level</div>
          <div className="survival-stat-stage">{completions + 1}</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Lives</div>
          <Lives count={lives} />
        </div>
      </div>

      <div className="timer-row">
        <div className={`timer-box${isLow ? " timer-box-danger" : ""}`}>
          <Clock size={18} color={isLow ? "#ef4444" : "#84cc16"} />
          <div>
            <div className="timer-label">Stage Time</div>
            <div className={`timer-value${isLow ? " timer-value-danger" : ""}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <div className="scoring-box">
          <div className="scoring-label">Scoring Formula</div>
          <div className="scoring-formula">100 × {fmt(pm)} × {fmt(tm)} × {fmt(ldm)}</div>
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

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Total Score</div>
          <div className="stat-value stat-value-accent">{score.toLocaleString()}</div>
        </div>
      </div>

      {started && !pendingStart && !timerExpired && !levelComplete && (
        <button className="btn-abandon" onClick={handleAbandon}>Abandon Game</button>
      )}
    </>
  );
}

export default function MemoryGrid() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"freeplay" | "survival">("freeplay");

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="game-board">
      <div className="mode-toggle">
        <div className="mode-toggle-track">
          <button
            className={`mode-btn${mode === "freeplay" ? " mode-btn-active" : ""}`}
            onClick={() => setMode("freeplay")}
          >
            Freeplay
          </button>
          <button
            className={`mode-btn${mode === "survival" ? " mode-btn-active" : ""}`}
            onClick={() => setMode("survival")}
          >
            Survival
          </button>
        </div>
      </div>

      {mode === "freeplay" ? <FreeplayBoard /> : <SurvivalBoard />}
    </div>
  );
}
