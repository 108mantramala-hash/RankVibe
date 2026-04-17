import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddleware } from '@/lib/supabase-middleware';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddleware(req, res);

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Public routes — always allow
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/api') ||
    pathname === '/'
  ) {
    return res;
  }

  // Not logged in → redirect to login
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from our users table using service role (bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: user } = await adminClient
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  const role = user?.role ?? null;

  // /admin — super_admin only
  if (pathname.startsWith('/admin')) {
    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // /dashboard — shop_owner or super_admin
  if (pathname.startsWith('/dashboard')) {
    if (role !== 'shop_owner' && role !== 'super_admin') {
      // Barbers get redirected to their own portal
      if (role === 'barber') return NextResponse.redirect(new URL('/barber', req.url));
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }

  // /barber — barber role only
  if (pathname.startsWith('/barber')) {
    if (role !== 'barber' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/barber/:path*',
    '/login',
  ],
};
