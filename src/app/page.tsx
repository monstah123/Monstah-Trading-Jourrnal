"use client";

import Link from "next/link";
import "@/styles/landing.css";
import { useSound } from "@/components/SoundProvider";

export default function Home() {
  const { playHover, playClick, playMoney } = useSound();

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-bg-glow" />
        <div className="hero-content">
          <div className="hero-badge">
            🚀 Elevate Your Trading Game
          </div>
          <h1 className="hero-title">
            Dominate The Markets With <span className="highlight">MONSTAH!!!</span>
          </h1>
          <p className="hero-subtitle">
            The all-in-one AI-powered trading journal designed to track your trades, 
            analyze your psychology, and sharpen your edge.
          </p>
          <div className="hero-btns">
            <Link 
              href="/login" 
              className="btn btn-primary btn-lg"
              onMouseEnter={playHover}
              onClick={playMoney}
            >
              Start Journaling For Free
            </Link>
            <Link 
              href="/dashboard" 
              className="btn btn-secondary btn-lg"
              onMouseEnter={playHover}
              onClick={playClick}
            >
              View Demo Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Professional Features for Serious Traders</h2>
          <p className="section-subtitle">Everything you need to turn trading into a business.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">🤖</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>AI Trading Coach</h3>
            <p className="feature-description">
              Personalized AI analysis powered by GPT-4o. Get daily reviews and identify 
              costly psychological patterns before they drain your account.
            </p>
          </div>

          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">📈</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>Advanced Analytics</h3>
            <p className="feature-description">
              Deep dive into your stats with equity curves, setup performance, 
              and win-rate breakdowns across different brokers and assets.
            </p>
          </div>

          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">🧠</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>Psychology Toolkit</h3>
            <p className="feature-description">
              Track your emotions before and after every trade. Understand how FOMO, 
              fear, and greed are impacting your P&L.
            </p>
          </div>

          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">🖼️</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>Visual Playbook</h3>
            <p className="feature-description">
              Capture screenshots and build a visual library of your A+ setups. 
              Review your best wins and sharpen your pattern recognition.
            </p>
          </div>

          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">🔗</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>Shareable P&L Cards</h3>
            <p className="feature-description">
              Generate beautiful, secure share links for your best trades. 
              Show off your wins on social media while keeping your personal data private.
            </p>
          </div>

          <div className="feature-card" onMouseEnter={playHover}>
            <span className="feature-icon">📝</span>
            <h3 className="feature-title" onMouseEnter={playMoney} style={{ cursor: 'pointer' }}>Real-Time Journal</h3>
            <p className="feature-description">
              End-of-day reflection tools that help you build the discipline of 
              a professional hedge fund manager.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ padding: "60px 20px", textAlign: "center", borderTop: "1px solid var(--border-primary)" }}>
         <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
           © 2026 MONSTAH!!! Trading Journal. Built for traders, by traders.
         </p>
      </footer>
    </div>
  );
}
