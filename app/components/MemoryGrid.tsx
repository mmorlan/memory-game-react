"use client";

import { useState, useEffect } from "react";
import "./MemoryGrid.css";
import { AlarmClock, Bell, Book, Clock, ChevronDown, Globe, Heart, Moon, Music, type LucideIcon } from "lucide-react";
import useMemoryGame from "../hooks/useMemoryGame";

const ICON_MAP: Record<string, LucideIcon> = {
  AlarmClock,
  Bell,
  Book,
  Clock,
  Globe,
  Heart,
  Moon,
  Music,
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MemoryGrid() {
  const [mounted, setMounted] = useState(false);
  const { board, handleCardClick, resetGame, elapsed } = useMemoryGame();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (board.every(card => card.matched)) {
    return (
      <>
        <div className="win-message">You won in {formatTime(elapsed)}!</div>
        <button onClick={resetGame}>Play Again</button>
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
      <div className="grid-controls">
        <span className="grid-controls-label">Grid Size:</span>
        <div className="grid-controls-selectors">
          <div className="grid-select">
            <span>Rows: 4</span>
            <ChevronDown size={14} color="#9ca3af" />
          </div>
          <span className="grid-controls-times">×</span>
          <div className="grid-select">
            <span>Cols: 4</span>
            <ChevronDown size={14} color="#9ca3af" />
          </div>
        </div>
        <span className="grid-controls-hint">(4–12 each)</span>
      </div>

      {/* Timer + Scoring + New Game */}
      <div className="timer-row">
        <div className="timer-box">
          <Clock size={18} color="#00ff3c" />
          <div>
            <div className="timer-value">{formatTime(elapsed)}</div>
          </div>
        </div>
        <div className="scoring-box">
          <div className="scoring-label">Scoring Formula</div>
          <div className="scoring-formula">100 pts × Grid Multiplier × Time Multiplier</div>
        </div>
        <button onClick={resetGame}>New Game</button>
      </div>

      {/* Game Grid */}
      <div className="grid-container">
        <div className="memory-grid">
          {board.map((card) => {
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
          })}
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
          <div className="stat-value">0 / {board.length / 2}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Current Score</div>
          <div className="stat-value stat-value-accent">0</div>
        </div>
      </div>

    </div>
  );
}
