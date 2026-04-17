import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getBarberData() {
  const cookieStore = await cookies();

  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get barber record linked to this auth user
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id, name, known_as, title, avatar_url, business_id, color')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!barber) redirect('/login?error=no_account');

  // Get barber's reviews
  const { data: reviews } = await adminClient
    .from('reviews')
    .select('id, rating, sentiment, published_at, author_name, text')
    .eq('barber_id', barber.id)
    .order('published_at', { ascending: false })
    .limit(5);

  // Aggregate stats
  const { data: allReviews } = await adminClient
    .from('reviews')
    .select('rating, sentiment')
    .eq('barber_id', barber.id);

  const total = allReviews?.length ?? 0;
  const avgRating = total > 0
    ? (allReviews!.reduce((s, r) => s + (r.rating ?? 0), 0) / total).toFixed(1)
    : null;
  const positive = allReviews?.filter(r => r.sentiment === 'positive').length ?? 0;

  // Get QR link for this barber
  const { data: qrLink } = await adminClient
    .from('review_links')
    .select('slug, scan_count')
    .eq('barber_id', barber.id)
    .maybeSingle();

  return { barber, reviews: reviews ?? [], total, avgRating, positive, qrLink };
}

export default async function BarberDashboardPage() {
  const { barber, reviews, total, avgRating, positive, qrLink } = await getBarberData();

  const displayName = barber.known_as || barber.name.split(' ')[0];
  const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {barber.avatar_url ? (
          <img src={barber.avatar_url} alt={barber.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-200" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: barber.color ?? '#6366f1' }}
          >
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">Hey, {displayName}</h1>
          <p className="text-[var(--muted)] text-sm">{barber.title}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">My Reviews</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
          <p className="text-sm text-[var(--muted)] mt-1">attributed to you</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Avg Rating</p>
          <p className="text-3xl font-bold mt-1 text-brand-600">
            {avgRating ? `${avgRating} ⭐` : '—'}
          </p>
          <p className="text-sm text-[var(--muted)] mt-1">from {total} reviews</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Positive Sentiment</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{positiveRate}%</p>
          <p className="text-sm text-[var(--muted)] mt-1">{positive} positive reviews</p>
        </div>
      </div>

      {/* QR scan count */}
      {qrLink && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">My QR Code Scans</p>
            <p className="text-3xl font-bold mt-1 text-brand-600">{qrLink.scan_count}</p>
          </div>
          <a
            href={`/barber/qr`}
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            View QR →
          </a>
        </div>
      )}

      {/* Recent reviews */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold mb-4">Recent Reviews Mentioning You</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No reviews attributed to you yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{r.author_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{'⭐'.repeat(r.rating ?? 0)}</span>
                    {r.sentiment && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                        r.sentiment === 'negative' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {r.sentiment}
                      </span>
                    )}
                  </div>
                </div>
                {r.text && (
                  <p className="text-sm text-[var(--muted)] line-clamp-2">{r.text}</p>
                )}
                {r.published_at && (
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {new Date(r.published_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
