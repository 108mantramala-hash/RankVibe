'use client';

import { useState } from 'react';

interface Business {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  is_customer: boolean;
  owner_email?: string | null;
}

// ── Activate Modal ──────────────────────────────────────────
function ActivateModal({
  business,
  onClose,
}: {
  business: Business;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tempPassword: string;
    ownerEmail: string;
  } | null>(null);
  const [error, setError] = useState('');

  async function handleActivate() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, ownerEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Activation failed');
      setResult({ tempPassword: data.tempPassword, ownerEmail: data.ownerEmail });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1">Activate Business</h2>
          <p className="text-sm text-[var(--muted)] mb-5">{business.name}</p>

          {!result ? (
            <>
              <label className="block text-sm font-medium mb-1">Owner Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleActivate}
                  disabled={loading || !email.trim()}
                  className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 transition-colors"
                >
                  {loading ? 'Creating account…' : 'Activate & Create Account'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--background)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
                <p className="text-green-800 font-semibold text-sm mb-2">Account created!</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Email:</span>
                    <span className="font-mono font-medium">{result.ownerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Temp Password:</span>
                    <span className="font-mono font-bold text-brand-700">{result.tempPassword}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)] mb-4">
                Send these credentials to the owner. They should change their password after first login.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${result.ownerEmail}\nPassword: ${result.tempPassword}`
                  );
                }}
                className="w-full mb-2 rounded-lg border border-[var(--border)] text-sm py-2 hover:bg-[var(--background)] transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => { onClose(); window.location.reload(); }}
                className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ──────────────────────────────────────────────
function EditModal({
  business,
  onClose,
}: {
  business: Business;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: business.name,
    phone: business.phone ?? '',
    website: business.website ?? '',
    address: business.address,
    city: business.city,
    state: business.state,
    zip: business.zip,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/business/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      setSaved(true);
      setTimeout(() => { onClose(); window.location.reload(); }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; type?: string }[] = [
    { key: 'name', label: 'Business Name' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zip', label: 'ZIP' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1">Edit Business</h2>
          <p className="text-sm text-[var(--muted)] mb-5">{business.name}</p>

          <div className="space-y-3 mb-5">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</label>
                <input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {saved && <p className="text-green-600 text-sm mb-3">Saved!</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading || saved}
              className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 transition-colors"
            >
              {loading ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Business Row Actions ────────────────────────────────────
export function BusinessRowActions({ business }: { business: Business }) {
  const [modal, setModal] = useState<'activate' | 'edit' | null>(null);

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setModal('edit')}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
        >
          Edit
        </button>
        {!business.is_customer && (
          <button
            onClick={() => setModal('activate')}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
          >
            Activate
          </button>
        )}
      </div>

      {modal === 'activate' && (
        <ActivateModal business={business} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && (
        <EditModal business={business} onClose={() => setModal(null)} />
      )}
    </>
  );
}
