import { createServerClient } from '@/lib/supabase-server';
import { getSessionBusinessId } from '@/lib/get-session-business';
import { headers } from 'next/headers';
import QrClient from './QrClient';

export const dynamic = 'force-dynamic';

async function getQrData() {
  const supabase = createServerClient();

  const businessId = await getSessionBusinessId();
  if (!businessId) return { business: null, links: [], barbers: [] };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, google_place_id')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { business: null, links: [], barbers: [] };

  const [{ data: links }, { data: barbers }] = await Promise.all([
    supabase
      .from('review_links')
      .select('id, business_id, barber_id, slug, name, placement, google_review_url, is_active, scan_count, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('barbers')
      .select('id, name, title, color')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
  ]);

  return { business, links: links ?? [], barbers: barbers ?? [] };
}

export default async function QrPage() {
  const { business, links, barbers } = await getQrData();
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Google Maps review URL for Outkasts — deep links to the "Write a review" dialog
  const googleReviewUrl = business
    ? `https://search.google.com/local/writereview?placeid=${business.google_place_id}`
    : '';

  if (!business) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">QR Codes</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-sm text-[var(--muted)]">No customer business configured.</p>
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

      <QrClient
        initialLinks={links}
        barbers={barbers}
        businessId={business.id}
        googleReviewUrl={googleReviewUrl}
        baseUrl={baseUrl}
      />
    </div>
  );
}
