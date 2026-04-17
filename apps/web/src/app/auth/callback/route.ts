/**
 * GET /auth/callback
 * Supabase OAuth callback — exchanges the code for a session,
 * then links the signed-in Google user to a barber or shop_owner record.
 *
 * Flow:
 *  1. Supabase redirects here with ?code=... after Google OAuth
 *  2. We exchange the code for a session
 *  3. Match the auth user's email to barbers.email or users.email
 *  4. Create/upsert a users row (role = barber or shop_owner)
 *  5. If barber: link barbers.user_id to the new users row
 *  6. Redirect to the appropriate dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/barber';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  // SSR client to exchange the code for a session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session) {
    console.error('[auth/callback] session exchange failed:', error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const authUserId = session.user.id;
  const authEmail = session.user.email ?? '';

  // Service role client for DB writes
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check if this auth user already has a users row
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', authUserId)
    .maybeSingle();

  if (existingUser) {
    // Already linked — go straight to the right dashboard
    const dest = existingUser.role === 'barber' ? '/barber' : '/dashboard';
    return NextResponse.redirect(`${origin}${dest}`);
  }

  // Try to match by email to a barber record
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id, business_id')
    .eq('email', authEmail)
    .maybeSingle();

  let role: 'barber' | 'shop_owner' = 'barber';
  let businessId: string | null = barber?.business_id ?? null;

  if (!barber) {
    // Check if email matches an existing shop_owner
    const { data: ownerUser } = await adminClient
      .from('users')
      .select('id, role, business_id')
      .eq('email', authEmail)
      .maybeSingle();

    if (ownerUser) {
      // Migrate: update their row to use the Supabase Auth UUID
      await adminClient
        .from('users')
        .update({ id: authUserId })
        .eq('email', authEmail);
      const dest = ownerUser.role === 'barber' ? '/barber' : '/dashboard';
      return NextResponse.redirect(`${origin}${dest}`);
    }

    // Unknown email — redirect with error
    return NextResponse.redirect(`${origin}/login?error=no_account`);
  }

  // Create users row for the barber
  await adminClient.from('users').insert({
    id: authUserId,
    email: authEmail,
    role,
    business_id: businessId,
  });

  // Link barber row → user
  await adminClient
    .from('barbers')
    .update({ user_id: authUserId })
    .eq('id', barber.id);

  const redirectTo = role === 'barber' ? '/barber' : next;
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
