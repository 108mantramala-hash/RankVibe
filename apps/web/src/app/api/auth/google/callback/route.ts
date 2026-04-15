/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google.
 * Exchanges code for tokens, fetches the Google account + location,
 * and stores everything in google_connections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function getGoogleAccountId(accessToken: string): Promise<string | null> {
  const res = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const { accounts } = await res.json();
  return accounts?.[0]?.name ?? null; // e.g. "accounts/123456789"
}

async function getGoogleLocation(
  accessToken: string,
  accountId: string
): Promise<{ locationId: string; locationName: string } | null> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const { locations } = await res.json();
  if (!locations?.length) return null;
  const loc = locations[0];
  return { locationId: loc.name, locationName: loc.title ?? loc.name };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const businessId = searchParams.get('state'); // passed through OAuth state
  const error = searchParams.get('error');

  const redirectBase = `${APP_URL}/dashboard/settings`;

  if (error || !code || !businessId) {
    return NextResponse.redirect(
      `${redirectBase}?google_error=${encodeURIComponent(error ?? 'missing_code')}`
    );
  }

  try {
    const tokens = await exchangeCode(code);

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const accountId = await getGoogleAccountId(tokens.access_token);
    const location = accountId
      ? await getGoogleLocation(tokens.access_token, accountId)
      : null;

    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from('google_connections')
      .upsert(
        {
          business_id: businessId,
          google_account_id: accountId,
          google_location_id: location?.locationId ?? null,
          google_location_name: location?.locationName ?? null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expiry: tokenExpiry,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      );

    if (upsertError) {
      console.error('google_connections upsert error:', upsertError);
      return NextResponse.redirect(`${redirectBase}?google_error=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}?google_connected=1`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}?google_error=server_error`);
  }
}
