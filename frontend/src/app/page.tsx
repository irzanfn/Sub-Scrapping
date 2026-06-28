"use client";

import { useEffect, useState } from "react";
import {
  User,
  getStoredUser,
  isAuthenticated,
  completeOAuthLogin,
  logout,
} from "./api";

import LandingPage from "../components/LandingPage";
import Dashboard from "../components/Dashboard";
import AuthModal from "../components/AuthModal";

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<"light" | "dracula">("dracula");

  // Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- Theme Management ---
  useEffect(() => {
    const storedTheme = localStorage.getItem("zst_theme") as "light" | "dracula" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dracula");
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "dracula" ? "dark" : "light";
    localStorage.setItem("zst_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dracula" ? "light" : "dracula");
  };

  // --- Initialization & Auth ---
  useEffect(() => {
    const checkAuth = () => {
      // Check URL for GitHub token
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        if (token) {
          completeOAuthLogin(token);
          // Remove token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const storedUser = getStoredUser();
      if (storedUser && isAuthenticated()) {
        setUser(storedUser);
      }
      setAuthReady(true);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setShowAuthModal(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <LandingPage 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onShowAuthModal={() => setShowAuthModal(true)} 
        />
      ) : (
        <Dashboard 
          user={user} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout} 
        />
      )}

      <AuthModal 
        show={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleLoginSuccess}
        theme={theme}
      />
    </>
  );
}
