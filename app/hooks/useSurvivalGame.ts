import { useState, useEffect, useRef } from "react";
import { Card, createShuffledBoard } from "./useMemoryGame";
import useCountdown from "./useCountdown";
import { calcPairScore } from "../util/scoring";
import { SIMILAR_ICON_GROUPS } from "../components/icons";

function getStageDurationMs(stage: number): number {
  const { rows, cols } = getGridForStage(stage);
  const pairs = Math.floor((rows * cols) / 2);
  return pairs * 7_500;
}
export const COMPLETIONS_PER_STAGE = 3;
const MAX_LIVES = 3;
const SAVE_KEY = "survivalGameState";

interface SurvivalSaveState {
  stage: number;
  lives: number;
  completions: number;
  score: number;
  clutchPairs: number;
  started: boolean;
  gameOver: boolean;
  timerExpired: boolean;
  levelComplete: boolean;
  board: Card[];
  totalPairTimeMsMs: number;
  matchedPairCount: number;
}

function loadSaveState(): SurvivalSaveState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SurvivalSaveState) : null;
  } catch {
    return null;
  }
}

function clearSaveState() {
  if (typeof window !== "undefined") localStorage.removeItem(SAVE_KEY);
}

function getSimilarCount(completions: number, stage: number): number {
  if (completions === 0) return 0;
  return (completions + 1) + (stage - 1);
}

function selectSimilarIcons(count: number): string[] {
  if (count === 0) return [];
  const groups = SIMILAR_ICON_GROUPS
    .map(g => [...g].sort(() => Math.random() - 0.5))
    .sort(() => Math.random() - 0.5);

  const result: string[] = [];
  let remaining = count;

  for (let i = 0; i < groups.length && remaining > 0; i++) {
    const group = groups[i];
    const maxTake = Math.min(group.length, remaining);
    if (maxTake < 2) break;
    const take = remaining <= maxTake
      ? remaining
      : Math.min(maxTake, remaining - 2);
    result.push(...group.slice(0, Math.max(take, 2)));
    remaining -= Math.max(take, 2);
  }

  return result;
}

function getGridForStage(stage: number) {
  const size = Math.min(stage + 3, 12);
  return { rows: size, cols: size };
}

function getLDM(completions: number): number {
  if (completions === 1) return 1.5;
  if (completions === 2) return 2;
  return 1;
}

export default function useSurvivalGame() {
  // Load saved state once at initialization
  const savedRef = useRef<SurvivalSaveState | null | undefined>(undefined);
  if (savedRef.current === undefined) {
    savedRef.current = loadSaveState();
  }
  const s = savedRef.current;

  const [stage, setStage] = useState<number>(s?.stage ?? 1);
  const [lives, setLives] = useState<number>(s?.lives ?? MAX_LIVES);
  const [completions, setCompletions] = useState<number>(s?.completions ?? 0);
  const [board, setBoard] = useState<Card[]>(() => {
    if (s?.board?.length) return s.board;
    return createShuffledBoard(4, 4);
  });
  const [started, setStarted] = useState<boolean>(s?.started ?? false);
  const [timerActive, setTimerActive] = useState(false);
  const [gameOver, setGameOver] = useState<boolean>(s?.gameOver ?? false);
  const [timerExpired, setTimerExpired] = useState<boolean>(s?.timerExpired ?? false);
  const [levelComplete, setLevelComplete] = useState<boolean>(s?.levelComplete ?? false);
  const [timerKey, setTimerKey] = useState(0);
  const [score, setScore] = useState<number>(s?.score ?? 0);
  const [clutchPairs, setClutchPairs] = useState<number>(s?.clutchPairs ?? 0);
  // pendingStart: board is ready but timer hasn't started — waiting for "Start Game" click
  const [pendingStart, setPendingStart] = useState<boolean>(
    !!(s?.started && !s?.gameOver && !s?.levelComplete && !s?.timerExpired)
  );

  const lastPairTimeRef = useRef<number>(Date.now());
  const totalPairTimeMsRef = useRef<number>(s?.totalPairTimeMsMs ?? 0);
  const matchedPairCountRef = useRef<number>(s?.matchedPairCount ?? 0);

  const { rows, cols } = getGridForStage(stage);
  const allMatched = board.filter(c => c.iconName !== "__blank__").every(c => c.matched);

  const stageDurationMs = getStageDurationMs(stage);

  const timeLeft = useCountdown(
    started && timerActive && !allMatched && !gameOver,
    stageDurationMs,
    timerKey,
  );

  // Persist state to localStorage whenever key values change
  useEffect(() => {
    if (!started) return;
    const state: SurvivalSaveState = {
      stage, lives, completions, score, clutchPairs,
      started, gameOver, timerExpired, levelComplete,
      board,
      totalPairTimeMsMs: totalPairTimeMsRef.current,
      matchedPairCount: matchedPairCountRef.current,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [stage, lives, completions, score, clutchPairs, started, gameOver, timerExpired, levelComplete, board]);

  // Board completed — lock score and wait for user to advance
  useEffect(() => {
    if (!started || gameOver || !allMatched || levelComplete) return;
    setLevelComplete(true);
    setTimerActive(false);
  }, [allMatched, started, gameOver, levelComplete]);

  // Timer expired — reveal all cards and wait for user action
  useEffect(() => {
    if (!started || !timerActive || gameOver || allMatched || timeLeft > 0) return;
    setTimerExpired(true);
    setTimerActive(false);
  }, [timeLeft, started, timerActive, gameOver, allMatched]);

  function handleCardClick(cardId: number): void {
    if (!started || gameOver || timerExpired || levelComplete || pendingStart) return;

    const currentlyClicked = board.filter(c => c.clicked && !c.matched);
    const clickedCard = board.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.clicked || clickedCard.matched) return;
    if (currentlyClicked.length >= 2) return;

    let newBoard = board.map(c => c.id === cardId ? { ...c, clicked: true } : c);
    const nowClicked = newBoard.filter(c => c.clicked && !c.matched);

    if (nowClicked.length === 2) {
      if (nowClicked[0].iconName === nowClicked[1].iconName) {
        newBoard = newBoard.map(c =>
          c.clicked && !c.matched ? { ...c, clicked: false, matched: true } : c,
        );
        const now = Date.now();
        const timeToPair = now - lastPairTimeRef.current;
        lastPairTimeRef.current = now;
        totalPairTimeMsRef.current += timeToPair;
        matchedPairCountRef.current++;
        if (timerActive && timeLeft <= 3_000) setClutchPairs(prev => prev + 1);
        const totalPairs = Math.floor((rows * cols) / 2);
        const ldm = getLDM(completions);
        const elapsed = stageDurationMs - timeLeft;
        setScore(prev => prev + calcPairScore(totalPairs, elapsed, ldm));
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map(c => c.clicked && !c.matched ? { ...c, clicked: false } : c));
        }, 800);
      }
    }
    setBoard(newBoard);
  }

  // Called when user clicks "Start Game" between levels/after continue
  function beginLevel(): void {
    setPendingStart(false);
    setTimerActive(true);
    lastPairTimeRef.current = Date.now();
  }

  // Advance to next level or stage — sets up board and waits for Start click
  function advanceLevel(): void {
    const newCompletions = completions + 1;
    if (newCompletions >= COMPLETIONS_PER_STAGE) {
      const nextStage = stage + 1;
      const { rows: r, cols: c } = getGridForStage(nextStage);
      setStage(nextStage);
      setCompletions(0);
      setBoard(createShuffledBoard(r, c));
    } else {
      const { rows: r, cols: c } = getGridForStage(stage);
      setCompletions(newCompletions);
      setBoard(createShuffledBoard(r, c, selectSimilarIcons(getSimilarCount(newCompletions, stage))));
    }
    setLevelComplete(false);
    setTimerKey(k => k + 1);
    setPendingStart(true);
  }

  // User acknowledges timer expiry — costs a life, then waits for Start click
  function continueAfterTimeout(): void {
    const newLives = lives - 1;
    if (newLives <= 0) {
      setLives(0);
      setGameOver(true);
    } else {
      setLives(newLives);
      const { rows: r, cols: c } = getGridForStage(stage);
      setBoard(createShuffledBoard(r, c, selectSimilarIcons(getSimilarCount(completions, stage))));
      setTimerExpired(false);
      setTimerKey(k => k + 1);
      setPendingStart(true);
    }
  }

  function startGame(): void {
    const { rows: r, cols: c } = getGridForStage(1);
    setStage(1);
    setLives(MAX_LIVES);
    setCompletions(0);
    setBoard(createShuffledBoard(r, c));
    setTimerKey(0);
    setTimerActive(true);
    setGameOver(false);
    setTimerExpired(false);
    setLevelComplete(false);
    setPendingStart(false);
    setStarted(true);
    setScore(0);
    setClutchPairs(0);
    lastPairTimeRef.current = Date.now();
    totalPairTimeMsRef.current = 0;
    matchedPairCountRef.current = 0;
  }

  function resetGame(): void {
    clearSaveState();
    savedRef.current = null;
    setStarted(false);
    setTimerActive(false);
    setGameOver(false);
    setTimerExpired(false);
    setLevelComplete(false);
    setPendingStart(false);
    setStage(1);
    setLives(MAX_LIVES);
    setCompletions(0);
    setBoard(createShuffledBoard(4, 4));
    setTimerKey(k => k + 1);
    setScore(0);
    setClutchPairs(0);
    lastPairTimeRef.current = Date.now();
    totalPairTimeMsRef.current = 0;
    matchedPairCountRef.current = 0;
  }

  function getAvgTimeToPairMs(): number {
    if (matchedPairCountRef.current === 0) return 0;
    return Math.round(totalPairTimeMsRef.current / matchedPairCountRef.current);
  }

  return {
    board, rows, cols,
    stage, lives, completions, score, clutchPairs,
    started, gameOver, timeLeft, timerExpired, levelComplete, pendingStart,
    stageDurationMs, ldm: getLDM(completions),
    handleCardClick, startGame, resetGame, beginLevel, advanceLevel, continueAfterTimeout, getAvgTimeToPairMs,
  };
}
