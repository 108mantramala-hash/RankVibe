'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

// ── Types ────────────────────────────────────────────────

type BarberStatus = 'active' | 'inactive' | 'on_leave';
type EmploymentType = 'employee' | 'booth_renter' | 'contractor';

interface Barber {
  id: string;
  business_id: string;
  name: string;
  known_as: string | null; // Short name / nickname for QR badge
  title: string;
  phone: string | null;
  email: string | null;
  employment_type: EmploymentType;
  status: BarberStatus;
  specialties: string[] | null;
  bio: string | null;
  color: string | null;
  avatar_url: string | null;
  experience_years: number | null;
}

interface BarberFormData {
  name: string;
  known_as: string;
  title: string;
  phone: string;
  email: string;
  employment_type: EmploymentType;
  status: BarberStatus;
  specialties: string;
  bio: string;
  color: string;
  experience_years: string;
}

interface QrLink {
  id: string;
  slug: string;
  name: string | null;
  scanCount: number;
  googleReviewUrl: string;
}

// ── Constants ────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#a16207',
];

const STATUS_LABELS: Record<BarberStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

const STATUS_STYLES: Record<BarberStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-600',
  on_leave: 'bg-amber-100 text-amber-700',
};

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  employee: 'Employee',
  booth_renter: 'Booth Renter',
  contractor: 'Contractor',
};

const EMPTY_FORM: BarberFormData = {
  name: '',
  known_as: '',
  title: 'Barber',
  phone: '',
  email: '',
  employment_type: 'employee',
  status: 'active',
  specialties: '',
  bio: '',
  color: PRESET_COLORS[0],
  experience_years: '',
};

// ── Invite Modal ─────────────────────────────────────────

function InviteModal({
  barber,
  shopName,
  onClose,
}: {
  barber: Barber;
  shopName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/barber/login`
    : 'https://rankvibe.org/barber/login';

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    setSending(true);
    setSendError('');
    const res = await fetch('/api/barbers/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberName: barber.name,
        barberEmail: barber.email,
        shopName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSendError(data.error ?? 'Failed to send email');
    } else {
      setSent(true);
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Invite {barber.known_as || barber.name.split(' ')[0]}</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg">✕</button>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Send <span className="font-medium text-[var(--foreground)]">{barber.name}</span> their login link via email.
          </p>

          {/* Link box */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <span className="flex-1 text-xs font-mono text-[var(--muted)] truncate">{inviteUrl}</span>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors flex-shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Send email */}
          {barber.email && (
            sent ? (
              <div className="flex items-center justify-center gap-2 w-full text-sm py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium">
                ✓ Invite sent to {barber.email}
              </div>
            ) : (
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex items-center justify-center gap-2 w-full text-sm py-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {sending ? 'Sending…' : `✉️ Send invite to ${barber.email}`}
              </button>
            )
          )}

          {sendError && (
            <p className="text-xs text-red-500 text-center">{sendError}</p>
          )}

          <p className="text-xs text-[var(--muted)] text-center">
            They sign in with Google — no password needed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── QR Modal ────────────────────────────────────────────

function BarberQrModal({
  barber,
  existingQr,
  businessId,
  shopGoogleUrl,
  onClose,
  onCreated,
}: {
  barber: Barber;
  existingQr: QrLink | null;
  businessId: string;
  shopGoogleUrl: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<QrLink | null>(existingQr);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function handleGenerate() {
    setCreating(true);
    const res = await fetch('/api/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        barber_id: barber.id,
        name: `${barber.name} – QR`,
        placement: 'mirror',
        google_review_url: shopGoogleUrl,
      }),
    });
    const data = await res.json();
    if (data.link) {
      setQr({ id: data.link.id, slug: data.link.slug, name: data.link.name, scanCount: 0, googleReviewUrl: data.link.google_review_url });
      onCreated();
    }
    setCreating(false);
  }

  const qrUrl = qr ? `${baseUrl}/review/${qr.slug}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{barber.name} — QR Code</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg">✕</button>
          </div>

          {qr ? (
            <div className="flex flex-col items-center gap-4">
              {/* QR with barber badge overlaid in center */}
              <div className="p-3 bg-white rounded-xl border border-[var(--border)] relative inline-block">
                <QRCodeSVG value={qrUrl} size={180} marginSize={1} level="H" />
                {/* Barber name badge — sits over the QR center, covered by error correction */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div
                    className="rounded-lg px-2 py-1 flex flex-col items-center shadow-sm border-2 border-white"
                    style={{ backgroundColor: barber.color ?? '#6366f1', maxWidth: 64 }}
                  >
                    <span className="text-white font-bold leading-tight text-center" style={{ fontSize: 10 }}>
                      {barber.known_as || barber.name.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{qr.name ?? barber.name}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">/review/{qr.slug}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{qr.scanCount} scans</p>
              </div>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                Preview review page →
              </a>
              <button
                onClick={onClose}
                className="w-full text-sm py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-8 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)]">
                <p className="text-3xl mb-2">📱</p>
                <p className="text-sm">No QR code yet for {barber.name}</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={creating}
                className="w-full text-sm py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {creating ? 'Generating…' : 'Generate QR Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Barber Card ──────────────────────────────────────────

function BarberCard({
  barber,
  reviewCount,
  avgRating,
  qr,
  onEdit,
  onStatusChange,
  onDelete,
  onQr,
  onInvite,
}: {
  barber: Barber;
  reviewCount: number;
  avgRating: number | null;
  qr: QrLink | null;
  onEdit: (b: Barber) => void;
  onStatusChange: (id: string, status: BarberStatus) => void;
  onDelete: (id: string, name: string) => void;
  onQr: (b: Barber) => void;
  onInvite: (b: Barber) => void;
}) {
  const initials = barber.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: barber.color ?? '#6366f1' }}
        >
          {barber.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{barber.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[barber.status]}`}>
              {STATUS_LABELS[barber.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">{barber.title}</p>
          <p className="text-xs text-[var(--muted)]">{EMPLOYMENT_LABELS[barber.employment_type]}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--background)] p-2">
          <p className="text-lg font-bold">{reviewCount}</p>
          <p className="text-xs text-[var(--muted)]">Reviews</p>
        </div>
        <div className="rounded-lg bg-[var(--background)] p-2">
          <p className="text-lg font-bold">{avgRating != null ? avgRating.toFixed(1) : '—'}</p>
          <p className="text-xs text-[var(--muted)]">Avg ⭐</p>
        </div>
        <div className="rounded-lg bg-[var(--background)] p-2">
          <p className="text-lg font-bold">{barber.experience_years ?? '—'}</p>
          <p className="text-xs text-[var(--muted)]">Yrs exp</p>
        </div>
      </div>

      {/* Specialties */}
      {barber.specialties && barber.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {barber.specialties.map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Contact */}
      {(barber.phone || barber.email) && (
        <div className="text-xs text-[var(--muted)] space-y-0.5">
          {barber.phone && <p>{barber.phone}</p>}
          {barber.email && <p>{barber.email}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
        <button
          onClick={() => onQr(barber)}
          className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${qr ? 'border-brand-300 text-brand-600 bg-brand-50 hover:bg-brand-100' : 'border-[var(--border)] hover:bg-[var(--background)]'}`}
          title={qr ? `QR · ${qr.scanCount} scans` : 'Generate QR'}
        >
          QR{qr ? ' ✓' : ''}
        </button>
        {barber.email && (
          <button
            onClick={() => onInvite(barber)}
            className="text-xs py-1.5 px-2 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            title="Send invite link"
          >
            ✉️
          </button>
        )}
        <button
          onClick={() => onEdit(barber)}
          className="flex-1 text-xs py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
        >
          Edit
        </button>
        <select
          value={barber.status}
          onChange={(e) => onStatusChange(barber.id, e.target.value as BarberStatus)}
          className="flex-1 text-xs py-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] cursor-pointer"
        >
          <option value="active">Set Active</option>
          <option value="inactive">Set Inactive</option>
          <option value="on_leave">Set On Leave</option>
        </select>
        <button
          onClick={() => onDelete(barber.id, barber.name)}
          className="text-xs py-1.5 px-3 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────

function BarberModal({
  businessId,
  editingBarber,
  onClose,
  onSaved,
}: {
  businessId: string;
  editingBarber: Barber | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BarberFormData>(
    editingBarber
      ? {
          name: editingBarber.name,
          known_as: editingBarber.known_as ?? '',
          title: editingBarber.title,
          phone: editingBarber.phone ?? '',
          email: editingBarber.email ?? '',
          employment_type: editingBarber.employment_type,
          status: editingBarber.status,
          specialties: (editingBarber.specialties ?? []).join(', '),
          bio: editingBarber.bio ?? '',
          color: editingBarber.color ?? PRESET_COLORS[0],
          experience_years: editingBarber.experience_years?.toString() ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(editingBarber?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function set(field: keyof BarberFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      known_as: form.known_as.trim() || null,
      title: form.title.trim() || 'Barber',
      phone: form.phone.trim(),
      email: form.email.trim(),
      employment_type: form.employment_type,
      status: form.status,
      specialties: form.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      bio: form.bio.trim(),
      color: form.color,
      experience_years: form.experience_years ? parseInt(form.experience_years) : null,
    };

    const url = editingBarber ? `/api/barbers/${editingBarber.id}` : '/api/barbers';
    const method = editingBarber ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const resData = await res.json();

    if (!res.ok) {
      setError(resData.error ?? 'Failed to save barber');
      setSaving(false);
      return;
    }

    // Upload avatar if a new file was selected
    if (avatarFile) {
      const barberId = resData.barber?.id ?? editingBarber?.id;
      if (barberId) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        fd.append('barberId', barberId);
        await fetch('/api/barbers/avatar', { method: 'POST', body: fd });
      }
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold">
              {editingBarber ? 'Edit Barber' : 'Add Barber'}
            </h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg leading-none">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar photo picker */}
            <div className="flex items-center gap-4">
              <label className="cursor-pointer group" title="Click to upload photo">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg border-2 border-dashed border-[var(--border)] group-hover:border-brand-400 transition-colors relative"
                  style={{ backgroundColor: form.color }}
                >
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm opacity-80">
                      {form.name ? form.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '📷'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <span className="text-white text-xs">Edit</span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              <div className="text-xs text-[var(--muted)]">
                <p className="font-medium">Profile Photo</p>
                <p>JPEG, PNG or WebP · max 5MB</p>
                <p className="mt-1">Click avatar to upload</p>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs text-[var(--muted)] mb-2 block">Profile Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? 'var(--foreground)' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Name + Known As */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Marcus Johnson"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">
                  Known As <span className="font-normal text-[var(--muted)]">(QR badge)</span>
                </label>
                <input
                  value={form.known_as}
                  onChange={(e) => set('known_as', e.target.value)}
                  placeholder="Marc, MJ…"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Senior Barber"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+1 416 000 0000"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="marcus@shop.com"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Employment + Status + Experience */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Employment</label>
                <select
                  value={form.employment_type}
                  onChange={(e) => set('employment_type', e.target.value as EmploymentType)}
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                >
                  <option value="employee">Employee</option>
                  <option value="booth_renter">Booth Renter</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as BarberStatus)}
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Years Exp.</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={form.experience_years}
                  onChange={(e) => set('experience_years', e.target.value)}
                  placeholder="5"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">
                Specialties <span className="font-normal">(comma-separated)</span>
              </label>
              <input
                value={form.specialties}
                onChange={(e) => set('specialties', e.target.value)}
                placeholder="fades, beard trims, line-ups"
                className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="Short bio or intro..."
                rows={2}
                className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-sm py-2 rounded-md border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-sm py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingBarber ? 'Save Changes' : 'Add Barber'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ────────────────────────────────

export default function BarberClient({
  initialBarbers,
  businessId,
  shopName,
  barberStats,
  qrByBarber,
  shopGoogleUrl,
}: {
  initialBarbers: Barber[];
  businessId: string;
  shopName: string;
  barberStats: Record<string, { reviewCount: number; avgRating: number | null }>;
  qrByBarber: Record<string, QrLink>;
  shopGoogleUrl: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [qrBarber, setQrBarber] = useState<Barber | null>(null);
  const [inviteBarber, setInviteBarber] = useState<Barber | null>(null);

  function refresh() {
    router.refresh();
  }

  function openAdd() {
    setEditingBarber(null);
    setShowModal(true);
  }

  function openEdit(barber: Barber) {
    setEditingBarber(barber);
    setShowModal(true);
  }

  async function handleStatusChange(id: string, status: BarberStatus) {
    await fetch(`/api/barbers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return;
    await fetch(`/api/barbers/${id}`, { method: 'DELETE' });
    refresh();
  }

  const active = initialBarbers.filter((b) => b.status === 'active');
  const inactive = initialBarbers.filter((b) => b.status !== 'active');

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barbers</h1>
          <p className="text-[var(--muted)] mt-1">
            {initialBarbers.length} team member{initialBarbers.length !== 1 ? 's' : ''} ·{' '}
            {active.length} active
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          + Add Barber
        </button>
      </div>

      {/* Empty state */}
      {initialBarbers.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-3xl mb-3">✂️</p>
          <h3 className="font-semibold mb-1">No barbers yet</h3>
          <p className="text-sm text-[var(--muted)] mb-4 max-w-sm mx-auto">
            Add your team so you can track per-barber reviews, generate individual QR codes, and give each barber access to their mobile app.
          </p>
          <button
            onClick={openAdd}
            className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Add First Barber
          </button>
        </div>
      )}

      {/* Active barbers */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Active Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {active.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                reviewCount={barberStats[barber.id]?.reviewCount ?? 0}
                avgRating={barberStats[barber.id]?.avgRating ?? null}
                qr={qrByBarber[barber.id] ?? null}
                onEdit={openEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onQr={setQrBarber}
                onInvite={setInviteBarber}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive / on leave */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Inactive / On Leave</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inactive.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                reviewCount={barberStats[barber.id]?.reviewCount ?? 0}
                avgRating={barberStats[barber.id]?.avgRating ?? null}
                qr={qrByBarber[barber.id] ?? null}
                onEdit={openEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onQr={setQrBarber}
                onInvite={setInviteBarber}
              />
            ))}
          </div>
        </div>
      )}

      {/* Barber edit/add modal */}
      {showModal && (
        <BarberModal
          businessId={businessId}
          editingBarber={editingBarber}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}

      {/* Invite modal */}
      {inviteBarber && (
        <InviteModal
          barber={inviteBarber}
          shopName={shopName}
          onClose={() => setInviteBarber(null)}
        />
      )}

      {/* QR modal */}
      {qrBarber && (
        <BarberQrModal
          barber={qrBarber}
          existingQr={qrByBarber[qrBarber.id] ?? null}
          businessId={businessId}
          shopGoogleUrl={shopGoogleUrl}
          onClose={() => setQrBarber(null)}
          onCreated={refresh}
        />
      )}
    </>
  );
}
