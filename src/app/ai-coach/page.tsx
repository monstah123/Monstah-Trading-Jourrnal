"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { getTrades } from "@/lib/storage";
import { Trade } from "@/types/trade";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AICoachPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (user) {
      getTrades(user.uid).then(setTrades);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!mounted) return null;

  const quickActions = [
    {
      label: "📊 Analyze my performance",
      prompt:
        "Analyze my overall trading performance and give me a detailed breakdown.",
    },
    {
      label: "🎯 Best setup?",
      prompt: "What is my most profitable trading setup and why?",
    },
    {
      label: "⏰ Best trading hours?",
      prompt: "What are my best and worst trading hours based on my data?",
    },
    {
      label: "😰 Emotional patterns?",
      prompt:
        "Analyze my emotional trading patterns. When do my emotions hurt me?",
    },
    {
      label: "📉 Biggest mistakes?",
      prompt:
        "What are my biggest recurring mistakes based on my trade history?",
    },
    {
      label: "🔥 Win streak analysis",
      prompt:
        "Analyze my winning and losing streaks. What do my best trades have in common?",
    },
  ];

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: trades.slice(-50),
          question: text,
          type: "question",
        }),
      });
      const data = await res.json();
      const aiMessage: Message = {
        role: "assistant",
        content: data.result || "Sorry, I could not generate a response.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to get response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/### (.*)/g, "<h3>$1</h3>")
      .replace(/## (.*)/g, "<h3>$1</h3>")
      .replace(/# (.*)/g, "<h3>$1</h3>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n- /g, "\n• ")
      .replace(/\n\d+\. /g, (match) => `\n${match.trim()} `)
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h2>🤖 Monstah AI Coach</h2>
          <p>Ask anything about your trading — powered by GPT-4o</p>
        </div>

        <div
          className="page-body"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 100px)",
          }}
        >
          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🧠</div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  Your Personal Trading AI Coach
                </h3>
                <p
                  className="text-muted"
                  style={{
                    maxWidth: "500px",
                    margin: "0 auto 32px",
                    fontSize: "0.9rem",
                  }}
                >
                  I have access to all your trade data. Ask me anything about
                  your performance, patterns, emotions, strategies, or get
                  personalized coaching advice.
                </p>

                {trades.length === 0 ? (
                  <div
                    className="card"
                    style={{
                      maxWidth: "400px",
                      margin: "0 auto",
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                      📋 Log some trades first to unlock AI analysis.
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className="text-muted"
                      style={{ fontSize: "0.8rem", marginBottom: "16px" }}
                    >
                      Try one of these quick actions:
                    </p>
                    <div
                      className="grid-3"
                      style={{ maxWidth: "700px", margin: "0 auto" }}
                    >
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.82rem",
                            padding: "12px 16px",
                            textAlign: "left",
                          }}
                          onClick={() => sendMessage(action.prompt)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`ai-message ${msg.role}`}
                style={{
                  marginBottom: "12px",
                  maxWidth: msg.role === "user" ? "70%" : "100%",
                  marginLeft: msg.role === "user" ? "auto" : "0",
                }}
              >
                {msg.role === "assistant" ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.content),
                    }}
                  />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            ))}

            {loading && (
              <div
                className="ai-message assistant"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div className="spinner" />
                <span className="text-muted">Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="ai-input-area"
            style={{
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-primary)",
              position: "sticky",
              bottom: "0",
            }}
          >
            <input
              placeholder={
                trades.length > 0
                  ? "Ask about your trading..."
                  : "Log trades first to use AI Coach..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={trades.length === 0 || loading}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <div
                  className="spinner"
                  style={{ width: "16px", height: "16px" }}
                />
              ) : (
                "→"
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
