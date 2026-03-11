"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      // Forces the Google login screen to always ask the user to pick an account
      provider.setCustomParameters({
        prompt: "select_account",
      });
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <div className="card" style={{ width: "400px", padding: "32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            className="sidebar-logo-icon"
            style={{ margin: "0 auto 16px", fontSize: "24px" }}
          >
            🔥
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Welcome Back!
          </h2>
          <p className="text-muted" style={{ marginTop: "8px" }}>
            Sign in to Monstah Trading Journal
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "var(--loss-bg)",
              color: "var(--loss)",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "16px",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleEmailSignIn}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@monstah.com"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: "8px" }}
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In with Email"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-primary)",
            }}
          />
          <span className="text-muted" style={{ fontSize: "0.8rem" }}>
            OR
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-primary)",
            }}
          />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="btn btn-secondary"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
          disabled={isLoading}
        >
          {/* Google SVG Logo */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25C22.56 11.47 22.49 10.74 22.37 10.03H12V14.23H17.92C17.65 15.58 16.9 16.7 15.75 17.47V20.19H19.34C21.43 18.25 22.56 15.48 22.56 12.25Z"
              fill="#4285F4"
            />
            <path
              d="M12 23C14.97 23 17.46 22.02 19.34 20.19L15.75 17.47C14.74 18.15 13.48 18.57 12 18.57C8.98 18.57 6.42 16.53 5.48 13.84H1.81V16.69C3.68 20.42 7.54 23 12 23Z"
              fill="#34A853"
            />
            <path
              d="M5.48 13.84C5.23 13.1 5.09 12.3 5.09 11.49C5.09 10.68 5.23 9.88 5.48 9.14V6.29H1.81C1.04 7.82 0.61 9.59 0.61 11.49C0.61 13.39 1.04 15.16 1.81 16.69L5.48 13.84Z"
              fill="#FBBC05"
            />
            <path
              d="M12 4.41C13.62 4.41 15.06 4.97 16.2 6.06L19.46 2.8C17.46 0.94 14.97 0 12 0C7.54 0 3.68 2.58 1.81 6.29L5.48 9.14C6.42 6.45 8.98 4.41 12 4.41Z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}
        >
          Don't have an account? Ask your admin to create one.
        </div>
      </div>
    </div>
  );
}
