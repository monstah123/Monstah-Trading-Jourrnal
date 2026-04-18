"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  getJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  getTrades,
  generateId,
} from "@/lib/storage";
import { JournalEntry, Emotion, Trade } from "@/types/trade";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import "@/styles/landing.css";

const EMOTIONS: { value: Emotion; emoji: string; label: string }[] = [
  { value: "confident", emoji: "😎", label: "Confident" },
  { value: "fearful", emoji: "😰", label: "Fearful" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "anxious", emoji: "😟", label: "Anxious" },
  { value: "disciplined", emoji: "🎯", label: "Disciplined" },
  { value: "calm", emoji: "🧘", label: "Calm" },
];

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard! 📋", "success");
  };

  const [form, setForm] = useState({
    date: "",
    preMarketNotes: "",
    postMarketNotes: "",
    mood: "neutral" as Emotion,
    lessonsLearned: "",
    goalsForTomorrow: "",
    marketConditions: "",
    overallRating: 5,
  });

  useEffect(() => {
    setMounted(true);
    setForm((prev) => ({
      ...prev,
      date: new Date().toISOString().split("T")[0],
    }));
    if (user) {
      Promise.all([getJournalEntries(user.uid), getTrades(user.uid)]).then(
        ([rawEntries, rawTrades]) => {
          setEntries(rawEntries.sort((a, b) => b.date.localeCompare(a.date)));
          setTrades(rawTrades);
        },
      );
    }
  }, [user]);

  if (!mounted) return null;

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const dayTrades = trades.filter((t) => t.date.startsWith(form.date));
      const entry: JournalEntry = {
        id: editingId || generateId(),
        date: form.date,
        preMarketNotes: form.preMarketNotes,
        postMarketNotes: form.postMarketNotes,
        mood: form.mood,
        lessonsLearned: form.lessonsLearned,
        goalsForTomorrow: form.goalsForTomorrow,
        marketConditions: form.marketConditions,
        overallRating: form.overallRating,
        trades: dayTrades.map((t) => t.id),
        createdAt: editingId
          ? entries.find((e) => e.id === editingId)?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveJournalEntry(user.uid, entry);
      const updatedEntries = await getJournalEntries(user.uid);
      setEntries(updatedEntries.sort((a, b) => b.date.localeCompare(a.date)));
      setShowForm(false);
      setEditingId(null);
      setForm({
        date: new Date().toISOString().split("T")[0],
        preMarketNotes: "",
        postMarketNotes: "",
        mood: "neutral",
        lessonsLearned: "",
        goalsForTomorrow: "",
        marketConditions: "",
        overallRating: 5,
      });
      showToast(
        editingId ? "Journal entry updated! ✨" : "Journal entry saved! 📝",
        "success",
      );
    } catch (error) {
      console.error("Save error:", error);
      showToast(
        "Failed to save journal entry. Check your database rules!",
        "error",
      );
    }
  };

  const generateDailyReview = async (date: string) => {
    const dayTrades = trades.filter((t) => t.date.startsWith(date));
    if (dayTrades.length === 0) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: dayTrades, type: "daily_review" }),
      });
      const data = await res.json();
      setAiReview(data.result);
    } catch {
      setAiReview("Failed to generate review.");
    } finally {
      setLoadingAi(false);
    }
  };

  const getDatePnl = (date: string) => {
    const dayTrades = trades.filter(
      (t) => t.date.startsWith(date) && t.status === "closed",
    );
    return dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  };

  const getDateTradeCount = (date: string) => {
    return trades.filter((t) => t.date.startsWith(date)).length;
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (
      !window.confirm(
        "Are you sure you want to delete this journal entry? This cannot be undone.",
      )
    )
      return;

    try {
      await deleteJournalEntry(user.uid, id);
      setEntries(entries.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
      showToast("Journal entry deleted! 🗑️", "success");
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Failed to delete journal entry.", "error");
    }
  };

  const handleEdit = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    setForm({
      date: entry.date,
      preMarketNotes: entry.preMarketNotes || "",
      postMarketNotes: entry.postMarketNotes || "",
      mood: entry.mood,
      lessonsLearned: entry.lessonsLearned || "",
      goalsForTomorrow: entry.goalsForTomorrow || "",
      marketConditions: entry.marketConditions || "",
      overallRating: entry.overallRating,
    });
    setEditingId(entry.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Link href="/" className="pricing-bubble">
           <span>💎</span>
           <span>Pro Plans</span>
        </Link>
        <div className="page-header flex justify-between items-center">
          <div>
            <h2>Trading Journal</h2>
            <p>Reflect on your trading day, build discipline</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (showForm) {
                setEditingId(null);
                setForm({
                  date: new Date().toISOString().split("T")[0],
                  preMarketNotes: "",
                  postMarketNotes: "",
                  mood: "neutral",
                  lessonsLearned: "",
                  goalsForTomorrow: "",
                  marketConditions: "",
                  overallRating: 5,
                });
              }
              setShowForm(!showForm);
            }}
          >
            {showForm ? "✕ Close" : "📝 New Entry"}
          </button>
        </div>

        <div className="page-body">
          {/* New Entry Form */}
          {showForm && (
            <div
              className="card mb-32"
              style={{ border: "1px solid var(--border-accent)" }}
            >
              <div className="card-header">
                <span className="card-title">
                  {editingId ? "✏️ Edit Journal Entry" : "📝 New Journal Entry"}
                </span>
              </div>

              <div className="form-row mb-16">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Market Conditions</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Bullish, bearish, choppy, trending..."
                    value={form.marketConditions}
                    onChange={(e) =>
                      handleChange("marketConditions", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Overall Rating: {form.overallRating}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="confidence-slider"
                    value={form.overallRating}
                    onChange={(e) =>
                      handleChange("overallRating", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="form-group mb-16">
                <label className="form-label">Mood</label>
                <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                  {EMOTIONS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      className={`emotion-btn ${form.mood === e.value ? "selected" : ""}`}
                      style={{ width: "auto", padding: "8px 16px" }}
                      onClick={() => handleChange("mood", e.value)}
                    >
                      {e.emoji} {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row mb-16">
                <div className="form-group">
                  <label className="form-label">Pre-Market Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What's your plan for today? Key levels to watch?"
                    value={form.preMarketNotes}
                    onChange={(e) =>
                      handleChange("preMarketNotes", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Post-Market Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="How did the day go? What happened?"
                    value={form.postMarketNotes}
                    onChange={(e) =>
                      handleChange("postMarketNotes", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-row mb-16">
                <div className="form-group">
                  <label className="form-label">Lessons Learned</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What did you learn today?"
                    value={form.lessonsLearned}
                    onChange={(e) =>
                      handleChange("lessonsLearned", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Goals for Tomorrow</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What will you focus on?"
                    value={form.goalsForTomorrow}
                    onChange={(e) =>
                      handleChange("goalsForTomorrow", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm({
                      date: new Date().toISOString().split("T")[0],
                      preMarketNotes: "",
                      postMarketNotes: "",
                      mood: "neutral",
                      lessonsLearned: "",
                      goalsForTomorrow: "",
                      marketConditions: "",
                      overallRating: 5,
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  💾 Save Entry
                </button>
              </div>
            </div>
          )}

          {/* Journal Entries */}
          {entries.length === 0 && !showForm ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Your journal is empty</h3>
              <p>
                Journaling is one of the most powerful tools for improving as a
                trader. Start documenting your days.
              </p>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowForm(true)}
              >
                📝 Write First Entry
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {entries.map((entry) => {
                const pnl = getDatePnl(entry.date);
                const tradeCount = getDateTradeCount(entry.date);
                const isSelected = selectedEntry?.id === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      cursor: "pointer",
                      border: isSelected
                        ? "1px solid var(--border-accent)"
                        : undefined,
                    }}
                    onClick={() => setSelectedEntry(isSelected ? null : entry)}
                  >
                    <div className="flex justify-between items-center mb-16 gap-16" style={{ flexWrap: 'wrap' }}>
                      <div className="flex items-center gap-16">
                        <div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                            {entry.date}
                          </div>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {tradeCount} trade{tradeCount !== 1 ? "s" : ""} ·{" "}
                            {entry.marketConditions || "No conditions noted"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-16">
                        <span style={{ fontSize: "1.3rem" }}>
                          {EMOTIONS.find((e) => e.value === entry.mood)
                            ?.emoji || "😐"}
                        </span>
                        <div
                          className="mono"
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: pnl >= 0 ? "var(--profit)" : "var(--loss)",
                          }}
                        >
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </div>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "var(--bg-tertiary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color:
                              entry.overallRating >= 7
                                ? "var(--profit)"
                                : entry.overallRating >= 4
                                  ? "var(--warning)"
                                  : "var(--loss)",
                          }}
                        >
                          {entry.overallRating}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-primary)",
                          paddingTop: "16px",
                          position: "relative",
                        }}
                      >
                        <button 
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            const allText = [
                              entry.preMarketNotes ? `PRE-MARKET:\n${entry.preMarketNotes}` : "",
                              entry.postMarketNotes ? `POST-MARKET:\n${entry.postMarketNotes}` : "",
                              entry.lessonsLearned ? `LESSONS:\n${entry.lessonsLearned}` : "",
                              entry.goalsForTomorrow ? `GOALS:\n${entry.goalsForTomorrow}` : ""
                            ].filter(Boolean).join("\n\n");
                            copyToClipboard(allText);
                          }}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "0",
                            zIndex: 10,
                          }}
                        >
                          📋 Copy All
                        </button>
                        <div
                          className="grid-2"
                          style={{ marginBottom: "16px" }}
                        >
                          {entry.preMarketNotes && (
                            <div>
                              <div
                                className="flex justify-between items-center"
                                style={{ marginBottom: "4px" }}
                              >
                                <label className="form-label" style={{ marginBottom: 0 }}>Pre-Market</label>
                                <button 
                                  className="btn btn-ghost btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(entry.preMarketNotes);
                                  }}
                                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-secondary)",
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {entry.preMarketNotes}
                              </div>
                            </div>
                          )}
                          {entry.postMarketNotes && (
                            <div>
                              <div
                                className="flex justify-between items-center"
                                style={{ marginBottom: "4px" }}
                              >
                                <label className="form-label" style={{ marginBottom: 0 }}>Post-Market</label>
                                <button 
                                  className="btn btn-ghost btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(entry.postMarketNotes);
                                  }}
                                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-secondary)",
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {entry.postMarketNotes}
                              </div>
                            </div>
                          )}
                        </div>
                        {entry.lessonsLearned && (
                          <div style={{ marginBottom: "12px" }}>
                            <div
                              className="flex justify-between items-center"
                              style={{ marginBottom: "4px" }}
                            >
                              <label className="form-label" style={{ marginBottom: 0 }}>💡 Lessons</label>
                              <button 
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(entry.lessonsLearned);
                                }}
                                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              >
                                📋 Copy
                              </button>
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {entry.lessonsLearned}
                            </div>
                          </div>
                        )}
                        {entry.goalsForTomorrow && (
                          <div style={{ marginBottom: "12px" }}>
                            <div
                              className="flex justify-between items-center"
                              style={{ marginBottom: "4px" }}
                            >
                              <label className="form-label" style={{ marginBottom: 0 }}>🎯 Goals</label>
                              <button 
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(entry.goalsForTomorrow);
                                }}
                                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              >
                                📋 Copy
                              </button>
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {entry.goalsForTomorrow}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-16">
                          <div className="flex items-center gap-12">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                generateDailyReview(entry.date);
                              }}
                            >
                              🤖 Generate AI Review
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={(e) => handleEdit(e, entry)}
                            >
                              ✏️ Edit
                            </button>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm text-loss"
                            style={{ color: "var(--loss)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.id);
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>

                        {loadingAi && (
                          <div
                            style={{
                              marginTop: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div className="spinner" />{" "}
                            <span className="text-muted">Generating...</span>
                          </div>
                        )}

                        {aiReview && (
                          <div
                            className="ai-message assistant"
                            style={{ marginTop: "12px" }}
                            dangerouslySetInnerHTML={{
                              __html: aiReview
                                .replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<strong>$1</strong>",
                                )
                                .replace(/### (.*)/g, "<h3>$1</h3>")
                                .replace(/\n/g, "<br/>"),
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.type === "success" ? "✅" : "❌"} {toast.message}
          </div>
        )}
      </main>
    </div>
  );
}
