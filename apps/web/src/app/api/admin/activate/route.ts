/**
 * POST /api/admin/activate
 * Activates a business as a customer, creates a Supabase Auth user
 * for the owner, and inserts a users row with shop_owner role.
 * Returns the temporary password so admin can send it to the owner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { businessId, ownerEmail } = body;

  if (!businessId || !ownerEmail) {
    return NextResponse.json({ error: 'businessId and ownerEmail required' }, { status: 400 });
  }

  const supabase = createServerClient(); // service role
  const tempPassword = generateTempPassword();

  // 1. Check business exists
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // 2. Check email isn't already used by a barber on a different business
  const { data: existingBarber } = await supabase
    .from('barbers')
    .select('id, business_id')
    .eq('email', ownerEmail)
    .maybeSingle();

  if (existingBarber && existingBarber.business_id !== businessId) {
    return NextResponse.json({
      error: 'This email is already registered as a barber at another business.',
    }, { status: 409 });
  }

  // Check email isn't already a shop_owner on a different business
  const { data: existingOwner } = await supabase
    .from('users')
    .select('id, business_id, role')
    .eq('email', ownerEmail)
    .maybeSingle();

  if (existingOwner && existingOwner.role === 'shop_owner' && existingOwner.business_id !== businessId) {
    return NextResponse.json({
      error: 'This email is already a shop owner for another business.',
    }, { status: 409 });
  }

  // 4. Create Supabase Auth user
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authUser, error: authError } = await authClient.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true, // skip email verification
  });

  if (authError) {
    // If user already exists in auth, look them up
    if (!authError.message.includes('already')) {
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 500 });
    }
  }

  const userId = authUser?.user?.id;

  // 5. Upsert users row
  if (userId) {
    await supabase.from('users').upsert({
      id: userId,
      email: ownerEmail,
      role: 'shop_owner',
      business_id: businessId,
    }, { onConflict: 'id' });
  }

  // 6. Mark business as customer
  await supabase
    .from('businesses')
    .update({ is_customer: true, updated_at: new Date().toISOString() })
    .eq('id', businessId);

  return NextResponse.json({
    success: true,
    businessName: business.name,
    ownerEmail,
    tempPassword,
    userId,
    note: 'Send these credentials to the owner. They should change their password after first login.',
  });
}
