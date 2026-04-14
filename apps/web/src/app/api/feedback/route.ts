import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  const body = await req.json();
  const { businessId, barberId, reviewLinkId, rating, message, contactEmail } = body;

  if (!businessId || !rating || !message?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: businessId, rating, message' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('feedback_submissions').insert({
    business_id: businessId,
    barber_id: barberId ?? null,
    review_link_id: reviewLinkId ?? null,
    rating,
    message: message.trim(),
    contact_email: contactEmail?.trim() || null,
  });

  if (error) {
    console.error('[feedback] Supabase error:', error.message);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
