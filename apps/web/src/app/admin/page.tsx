import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 0;

async function getAdminData() {
  const supabase = createServerClient();

  // Use count queries — never fetch all rows for aggregate stats
  const [
    { count: totalBusinesses },
    { count: customerCount },
    { count: totalReviews },
    { count: enrichedReviews },
    { count: totalFeedback },
    { data: businesses },
    { data: users },
    { data: snapshots },
    { data: qrLinks },
  ] = await Promise.all([
    supabase.from('businesses').select('*', { count: 'exact', head: true }),
    supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('is_customer', true),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).not('sentiment', 'is', null),
    supabase.from('feedback_submissions').select('*', { count: 'exact', head: true }),
    supabase.from('businesses').select('id, name, city, google_rating, google_review_count, is_customer, created_at'),
    supabase.from('users').select('id, email, role, business_id, created_at').order('created_at'),
    supabase.from('review_snapshots')
      .select('business_id, avg_rating, review_count, positive_count, negative_count, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(500),
    supabase.from('review_links').select('id, business_id, scan_count, is_active'),
  ]);

  const totalScans = qrLinks?.reduce((s, l) => s + (l.scan_count ?? 0), 0) ?? 0;

  // Per-business review counts via separate queries for customer businesses
  const customerBizIds = (businesses ?? []).filter((b) => b.is_customer).map((b) => b.id);

  // Fetch actual review counts per customer business
  const reviewCountsByBiz: Record<string, number> = {};
  await Promise.all(
    customerBizIds.map(async (bizId) => {
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bizId);
      reviewCountsByBiz[bizId] = count ?? 0;
    })
  );

  // Latest snapshot per business
  const latestSnapByBiz: Record<string, { avgRating: number; reviewCount: number; positiveCount: number; negativeCount: number }> = {};
  for (const s of snapshots ?? []) {
    if (!latestSnapByBiz[s.business_id]) {
      latestSnapByBiz[s.business_id] = {
        avgRating: s.avg_rating,
        reviewCount: s.review_count,
        positiveCount: s.positive_count ?? 0,
        negativeCount: s.negative_count ?? 0,
      };
    }
  }

  const customerSummaries = (businesses ?? [])
    .filter((b) => b.is_customer)
    .map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      googleRating: b.google_rating,
      reviewCount: reviewCountsByBiz[b.id] ?? 0,
      latestSnap: latestSnapByBiz[b.id] ?? null,
      qrCodes: qrLinks?.filter((l) => l.business_id === b.id).length ?? 0,
      totalScans: qrLinks?.filter((l) => l.business_id === b.id).reduce((s, l) => s + l.scan_count, 0) ?? 0,
      joinedAt: b.created_at,
    }));

  const allTracked = (businesses ?? [])
    .filter((b) => !b.is_customer)
    .sort((a, b) => (b.google_review_count ?? 0) - (a.google_review_count ?? 0));

  return {
    totalBusinesses: totalBusinesses ?? 0,
    customerCount: customerCount ?? 0,
    totalReviews: totalReviews ?? 0,
    enrichedReviews: enrichedReviews ?? 0,
    totalFeedback: totalFeedback ?? 0,
    totalScans,
    users: users ?? [],
    customerSummaries,
    allTracked,
  };
}

export default async function AdminPage() {
  const data = await getAdminData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-[var(--muted)] mt-1">All registered businesses and platform-wide metrics.</p>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Businesses', value: data.totalBusinesses, sub: `${data.customerCount} subscribed` },
          { label: 'Total Reviews', value: data.totalReviews.toLocaleString(), sub: `${data.enrichedReviews.toLocaleString()} enriched` },
          { label: 'QR Scans', value: data.totalScans.toLocaleString(), sub: 'across all shops' },
          { label: 'Feedback Captured', value: data.totalFeedback, sub: 'private submissions' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Subscribed businesses */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-1">Subscribed Businesses</h2>
        <p className="text-xs text-[var(--muted)] mb-4">{data.customerCount} active customer{data.customerCount !== 1 ? 's' : ''}</p>

        {data.customerSummaries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No subscribed businesses yet.</p>
        ) : (
          <div className="space-y-3">
            {data.customerSummaries.map((biz) => (
              <div key={biz.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{biz.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{biz.city}</p>
                  </div>
                  <p className="text-sm font-bold">{biz.googleRating} ⭐</p>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3 text-center">
                  {[
                    { label: 'Reviews', value: biz.reviewCount.toLocaleString() },
                    { label: 'QR Codes', value: biz.qrCodes },
                    { label: 'Scans', value: biz.totalScans },
                    {
                      label: 'Sentiment',
                      value: biz.latestSnap
                        ? `${biz.latestSnap.positiveCount}✓ ${biz.latestSnap.negativeCount}✗`
                        : '—',
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md bg-[var(--card)] border border-[var(--border)] p-2">
                      <p className="text-sm font-bold">{stat.value}</p>
                      <p className="text-xs text-[var(--muted)]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Users</h2>
        <div className="space-y-2">
          {data.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div>
                <p className="text-sm font-medium">{u.email}</p>
                <p className="text-xs text-[var(--muted)] font-mono">{u.id.slice(0, 8)}…</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                u.role === 'super_admin'
                  ? 'bg-brand-100 text-brand-700'
                  : u.role === 'shop_owner'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* All tracked businesses preview */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">All Tracked Businesses</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{data.allTracked.length} North York businesses — intelligence layer</p>
          </div>
          <a href="/admin/businesses" className="text-xs text-brand-600 hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left pb-2 font-medium">Name</th>
                <th className="text-right pb-2 font-medium">Google ⭐</th>
                <th className="text-right pb-2 font-medium">Google Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.allTracked.slice(0, 10).map((b) => (
                <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 font-medium truncate max-w-[200px]">{b.name}</td>
                  <td className="py-2 text-right">{b.google_rating ?? '—'}</td>
                  <td className="py-2 text-right text-[var(--muted)]">{b.google_review_count?.toLocaleString() ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
