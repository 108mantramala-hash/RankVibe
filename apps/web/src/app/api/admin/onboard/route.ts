/**
 * POST /api/admin/onboard
 * Sends a branded welcome email to a shop owner with their temp password.
 * tempPassword is passed from the activate flow — no reset link needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { businessId, ownerEmail, businessName, tempPassword } = await req.json();

  if (!businessId || !ownerEmail || !businessName) {
    return NextResponse.json({ error: 'businessId, ownerEmail, and businessName required' }, { status: 400 });
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://rankvibe.org'}/login`;
  const from = process.env.RESEND_FROM ?? 'noreply@rankvibe.org';

  const { error: emailError } = await resend.emails.send({
    from,
    to: ownerEmail,
    subject: `Welcome to RankVibe — ${businessName} is ready`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">

          <!-- Header -->
          <div style="background: #4f46e5; padding: 32px 40px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
              Rank<span style="color: #a5b4fc;">Vibe</span>
            </h1>
            <p style="color: #c7d2fe; margin: 6px 0 0; font-size: 13px;">Reputation Intelligence for ${businessName}</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 40px;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">Welcome aboard! 👋</h2>
            <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
              Your RankVibe dashboard for <strong style="color: #111827;">${businessName}</strong> is ready.
              Sign in with the credentials below, then change your password from Settings.
            </p>

            <!-- Credentials box -->
            <div style="background: #f3f4f6; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #374151;">Your login details:</p>
              <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280;">
                <strong style="color: #111827;">Email:</strong> ${ownerEmail}
              </p>
              ${tempPassword ? `
              <p style="margin: 0; font-size: 13px; color: #6b7280;">
                <strong style="color: #111827;">Temp Password:</strong>
                <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #4f46e5; letter-spacing: 1px;">${tempPassword}</span>
              </p>
              ` : ''}
            </div>

            <!-- CTA -->
            <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Sign In to Dashboard →
            </a>

            <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 16px; line-height: 1.6;">
              After signing in, go to <strong>Settings</strong> to change your password.
            </p>

            <!-- What's inside -->
            <div style="border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-top: 8px;">
              <div style="padding: 14px 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #374151;">What's waiting for you:</p>
              </div>
              <div style="padding: 16px 20px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">📊 <strong>Overview</strong> — ratings, sentiment trends, and competitor rank</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">⭐ <strong>Reviews</strong> — all your Google reviews in one place</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">✂️ <strong>Barbers</strong> — per-barber performance and QR codes</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">📱 <strong>QR Codes</strong> — generate review links for your team</p>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">🤖 <strong>AI Replies</strong> — auto-drafted responses to your reviews</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 40px; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0; font-size: 12px; color: #d1d5db; text-align: center;">
              Powered by RankVibe · Questions? Reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (emailError) {
    console.error('[onboard] Resend error:', emailError);
    return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
