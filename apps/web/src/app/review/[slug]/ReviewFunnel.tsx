'use client';

import { useState } from 'react';

type Step = 'rate' | 'google' | 'feedback' | 'thanks';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Okay', 'Good', 'Excellent'];

interface Props {
  businessId: string;
  businessName: string;
  barberId: string | null;
  barberName: string | null;
  barberColor: string | null;
  reviewLinkId: string;
  googleReviewUrl: string;
  ratingThreshold: number;
}

export default function ReviewFunnel({
  businessId,
  businessName,
  barberId,
  barberName,
  barberColor,
  reviewLinkId,
  googleReviewUrl,
  ratingThreshold,
}: Props) {
  const [step, setStep] = useState<Step>('rate');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleRate(star: number) {
    setRating(star);
  }

  function handleContinue() {
    if (rating >= ratingThreshold) {
      setStep('google');
    } else {
      setStep('feedback');
    }
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        barberId,
        reviewLinkId,
        rating,
        message,
        contactEmail: email,
      }),
    });

    if (!res.ok) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setStep('thanks');
  }

  const displayStar = hovered || rating;

  return (
    <main className="flex min-h-screen items-center justify-center p-5 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-5">

        {/* Shop / barber header */}
        <div className="text-center">
          {barberName ? (
            <>
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: barberColor ?? '#6366f1' }}
              >
                {barberName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <p className="font-semibold">{barberName}</p>
              <p className="text-sm text-[var(--muted)]">{businessName}</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-brand-600 flex items-center justify-center text-white font-bold text-xl">
                ✂️
              </div>
              <p className="font-semibold">{businessName}</p>
            </>
          )}
        </div>

        {/* Step: Rate */}
        {step === 'rate' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 text-center space-y-5">
            <div>
              <h1 className="text-lg font-bold">How was your visit?</h1>
              <p className="text-sm text-[var(--muted)] mt-1">Tap a star to rate</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onTouchStart={() => handleRate(star)}
                  className="text-5xl leading-none transition-transform active:scale-90 hover:scale-110 touch-manipulation"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <span className={star <= displayStar ? 'text-amber-400' : 'text-gray-200'}>
                    ★
                  </span>
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p className={`text-sm font-medium h-5 transition-opacity ${rating > 0 ? 'opacity-100' : 'opacity-0'}`}>
              {RATING_LABELS[rating]}
            </p>

            <button
              onClick={handleContinue}
              disabled={rating === 0}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step: Google redirect */}
        {step === 'google' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 text-center space-y-5">
            <div className="text-5xl leading-none">🎉</div>
            <div>
              <h2 className="text-lg font-bold">
                {rating === 5 ? "You're amazing — thank you!" : "Glad you had a great visit!"}
              </h2>
              <p className="text-sm text-[var(--muted)] mt-2">
                Could you share that on Google? It only takes 30 seconds and means the world to us.
              </p>
            </div>

            {/* Stars recap */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-2xl ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>

            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 transition-colors text-center"
            >
              Leave a Google Review
            </a>
            <button
              onClick={() => setStep('thanks')}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              No thanks
            </button>
          </div>
        )}

        {/* Step: Private feedback */}
        {step === 'feedback' && (
          <form
            onSubmit={handleFeedbackSubmit}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 space-y-5"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🙏</div>
              <h2 className="text-lg font-bold">We&apos;re sorry to hear that</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Your feedback goes directly to the owner — we&apos;d love to make it right.
              </p>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1.5 block">What could we do better? *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what happened..."
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm resize-none outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1.5 block">Email <span className="font-normal">(optional — so we can follow up)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={!message.trim() || submitting}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </form>
        )}

        {/* Step: Thank you */}
        {step === 'thanks' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 text-center space-y-4">
            <div className="text-5xl leading-none">✅</div>
            <h2 className="text-lg font-bold">Thank you!</h2>
            <p className="text-sm text-[var(--muted)]">
              We appreciate you taking the time. Your feedback helps us get better every day.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-[var(--muted)]">
          Powered by <span className="font-semibold">RankVibe</span>
        </p>
      </div>
    </main>
  );
}
