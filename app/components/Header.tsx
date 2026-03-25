"use client";

import useAuth from "../hooks/useAuth";
import Link from "next/link";
import { User, Trophy, LogOut } from "lucide-react";
import "./Header.css";

export default function Header() {
  const { user, username, isLoading, handleSignOut } = useAuth();

  return (
    <header className="header">
      <div className="header-logo">Memory Game</div>
      <nav className="header-nav">
        {isLoading ? null : user ? (
          <>
            <Link href="/profile" className="header-btn">
              <User size={16} />
              <span>{username ?? user.username}</span>
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
        <button className="header-btn">
          <Trophy size={16} color="#84cc16" />
          <span>Leaderboard</span>
        </button>
      </nav>
    </header>
  );
}
