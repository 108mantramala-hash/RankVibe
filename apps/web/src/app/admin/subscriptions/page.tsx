import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 0;

async function getData() {
  const supabase = createServerClient();

  const [{ data: customers }, { data: allBizCount }, { data: users }, { data: qrLinks }, { data: feedback }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, city, google_rating, google_review_count, created_at')
      .eq('is_customer', true),
    supabase
      .from('businesses')
      .select('id')
      .eq('is_customer', false),
    supabase
      .from('users')
      .select('id, email, role, business_id, created_at')
      .order('created_at'),
    supabase
      .from('review_links')
      .select('id, business_id, scan_count, is_active, created_at'),
    supabase
      .from('feedback_submissions')
      .select('id, business_id, rating, created_at'),
  ]);

  // Per-business review counts
  const reviewCounts: Record<string, number> = {};
  await Promise.all(
    (customers ?? []).map(async (b) => {
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', b.id);
      reviewCounts[b.id] = count ?? 0;
    })
  );

  const businessData = (customers ?? []).map((b) => {
    const bizQr = qrLinks?.filter((l) => l.business_id === b.id) ?? [];
    const bizFeedback = feedback?.filter((f) => f.business_id === b.id) ?? [];
    const bizUsers = users?.filter((u) => u.business_id === b.id) ?? [];
    return {
      ...b,
      reviewCount: reviewCounts[b.id] ?? 0,
      qrCount: bizQr.length,
      totalScans: bizQr.reduce((s, l) => s + (l.scan_count ?? 0), 0),
      feedbackCount: bizFeedback.length,
      negativeFeedback: bizFeedback.filter((f) => f.rating <= 3).length,
      userCount: bizUsers.length,
    };
  });

  return {
    businessData,
    prospectCount: allBizCount?.length ?? 0,
    users: users ?? [],
  };
}

const PLAN_PLACEHOLDER = 'Starter'; // Until billing is wired

export default async function SubscriptionsPage() {
  const { businessData, prospectCount, users } = await getData();

  const mrr = businessData.length * 49; // $49/mo placeholder per shop

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-[var(--muted)] mt-1">Customer accounts, usage, and billing overview.</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', value: businessData.length, sub: 'paying customers', color: '' },
          { label: 'MRR (est.)', value: `$${mrr}`, sub: 'at $49/mo per shop', color: 'text-green-600' },
          { label: 'Prospects', value: prospectCount, sub: 'tracked, not subscribed', color: '' },
          { label: 'Platform Users', value: users.length, sub: `${users.filter(u => u.role === 'barber').length} barbers`, color: '' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-subscription detail */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Active Subscriptions</h2>

        {businessData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">💳</p>
            <p className="text-sm text-[var(--muted)]">No subscribed businesses yet. Start converting prospects from the Businesses page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {businessData.map((b) => (
              <div key={b.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{b.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {PLAN_PLACEHOLDER}
                      </span>
                      <span className="text-xs text-[var(--muted)]">$49/mo</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {b.city} · {b.google_rating}⭐ · {b.google_review_count?.toLocaleString()} Google reviews
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Joined {new Date(b.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--muted)]">Next billing</p>
                    <p className="text-sm font-medium">—</p>
                  </div>
                </div>

                {/* Usage stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Scraped Reviews', value: b.reviewCount.toLocaleString() },
                    { label: 'QR Codes', value: b.qrCount },
                    { label: 'QR Scans', value: b.totalScans },
                    { label: 'Feedback Captured', value: b.feedbackCount },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md bg-[var(--card)] border border-[var(--border)] p-3 text-center">
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-[var(--muted)]">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Negative feedback alert */}
                {b.negativeFeedback > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>{b.negativeFeedback} negative feedback submission{b.negativeFeedback !== 1 ? 's' : ''} captured privately (saved from going public)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prospects pipeline */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-1">Sales Pipeline</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          {prospectCount} North York barbershops tracked but not yet subscribed — warm outreach opportunities.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4">
            <p className="text-2xl font-bold">{prospectCount}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Total prospects</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4">
            <p className="text-2xl font-bold text-green-600">{businessData.length}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Converted</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4">
            <p className="text-2xl font-bold text-brand-600">
              {prospectCount > 0 ? `${((businessData.length / (prospectCount + businessData.length)) * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">Conversion rate</p>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)] mt-4">
          View all prospects → <a href="/admin/businesses" className="text-brand-600 hover:underline">Businesses page</a>
        </p>
      </div>
    </div>
  );
}
