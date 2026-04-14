'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

type Placement = 'register' | 'mirror' | 'waiting_area' | 'other';

interface Barber {
  id: string;
  name: string;
  title: string;
  color: string | null;
}

interface ReviewLink {
  id: string;
  business_id: string;
  barber_id: string | null;
  slug: string;
  name: string | null;
  placement: Placement | null;
  google_review_url: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
}

const PLACEMENT_LABELS: Record<Placement, string> = {
  register: 'Register',
  mirror: 'Mirror',
  waiting_area: 'Waiting Area',
  other: 'Other',
};

const PLACEMENT_ICONS: Record<Placement, string> = {
  register: '🖥️',
  mirror: '🪞',
  waiting_area: '🪑',
  other: '📍',
};

// ── QR Card ──────────────────────────────────────────────

function QrCard({
  link,
  barbers,
  baseUrl,
  onToggle,
  onDelete,
}: {
  link: ReviewLink;
  barbers: Barber[];
  baseUrl: string;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const reviewUrl = `${baseUrl}/review/${link.slug}`;
  const barber = barbers.find((b) => b.id === link.barber_id);

  async function copyLink() {
    await navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    const svg = document.getElementById(`qr-${link.id}`);
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${link.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayName = link.name ?? (barber ? `${barber.name} QR` : 'Shop QR');

  return (
    <div className={`rounded-xl border bg-[var(--card)] p-5 flex flex-col gap-4 ${!link.is_active ? 'opacity-60' : 'border-[var(--border)]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{displayName}</p>
            {!link.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {barber && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: barber.color ?? '#6366f1' }}
              >
                {barber.name}
              </span>
            )}
            {!barber && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                Shop-wide
              </span>
            )}
            {link.placement && (
              <span className="text-xs text-[var(--muted)]">
                {PLACEMENT_ICONS[link.placement]} {PLACEMENT_LABELS[link.placement]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(link.id, !link.is_active)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              link.is_active
                ? 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)]'
                : 'border-brand-200 text-brand-600 hover:bg-brand-50'
            }`}
          >
            {link.is_active ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onDelete(link.id, displayName)}
            className="text-xs px-2 py-1 rounded border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center py-2">
        <div className="p-3 bg-white rounded-lg border border-[var(--border)] inline-block">
          <QRCodeSVG
            id={`qr-${link.id}`}
            value={reviewUrl}
            size={140}
            level="M"
            marginSize={0}
          />
        </div>
      </div>

      {/* Slug + scan count */}
      <div className="text-center">
        <p className="text-xs font-mono text-[var(--muted)]">/review/{link.slug}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {link.scan_count} scan{link.scan_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 text-xs py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
        <button
          onClick={downloadQr}
          className="flex-1 text-xs py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
}

// ── Add QR Modal ─────────────────────────────────────────

function AddQrModal({
  businessId,
  barbers,
  googleReviewUrl,
  onClose,
  onSaved,
}: {
  businessId: string;
  barbers: Barber[];
  googleReviewUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [barberId, setBarberId] = useState('');
  const [placement, setPlacement] = useState<Placement | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        barber_id: barberId || null,
        name: name.trim() || null,
        placement: placement || null,
        google_review_url: googleReviewUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to create QR code');
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold">New QR Code</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg leading-none">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Front Desk, Marcus – Chair 1"
                className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Assign to Barber <span className="font-normal">(optional — leave blank for shop-wide)</span></label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
              >
                <option value="">Shop-wide</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} — {b.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Placement <span className="font-normal">(optional)</span></label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as Placement | '')}
                className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
              >
                <option value="">— select —</option>
                <option value="register">🖥️ Register</option>
                <option value="mirror">🪞 Mirror</option>
                <option value="waiting_area">🪑 Waiting Area</option>
                <option value="other">📍 Other</option>
              </select>
            </div>

            <p className="text-xs text-[var(--muted)] bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 font-mono break-all">
              → {googleReviewUrl.slice(0, 60)}…
            </p>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 text-sm py-2 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 text-sm py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60">
                {saving ? 'Creating…' : 'Create QR Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────

export default function QrClient({
  initialLinks,
  barbers,
  businessId,
  googleReviewUrl,
  baseUrl,
}: {
  initialLinks: ReviewLink[];
  barbers: Barber[];
  businessId: string;
  googleReviewUrl: string;
  baseUrl: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    });
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/qr/${id}`, { method: 'DELETE' });
    refresh();
  }

  const shopLinks = initialLinks.filter((l) => !l.barber_id);
  const barberLinks = initialLinks.filter((l) => !!l.barber_id);
  const totalScans = initialLinks.reduce((s, l) => s + l.scan_count, 0);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Codes</h1>
          <p className="text-[var(--muted)] mt-1">
            {initialLinks.length} code{initialLinks.length !== 1 ? 's' : ''} · {totalScans} total scans
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          + New QR Code
        </button>
      </div>

      {/* Empty state */}
      {initialLinks.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-3xl mb-3">📱</p>
          <h3 className="font-semibold mb-1">No QR codes yet</h3>
          <p className="text-sm text-[var(--muted)] mb-4 max-w-sm mx-auto">
            Create QR codes for your shop or individual barbers. Customers scan them to leave a review — or get redirected to a private feedback form if they had a bad experience.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Create First QR Code
          </button>
        </div>
      )}

      {/* Shop-wide QR codes */}
      {shopLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Shop-wide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shopLinks.map((link) => (
              <QrCard
                key={link.id}
                link={link}
                barbers={barbers}
                baseUrl={baseUrl}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-barber QR codes */}
      {barberLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Per-Barber</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {barberLinks.map((link) => (
              <QrCard
                key={link.id}
                link={link}
                barbers={barbers}
                baseUrl={baseUrl}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <AddQrModal
          businessId={businessId}
          barbers={barbers}
          googleReviewUrl={googleReviewUrl}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
