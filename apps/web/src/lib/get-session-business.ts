/**
 * Server-side helper: returns the business_id for the current session user.
 * - shop_owner → their own business_id from users table
 * - super_admin → falls back to first is_customer business (admin view)
 * - barber → their business_id
 */

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getSessionBusinessId(): Promise<string | null> {
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
  if (!session) return null;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await adminClient
    .from('users')
    .select('role, business_id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!user) return null;

  // shop_owner or barber → use their assigned business
  if (user.business_id) return user.business_id;

  // super_admin with no business → fall back to first customer (platform view)
  if (user.role === 'super_admin') {
    const { data: biz } = await adminClient
      .from('businesses')
      .select('id')
      .eq('is_customer', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return biz?.id ?? null;
  }

  return null;
}
