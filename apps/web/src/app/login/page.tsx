'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError('');
    const supabase = createSupabaseBrowser();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
    // On success, browser is redirected by Supabase — no further action needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    // Fetch role to decide where to redirect
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Login failed. Please try again.');
      setLoading(false);
      return;
    }

    // Role-based redirect
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (data.role === 'super_admin') {
      router.push(next.startsWith('/admin') ? next : '/admin');
    } else {
      router.push(next.startsWith('/dashboard') ? next : '/dashboard');
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Rank<span className="text-brand-500">Vibe</span>
          </h1>
          <p className="text-sm text-[var(--muted)] mt-2">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-5">
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block font-medium">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-[var(--border)]" />
            <span className="text-xs text-[var(--muted)]">or</span>
            <div className="flex-1 border-t border-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] py-3 text-sm font-medium hover:bg-[var(--card)] transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--muted)]">
          Barbers: use <span className="font-medium">Continue with Google</span> to sign in
        </p>

        <p className="text-center text-xs text-[var(--muted)]">
          Powered by <span className="font-semibold">RankVibe</span>
        </p>

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
