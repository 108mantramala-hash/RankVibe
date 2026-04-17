'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const errorMessages: Record<string, string> = {
  no_account: 'No barber account found for that Google email. Contact your shop manager.',
  auth_failed: 'Sign-in failed. Please try again.',
  no_code: 'Sign-in was cancelled. Please try again.',
};

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function BarberLoginForm() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error') ?? '';
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Rank<span className="text-brand-500">Vibe</span>
          </h1>
          <p className="text-sm text-[var(--muted)] mt-2">Barber Portal</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="font-semibold text-lg">Welcome</h2>
            <p className="text-sm text-[var(--muted)]">
              Sign in with the Google account your shop manager registered for you.
            </p>
          </div>

          {errorKey && errorMessages[errorKey] && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
              {errorMessages[errorKey]}
            </p>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] py-3 text-sm font-medium hover:bg-[var(--card)] transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          Powered by <span className="font-semibold">RankVibe</span>
        </p>
      </div>
    </main>
  );
}

export default function BarberLoginPage() {
  return (
    <Suspense>
      <BarberLoginForm />
    </Suspense>
  );
}
