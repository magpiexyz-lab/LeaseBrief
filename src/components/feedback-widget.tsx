"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trackFeedbackSubmitted } from "@/lib/events";

const SHOWN_KEY = "lb_feedback_shown_v1";

const SOURCES = [
  { value: "", label: "Pick one (optional)" },
  { value: "google", label: "Google Search" },
  { value: "social", label: "Social media" },
  { value: "friend", label: "Friend / referral" },
  { value: "other", label: "Other" },
];

export function FeedbackWidget({
  activationAction,
  open,
  onOpenChange,
}: {
  activationAction: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [source, setSource] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function markShown() {
    try {
      window.localStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* localStorage may be unavailable — fail open */
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    trackFeedbackSubmitted({
      activation_action: activationAction,
      source: source || undefined,
      feedback: feedback.trim() || undefined,
    });
    markShown();
    setSubmitted(true);
    setSubmitting(false);
    window.setTimeout(() => {
      onOpenChange(false);
    }, 900);
  }

  function handleDismiss(next: boolean) {
    if (!next) markShown();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            One quick question.
          </DialogTitle>
          <DialogDescription className="text-[var(--whisper)]">
            How did you find LeaseBrief? Anything we should know? Takes 10
            seconds — entirely optional.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p
            role="status"
            className="my-2 rounded-[10px] border border-[var(--brass)]/40 bg-[var(--brass)]/[0.08] px-4 py-3 text-sm text-[var(--ink)]"
          >
            <span className="font-display italic text-[var(--brass)]">¶</span>{" "}
            Thanks — noted.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="feedback-source"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--whisper)]"
              >
                How did you find us?
              </Label>
              <select
                id="feedback-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-[var(--ash)] bg-[var(--vellum)] px-3 text-[15px] text-[var(--ink)] focus:border-[var(--brass)] focus:outline-none focus:ring-2 focus:ring-[var(--brass)]/40"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="feedback-text"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--whisper)]"
              >
                Anything else? (optional)
              </Label>
              <textarea
                id="feedback-text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What surprised you? What's missing?"
                className="w-full resize-none rounded-[10px] border border-[var(--ash)] bg-[var(--vellum)] p-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--whisper)]/70 focus:border-[var(--brass)] focus:outline-none focus:ring-2 focus:ring-[var(--brass)]/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDismiss(false)}
                className="h-10 rounded-full px-4 text-sm text-[var(--whisper)] hover:text-[var(--ink)]"
              >
                Not now
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-full bg-[var(--brass)] px-5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--brass)]/90"
              >
                {submitting ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper: returns true if the widget should be shown to this user. Call from
// the activation page (e.g., /abstract/[id]) after approve.
export function shouldShowFeedbackWidget(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SHOWN_KEY) !== "1";
  } catch {
    return false;
  }
}
