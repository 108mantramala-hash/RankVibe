import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 0;

async function getData() {
  const supabase = createServerClient();

  const [{ data: businesses }, { data: snapshots }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, city, address, google_rating, google_review_count, is_customer, is_tracked, phone, website, created_at')
      .order('google_review_count', { ascending: false }),
    supabase
      .from('review_snapshots')
      .select('business_id, avg_rating, review_count, positive_count, negative_count, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(500),
  ]);

  // Latest snapshot per biz
  const latestSnap: Record<string, { avgRating: number; reviewCount: number; positiveCount: number; negativeCount: number }> = {};
  for (const s of snapshots ?? []) {
    if (!latestSnap[s.business_id]) {
      latestSnap[s.business_id] = {
        avgRating: s.avg_rating,
        reviewCount: s.review_count,
        positiveCount: s.positive_count ?? 0,
        negativeCount: s.negative_count ?? 0,
      };
    }
  }

  return { businesses: businesses ?? [], latestSnap };
}

export default async function AdminBusinessesPage() {
  const { businesses, latestSnap } = await getData();

  const customers = businesses.filter((b) => b.is_customer);
  const tracked = businesses.filter((b) => !b.is_customer);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Businesses</h1>
        <p className="text-[var(--muted)] mt-1">
          {businesses.length} total · {customers.length} subscribed · {tracked.length} intelligence-only
        </p>
      </div>

      {/* Subscribed */}
      {customers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Subscribed Customers</h2>
          <div className="space-y-3">
            {customers.map((b) => {
              const snap = latestSnap[b.id];
              return (
                <div key={b.id} className="rounded-xl border border-brand-200 bg-[var(--card)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{b.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Subscribed</span>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{b.address}</p>
                      {(b.phone || b.website) && (
                        <div className="flex gap-3 mt-1 text-xs text-[var(--muted)]">
                          {b.phone && <span>{b.phone}</span>}
                          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{b.website}</a>}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{b.google_rating} ⭐</p>
                      <p className="text-xs text-[var(--muted)]">{b.google_review_count?.toLocaleString()} Google reviews</p>
                    </div>
                  </div>
                  {snap && (
                    <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                      {[
                        { label: 'Snap Reviews', value: snap.reviewCount },
                        { label: 'Avg Rating', value: `${snap.avgRating}⭐` },
                        { label: 'Positive', value: snap.positiveCount },
                        { label: 'Negative', value: snap.negativeCount },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-2">
                          <p className="text-sm font-bold">{s.value}</p>
                          <p className="text-xs text-[var(--muted)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All tracked */}
      <section>
        <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Intelligence Layer — All {tracked.length} Tracked Businesses</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted)] border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">City</th>
                  <th className="text-right px-4 py-3 font-medium">Google ⭐</th>
                  <th className="text-right px-4 py-3 font-medium">Google Reviews</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Snap Avg</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Snap +/−</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((b) => {
                  const snap = latestSnap[b.id];
                  return (
                    <tr key={b.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{b.name}</td>
                      <td className="px-4 py-3 text-[var(--muted)] hidden lg:table-cell">{b.city}</td>
                      <td className="px-4 py-3 text-right">{b.google_rating ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">{b.google_review_count?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {snap ? `${snap.avgRating}⭐` : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-xs">
                        {snap ? (
                          <span>
                            <span className="text-green-600">{snap.positiveCount}✓</span>
                            {' '}
                            <span className="text-red-500">{snap.negativeCount}✗</span>
                          </span>
                        ) : <span className="text-[var(--muted)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
