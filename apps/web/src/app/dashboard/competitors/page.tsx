import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 1800;

async function getCompetitorData() {
  const supabase = createServerClient();

  const [{ data: businesses }, { data: reviews }] = await Promise.all([
    supabase.from('businesses').select('id, name, google_rating, google_review_count, address, phone, website'),
    supabase.from('reviews').select('business_id, rating, sentiment'),
  ]);

  const bizMap: Record<
    string,
    {
      id: string;
      name: string;
      googleRating: number | null;
      googleReviewCount: number | null;
      address: string;
      phone: string | null;
      website: string | null;
      reviewCount: number;
      ratingSum: number;
      positive: number;
      negative: number;
      neutral: number;
    }
  > = {};

  for (const b of businesses ?? []) {
    bizMap[b.id] = {
      id: b.id,
      name: b.name,
      googleRating: b.google_rating,
      googleReviewCount: b.google_review_count,
      address: b.address,
      phone: b.phone,
      website: b.website,
      reviewCount: 0,
      ratingSum: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
    };
  }

  for (const r of reviews ?? []) {
    const b = bizMap[r.business_id];
    if (!b) continue;
    b.reviewCount++;
    b.ratingSum += r.rating ?? 0;
    if (r.sentiment === 'positive') b.positive++;
    else if (r.sentiment === 'negative') b.negative++;
    else if (r.sentiment === 'neutral') b.neutral++;
  }

  return Object.values(bizMap)
    .map((b) => ({
      ...b,
      avgRating: b.reviewCount > 0 ? parseFloat((b.ratingSum / b.reviewCount).toFixed(1)) : null,
      positiveRate: b.reviewCount > 0 ? Math.round((b.positive / b.reviewCount) * 100) : null,
    }))
    .sort((a, b) => (b.googleReviewCount ?? 0) - (a.googleReviewCount ?? 0));
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span className="font-semibold">
      {rating} <span className="text-yellow-400">★</span>
    </span>
  );
}

function SentimentBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-[var(--muted)] text-xs">—</span>;
  const color =
    rate >= 75 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{rate}%</span>;
}

export default async function CompetitorsPage() {
  const competitors = await getCompetitorData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Competitors</h1>
        <p className="text-[var(--muted)] mt-1">{competitors.length} North York barbershops — sorted by review volume.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted)] w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted)]">Business</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Google Rating</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Reviews</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Avg Rating</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Positive</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)] hidden lg:table-cell">Neg / Neu</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((biz, i) => (
                <tr
                  key={biz.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--muted)]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-xs text-[var(--muted)] truncate max-w-xs">{biz.address}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Stars rating={biz.googleRating} />
                    {biz.googleReviewCount && (
                      <p className="text-xs text-[var(--muted)]">{biz.googleReviewCount.toLocaleString()} on Google</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{biz.reviewCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Stars rating={biz.avgRating} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SentimentBadge rate={biz.positiveRate} />
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className="text-xs text-red-500">{biz.negative} neg</span>
                    <span className="text-[var(--muted)] mx-1">/</span>
                    <span className="text-xs text-[var(--muted)]">{biz.neutral} neu</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
