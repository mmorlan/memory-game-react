"use client";

import useAuth from "../hooks/useAuth";
import useGameSettings from "../hooks/useGameSettings";
import Link from "next/link";
import { User, Trophy, LogOut, Eye, EyeOff } from "lucide-react";
import "./Header.css";

export default function Header() {
  const { username, isLoading, handleSignOut } = useAuth();
  const { cardsHidden, toggleCardsHidden } = useGameSettings();

  return (
    <header className="header">
      <div className="header-logo">Memory Game</div>
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
              <span>{username}</span>
            </Link>
            <button className="header-btn header-btn-signout" onClick={handleSignOut}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <Link href="/sign-in" className="header-btn">
              <User size={16} />
              <span>Sign In</span>
            </Link>
            <Link href="/register" className="header-btn header-btn-primary">
              <span>Register</span>
            </Link>
          </>
        )}
        <button className="header-btn" onClick={toggleCardsHidden} title={cardsHidden ? "Cards hidden" : "Cards visible"}>
          {cardsHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{cardsHidden ? "Hidden" : "Visible"}</span>
        </button>
        <button className="header-btn">
          <Trophy size={16} color="#84cc16" />
          <span>Leaderboard</span>
        </button>
      </nav>
    </header>
  );
}
