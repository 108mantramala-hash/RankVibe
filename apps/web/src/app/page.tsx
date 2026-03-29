export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Rank<span className="text-brand-500">Vibe</span>
        </h1>
        <p className="text-lg text-[var(--muted)]">
          AI-powered reputation growth for local businesses. Get more reviews, capture feedback, and
          outperform your competitors.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Go to Dashboard
          </a>
          <a
            href="/review/demo"
            className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-semibold hover:bg-[var(--card)] transition-colors"
          >
            Try Review Flow
          </a>
        </div>
      </div>
    </main>
  );
}
