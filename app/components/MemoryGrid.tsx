"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Clock } from "lucide-react";
import "./MemoryGrid.css";
import { ChevronDown } from "./icons";
import { ICON_MAP } from "./icons";
import useMemoryGame from "../hooks/useMemoryGame";
import useSurvivalGame from "../hooks/useSurvivalGame";
import { Card } from "../hooks/useMemoryGame";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
}: {
  board: Card[];
  cols: number;
  started: boolean;
  pendingCols: number;
  pendingRows: number;
  onCardClick: (id: number) => void;
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
  const { board, rows, cols, started, handleCardClick, startGame, resetGame, elapsed } = useMemoryGame();
  const [pendingRows, setPendingRows] = useState(rows);
  const [pendingCols, setPendingCols] = useState(cols);

  useEffect(() => {
    setPendingRows(rows);
    setPendingCols(cols);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allMatched = board.filter((c) => c.iconName !== "__blank__").every((c) => c.matched);
  const showStartGame = !started || pendingRows !== rows || pendingCols !== cols;

  function handleNewGame() {
    resetGame();
    setPendingRows(rows);
    setPendingCols(cols);
  }

  if (allMatched && started) {
    return (
      <>
        <div className="win-message">You won in {formatTime(elapsed)}!</div>
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
        {started && <button onClick={handleNewGame}>New Game</button>}
      </div>

      <GameGrid
        board={board}
        cols={cols}
        started={started}
        pendingRows={pendingRows}
        pendingCols={pendingCols}
        onCardClick={handleCardClick}
      />

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Moves</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat">
          <div className="stat-label">Matches</div>
          <div className="stat-value">
            0 / {board.filter((c) => c.iconName !== "__blank__").length / 2}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Current Score</div>
          <div className="stat-value stat-value-accent">0</div>
        </div>
      </div>
    </>
  );
}

function SurvivalBoard() {
  const {
    board, rows, cols,
    stage, lives, completions,
    started, gameOver, timeLeft,
    handleCardClick, startGame, resetGame,
  } = useSurvivalGame();

  if (gameOver) {
    return (
      <div className="game-over">
        <div className="game-over-title">Game Over</div>
        <div className="game-over-info">You reached Stage {stage}</div>
        <button className="btn-start" onClick={resetGame}>Play Again</button>
      </div>
    );
  }

  const isLow = timeLeft <= 15_000;

  return (
    <>
      {/* Stage info */}
      <div className="survival-info">
        <div className="survival-stat">
          <div className="survival-stat-label">Current Stage</div>
          <div className="survival-stat-stage">{stage}</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Stage Progress</div>
          <div className="survival-stat-value">{completions} / 3 Completions</div>
        </div>
        <div className="survival-stat">
          <div className="survival-stat-label">Lives</div>
          <Lives count={lives} />
        </div>
      </div>

      {/* Timer */}
      <div className="timer-row">
        <div className={`timer-box${isLow ? " timer-box-danger" : ""}`}>
          <Clock size={18} color={isLow ? "#ef4444" : "#84cc16"} />
          <div>
            <div className="timer-label">Stage Time</div>
            <div className={`timer-value${isLow ? " timer-value-danger" : ""}`}>
              {started ? formatTime(timeLeft) : "1:00"}
            </div>
          </div>
        </div>
        <div className="scoring-box">
          <div className="scoring-label">Scoring Formula</div>
          <div className="scoring-formula">Base × Time + Early Bonus</div>
        </div>
      </div>

      {/* Start / New Game */}
      <div className="game-buttons">
        {!started && (
          <button className="btn-start" onClick={startGame}>
            Start Game
          </button>
        )}
        {started && <button onClick={resetGame}>New Game</button>}
      </div>

      <GameGrid
        board={board}
        cols={cols}
        started={started}
        pendingRows={rows}
        pendingCols={cols}
        onCardClick={handleCardClick}
      />

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Total Score</div>
          <div className="stat-value stat-value-accent">0</div>
        </div>
        <div className="stat">
          <div className="stat-label">Current Streak</div>
          <div className="stat-value stat-value-accent">0</div>
        </div>
      </div>
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
