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
  if (!business) return { business: null, barbers: [], barberStats: {} };

  const [{ data: barbers }, { data: reviews }] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, name, title, phone, email, employment_type, status, specialties, bio, color, experience_years, business_id')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('reviews')
      .select('barber_id, rating')
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

  return { business, barbers: parsedBarbers, barberStats };
}

export default async function BarbersPage() {
  const { business, barbers, barberStats } = await getBarbersData();

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
      />
    </div>
  );
}
