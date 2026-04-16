import { createServerClient } from '@/lib/supabase-server';
import BarberClient from './BarberClient';

export const revalidate = 0;

async function getBarbersData() {
  const supabase = createServerClient();

  // Until auth is wired: use the first isCustomer business as the "current shop"
  // Once auth is added, this becomes: businesses.eq('id', session.user.businessId)
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('is_customer', true)
    .limit(1);

  const business = businesses?.[0] ?? null;
  if (!business) return { business: null, barbers: [], barberStats: {}, qrByBarber: {}, shopGoogleUrl: '' };

  const [{ data: barbers }, { data: reviews }, { data: reviewLinks }] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, name, known_as, title, phone, email, employment_type, status, specialties, bio, color, experience_years, business_id')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('reviews')
      .select('barber_id, rating')
      .eq('business_id', business.id)
      .not('barber_id', 'is', null),
    supabase
      .from('review_links')
      .select('id, barber_id, slug, name, google_review_url, is_active, scan_count')
      .eq('business_id', business.id)
      .not('barber_id', 'is', null),
  ]);

  // Aggregate per-barber stats from reviews attributed to them
  const barberStats: Record<string, { reviewCount: number; avgRating: number | null }> = {};
  for (const rev of reviews ?? []) {
    if (!rev.barber_id) continue;
    if (!barberStats[rev.barber_id]) barberStats[rev.barber_id] = { reviewCount: 0, avgRating: null };
    barberStats[rev.barber_id].reviewCount++;
  }
  // Compute avg ratings
  const ratingAccum: Record<string, { sum: number; count: number }> = {};
  for (const rev of reviews ?? []) {
    if (!rev.barber_id || !rev.rating) continue;
    if (!ratingAccum[rev.barber_id]) ratingAccum[rev.barber_id] = { sum: 0, count: 0 };
    ratingAccum[rev.barber_id].sum += rev.rating;
    ratingAccum[rev.barber_id].count++;
  }
  for (const [bid, { sum, count }] of Object.entries(ratingAccum)) {
    if (barberStats[bid]) {
      barberStats[bid].avgRating = parseFloat((sum / count).toFixed(1));
    }
  }

  function parseJsonArray(val: unknown): string[] | null {
    if (!val) return null;
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return null; }
    }
    return null;
  }

  const parsedBarbers = (barbers ?? []).map((b) => ({
    ...b,
    specialties: parseJsonArray(b.specialties),
  }));

  // QR link keyed by barber id (first active one wins)
  const qrByBarber: Record<string, { id: string; slug: string; name: string | null; scanCount: number; googleReviewUrl: string }> = {};
  for (const link of reviewLinks ?? []) {
    if (link.barber_id && !qrByBarber[link.barber_id]) {
      qrByBarber[link.barber_id] = {
        id: link.id,
        slug: link.slug,
        name: link.name,
        scanCount: link.scan_count,
        googleReviewUrl: link.google_review_url,
      };
    }
  }

  // Get the shop's google review URL from any existing link
  const shopGoogleUrl = (reviewLinks ?? [])[0]?.google_review_url
    ?? 'https://search.google.com/local/writereview?placeid=ChIJB3qd7TEtK4gR-t0k06aGpss';

  return { business, barbers: parsedBarbers, barberStats, qrByBarber, shopGoogleUrl };
}

export default async function BarbersPage() {
  const { business, barbers, barberStats, qrByBarber, shopGoogleUrl } = await getBarbersData();

  if (!business) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Barbers</h1>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-2xl mb-2">🏪</p>
          <h3 className="font-semibold mb-1">No customer business found</h3>
          <p className="text-sm text-[var(--muted)] max-w-sm mx-auto">
            Mark a business as <code>is_customer = true</code> in Supabase to activate barber management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] border border-[var(--border)] rounded px-3 py-1.5 inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {business.name}
      </div>

      <BarberClient
        initialBarbers={barbers}
        businessId={business.id}
        barberStats={barberStats}
        qrByBarber={qrByBarber}
        shopGoogleUrl={shopGoogleUrl}
      />
    </div>
  );
}
