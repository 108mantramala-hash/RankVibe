'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Tone = 'professional' | 'friendly' | 'empathetic' | 'warm' | 'playful';
type TabFilter = 'all' | 'draft' | 'approved' | 'posted';

interface AiReply {
  id: string;
  suggested_reply: string;
  tone: Tone;
  is_approved: boolean;
  is_posted: boolean;
  approved_at: string | null;
}

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  sentiment: string | null;
  published_at: string | null;
  summary: string | null;
  ai_replies: AiReply[] | AiReply | null;
}

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Polished & business-like' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm & conversational' },
  { value: 'empathetic',   label: 'Empathetic',   desc: 'Caring & understanding' },
  { value: 'warm',         label: 'Warm',         desc: 'Genuine & heartfelt' },
  { value: 'playful',      label: 'Playful',      desc: 'Upbeat with personality' },
];

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-700',
  negative: 'bg-red-100 text-red-700',
  neutral:  'bg-slate-100 text-slate-600',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={s <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

function getReply(review: Review): AiReply | null {
  if (!review.ai_replies) return null;
  if (Array.isArray(review.ai_replies)) return review.ai_replies[0] ?? null;
  return review.ai_replies;
}

// ── Review Reply Card ────────────────────────────────────

function ReplyCard({
  review,
  defaultTone,
  shopSignature,
  onRefresh,
}: {
  review: Review;
  defaultTone: Tone;
  shopSignature: string;
  onRefresh: () => void;
}) {
  const existingReply = getReply(review);
  const draftText = existingReply?.suggested_reply ?? review.summary ?? '';

  const [replyText, setReplyText] = useState(draftText);
  const [tone, setTone] = useState<Tone>(existingReply?.tone ?? defaultTone);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyId, setReplyId] = useState<string | null>(existingReply?.id ?? null);
  const [isApproved, setIsApproved] = useState(existingReply?.is_approved ?? false);
  const [isPosted, setIsPosted] = useState(existingReply?.is_posted ?? false);
  const [copied, setCopied] = useState(false);
  const [showTones, setShowTones] = useState(false);

  const hasReply = replyText.trim().length > 0;

  async function generate() {
    setGenerating(true);
    const res = await fetch('/api/ai-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: review.id,
        reviewText: review.text,
        tone,
        shopSignature: shopSignature || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setReplyText(data.suggestedReply);
      setReplyId(data.reply?.id ?? null);
      setIsApproved(false);
      setIsPosted(false);
    }
    setGenerating(false);
  }

  async function approve() {
    if (!replyId) {
      // First save a draft if we only have reviews.summary
      const res = await fetch('/api/ai-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id, reviewText: review.text, tone, shopSignature }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setReplyId(data.reply?.id);
      await patchReply(data.reply?.id, { is_approved: true });
    } else {
      await patchReply(replyId, { is_approved: true });
    }
    setIsApproved(true);
    onRefresh();
  }

  async function unapprove() {
    if (!replyId) return;
    await patchReply(replyId, { is_approved: false });
    setIsApproved(false);
    onRefresh();
  }

  async function markPosted() {
    if (!replyId) return;
    setSaving(true);
    await patchReply(replyId, { is_posted: true, is_used: true });
    setIsPosted(true);
    setSaving(false);
    onRefresh();
  }

  async function patchReply(id: string, payload: Record<string, unknown>) {
    await fetch(`/api/ai-replies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function copyReply() {
    await navigator.clipboard.writeText(replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Status badge
  const statusBadge = isPosted
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Posted</span>
    : isApproved
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">Approved</span>
    : hasReply
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Draft Ready</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">No Reply</span>;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      {/* Review header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{review.author_name}</p>
            <Stars rating={review.rating} />
            {review.sentiment && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SENTIMENT_STYLES[review.sentiment] ?? ''}`}>
                {review.sentiment}
              </span>
            )}
            {statusBadge}
          </div>
          {review.published_at && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {new Date(review.published_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-3">{review.text}</p>

      {/* Reply area */}
      <div className="space-y-3 pt-1 border-t border-[var(--border)]">
        {hasReply ? (
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            disabled={isPosted}
            className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 resize-none outline-none focus:border-brand-500 disabled:opacity-60"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-4 text-center">
            <p className="text-xs text-[var(--muted)]">No reply generated yet</p>
          </div>
        )}

        {/* Tone selector + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tone picker */}
          <div className="relative">
            <button
              onClick={() => setShowTones(!showTones)}
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] flex items-center gap-1 transition-colors"
            >
              <span className="capitalize">{tone}</span>
              <span className="text-[var(--muted)]">▾</span>
            </button>
            {showTones && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden min-w-[180px]">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTone(t.value); setShowTones(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--background)] transition-colors ${tone === t.value ? 'text-brand-600 font-medium' : ''}`}
                  >
                    <p>{t.label}</p>
                    <p className="text-[var(--muted)] font-normal">{t.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate / Regenerate */}
          {!isPosted && (
            <button
              onClick={generate}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating…' : hasReply ? 'Regenerate' : 'Generate Reply'}
            </button>
          )}

          {/* Copy */}
          {hasReply && (
            <button
              onClick={copyReply}
              className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}

          <div className="flex-1" />

          {/* Approve / Unapprove */}
          {hasReply && !isPosted && (
            isApproved ? (
              <button
                onClick={unapprove}
                className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)] transition-colors"
              >
                Unapprove
              </button>
            ) : (
              <button
                onClick={approve}
                className="text-xs px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Approve
              </button>
            )
          )}

          {/* Mark as posted */}
          {isApproved && !isPosted && (
            <button
              onClick={markPosted}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Mark Posted'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────

export default function AiRepliesClient({
  reviews,
  defaultTone,
  shopSignature,
}: {
  reviews: Review[];
  defaultTone: Tone;
  shopSignature: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<TabFilter>('all');

  function refresh() {
    startTransition(() => router.refresh());
  }

  // Compute counts for tabs
  const counts = {
    all: reviews.length,
    draft: reviews.filter((r) => {
      const reply = getReply(r);
      return (reply?.suggested_reply || r.summary) && !reply?.is_approved && !reply?.is_posted;
    }).length,
    approved: reviews.filter((r) => getReply(r)?.is_approved && !getReply(r)?.is_posted).length,
    posted: reviews.filter((r) => getReply(r)?.is_posted).length,
  };

  const filtered = reviews.filter((r) => {
    const reply = getReply(r);
    if (filter === 'all') return true;
    if (filter === 'draft') return (reply?.suggested_reply || r.summary) && !reply?.is_approved && !reply?.is_posted;
    if (filter === 'approved') return reply?.is_approved && !reply?.is_posted;
    if (filter === 'posted') return reply?.is_posted;
    return true;
  });

  const totalApproved = counts.approved + counts.posted;
  const totalDraft = counts.draft;

  const TAB_CONFIG: { value: TabFilter; label: string; count: number }[] = [
    { value: 'all',      label: 'All',      count: counts.all },
    { value: 'draft',    label: 'Draft',    count: totalDraft },
    { value: 'approved', label: 'Approved', count: counts.approved },
    { value: 'posted',   label: 'Posted',   count: counts.posted },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Replies</h1>
          <p className="text-[var(--muted)] mt-1">
            {totalApproved} approved · {totalDraft} drafts ready · {counts.posted} posted
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === tab.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === tab.value ? 'bg-brand-400' : 'bg-[var(--border)]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-3xl mb-3">🤖</p>
          <h3 className="font-semibold mb-1">No reviews in this filter</h3>
          <p className="text-sm text-[var(--muted)]">
            {filter === 'all'
              ? 'No reviews with text found for this business.'
              : `No ${filter} replies yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <ReplyCard
              key={review.id}
              review={review}
              defaultTone={defaultTone}
              shopSignature={shopSignature}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
