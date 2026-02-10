import "./MemoryGrid.css";
import { AlarmClock, Bell, Book, Clock, Globe, Heart, Moon, Music } from "lucide-react";
import useMemoryGame from "../hooks/useMemoryGame";

const ICON_MAP = {
  AlarmClock,
  Bell,
  Book,
  Clock,
  Globe,
  Heart,
  Moon,
  Music,
};

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MemoryGrid() {
  const { board, handleCardClick, resetGame, elapsed } = useMemoryGame();
  if (board.every(card => card.matched)) {
    return (
      <>
        <div>You won in {formatTime(elapsed)}!</div>
        <button onClick={resetGame}>Reset Game</button>
      </>
    );
  }

  return (
    <>
      <div className="stopwatch">{formatTime(elapsed)}</div>
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
    </>
  );
}
