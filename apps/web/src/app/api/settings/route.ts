/**
 * GET   /api/settings?businessId=<id>  — fetch AI settings for a business
 * PATCH /api/settings                  — upsert AI settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  // Return defaults if no row yet
  return NextResponse.json({
    settings: data ?? {
      business_id: businessId,
      default_tone: 'professional',
      auto_draft: true,
      include_emoji: false,
      shop_signature: '',
    },
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { business_id, default_tone, auto_draft, include_emoji, shop_signature } = body;

  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  const payload = {
    business_id,
    default_tone: default_tone ?? 'professional',
    auto_draft: auto_draft ?? true,
    include_emoji: include_emoji ?? false,
    shop_signature: shop_signature ?? null,
    updated_at: new Date().toISOString(),
  };

  // Upsert
  const { data: existing } = await supabase
    .from('ai_settings')
    .select('id')
    .eq('business_id', business_id)
    .maybeSingle();

  let result;
  if (existing) {
    const { data } = await supabase
      .from('ai_settings')
      .update(payload)
      .eq('business_id', business_id)
      .select()
      .single();
    result = data;
  } else {
    const { data } = await supabase
      .from('ai_settings')
      .insert(payload)
      .select()
      .single();
    result = data;
  }

  return NextResponse.json({ settings: result });
}
