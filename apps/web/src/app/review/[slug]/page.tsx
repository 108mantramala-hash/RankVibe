'use client';

import { useState } from 'react';

type Step = 'rate' | 'google' | 'feedback' | 'thanks';

export default function ReviewPage() {
  const [step, setStep] = useState<Step>('rate');
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  const handleRatingSubmit = () => {
    if (rating >= 4) {
      // Happy customer → redirect to Google review
      setStep('google');
    } else {
      // Unhappy customer → private feedback
      setStep('feedback');
    }
  };

  const handleFeedbackSubmit = () => {
    // TODO: POST to /api/feedback
    setStep('thanks');
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">How was your experience?</h1>
          <p className="text-[var(--muted)] mt-1 text-sm">
            Your feedback helps us improve.
          </p>
        </div>

        {/* Step: Rate */}
        {step === 'rate' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center space-y-6">
            <p className="text-sm text-[var(--muted)]">Tap a star to rate</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="text-4xl transition-transform hover:scale-110"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <span
                    className={
                      star <= (hoveredStar || rating) ? 'text-amber-400' : 'text-gray-300'
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <button
                onClick={handleRatingSubmit}
                className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Step: Google redirect */}
        {step === 'google' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center space-y-6">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">Glad you had a great experience!</h2>
            <p className="text-sm text-[var(--muted)]">
              Would you mind sharing your experience on Google? It really helps us out.
            </p>
            <a
              href="#" // TODO: dynamic Google review link per business
              className="block w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors text-center"
            >
              Leave a Google Review
            </a>
            <button
              onClick={() => setStep('thanks')}
              className="text-sm text-[var(--muted)] hover:underline"
            >
              No thanks, skip
            </button>
          </div>
        )}

        {/* Step: Private feedback */}
        {step === 'feedback' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">We&apos;re sorry to hear that</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Your feedback stays private and helps us improve.
              </p>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could we do better?"
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedback.trim()}
              className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send Feedback
            </button>
          </div>
        )}

        {/* Step: Thank you */}
        {step === 'thanks' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold">Thank you!</h2>
            <p className="text-sm text-[var(--muted)]">
              We appreciate your time. Your feedback matters.
            </p>
          </div>
        )}

        {/* Branding */}
        <p className="text-center text-xs text-[var(--muted)]">
          Powered by <span className="font-semibold">RankVibe</span>
        </p>
      </div>
    </main>
  );
}
