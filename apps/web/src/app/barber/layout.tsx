'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { label: 'My Dashboard', href: '/barber' },
  { label: 'Appointments', href: '/barber/appointments' },
  { label: 'My Reviews', href: '/barber/reviews' },
  { label: 'My QR Code', href: '/barber/qr' },
];

function BarberSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-6 hidden md:flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold">
          Rank<span className="text-brand-500">Vibe</span>
        </h2>
        <p className="text-xs text-[var(--muted)] mt-1">Barber Portal</p>
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/barber'
              ? pathname === '/barber'
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
      <div className="pt-4 border-t border-[var(--border)] mt-4">
        <button
          onClick={handleLogout}
          className="w-full text-left rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <BarberSidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
