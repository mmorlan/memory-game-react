"use client";

import { useState, useEffect, useRef } from "react";
import useAuth from "../hooks/useAuth";
import useGameSettings from "../hooks/useGameSettings";
import Link from "next/link";
import { User, Trophy, LogOut, Eye, EyeOff } from "lucide-react";
import "./Header.css";

function MobileAuthMenu() {
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
    <div className="header-auth-dropdown-wrapper" ref={ref}>
      <button className="header-btn" onClick={() => setOpen(o => !o)}>
        <User size={16} />
      </button>
      {open && (
        <div className="header-auth-dropdown">
          <Link href="/sign-in" className="header-auth-dropdown-item" onClick={() => setOpen(false)}>
            Sign In
          </Link>
          <Link href="/register" className="header-auth-dropdown-item header-auth-dropdown-item-primary" onClick={() => setOpen(false)}>
            Register
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { username, isLoading, handleSignOut } = useAuth();
  const { cardsHidden, toggleCardsHidden } = useGameSettings();

  return (
    <header className="header">
      <Link className="header-logo" href="/">Pairanoia</Link>
      <nav className="header-nav">
        {isLoading ? (
          <>
            <div className="header-skeleton header-skeleton-wide" />
            <div className="header-skeleton header-skeleton-narrow" />
          </>
        ) : username ? (
          <>
            <Link href="/profile" className="header-btn">
              <User size={16} />
              <span className="header-btn-text">{username}</span>
            </Link>
            <button
              className="header-btn header-btn-signout"
              onClick={async () => { await handleSignOut(); window.location.href = "/"; }}
            >
              <LogOut size={16} />
              <span className="header-btn-text">Sign Out</span>
            </button>
          </>
        ) : (
          <>
            {/* Desktop: two separate buttons */}
            <div className="header-auth-desktop">
              <Link href="/sign-in" className="header-btn">
                <User size={16} />
                <span>Sign In</span>
              </Link>
              <Link href="/register" className="header-btn header-btn-primary">
                <span>Register</span>
              </Link>
            </div>
            {/* Mobile: single icon with dropdown */}
            <div className="header-auth-mobile">
              <MobileAuthMenu />
            </div>
          </>
        )}

        <button className="header-btn" onClick={toggleCardsHidden} title={cardsHidden ? "Cards hidden" : "Cards visible"}>
          {cardsHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="header-btn-text">{cardsHidden ? "Hidden" : "Visible"}</span>
        </button>
        <Link href="/leaderboard" className="header-btn">
          <Trophy size={16} color="#84cc16" />
          <span className="header-btn-text">Leaderboard</span>
        </Link>
      </nav>
    </header>
  );
}
