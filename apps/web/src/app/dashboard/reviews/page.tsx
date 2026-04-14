import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 1800;

type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';

async function getReviews(sentiment: SentimentFilter) {
  const supabase = createServerClient();

  // Scope to the customer business
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('is_customer', true)
    .limit(1);

  const business = businesses?.[0] ?? null;
  if (!business) return { reviews: [], business: null };

  // Also fetch barbers for name lookup
  const [reviewResult, barberResult] = await Promise.all([
    (() => {
      let q = supabase
        .from('reviews')
        .select('id, author_name, rating, text, sentiment, themes, published_at, barber_id')
        .eq('business_id', business.id)
        .not('text', 'is', null)
        .order('published_at', { ascending: false })
        .limit(100);
      if (sentiment !== 'all') q = q.eq('sentiment', sentiment);
      return q;
    })(),
    supabase
      .from('barbers')
      .select('id, name, color')
      .eq('business_id', business.id),
  ]);

  const barberMap: Record<string, { name: string; color: string | null }> = {};
  for (const b of barberResult.data ?? []) barberMap[b.id] = { name: b.name, color: b.color };

  return {
    business,
    reviews: (reviewResult.data ?? []).map((r) => ({
      ...r,
      themes: (r.themes as string[]) ?? [],
      barber: r.barber_id ? barberMap[r.barber_id] : null,
    })),
  };
}

const sentimentStyles = {
  positive: 'bg-green-100 text-green-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(Math.min(rating, 5))}
      <span className="text-[var(--border)]">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ sentiment?: string }>;
}) {
  const params = await searchParams;
  const sentiment = (params.sentiment ?? 'all') as SentimentFilter;
  const { reviews, business } = await getReviews(sentiment);

  const filters: { label: string; value: SentimentFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Positive', value: 'positive' },
    { label: 'Neutral', value: 'neutral' },
    { label: 'Negative', value: 'negative' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-[var(--muted)] mt-1">
          {business?.name} · {reviews.length} most recent{sentiment !== 'all' ? ` ${sentiment}` : ''} reviews
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <a
            key={f.value}
            href={f.value === 'all' ? '/dashboard/reviews' : `/dashboard/reviews?sentiment=${f.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              sentiment === f.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{review.author_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {review.published_at && (
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(review.published_at).toLocaleDateString('en-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {review.barber && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: review.barber.color ?? '#6366f1' }}
                    >
                      {review.barber.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Stars rating={review.rating} />
                {review.sentiment && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      sentimentStyles[review.sentiment as keyof typeof sentimentStyles]
                    }`}
                  >
                    {review.sentiment}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[var(--foreground)] leading-relaxed">{review.text}</p>

            {review.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {review.themes.map((theme) => (
                  <span
                    key={theme}
                    className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <p className="text-sm text-[var(--muted)]">No {sentiment !== 'all' ? sentiment : ''} reviews found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
