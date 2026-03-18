"use client";

import useAuth from "../hooks/useAuth";
import Link from "next/link";
import { User, Trophy } from "lucide-react";
import "./Header.css";

export default function Header() {
  const { user, handleSignOut } = useAuth();

  return (
    <header className="header">
      <div className="header-logo">Memory Game</div>
      <nav className="header-nav">
        {user ? (
          <button className="header-btn" onClick={handleSignOut}>
            <User size={16} />
            <span>{user.signInDetails?.loginId ?? user.username}</span>
          </button>
        ) : (
          <Link href="/components/auth" className="header-btn">
            <User size={16} />
            <span>Profile</span>
          </Link>
        )}
        <button className="header-btn">
          <Trophy size={16} color="#00ff3c" />
          <span>Leaderboard</span>
        </button>
      </nav>
    </header>
  );
}
