import { createServerClient } from '@/lib/supabase-server';
import { getSessionBusinessId } from '@/lib/get-session-business';

export const dynamic = 'force-dynamic';

async function getInsightsData() {
  const supabase = createServerClient();

  const businessId = await getSessionBusinessId();
  if (!businessId) return { hasData: false, business: null, snapshots: [], topThemes: [] };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { hasData: false, business: null, snapshots: [], topThemes: [] };

  const { data: snapshots } = await supabase
    .from('review_snapshots')
    .select('avg_rating, review_count, review_velocity, positive_count, negative_count, neutral_count, top_themes, snapshot_date')
    .eq('business_id', business.id)
    .order('snapshot_date', { ascending: false })
    .limit(12);

  if (!snapshots || snapshots.length === 0) {
    return { hasData: false, business, snapshots: [], topThemes: [] };
  }

  const latest = snapshots[0];

  // Aggregate top themes across all snapshots
  const themeCount: Record<string, number> = {};
  for (const snap of snapshots) {
    if (Array.isArray(snap.top_themes)) {
      for (const t of snap.top_themes as string[]) {
        themeCount[t] = (themeCount[t] ?? 0) + 1;
      }
    }
  }
  const topThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return { hasData: true, business, snapshots, latest, topThemes };
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span className={value > 0 ? 'text-green-600' : 'text-red-500'}>
      {value > 0 ? '▲' : '▼'} {Math.abs(value)}
    </span>
  );
}

export default async function InsightsPage() {
  const { hasData, business, snapshots, topThemes } = await getInsightsData();
  const latest = hasData ? (snapshots as NonNullable<typeof snapshots>)[0] : null;
  const prev = hasData && snapshots.length > 1 ? snapshots[1] : null;

  const ratingTrend = latest && prev
    ? parseFloat((latest.avg_rating - prev.avg_rating).toFixed(2))
    : 0;
  const velocityTrend = latest && prev
    ? (latest.review_velocity ?? 0) - (prev.review_velocity ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-[var(--muted)] mt-1">
          {business?.name ?? 'No business configured'} · snapshot history & trends
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-2xl mb-2">📸</p>
          <h3 className="font-semibold mb-1">No snapshots yet</h3>
          <p className="text-sm text-[var(--muted)] max-w-sm mx-auto mb-4">
            Snapshots run every Sunday automatically. Trigger one manually to start tracking trends.
          </p>
          <p className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 inline-block">
            GET /api/snapshots — Authorization: Bearer &lt;CRON_SECRET&gt;
          </p>
        </div>
      ) : (
        <>
          {/* Latest snapshot summary */}
          {latest && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Avg Rating</p>
                <p className="text-3xl font-bold mt-1">{latest.avg_rating} ⭐</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  <TrendArrow value={ratingTrend} /> vs previous
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">New Reviews</p>
                <p className="text-3xl font-bold mt-1 text-brand-600">+{latest.review_velocity ?? 0}</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  <TrendArrow value={velocityTrend} /> vs previous
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Positive</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{latest.positive_count}</p>
                <p className="text-xs text-[var(--muted)] mt-1">this snapshot</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-sm text-[var(--muted)]">Negative</p>
                <p className="text-3xl font-bold mt-1 text-red-500">{latest.negative_count}</p>
                <p className="text-xs text-[var(--muted)] mt-1">need attention</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Snapshot history table */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h2 className="text-base font-semibold mb-1">Snapshot History</h2>
              <p className="text-xs text-[var(--muted)] mb-4">{snapshots.length} snapshots recorded</p>
              <div className="space-y-2">
                {snapshots.slice(0, 8).map((snap, i) => {
                  const next = snapshots[i + 1];
                  const diff = next ? parseFloat((snap.avg_rating - next.avg_rating).toFixed(2)) : null;
                  return (
                    <div key={snap.snapshot_date} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)] text-xs">
                        {new Date(snap.snapshot_date).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span>{snap.avg_rating}⭐</span>
                        <span className="text-brand-600">+{snap.review_velocity ?? 0} new</span>
                        <span className="text-green-600">{snap.positive_count} pos</span>
                        {snap.negative_count > 0 && (
                          <span className="text-red-500">{snap.negative_count} neg</span>
                        )}
                        {diff !== null && diff !== 0 && (
                          <span className={diff > 0 ? 'text-green-600' : 'text-red-500'}>
                            {diff > 0 ? '▲' : '▼'}{Math.abs(diff)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top recurring themes */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h2 className="text-base font-semibold mb-1">Recurring Themes</h2>
              <p className="text-xs text-[var(--muted)] mb-4">Themes appearing across snapshots</p>
              {topThemes.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No theme data yet.</p>
              ) : (
                <div className="space-y-2">
                  {topThemes.map(([theme, count]) => (
                    <div key={theme} className="flex items-center gap-3">
                      <span className="text-sm flex-1">{theme}</span>
                      <div className="w-24 bg-[var(--border)] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brand-500 h-2 rounded-full"
                          style={{ width: `${Math.round((count / snapshots.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--muted)] w-12 text-right">
                        {count}/{snapshots.length} snaps
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {latest && (
            <p className="text-xs text-[var(--muted)]">
              Last snapshot:{' '}
              {new Date(latest.snapshot_date).toLocaleDateString('en-CA', {
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
