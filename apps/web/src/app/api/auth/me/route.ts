/**
 * GET /api/auth/me
 * Returns the current user's role and business_id from our users table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createSSRClient(
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ user: null, role: null }, { status: 401 });
  }

  // Get role + business_id from our users table
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: user } = await adminClient
    .from('users')
    .select('role, business_id')
    .eq('id', session.user.id)
    .maybeSingle();

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    role: user?.role ?? null,
    businessId: user?.business_id ?? null,
  });
}
