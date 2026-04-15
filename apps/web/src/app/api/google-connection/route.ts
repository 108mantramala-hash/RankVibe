/**
 * GET /api/google-connection?businessId=<id>
 * Returns whether a business has an active Google connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from('google_connections')
    .select('google_location_name, connected_at')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    locationName: data.google_location_name,
    connectedAt: data.connected_at,
  });
}
