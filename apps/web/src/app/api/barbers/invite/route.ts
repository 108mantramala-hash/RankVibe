/**
 * POST /api/barbers/invite
 * Sends a barber onboarding invite email via Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { barberName, barberEmail, shopName } = await req.json();

  if (!barberName || !barberEmail) {
    return NextResponse.json({ error: 'barberName and barberEmail required' }, { status: 400 });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://rankvibe.org'}/barber/login`;
  const firstName = barberName.split(' ')[0];
  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
  const shop = shopName ?? 'your barbershop';

  const { error } = await resend.emails.send({
    from,
    to: barberEmail,
    subject: `You've been added to RankVibe — ${shop}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">

          <!-- Header -->
          <div style="background: #4f46e5; padding: 32px 40px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
              Rank<span style="color: #a5b4fc;">Vibe</span>
            </h1>
            <p style="color: #c7d2fe; margin: 4px 0 0; font-size: 13px;">Barber Portal</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 40px;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">Hey ${firstName} 👋</h2>
            <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
              You've been added to <strong style="color: #111827;">${shop}</strong>'s RankVibe dashboard.
              You can now view your reviews, ratings, and QR code stats — all in one place.
            </p>

            <!-- CTA Button -->
            <a href="${inviteUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Sign In with Google →
            </a>

            <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; line-height: 1.6;">
              Just click the button and sign in with the Google account your manager registered for you.<br>
              No password needed.
            </p>

            <!-- Link fallback -->
            <div style="margin-top: 24px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">Or copy this link:</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #4f46e5; font-family: monospace; word-break: break-all;">${inviteUrl}</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 40px; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0; font-size: 12px; color: #d1d5db; text-align: center;">
              Powered by RankVibe · If you weren't expecting this, you can ignore it.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('[invite] Resend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
