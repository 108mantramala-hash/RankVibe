import { createServerClient } from '@/lib/supabase-server';

// Revalidate every 30 minutes — dashboard data doesn't need to be real-time
export const revalidate = 1800;

async function getDashboardData() {
  const supabase = createServerClient();

  const [{ data: reviews }, { data: businesses }] = await Promise.all([
    supabase.from('reviews').select('id, rating, sentiment, themes, business_id'),
    supabase.from('businesses').select('id, name, google_rating, google_review_count'),
  ]);

  const totalReviews = reviews?.length ?? 0;
  const totalBusinesses = businesses?.length ?? 0;

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
    .slice(0, 12);

  // Top businesses by review count (min 5 reviews)
  const bizMap: Record<string, { name: string; count: number; ratingSum: number; positive: number }> = {};
  for (const r of reviews ?? []) {
    if (!bizMap[r.business_id]) {
      const biz = businesses?.find((b) => b.id === r.business_id);
      bizMap[r.business_id] = { name: biz?.name ?? 'Unknown', count: 0, ratingSum: 0, positive: 0 };
    }
    bizMap[r.business_id].count++;
    bizMap[r.business_id].ratingSum += r.rating ?? 0;
    if (r.sentiment === 'positive') bizMap[r.business_id].positive++;
  }

  const topBusinesses = Object.values(bizMap)
    .filter((b) => b.count >= 5)
    .map((b) => ({
      name: b.name,
      count: b.count,
      avgRating: parseFloat((b.ratingSum / b.count).toFixed(1)),
      positiveRate: Math.round((b.positive / b.count) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalReviews, totalBusinesses, avgRating, positive, negative, neutral, enriched, topThemes, topBusinesses };
}

export default async function DashboardPage() {
  const { totalReviews, totalBusinesses, avgRating, positive, negative, neutral, enriched, topThemes, topBusinesses } =
    await getDashboardData();

  const positiveRate = enriched > 0 ? Math.round((positive / enriched) * 100) : 0;
  const negativeRate = enriched > 0 ? Math.round((negative / enriched) * 100) : 0;
  const neutralRate = enriched > 0 ? Math.round((neutral / enriched) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-[var(--muted)] mt-1">North York barbershop intelligence — live from Supabase.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Businesses Tracked</p>
          <p className="text-3xl font-bold mt-1">{totalBusinesses}</p>
          <p className="text-sm text-[var(--muted)] mt-1">North York area</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Reviews</p>
          <p className="text-3xl font-bold mt-1">{totalReviews.toLocaleString()}</p>
          <p className="text-sm text-[var(--muted)] mt-1">{enriched.toLocaleString()} enriched</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Avg Google Rating</p>
          <p className="text-3xl font-bold mt-1">{avgRating} ⭐</p>
          <p className="text-sm text-[var(--muted)] mt-1">across all businesses</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Positive Sentiment</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{positiveRate}%</p>
          <p className="text-sm text-[var(--muted)] mt-1">{positive.toLocaleString()} reviews</p>
        </div>
      </div>

      {/* Sentiment breakdown */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Sentiment Breakdown</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm w-16 text-green-600 font-medium">Positive</span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-3 overflow-hidden">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: `${positiveRate}%` }} />
            </div>
            <span className="text-sm text-[var(--muted)] w-20 text-right">{positive.toLocaleString()} ({positiveRate}%)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-16 text-[var(--muted)] font-medium">Neutral</span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-3 overflow-hidden">
              <div className="bg-slate-400 h-3 rounded-full" style={{ width: `${neutralRate}%` }} />
            </div>
            <span className="text-sm text-[var(--muted)] w-20 text-right">{neutral.toLocaleString()} ({neutralRate}%)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-16 text-red-500 font-medium">Negative</span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-3 overflow-hidden">
              <div className="bg-red-500 h-3 rounded-full" style={{ width: `${negativeRate}%` }} />
            </div>
            <span className="text-sm text-[var(--muted)] w-20 text-right">{negative.toLocaleString()} ({negativeRate}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top themes */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold mb-4">Top Themes</h2>
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
          </div>
        </div>

        {/* Top businesses */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold mb-4">Most Reviewed</h2>
          <div className="space-y-3">
            {topBusinesses.map((biz, i) => (
              <div key={biz.name} className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted)] w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{biz.name}</p>
                  <p className="text-xs text-[var(--muted)]">{biz.count} reviews · {biz.avgRating}⭐</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    biz.positiveRate >= 75
                      ? 'bg-green-100 text-green-700'
                      : biz.positiveRate >= 50
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {biz.positiveRate}% pos
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
