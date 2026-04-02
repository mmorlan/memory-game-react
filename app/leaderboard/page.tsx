"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import { ChevronDown } from "../components/icons";
import { LeaderboardEntry } from "../util/dynamodb";
import { formatTime } from "../util/scoring";
import classes from "./page.module.css";

type Mode = "freeplay" | "survival";

const GRID_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 4); // 4–12

function GridFilter({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
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
    <div className={classes["grid-filter"]} ref={ref} onClick={() => setOpen(o => !o)}>
      <span>{value ?? "ALL"}</span>
      <ChevronDown size={14} color="#9ca3af" className={open ? classes["chevron-open"] : ""} />
      {open && (
        <div className={classes["grid-filter-dropdown"]}>
          <div
            className={`${classes["grid-filter-option"]}${value === null ? ` ${classes["grid-filter-option-active"]}` : ""}`}
            onClick={e => { e.stopPropagation(); onChange(null); setOpen(false); }}
          >
            ALL
          </div>
          {GRID_OPTIONS.map(n => (
            <div
              key={n}
              className={`${classes["grid-filter-option"]}${n === value ? ` ${classes["grid-filter-option-active"]}` : ""}`}
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

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) as T : fallback;
  } catch { return fallback; }
}

const cache: Partial<Record<Mode, LeaderboardEntry[]>> = {};

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("freeplay");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRows, setFilterRows] = useState<number | null>(null);
  const [filterCols, setFilterCols] = useState<number | null>(null);

  // Restore persisted state after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMode(load("lb_mode", "freeplay" as Mode));
    setFilterRows(load("lb_filterRows", null));
    setFilterCols(load("lb_filterCols", null));
  }, []);

  useEffect(() => { localStorage.setItem("lb_mode", JSON.stringify(mode)); }, [mode]);
  useEffect(() => { localStorage.setItem("lb_filterRows", JSON.stringify(filterRows)); }, [filterRows]);
  useEffect(() => { localStorage.setItem("lb_filterCols", JSON.stringify(filterCols)); }, [filterCols]);

  useEffect(() => {
    if (cache[mode]) {
      setEntries(cache[mode]!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?mode=${mode}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        cache[mode] = data as LeaderboardEntry[];
        setEntries(cache[mode]!);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [mode]);

  const filtered = entries
    .filter(e => e.score > 0 && (filterRows === null || e.rows === filterRows) && (filterCols === null || e.cols === filterCols))
    .slice(0, 10);

  return (
    <main className={classes.page}>
      <div className={classes.header}>
        <Trophy size={28} color="#84cc16" />
        <h1 className={classes.title}>Leaderboard</h1>
      </div>

      <div className={classes["tab-toggle"]}>
        {(["freeplay", "survival"] as Mode[]).map(m => (
          <button
            key={m}
            className={`${classes["tab-btn"]}${mode === m ? ` ${classes["tab-btn-active"]}` : ""}`}
            onClick={() => setMode(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === "freeplay" && (
        <div className={classes["grid-controls"]}>
          <span className={classes["grid-controls-label"]}>Grid Size:</span>
          <GridFilter value={filterRows} onChange={setFilterRows} />
          <span className={classes["grid-controls-times"]}>×</span>
          <GridFilter value={filterCols} onChange={setFilterCols} />
        </div>
      )}

      <div className={classes.card}>
        <div className={classes["table-head"]}>
          <span>#</span>
          <span>Player</span>
          <span>Score</span>
          {mode === "freeplay" ? <span>Grid</span> : <span>Stage</span>}
          {mode === "freeplay" ? <span>Time</span> : <span>Remaining Pairs</span>}
        </div>

        {loading ? (
          <div className={classes.empty}>Loading...</div>
        ) : error ? (
          <div className={classes.empty}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={classes.empty}>No scores yet. Be the first!</div>
        ) : (
          <div className={classes.rows}>
            {filtered.map((e, i) => (
              <div key={e.gameId} className={`${classes.row}${i < 3 ? ` ${classes[`rank-${i + 1}`]}` : ""}`}>
                <span className={classes.rank}>{i + 1}</span>
                <span className={classes.player}>{e.username ?? "Anonymous"}</span>
                <span className={classes.score}>{e.score.toLocaleString()}</span>
                {mode === "freeplay"
                  ? <span>{e.rows}×{e.cols}</span>
                  : <span>Stage {e.stage ?? 1}</span>}
                {mode === "freeplay"
                  ? <span>{formatTime(e.timeMs)}</span>
                  : <span>{e.remainingPairs ?? "—"}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
