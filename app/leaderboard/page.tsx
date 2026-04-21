"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy, Monitor, Smartphone } from "lucide-react";
import { ChevronDown } from "../components/icons";
import { LeaderboardEntry } from "../util/dynamodb";
import { formatTime } from "../util/scoring";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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

function getRankClass(index: number): string {
  if (index === 0) return "text-yellow-400 font-bold";
  if (index === 1) return "text-gray-400 font-bold";
  if (index === 2) return "text-amber-600 font-bold";
  return "text-muted-foreground font-semibold";
}

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

      <div className="rounded-xl border border-[#374151] overflow-hidden w-fit mx-auto [&>div]:w-auto">
        <Table className="w-auto">
          <TableHeader>
            <TableRow className="border-[#374151] hover:bg-transparent">
              <TableHead className="text-center text-muted-foreground">#</TableHead>
              <TableHead className="text-muted-foreground">Player</TableHead>
              <TableHead className="text-muted-foreground">Score</TableHead>
              <TableHead className="text-muted-foreground">{mode === "freeplay" ? "Grid" : "Stage"}</TableHead>
              <TableHead className="text-muted-foreground">{mode === "freeplay" ? "Time" : "Remaining Pairs"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">{error}</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No scores yet. Be the first!</TableCell>
              </TableRow>
            ) : (
              filtered.map((e, i) => (
                <TableRow key={e.gameId} className="border-[#1f2937]">
                  <TableCell className={`text-center ${getRankClass(i)}`}>{i + 1}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      {e.device === "mobile" ? <Smartphone size={12} className="text-muted-foreground" /> : <Monitor size={12} className="text-muted-foreground" />}
                      {e.username ?? "Anonymous"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#00ff3c] font-bold">{e.score.toLocaleString()}</TableCell>
                  {mode === "freeplay"
                    ? <TableCell>{e.rows}×{e.cols}</TableCell>
                    : <TableCell>Stage {e.stage ?? 1}</TableCell>}
                  {mode === "freeplay"
                    ? <TableCell>{formatTime(e.timeMs)}</TableCell>
                    : <TableCell>{e.remainingPairs ?? "—"}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
