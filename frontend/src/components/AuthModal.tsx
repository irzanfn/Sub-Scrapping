"use client";

import { useEffect, useState } from "react";
import { registerManualUser, loginManualUser, loginWithGoogle, User } from "../app/api";

interface AuthModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  theme: "light" | "dracula";
}

export default function AuthModal({ show, onClose, onSuccess, theme }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (show) {
      setAuthForm({ name: "", email: "", password: "" });
      setAuthError("");
    }
  }, [show]);

  useEffect(() => {
    if (show && typeof window !== "undefined") {
      const initGoogleButton = () => {
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer && window.google) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            callback: async (response: any) => {
              try {
                const data = await loginWithGoogle(response.credential);
                onSuccess(data.user);
              } catch (err) {
                console.error("Login error:", err);
                setAuthError("Google login failed.");
              }
            },
          });
          window.google.accounts.id.renderButton(btnContainer, {
            theme: theme === "dracula" ? "filled_black" : "outline",
            size: "large",
            shape: "rectangular",
            width: btnContainer.offsetWidth || "100%",
          });
        }
      };

      if (window.google) {
        initGoogleButton();
      } else {
        const interval = setInterval(() => {
          if (window.google) {
            clearInterval(interval);
            initGoogleButton();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [show, theme, onSuccess]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "register") {
        const data = await registerManualUser(authForm.name, authForm.email, authForm.password);
        onSuccess(data.user);
      } else {
        const data = await loginManualUser(authForm.email, authForm.password);
        onSuccess(data.user);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  const handleGitHubLogin = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${API_URL}/api/v1/auth/github`;
  };

  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-md p-8">
        <button 
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >✕</button>
        <h3 className="font-bold text-2xl mb-2 text-center">
          {authMode === "login" ? "Welcome Back" : "Create Account"}
        </h3>
        <p className="text-center text-sm text-base-content/60 mb-6">
          {authMode === "login" ? "Sign in to continue to SubScrapping" : "Sign up to start tracking your subscriptions"}
        </p>

        {authError && (
          <div className="alert alert-error mb-4 rounded-lg p-3 text-sm">
            <span>{authError}</span>
          </div>
        )}

        {/* Manual Form */}
        <form onSubmit={handleManualAuth} className="space-y-4 mb-6">
          {authMode === "register" && (
            <div className="form-control">
              <input 
                type="text" 
                placeholder="Full Name" 
                className="input input-bordered w-full bg-base-100" 
                required
                value={authForm.name}
                onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
              />
            </div>
          )}
          <div className="form-control">
            <input 
              type="email" 
              placeholder="Email address" 
              className="input input-bordered w-full bg-base-100" 
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
            />
          </div>
          <div className="form-control">
            <input 
              type="password" 
              placeholder="Password" 
              className="input input-bordered w-full bg-base-100" 
              required
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            {authMode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="divider text-xs text-base-content/40 uppercase tracking-widest">or continue with</div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]"></div>
          
          <button 
            onClick={handleGitHubLogin} 
            className="btn w-full hover:bg-neutral hover:text-neutral-content transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-base-content/70">
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            className="link link-primary font-medium ml-1"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "Sign up" : "Log in"}
          </button>
        </div>

        <p className="text-center text-xs text-base-content/50 mt-8 max-w-xs mx-auto leading-relaxed">
          By signing in and using SubScrapping, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
