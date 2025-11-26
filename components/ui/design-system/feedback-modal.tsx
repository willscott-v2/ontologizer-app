"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageUrl?: string;
  analysisId?: string;
}

const feedbackTypes = [
  { value: "bug", label: "Bug Report", icon: "🐛" },
  { value: "feature", label: "Feature Request", icon: "✨" },
  { value: "improvement", label: "Improvement", icon: "💡" },
  { value: "other", label: "Other", icon: "💬" },
] as const;

export function FeedbackModal({ isOpen, onClose, pageUrl, analysisId }: FeedbackModalProps) {
  const [type, setType] = useState<string>("improvement");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          pageUrl: pageUrl || window.location.href,
          analysisId,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          // Reset form after close
          setSubmitted(false);
          setMessage("");
          setType("improvement");
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit feedback");
      }
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card variant="glass" padding="lg" className="relative z-10 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[var(--orange-accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            Send Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--success-green)]/20 mb-4">
                <svg
                  className="w-8 h-8 text-[var(--success-green)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white text-lg font-semibold">Thank you!</p>
              <p className="text-[var(--light-gray)] mt-1">
                Your feedback helps us improve Ontologizer.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feedback Type */}
              <div>
                <label className="block text-[var(--light-gray)] text-sm mb-2">
                  Type of feedback
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setType(ft.value)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        type === ft.value
                          ? "bg-[var(--orange-accent)] text-white"
                          : "bg-white/10 text-[var(--light-gray)] hover:bg-white/20"
                      }`}
                    >
                      <span className="mr-2">{ft.icon}</span>
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block text-[var(--light-gray)] text-sm mb-2"
                >
                  Your feedback
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "Describe what happened and how to reproduce it..."
                      : type === "feature"
                      ? "Describe the feature you'd like to see..."
                      : type === "improvement"
                      ? "How can we improve Ontologizer?"
                      : "Share your thoughts..."
                  }
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-[var(--medium-gray)] focus:outline-none focus:border-[var(--orange-accent)] focus:ring-1 focus:ring-[var(--orange-accent)] resize-none"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-[var(--error-red)] text-sm">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="flex-1"
                >
                  {submitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Floating Feedback Button component
export function FeedbackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--orange-accent)] text-white font-semibold shadow-lg hover:bg-[var(--orange-accent)]/90 transition-all hover:scale-105 active:scale-95"
      title="Send Feedback"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
}
