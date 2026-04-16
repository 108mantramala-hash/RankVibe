import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 1800;

async function getDashboardData() {
  const supabase = createServerClient();

  // Scope to the customer business (Outkasts Barbershop)
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, google_rating, google_review_count')
    .eq('is_customer', true)
    .limit(1);

  const business = businesses?.[0] ?? null;
  if (!business) return null;

  const [{ data: reviews }, { data: snapshots }, { data: allBusinesses }, { data: oldestReview }, { data: newestReview }] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, rating, sentiment, themes')
      .eq('business_id', business.id),
    supabase
      .from('review_snapshots')
      .select('avg_rating, review_count, review_velocity, positive_count, negative_count, snapshot_date')
      .eq('business_id', business.id)
      .order('snapshot_date', { ascending: false })
      .limit(8),
    // For competitor rank calculation
    supabase
      .from('businesses')
      .select('id, google_rating, google_review_count'),
    supabase
      .from('reviews')
      .select('published_at')
      .eq('business_id', business.id)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: true })
      .limit(1),
    supabase
      .from('reviews')
      .select('published_at')
      .eq('business_id', business.id)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1),
  ]);

  const totalReviews = reviews?.length ?? 0;
  const avgRating =
    totalReviews > 0
      ? (reviews!.reduce((s, r) => s + (r.rating ?? 0), 0) / totalReviews).toFixed(2)
      : '0';

  const positive = reviews?.filter((r) => r.sentiment === 'positive').length ?? 0;
  const negative = reviews?.filter((r) => r.sentiment === 'negative').length ?? 0;
  const neutral = reviews?.filter((r) => r.sentiment === 'neutral').length ?? 0;
  const enriched = positive + negative + neutral;

  // Top themes
  const themeCount: Record<string, number> = {};
  for (const r of reviews ?? []) {
    if (Array.isArray(r.themes)) {
      for (const t of r.themes as string[]) {
        themeCount[t] = (themeCount[t] ?? 0) + 1;
      }
    }
  }
  const topThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Competitor rank by review count
  const sorted = (allBusinesses ?? [])
    .filter((b) => (b.google_review_count ?? 0) > 0)
    .sort((a, b) => (b.google_review_count ?? 0) - (a.google_review_count ?? 0));
  const rank = sorted.findIndex((b) => b.id === business.id) + 1;

  // Velocity trend from snapshots
  const latestSnap = snapshots?.[0] ?? null;
  const prevSnap = snapshots?.[1] ?? null;
  const ratingTrend =
    latestSnap && prevSnap
      ? parseFloat((latestSnap.avg_rating - prevSnap.avg_rating).toFixed(2))
      : 0;

  const oldestDate = oldestReview?.[0]?.published_at ?? null;
  const newestDate = newestReview?.[0]?.published_at ?? null;

  return {
    business,
    totalReviews,
    avgRating,
    positive,
    negative,
    neutral,
    enriched,
    topThemes,
    rank,
    totalCompetitors: sorted.length,
    latestSnap,
    ratingTrend,
    oldestDate,
    newestDate,
  };
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? ''}`}>{value}</p>
      <p className="text-sm text-[var(--muted)] mt-1">{sub}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-sm text-[var(--muted)]">No customer business configured in Supabase.</p>
        </div>
      </div>
    );
  }

  const {
    business,
    totalReviews,
    avgRating,
    positive,
    negative,
    neutral,
    enriched,
    topThemes,
    rank,
    totalCompetitors,
    latestSnap,
    ratingTrend,
    oldestDate,
    newestDate,
  } = data;

  const positiveRate = enriched > 0 ? Math.round((positive / enriched) * 100) : 0;
  const negativeRate = enriched > 0 ? Math.round((negative / enriched) * 100) : 0;
  const neutralRate = enriched > 0 ? Math.round((neutral / enriched) * 100) : 0;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-[var(--muted)] mt-1">{business.name}</p>
        {oldestDate && newestDate && (
          <p className="text-xs text-[var(--muted)] mt-1">
            Review data captured: {fmt(oldestDate)} — {fmt(newestDate)}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reviews"
          value={totalReviews.toLocaleString()}
          sub={`${enriched.toLocaleString()} enriched`}
        />
        <StatCard
          label="Avg Rating"
          value={`${avgRating} ⭐`}
          sub={
            ratingTrend !== 0
              ? `${ratingTrend > 0 ? '▲' : '▼'} ${Math.abs(ratingTrend)} vs last snapshot`
              : 'No trend data yet'
          }
        />
        <StatCard
          label="Positive Sentiment"
          value={`${positiveRate}%`}
          sub={`${positive.toLocaleString()} reviews`}
          color="text-green-600"
        />
        <StatCard
          label="Competitor Rank"
          value={rank > 0 ? `#${rank}` : '—'}
          sub={`out of ${totalCompetitors} North York shops`}
          color="text-brand-600"
        />
      </div>

      {/* Velocity from latest snapshot */}
      {latestSnap && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-sm text-[var(--muted)]">New Reviews (last snapshot)</p>
            <p className="text-3xl font-bold mt-1 text-brand-600">
              +{latestSnap.review_velocity ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-sm text-[var(--muted)]">Positive (last snapshot)</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{latestSnap.positive_count}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-sm text-[var(--muted)]">Negative (last snapshot)</p>
            <p className="text-3xl font-bold mt-1 text-red-500">{latestSnap.negative_count}</p>
          </div>
        </div>
      )}

      {/* Sentiment breakdown */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Sentiment Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Positive', rate: positiveRate, count: positive, color: 'bg-green-500', textColor: 'text-green-600' },
            { label: 'Neutral', rate: neutralRate, count: neutral, color: 'bg-slate-400', textColor: 'text-[var(--muted)]' },
            { label: 'Negative', rate: negativeRate, count: negative, color: 'bg-red-500', textColor: 'text-red-500' },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className={`text-sm w-16 font-medium ${row.textColor}`}>{row.label}</span>
              <div className="flex-1 bg-[var(--border)] rounded-full h-3 overflow-hidden">
                <div className={`${row.color} h-3 rounded-full`} style={{ width: `${row.rate}%` }} />
              </div>
              <span className="text-sm text-[var(--muted)] w-24 text-right">
                {row.count.toLocaleString()} ({row.rate}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top themes */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Top Review Themes</h2>
        <div className="flex flex-wrap gap-2">
          {topThemes.map(([theme, count]) => (
            <span
              key={theme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-brand-50 text-brand-700 border border-brand-100"
            >
              {theme}
              <span className="font-semibold text-brand-500">{count}</span>
            </span>
          ))}
          {topThemes.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No themes yet — enrich some reviews first.</p>
          )}
        </div>
      </div>
    </div>
  );
}
