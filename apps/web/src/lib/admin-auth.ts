import { NextRequest, NextResponse } from 'next/server';

/**
 * Guards admin-only API routes with an ADMIN_API_KEY header check.
 * Returns a 401 response if unauthorized, or null if authorized.
 *
 * Usage:
 *   const denied = checkAdminAuth(req);
 *   if (denied) return denied;
 */
export function checkAdminAuth(req: NextRequest): NextResponse | null {
  const apiKey = req.headers.get('x-api-key');
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    // If env var not set, block in production, allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Server misconfiguration: ADMIN_API_KEY not set' },
        { status: 500 }
      );
    }
    return null; // Allow in dev if not configured
  }

  if (apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
