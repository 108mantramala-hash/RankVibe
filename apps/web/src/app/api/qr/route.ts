/**
 * GET  /api/qr?businessId=<id>  — list review links for a business
 * POST /api/qr                  — create a new review link / QR code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function generateSlug(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${rand}`;
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  const supabase = createServerClient();

  let query = supabase
    .from('review_links')
    .select('id, business_id, barber_id, slug, name, placement, google_review_url, is_active, scan_count, created_at')
    .order('created_at', { ascending: true });

  if (businessId) query = query.eq('business_id', businessId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const { business_id, barber_id, name, placement, google_review_url } = body;

  if (!business_id || !google_review_url) {
    return NextResponse.json({ error: 'business_id and google_review_url are required' }, { status: 400 });
  }

  // Generate a unique slug based on barber name or placement
  const prefix = (name ?? 'qr').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 12);
  const slug = generateSlug(prefix);

  const { data, error } = await supabase
    .from('review_links')
    .insert({
      business_id,
      barber_id: barber_id || null,
      slug,
      name: name || null,
      placement: placement || null,
      google_review_url,
      is_active: true,
      scan_count: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data }, { status: 201 });
}
