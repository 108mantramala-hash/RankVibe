'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { label: 'Platform Overview', href: '/admin' },
  { label: 'Businesses', href: '/admin/businesses' },
  { label: 'Subscriptions', href: '/admin/subscriptions' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-6 hidden md:flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-bold">
            Rank<span className="text-brand-500">Vibe</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">Super Admin</p>
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
            Platform View
          </span>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-[var(--border)] mt-4 space-y-1">
          <Link
            href="/dashboard"
            className="block rounded-md px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--background)] transition-colors"
          >
            ← Owner Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
