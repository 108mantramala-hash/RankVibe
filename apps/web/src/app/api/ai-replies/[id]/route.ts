/**
 * PATCH /api/ai-replies/[id]
 *   Update approval / posted status on an ai_replies row.
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

  const updates: Record<string, unknown> = {};
  if ('is_approved' in body) {
    updates.is_approved = body.is_approved;
    if (body.is_approved) updates.approved_at = new Date().toISOString();
    else updates.approved_at = null;
  }
  if ('is_posted' in body) updates.is_posted = body.is_posted;
  if ('is_used' in body) updates.is_used = body.is_used;

  const { data, error } = await supabase
    .from('ai_replies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reply: data });
}
