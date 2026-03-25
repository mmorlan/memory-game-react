import { useState, useEffect, useRef } from "react";
import { Card, createShuffledBoard } from "./useMemoryGame";
import useCountdown from "./useCountdown";
import { calcPairScore } from "../util/scoring";

const STAGE_DURATION_MS = 60_000;
const COMPLETIONS_PER_STAGE = 3;
const MAX_LIVES = 3;

function getGridForStage(stage: number) {
  const size = Math.min(stage + 3, 12); // Stage 1→4, Stage 2→5, ..., Stage 9→12 (max)
  return { rows: size, cols: size };
}

// completions is 0-indexed within a stage (0 = level 1, 1 = level 2, 2 = level 3)
function getLDM(completions: number): number {
  if (completions === 1) return 1.5;
  if (completions === 2) return 2;
  return 1;
}

export default function useSurvivalGame() {
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [completions, setCompletions] = useState(0);
  const [board, setBoard] = useState<Card[]>(() => createShuffledBoard(4, 4));
  const [started, setStarted] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [score, setScore] = useState(0);
  const lastPairTimeRef = useRef<number>(Date.now());

  const { rows, cols } = getGridForStage(stage);
  const allMatched = board.filter((c) => c.iconName !== "__blank__").every((c) => c.matched);

  const timeLeft = useCountdown(
    started && timerActive && !allMatched && !gameOver,
    STAGE_DURATION_MS,
    timerKey,
  );

  // Stable refs so effects don't go stale
  const stageRef = useRef(stage);
  const completionsRef = useRef(completions);
  const livesRef = useRef(lives);
  stageRef.current = stage;
  completionsRef.current = completions;
  livesRef.current = lives;

  // Board completed — advance completions or stage
  useEffect(() => {
    if (!started || gameOver || !allMatched) return;
    const timeout = setTimeout(() => {
      const currentStage = stageRef.current;
      const newCompletions = completionsRef.current + 1;
      if (newCompletions >= COMPLETIONS_PER_STAGE) {
        const nextStage = currentStage + 1;
        const { rows: r, cols: c } = getGridForStage(nextStage);
        setStage(nextStage);
        setCompletions(0);
        setBoard(createShuffledBoard(r, c));
      } else {
        const { rows: r, cols: c } = getGridForStage(currentStage);
        setCompletions(newCompletions);
        setBoard(createShuffledBoard(r, c));
      }
      setTimerActive(false);
      setTimerKey((k) => k + 1);
      lastPairTimeRef.current = Date.now();
    }, 800);
    return () => clearTimeout(timeout);
  }, [allMatched, started, gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer expired — lose a life or end game
  useEffect(() => {
    if (!started || !timerActive || gameOver || allMatched || timeLeft > 0) return;
    const newLives = livesRef.current - 1;
    if (newLives <= 0) {
      setLives(0);
      setGameOver(true);
    } else {
      setLives(newLives);
      const { rows: r, cols: c } = getGridForStage(stageRef.current);
      setBoard(createShuffledBoard(r, c));
      setTimerActive(false);
      setTimerKey((k) => k + 1);
      lastPairTimeRef.current = Date.now();
    }
  }, [timeLeft, started, timerActive, gameOver, allMatched]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCardClick(cardId: number): void {
    if (!started || gameOver || (timerActive && timeLeft === 0)) return;
    if (!timerActive) {
      setTimerActive(true);
      lastPairTimeRef.current = Date.now();
    }
    const currentlyClicked = board.filter((c) => c.clicked && !c.matched);
    const clickedCard = board.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.clicked || clickedCard.matched) return;
    if (currentlyClicked.length >= 2) return;

    let newBoard = board.map((c) => (c.id === cardId ? { ...c, clicked: true } : c));
    const nowClicked = newBoard.filter((c) => c.clicked && !c.matched);

    if (nowClicked.length === 2) {
      if (nowClicked[0].iconName === nowClicked[1].iconName) {
        newBoard = newBoard.map((c) =>
          c.clicked && !c.matched ? { ...c, clicked: false, matched: true } : c,
        );
        const now = Date.now();
        const timeToPair = now - lastPairTimeRef.current;
        lastPairTimeRef.current = now;
        const totalPairs = Math.floor((rows * cols) / 2);
        const ldm = getLDM(completionsRef.current);
        setScore((prev) => prev + calcPairScore(totalPairs, timeToPair, ldm));
      } else {
        setTimeout(() => {
          setBoard((prev) =>
            prev.map((c) => (c.clicked && !c.matched ? { ...c, clicked: false } : c)),
          );
        }, 800);
      }
    }
    setBoard(newBoard);
  }

  function startGame(): void {
    const { rows: r, cols: c } = getGridForStage(1);
    setStage(1);
    setLives(MAX_LIVES);
    setCompletions(0);
    setBoard(createShuffledBoard(r, c));
    setTimerKey(0);
    setTimerActive(false);
    setGameOver(false);
    setStarted(true);
    setScore(0);
    lastPairTimeRef.current = Date.now();
  }

  function resetGame(): void {
    setStarted(false);
    setTimerActive(false);
    setGameOver(false);
    setStage(1);
    setLives(MAX_LIVES);
    setCompletions(0);
    setBoard(createShuffledBoard(4, 4));
    setTimerKey((k) => k + 1);
    setScore(0);
    lastPairTimeRef.current = Date.now();
  }

  return {
    board, rows, cols,
    stage, lives, completions, score,
    started, gameOver, timeLeft,
    handleCardClick, startGame, resetGame,
  };
}
