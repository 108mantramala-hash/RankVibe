import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { RATING_THRESHOLD } from '@rankvibe/core';
import ReviewFunnel from './ReviewFunnel';

export const revalidate = 0; // always fresh — links can be deactivated

interface Props {
  params: Promise<{ slug: string }>;
}

async function getLinkData(slug: string) {
  const supabase = createServerClient();

  const { data: link } = await supabase
    .from('review_links')
    .select(`
      id, slug, business_id, barber_id, google_review_url, is_active, scan_count,
      businesses!inner ( id, name ),
      barbers ( id, name, color )
    `)
    .eq('slug', slug)
    .maybeSingle();

  return link;
}

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const link = await getLinkData(slug);

  if (!link || !link.is_active) notFound();

  // Increment scan count — fire and forget, don't block page render
  const supabase = createServerClient();
  supabase
    .from('review_links')
    .update({ scan_count: (link.scan_count ?? 0) + 1 })
    .eq('id', link.id)
    .then(() => {});

  const business = link.businesses as unknown as { id: string; name: string };
  const barber = link.barbers as unknown as { id: string; name: string; color: string | null } | null;

  return (
    <ReviewFunnel
      businessId={business.id}
      businessName={business.name}
      barberId={barber?.id ?? null}
      barberName={barber?.name ?? null}
      barberColor={barber?.color ?? null}
      reviewLinkId={link.id}
      googleReviewUrl={link.google_review_url}
      ratingThreshold={RATING_THRESHOLD}
    />
  );
}
