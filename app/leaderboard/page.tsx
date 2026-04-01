"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { LeaderboardEntry } from "../util/dynamodb";
import { formatTime } from "../util/scoring";
import classes from "./page.module.css";

type Mode = "freeplay" | "survival";

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("freeplay");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?mode=${mode}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEntries(data as LeaderboardEntry[]);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [mode]);

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

      <div className={classes.card}>
        <div className={classes["table-head"]}>
          <span>#</span>
          <span>Player</span>
          <span>Score</span>
          {mode === "freeplay" ? <span>Grid</span> : <span>Stage</span>}
          <span>Time</span>
        </div>

        {loading ? (
          <div className={classes.empty}>Loading...</div>
        ) : error ? (
          <div className={classes.empty}>{error}</div>
        ) : entries.length === 0 ? (
          <div className={classes.empty}>No scores yet. Be the first!</div>
        ) : (
          <div className={classes.rows}>
            {entries.map((e, i) => (
              <div key={e.gameId} className={`${classes.row}${i < 3 ? ` ${classes[`rank-${i + 1}`]}` : ""}`}>
                <span className={classes.rank}>{i + 1}</span>
                <span className={classes.player}>{e.username ?? "Anonymous"}</span>
                <span className={classes.score}>{e.score.toLocaleString()}</span>
                {mode === "freeplay"
                  ? <span>{e.rows}×{e.cols}</span>
                  : <span>Stage {e.stage ?? 1}</span>}
                <span>{formatTime(e.timeMs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
