"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy, Monitor, Smartphone } from "lucide-react";
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

type DeviceFilter = "all" | "desktop" | "mobile";
type AllEntries = { freeplay: LeaderboardEntry[]; survival: LeaderboardEntry[] };

const DEVICE_OPTIONS: { value: DeviceFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all",     label: "All",     icon: null },
  { value: "desktop", label: "Desktop", icon: <Monitor size={14} /> },
  { value: "mobile",  label: "Mobile",  icon: <Smartphone size={14} /> },
];

export default function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("freeplay");
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [data, setData] = useState<AllEntries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRows, setFilterRows] = useState<number | null>(null);
  const [filterCols, setFilterCols] = useState<number | null>(null);

  // Restore persisted UI state after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const savedMode = localStorage.getItem("lb_mode");
    if (savedMode === "freeplay" || savedMode === "survival") setMode(savedMode);
    const savedDevice = localStorage.getItem("lb_device");
    if (savedDevice === "all" || savedDevice === "desktop" || savedDevice === "mobile") setDeviceFilter(savedDevice);
    try {
      const r = localStorage.getItem("lb_filterRows");
      const c = localStorage.getItem("lb_filterCols");
      if (r) setFilterRows(JSON.parse(r));
      if (c) setFilterCols(JSON.parse(c));
    } catch { /* ignore */ }

    fetch("/api/leaderboard")
      .then(res => res.json())
      .then((json: AllEntries & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleModeChange(m: Mode) {
    setMode(m);
    localStorage.setItem("lb_mode", m);
  }

  function handleDeviceFilter(d: DeviceFilter) {
    setDeviceFilter(d);
    localStorage.setItem("lb_device", d);
  }

  function handleFilterRows(n: number | null) {
    setFilterRows(n);
    localStorage.setItem("lb_filterRows", JSON.stringify(n));
  }

  function handleFilterCols(n: number | null) {
    setFilterCols(n);
    localStorage.setItem("lb_filterCols", JSON.stringify(n));
  }

  const entries = data?.[mode] ?? [];
  const filtered = entries
    .filter(e =>
      e.score > 0 &&
      (deviceFilter === "all" || e.device === deviceFilter) &&
      (filterRows === null || e.rows === filterRows) &&
      (filterCols === null || e.cols === filterCols)
    )
    .slice(0, 10);

  return (
    <main className={classes.page}>
      <div className={classes.header}>
        <Trophy size={28} color="#00ff3c" />
        <h1 className={classes.title}>Leaderboard</h1>
      </div>

      <div className={classes["tab-toggle"]}>
        {(["freeplay", "survival"] as Mode[]).map(m => (
          <button
            key={m}
            className={`${classes["tab-btn"]}${mode === m ? ` ${classes["tab-btn-active"]}` : ""}`}
            onClick={() => handleModeChange(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className={classes["tab-toggle"]}>
        {DEVICE_OPTIONS.map(({ value, label, icon }) => (
          <button
            key={value}
            className={`${classes["tab-btn"]}${deviceFilter === value ? ` ${classes["tab-btn-active"]}` : ""}`}
            onClick={() => handleDeviceFilter(value)}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {mode === "freeplay" && (
        <div className={classes["grid-controls"]}>
          <span className={classes["grid-controls-label"]}>Grid Size:</span>
          <GridFilter value={filterRows} onChange={handleFilterRows} />
          <span className={classes["grid-controls-times"]}>×</span>
          <GridFilter value={filterCols} onChange={handleFilterCols} />
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
                <span className={classes.player}>
                  {e.device === "mobile" ? <Smartphone size={12} color="#6b7280" /> : <Monitor size={12} color="#6b7280" />}
                  {e.username ?? "Anonymous"}
                </span>
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
