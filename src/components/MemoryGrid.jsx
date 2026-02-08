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

export default function MemoryGrid() {
  const { board, handleCardClick } = useMemoryGame();

  return (
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
  );
}
