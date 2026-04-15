/**
 * PATCH /api/admin/business/[id]
 * Update business details: name, phone, website, address.
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await req.json();

  const allowed = ['name', 'phone', 'website', 'address', 'city', 'state', 'zip'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] === '' ? null : body[key];
  }

  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select('id, name, phone, website, address')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}
