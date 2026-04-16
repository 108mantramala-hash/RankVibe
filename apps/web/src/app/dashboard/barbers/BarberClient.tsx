'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────

type BarberStatus = 'active' | 'inactive' | 'on_leave';
type EmploymentType = 'employee' | 'booth_renter' | 'contractor';

interface Barber {
  id: string;
  business_id: string;
  name: string;
  title: string;
  phone: string | null;
  email: string | null;
  employment_type: EmploymentType;
  status: BarberStatus;
  specialties: string[] | null;
  bio: string | null;
  color: string | null;
  experience_years: number | null;
}

interface BarberFormData {
  name: string;
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

// ── Barber Card ──────────────────────────────────────────

function BarberCard({
  barber,
  reviewCount,
  avgRating,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  barber: Barber;
  reviewCount: number;
  avgRating: number | null;
  onEdit: (b: Barber) => void;
  onStatusChange: (id: string, status: BarberStatus) => void;
  onDelete: (id: string, name: string) => void;
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
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: barber.color ?? '#6366f1' }}
        >
          {initials}
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

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to save barber');
      setSaving(false);
      return;
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

            {/* Name + Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Marcus Johnson"
                  className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-brand-500"
                />
              </div>
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
  barberStats,
}: {
  initialBarbers: Barber[];
  businessId: string;
  barberStats: Record<string, { reviewCount: number; avgRating: number | null }>;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

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
                onEdit={openEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
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
                onEdit={openEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
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
    </>
  );
}
