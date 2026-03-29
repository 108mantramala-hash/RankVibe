export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-6 hidden md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">
            Rank<span className="text-brand-500">Vibe</span>
          </h2>
        </div>
        <nav className="space-y-2">
          {[
            { label: 'Overview', href: '/dashboard' },
            { label: 'Reviews', href: '/dashboard/reviews' },
            { label: 'Competitors', href: '/dashboard/competitors' },
            { label: 'Insights', href: '/dashboard/insights' },
            { label: 'QR Codes', href: '/dashboard/qr' },
            { label: 'Feedback', href: '/dashboard/feedback' },
            { label: 'Settings', href: '/dashboard/settings' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
