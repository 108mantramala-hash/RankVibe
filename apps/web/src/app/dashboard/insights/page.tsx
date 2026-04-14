import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 1800;

async function getInsightsData() {
  const supabase = createServerClient();

  // Fetch last 12 snapshots per business (ordered newest first)
  const { data: snapshots } = await supabase
    .from('review_snapshots')
    .select('business_id, avg_rating, review_count, review_velocity, positive_count, negative_count, snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1000);

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name');

  const bizName: Record<string, string> = {};
  for (const b of businesses ?? []) bizName[b.id] = b.name;

  if (!snapshots || snapshots.length === 0) {
    return { hasData: false, topMovers: [], weeklyStats: null, snapshotsByBiz: {} };
  }

  // Group snapshots by business
  const snapshotsByBiz: Record<string, typeof snapshots> = {};
  for (const snap of snapshots) {
    if (!snapshotsByBiz[snap.business_id]) snapshotsByBiz[snap.business_id] = [];
    snapshotsByBiz[snap.business_id].push(snap);
  }

  // Latest snapshot date for weekly stats — group by date prefix (YYYY-MM-DD) to handle ms differences
  const latestDate = snapshots[0].snapshot_date;
  const latestDatePrefix = latestDate.slice(0, 10);
  const latestSnaps = snapshots.filter((s) => s.snapshot_date.slice(0, 10) === latestDatePrefix);

  const weeklyStats = {
    date: latestDate,
    totalNewReviews: latestSnaps.reduce((sum, s) => sum + (s.review_velocity ?? 0), 0),
    avgRating: latestSnaps.length
      ? parseFloat(
          (latestSnaps.reduce((sum, s) => sum + (s.avg_rating ?? 0), 0) / latestSnaps.length).toFixed(2)
        )
      : 0,
    totalPositive: latestSnaps.reduce((sum, s) => sum + (s.positive_count ?? 0), 0),
    totalNegative: latestSnaps.reduce((sum, s) => sum + (s.negative_count ?? 0), 0),
    businessesWithNewReviews: latestSnaps.filter((s) => (s.review_velocity ?? 0) > 0).length,
  };

  // Top movers — businesses with highest velocity in latest snapshot
  const topMovers = latestSnaps
    .filter((s) => (s.review_velocity ?? 0) > 0)
    .sort((a, b) => (b.review_velocity ?? 0) - (a.review_velocity ?? 0))
    .slice(0, 10)
    .map((s) => ({
      businessId: s.business_id,
      name: bizName[s.business_id] ?? 'Unknown',
      velocity: s.review_velocity ?? 0,
      reviewCount: s.review_count,
      avgRating: s.avg_rating,
      positiveCount: s.positive_count ?? 0,
      negativeCount: s.negative_count ?? 0,
    }));

  return { hasData: true, topMovers, weeklyStats, snapshotsByBiz, bizName };
}

function VelocityBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--border)] rounded-full h-2 overflow-hidden">
        <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-brand-600 w-8 text-right">+{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
      <p className="text-2xl mb-2">📸</p>
      <h3 className="font-semibold mb-1">No snapshots yet</h3>
      <p className="text-sm text-[var(--muted)] max-w-sm mx-auto mb-4">
        Snapshots are taken every Sunday automatically. You can also trigger one manually to start tracking velocity.
      </p>
      <p className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 inline-block">
        GET /api/snapshots — Authorization: Bearer &lt;CRON_SECRET&gt;
      </p>
    </div>
  );
}

export default async function InsightsPage() {
  const { hasData, topMovers, weeklyStats, snapshotsByBiz, bizName } = await getInsightsData();

  const maxVelocity = topMovers.length > 0 ? topMovers[0].velocity : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-[var(--muted)] mt-1">
          Weekly velocity, trends, and sentiment shifts across North York.
        </p>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Weekly summary cards */}
          {weeklyStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">New Reviews This Week</p>
                <p className="text-3xl font-bold mt-1 text-brand-600">
                  +{weeklyStats.totalNewReviews}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {weeklyStats.businessesWithNewReviews} businesses active
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Avg Rating (Week)</p>
                <p className="text-3xl font-bold mt-1">{weeklyStats.avgRating} ⭐</p>
                <p className="text-xs text-[var(--muted)] mt-1">across all businesses</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Positive This Week</p>
                <p className="text-3xl font-bold mt-1 text-green-600">
                  {weeklyStats.totalPositive}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">new positive reviews</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Negative This Week</p>
                <p className="text-3xl font-bold mt-1 text-red-500">
                  {weeklyStats.totalNegative}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">need attention</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top movers */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h2 className="text-base font-semibold mb-1">Fastest Growing This Week</h2>
              <p className="text-xs text-[var(--muted)] mb-4">Businesses with most new reviews</p>
              {topMovers.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No new reviews recorded this week.</p>
              ) : (
                <div className="space-y-4">
                  {topMovers.map((biz) => (
                    <div key={biz.businessId}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium">{biz.name}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {biz.reviewCount} total · {biz.avgRating}⭐ ·{' '}
                            <span className="text-green-600">{biz.positiveCount} pos</span>
                            {biz.negativeCount > 0 && (
                              <span className="text-red-500"> · {biz.negativeCount} neg</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <VelocityBar value={biz.velocity} max={maxVelocity} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Snapshot history info */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h2 className="text-base font-semibold mb-1">Snapshot History</h2>
              <p className="text-xs text-[var(--muted)] mb-4">
                {Object.keys(snapshotsByBiz ?? {}).length} businesses tracked
              </p>
              <div className="space-y-2">
                {Object.entries(snapshotsByBiz ?? {})
                  .filter(([, snaps]) => snaps.length >= 2)
                  .slice(0, 8)
                  .map(([bizId, snaps]) => {
                    const latest = snaps[0];
                    const prev = snaps[1];
                    const ratingDiff = parseFloat(
                      (latest.avg_rating - prev.avg_rating).toFixed(2)
                    );
                    const isUp = ratingDiff > 0;
                    const isDown = ratingDiff < 0;
                    return (
                      <div key={bizId} className="flex items-center justify-between">
                        <p className="text-sm truncate max-w-[200px]">
                          {bizName?.[bizId] ?? 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--muted)]">{latest.avg_rating}⭐</span>
                          {ratingDiff !== 0 && (
                            <span
                              className={`font-medium ${isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-[var(--muted)]'}`}
                            >
                              {isUp ? '▲' : '▼'} {Math.abs(ratingDiff)}
                            </span>
                          )}
                          <span className="text-[var(--muted)]">{snaps.length} snaps</span>
                        </div>
                      </div>
                    );
                  })}
                {Object.values(snapshotsByBiz ?? {}).filter(
                  (snaps) => snaps.length >= 2
                ).length === 0 && (
                  <p className="text-sm text-[var(--muted)]">
                    Need at least 2 snapshots to show trends. Come back next week!
                  </p>
                )}
              </div>
            </div>
          </div>

          {weeklyStats && (
            <p className="text-xs text-[var(--muted)]">
              Last snapshot:{' '}
              {new Date(weeklyStats.date).toLocaleDateString('en-CA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              . Next snapshot runs automatically every Sunday at midnight.
            </p>
          )}
        </>
      )}
    </div>
  );
}
