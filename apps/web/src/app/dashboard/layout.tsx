'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Reviews', href: '/dashboard/reviews' },
  { label: 'Competitors', href: '/dashboard/competitors' },
  { label: 'Insights', href: '/dashboard/insights' },
  { label: 'Barbers', href: '/dashboard/barbers' },
  { label: 'QR Codes', href: '/dashboard/qr' },
  { label: 'Feedback', href: '/dashboard/feedback' },
  { label: 'Settings', href: '/dashboard/settings' },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-6 hidden md:flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold">
          Rank<span className="text-brand-500">Vibe</span>
        </h2>
        <p className="text-xs text-[var(--muted)] mt-1">North York Intelligence</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
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
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
