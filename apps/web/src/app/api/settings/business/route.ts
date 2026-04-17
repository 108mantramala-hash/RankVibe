import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) return NextResponse.json({ business: null }, { status: 400 });

  const supabase = createServerClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, address, google_rating, google_review_count, category')
    .eq('id', businessId)
    .maybeSingle();

  return NextResponse.json({ business });
}
