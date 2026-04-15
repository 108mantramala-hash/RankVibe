import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 0;

async function getAdminData() {
  const supabase = createServerClient();

  const [
    { data: businesses },
    { data: reviews },
    { data: users },
    { data: snapshots },
    { data: feedback },
    { data: qrLinks },
  ] = await Promise.all([
    supabase.from('businesses').select('id, name, is_customer, is_tracked, google_rating, google_review_count, city, created_at'),
    supabase.from('reviews').select('id, sentiment, business_id, created_at'),
    supabase.from('users').select('id, email, role, business_id, created_at'),
    supabase.from('review_snapshots').select('business_id, avg_rating, review_count, snapshot_date').order('snapshot_date', { ascending: false }).limit(200),
    supabase.from('feedback_submissions').select('id, rating, created_at'),
    supabase.from('review_links').select('id, business_id, scan_count, is_active'),
  ]);

  const totalBusinesses = businesses?.length ?? 0;
  const customerBusinesses = businesses?.filter((b) => b.is_customer) ?? [];
  const totalReviews = reviews?.length ?? 0;
  const enriched = reviews?.filter((r) => r.sentiment !== null).length ?? 0;
  const totalFeedback = feedback?.length ?? 0;
  const totalScans = qrLinks?.reduce((s, l) => s + (l.scan_count ?? 0), 0) ?? 0;

  // Per-customer-business summary
  const bizMap: Record<string, NonNullable<typeof businesses>[0]> = {};
  for (const b of businesses ?? []) bizMap[b.id] = b;

  const reviewCountByBiz: Record<string, number> = {};
  for (const r of reviews ?? []) {
    reviewCountByBiz[r.business_id] = (reviewCountByBiz[r.business_id] ?? 0) + 1;
  }

  // Latest snapshot per business
  const latestSnapByBiz: Record<string, { avgRating: number; reviewCount: number; date: string }> = {};
  for (const s of snapshots ?? []) {
    if (!latestSnapByBiz[s.business_id]) {
      latestSnapByBiz[s.business_id] = {
        avgRating: s.avg_rating,
        reviewCount: s.review_count,
        date: s.snapshot_date,
      };
    }
  }

  const customerSummaries = customerBusinesses.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    googleRating: b.google_rating,
    reviewCount: reviewCountByBiz[b.id] ?? 0,
    latestSnap: latestSnapByBiz[b.id] ?? null,
    qrCodes: qrLinks?.filter((l) => l.business_id === b.id).length ?? 0,
    totalScans: qrLinks?.filter((l) => l.business_id === b.id).reduce((s, l) => s + l.scan_count, 0) ?? 0,
    joinedAt: b.created_at,
  }));

  // All 79 tracked businesses brief list
  const allTracked = (businesses ?? [])
    .filter((b) => !b.is_customer)
    .map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      googleRating: b.google_rating,
      googleReviewCount: b.google_review_count,
      reviewCount: reviewCountByBiz[b.id] ?? 0,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);

  return {
    totalBusinesses,
    customerCount: customerBusinesses.length,
    totalReviews,
    enriched,
    totalFeedback,
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
          { label: 'Total Reviews', value: data.totalReviews.toLocaleString(), sub: `${data.enriched.toLocaleString()} enriched` },
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
                    { label: 'Snap Rating', value: biz.latestSnap ? `${biz.latestSnap.avgRating}⭐` : '—' },
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

      {/* All tracked businesses */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-1">All Tracked Businesses</h2>
        <p className="text-xs text-[var(--muted)] mb-4">{data.allTracked.length} North York businesses in the intelligence layer</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left pb-2 font-medium">Name</th>
                <th className="text-right pb-2 font-medium">Google ⭐</th>
                <th className="text-right pb-2 font-medium">Google Reviews</th>
                <th className="text-right pb-2 font-medium">Scraped Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.allTracked.slice(0, 20).map((b) => (
                <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 font-medium truncate max-w-[200px]">{b.name}</td>
                  <td className="py-2 text-right">{b.googleRating ?? '—'}</td>
                  <td className="py-2 text-right text-[var(--muted)]">{b.googleReviewCount?.toLocaleString() ?? '—'}</td>
                  <td className="py-2 text-right text-[var(--muted)]">{b.reviewCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.allTracked.length > 20 && (
            <p className="text-xs text-[var(--muted)] mt-3">Showing 20 of {data.allTracked.length}</p>
          )}
        </div>
      </div>
    </div>
  );
}
