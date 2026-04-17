/**
 * PATCH  /api/barbers/[id]  — update a barber
 * DELETE /api/barbers/[id]  — delete a barber
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

  // Only allow updating these fields
  const allowed = [
    'name', 'known_as', 'title', 'phone', 'email', 'employment_type', 'status',
    'specialties', 'bio', 'color', 'avatar_url', 'experience_years',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] === '' ? null : body[key];
  }

  // Email uniqueness check — skip if email not being changed
  if (updates.email) {
    const email = updates.email as string;
    const [{ data: existingBarber }, { data: existingOwner }] = await Promise.all([
      supabase.from('barbers').select('id, business_id').eq('email', email).neq('id', id).maybeSingle(),
      supabase.from('users').select('id, role, business_id').eq('email', email).maybeSingle(),
    ]);
    if (existingBarber) {
      return NextResponse.json({ error: 'This email is already registered to another barber.' }, { status: 409 });
    }
    // Get this barber's business_id to allow owner+barber same email on same biz
    if (existingOwner && existingOwner.role === 'shop_owner') {
      const { data: thisBarber } = await supabase.from('barbers').select('business_id').eq('id', id).maybeSingle();
      if (existingOwner.business_id !== thisBarber?.business_id) {
        return NextResponse.json({ error: 'This email belongs to a shop owner on another business.' }, { status: 409 });
      }
    }
  }

  const { data, error } = await supabase
    .from('barbers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ barber: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from('barbers').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
