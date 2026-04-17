import { createServerClient } from '@/lib/supabase-server';
import { getSessionBusinessId } from '@/lib/get-session-business';

export const dynamic = 'force-dynamic';

async function getFeedbackData() {
  const supabase = createServerClient();

  const businessId = await getSessionBusinessId();
  if (!businessId) return { business: null, submissions: [], barbers: {} };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { business: null, submissions: [], barbers: {} };

  const [{ data: submissions }, { data: barbers }] = await Promise.all([
    supabase
      .from('feedback_submissions')
      .select('id, rating, message, contact_email, barber_id, review_link_id, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('barbers')
      .select('id, name, color')
      .eq('business_id', business.id),
  ]);

  const barberMap: Record<string, { name: string; color: string | null }> = {};
  for (const b of barbers ?? []) barberMap[b.id] = { name: b.name, color: b.color };

  return { business, submissions: submissions ?? [], barbers: barberMap };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

const RATING_BG: Record<number, string> = {
  1: 'border-l-red-500',
  2: 'border-l-red-400',
  3: 'border-l-amber-400',
  4: 'border-l-green-400',
  5: 'border-l-green-500',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export default async function FeedbackPage() {
  const { business, submissions, barbers } = await getFeedbackData();

  if (!business) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-sm text-[var(--muted)]">No customer business configured.</p>
        </div>
      </div>
    );
  }

  // Summary stats
  const total = submissions.length;
  const avgRating = total > 0
    ? (submissions.reduce((s, f) => s + f.rating, 0) / total).toFixed(1)
    : '—';
  const withEmail = submissions.filter((f) => f.contact_email).length;
  const byRating = [1, 2, 3].map((r) => submissions.filter((f) => f.rating === r).length);
  const critical = byRating[0] + byRating[1]; // 1 + 2 star

  // Group by barber
  const withBarber = submissions.filter((f) => f.barber_id);
  const shopWide = submissions.filter((f) => !f.barber_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback Inbox</h1>
        <p className="text-[var(--muted)] mt-1">{business.name} · private customer feedback</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Submissions</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
          <p className="text-xs text-[var(--muted)] mt-1">captured privately</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Avg Rating</p>
          <p className="text-3xl font-bold mt-1">{avgRating} {total > 0 ? '⭐' : ''}</p>
          <p className="text-xs text-[var(--muted)] mt-1">from unhappy visits</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Critical (1–2 ⭐)</p>
          <p className={`text-3xl font-bold mt-1 ${critical > 0 ? 'text-red-500' : ''}`}>{critical}</p>
          <p className="text-xs text-[var(--muted)] mt-1">need immediate attention</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Left Contact</p>
          <p className="text-3xl font-bold mt-1 text-brand-600">{withEmail}</p>
          <p className="text-xs text-[var(--muted)] mt-1">want follow-up</p>
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-3xl mb-3">📬</p>
          <h3 className="font-semibold mb-1">No feedback yet</h3>
          <p className="text-sm text-[var(--muted)] max-w-sm mx-auto">
            When a customer rates their visit 1–3 stars via a QR code, their message lands here instead of going public on Google.
          </p>
        </div>
      )}

      {/* Feedback list */}
      {total > 0 && (
        <div className="space-y-6">
          {/* Per-barber feedback */}
          {withBarber.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Per-Barber Feedback</h2>
              <div className="space-y-3">
                {withBarber.map((sub) => {
                  const barber = sub.barber_id ? barbers[sub.barber_id] : null;
                  return (
                    <FeedbackCard
                      key={sub.id}
                      sub={sub}
                      barber={barber}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Shop-wide feedback */}
          {shopWide.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted)] mb-3">
                {withBarber.length > 0 ? 'Shop-Wide Feedback' : 'All Feedback'}
              </h2>
              <div className="space-y-3">
                {shopWide.map((sub) => (
                  <FeedbackCard key={sub.id} sub={sub} barber={null} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feedback Card ────────────────────────────────────────

function FeedbackCard({
  sub,
  barber,
}: {
  sub: {
    id: string;
    rating: number;
    message: string;
    contact_email: string | null;
    created_at: string;
  };
  barber: { name: string; color: string | null } | null;
}) {
  const borderColor = RATING_BG[sub.rating] ?? 'border-l-gray-300';

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Stars rating={sub.rating} />
          {barber && (
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: barber.color ?? '#6366f1' }}
            >
              {barber.name}
            </span>
          )}
          {sub.contact_email && (
            <a
              href={`mailto:${sub.contact_email}`}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              {sub.contact_email}
            </a>
          )}
        </div>
        <span className="text-xs text-[var(--muted)] shrink-0">{timeAgo(sub.created_at)}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{sub.message}</p>
    </div>
  );
}
