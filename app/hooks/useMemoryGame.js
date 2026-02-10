import { useEffect } from "react";
import useLocalStorage from "./useLocalStorage";
import useStopwatch from "./useStopwatch";

const ICON_NAMES = [
  "AlarmClock", "Bell", "Book", "Clock",
  "Globe", "Heart", "Moon", "Music",
];

function createShuffledBoard() {
  const doubled = [...ICON_NAMES, ...ICON_NAMES];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((iconName, index) => ({
    id: index,
    iconName,
    clicked: false,
    matched: false,
  }));
}

export default function useMemoryGame() {
  const [board, setBoard] = useLocalStorage("memory-game-board", createShuffledBoard());
  const [startTime, setStartTime] = useLocalStorage("memory-game-start", Date.now());
  const [endTime, setEndTime] = useLocalStorage("memory-game-end", null);

  const allMatched = board.every(c => c.matched);
  const elapsed = useStopwatch(!allMatched, startTime, endTime);

  useEffect(() => {
    if (allMatched && !endTime) {
      setEndTime(Date.now());
    }
  }, [allMatched, endTime, setEndTime]);

  function handleCardClick(cardId) {
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

  function resetGame() {
    setBoard(createShuffledBoard());
    setStartTime(Date.now());
    setEndTime(null);
  }

  return { board, handleCardClick, resetGame, elapsed };
}
