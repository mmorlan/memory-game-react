"use client";

import { useState, useEffect, useRef } from "react";
import "./MemoryGrid.css";
import { ChevronDown, Clock } from "./icons";
import { ICON_MAP } from "./icons";
import useMemoryGame from "../hooks/useMemoryGame";

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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="grid-select" ref={ref} onClick={() => setOpen(o => !o)}>
      <span>{value}</span>
      <ChevronDown size={14} color="#9ca3af" className={open ? "chevron-open" : ""} />
      {open && (
        <div className="grid-select-dropdown">
          {GRID_OPTIONS.map(n => (
            <div
              key={n}
              className={`grid-select-option${n === value ? " grid-select-option-active" : ""}`}
              onClick={e => { e.stopPropagation(); onChange(n); setOpen(false); }}
            >
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemoryGrid() {
  const [mounted, setMounted] = useState(false);
  const { board, rows, cols, started, handleCardClick, startGame, resetGame, elapsed } = useMemoryGame();
  const [pendingRows, setPendingRows] = useState(rows);
  const [pendingCols, setPendingCols] = useState(cols);

  useEffect(() => {
    setMounted(true);
    setPendingRows(rows);
    setPendingCols(cols);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const allMatched = board.filter(c => c.iconName !== "__blank__").every(c => c.matched);
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
    <div className="game-board">

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <div className="mode-toggle-track">
          <button className="mode-btn mode-btn-active">Freeplay</button>
          <button className="mode-btn">Survival</button>
        </div>
      </div>

      {/* Grid Controls */}
      <div className={`grid-controls${started ? " grid-controls-disabled" : ""}`}>
        <span className="grid-controls-label">Grid Size:</span>
        <div className="grid-controls-selectors">
          <GridSelect value={pendingRows} onChange={setPendingRows} />
          <span className="grid-controls-times">×</span>
          <GridSelect value={pendingCols} onChange={setPendingCols} />
        </div>
        <span className="grid-controls-hint">(4–12 each)</span>
      </div>

      {/* Timer + Scoring */}
      <div className="timer-row">
        <div className="timer-box">
          <Clock size={18} color="#00ff3c" />
          <div>
            <div className="timer-value">{started ? formatTime(elapsed) : "0:00"}</div>
          </div>
        </div>
        <div className="scoring-box">
          <div className="scoring-label">Scoring Formula</div>
          <div className="scoring-formula">100 pts × Grid Multiplier × Time Multiplier</div>
        </div>
      </div>

      {/* Buttons */}
      <div className="game-buttons">
        {showStartGame && (
          <button className="btn-start" onClick={() => startGame(pendingRows, pendingCols)}>
            Start Game
          </button>
        )}
        {started && <button onClick={handleNewGame}>New Game</button>}
      </div>

      {/* Game Grid */}
      <div className="grid-container">
        <div
          className="memory-grid"
          style={{ gridTemplateColumns: `repeat(${started ? cols : pendingCols}, 1fr)` }}
        >
          {!started
            ? Array.from({ length: pendingRows * pendingCols }, (_, i) => {
                const isCenter = (pendingRows * pendingCols) % 2 === 1 && i === Math.floor(pendingRows * pendingCols / 2);
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
                    onClick={() => handleCardClick(card.id)}
                    className={`memory-card${card.clicked ? " clicked" : ""}${card.matched ? " matched" : ""}`}
                  >
                    <IconComponent size={32} />
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <div className="stat-label">Moves</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat">
          <div className="stat-label">Matches</div>
          <div className="stat-value">0 / {board.filter(c => c.iconName !== "__blank__").length / 2}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Current Score</div>
          <div className="stat-value stat-value-accent">0</div>
        </div>
      </div>

    </div>
  );
}
