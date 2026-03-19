import { useState, useEffect } from "react";
import useLocalStorage from "./useLocalStorage";
import useStopwatch from "./useStopwatch";
import { ICON_NAMES } from "../components/icons";

export interface Card {
  id: number;
  iconName: string;
  clicked: boolean;
  matched: boolean;
}

function createShuffledBoard(rows: number, cols: number): Card[] {
  const total = rows * cols;
  const pairs = Math.floor(total / 2);
  const hasBlank = total % 2 === 1;

  const shuffledIcons = [...ICON_NAMES].sort(() => Math.random() - 0.5).slice(0, pairs);
  const doubled = [...shuffledIcons, ...shuffledIcons];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }

  const cards: Card[] = doubled.map((iconName, index) => ({
    id: index,
    iconName,
    clicked: false,
    matched: false,
  }));

  if (hasBlank) {
    const centerIndex = Math.floor(total / 2);
    cards.splice(centerIndex, 0, {
      id: -1,
      iconName: "__blank__",
      clicked: false,
      matched: true,
    });
  }

  return cards.map((card, index) => ({ ...card, id: index }));
}

export default function useMemoryGame() {
  const [rows, setRows] = useLocalStorage<number>("mg-rows", 4);
  const [cols, setCols] = useLocalStorage<number>("mg-cols", 4);
  const [board, setBoard] = useLocalStorage<Card[]>("mg-board", createShuffledBoard(4, 4));
  const [startTime, setStartTime] = useLocalStorage<number>("mg-start", Date.now());
  const [endTime, setEndTime] = useLocalStorage<number | null>("mg-end", null);
  const [started, setStarted] = useState(false);

  const allMatched = board.filter(c => c.iconName !== "__blank__").every(c => c.matched);
  const elapsed = useStopwatch(started && !allMatched, startTime, endTime);

  useEffect(() => {
    if (allMatched && started && !endTime) {
      setEndTime(Date.now());
    }
  }, [allMatched, started, endTime, setEndTime]);

  function handleCardClick(cardId: number): void {
    if (!started) return;
    const currentlyClicked = board.filter(c => c.clicked && !c.matched);
    const clickedCard = board.find(c => c.id === cardId);

    if (!clickedCard || clickedCard.clicked || clickedCard.matched) return;
    if (currentlyClicked.length >= 2) return;

    let newBoard = board.map(c =>
      c.id === cardId ? { ...c, clicked: true } : c
    );

    const nowClicked = newBoard.filter(c => c.clicked && !c.matched);

    if (nowClicked.length === 2) {
      if (nowClicked[0].iconName === nowClicked[1].iconName) {
        newBoard = newBoard.map(c =>
          c.clicked && !c.matched ? { ...c, clicked: false, matched: true } : c
        );
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map(c =>
            c.clicked && !c.matched ? { ...c, clicked: false } : c
          ));
        }, 800);
      }
    }

    setBoard(newBoard);
  }

  function startGame(newRows: number, newCols: number): void {
    setRows(newRows);
    setCols(newCols);
    setBoard(createShuffledBoard(newRows, newCols));
    setStartTime(Date.now());
    setEndTime(null);
    setStarted(true);
  }

  function resetGame(): void {
    setBoard(createShuffledBoard(rows, cols));
    setStartTime(Date.now());
    setEndTime(null);
    setStarted(false);
  }

  return { board, rows, cols, started, handleCardClick, startGame, resetGame, elapsed };
}
