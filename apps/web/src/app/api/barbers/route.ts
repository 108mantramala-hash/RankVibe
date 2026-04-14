/**
 * GET  /api/barbers?businessId=<id>  — list barbers for a business
 * POST /api/barbers                  — create a new barber
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  const supabase = createServerClient();

  let query = supabase
    .from('barbers')
    .select(`
      id, name, title, phone, email, employment_type, status,
      specialties, bio, color, avatar_url, experience_years,
      created_at, updated_at, business_id
    `)
    .order('created_at', { ascending: true });

  if (businessId) query = query.eq('business_id', businessId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ barbers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const {
    business_id,
    name,
    title = 'Barber',
    phone,
    email,
    employment_type = 'employee',
    status = 'active',
    specialties = [],
    bio,
    color,
    avatar_url,
    experience_years,
  } = body;

  if (!business_id || !name) {
    return NextResponse.json({ error: 'business_id and name are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('barbers')
    .insert({
      business_id,
      name,
      title,
      phone: phone || null,
      email: email || null,
      employment_type,
      status,
      specialties: specialties.length > 0 ? specialties : null,
      bio: bio || null,
      color: color || null,
      avatar_url: avatar_url || null,
      experience_years: experience_years || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ barber: data }, { status: 201 });
}
