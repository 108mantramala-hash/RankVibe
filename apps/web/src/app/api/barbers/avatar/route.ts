/**
 * POST /api/barbers/avatar
 * Accepts a multipart form upload, stores in Supabase Storage,
 * returns the public URL. barberId must be passed as a form field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const barberId = formData.get('barberId') as string | null;

  if (!file || !barberId) {
    return NextResponse.json({ error: 'file and barberId required' }, { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP allowed' }, { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${barberId}.${ext}`;

  const supabase = createServerClient();

  const { error: uploadError } = await supabase.storage
    .from('barber-avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('barber-avatars')
    .getPublicUrl(path);

  // Update barber row with new avatar_url
  await supabase
    .from('barbers')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', barberId);

  return NextResponse.json({ avatarUrl: publicUrl });
}
