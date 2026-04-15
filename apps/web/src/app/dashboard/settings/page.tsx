'use client';

import { useState, useEffect } from 'react';

type Tone = 'professional' | 'friendly' | 'empathetic' | 'warm' | 'playful';

interface AiSettings {
  business_id: string;
  default_tone: Tone;
  auto_draft: boolean;
  include_emoji: boolean;
  shop_signature: string;
}

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Polished, business-appropriate replies' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm and conversational' },
  { value: 'empathetic',   label: 'Empathetic',   desc: 'Caring, acknowledges feelings' },
  { value: 'warm',         label: 'Warm',         desc: 'Genuine and heartfelt' },
  { value: 'playful',      label: 'Playful',      desc: 'Upbeat with personality' },
];

const BUSINESS_ID = '80f21118-b561-45a0-9388-3e91bfa3f459';

function GoogleConnectSection({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/google-connection?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setStatus('connected');
          setLocationName(data.locationName ?? null);
        } else {
          setStatus('disconnected');
        }
      })
      .catch(() => setStatus('disconnected'));
  }, [businessId]);

  // Check for redirect result from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === '1') {
      setStatus('connected');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function handleConnect() {
    window.location.href = `/api/auth/google?businessId=${businessId}`;
  }

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse">
        <div className="h-4 bg-[var(--border)] rounded w-48" />
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <p className="text-sm font-semibold text-green-800">Google Business Profile connected</p>
          </div>
          {locationName && (
            <p className="text-xs text-green-700 mt-1 ml-4">{locationName}</p>
          )}
        </div>
        <button
          onClick={handleConnect}
          className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-colors"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Not connected</p>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Connect to enable one-click reply posting to Google
        </p>
      </div>
      <button
        onClick={handleConnect}
        className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors shrink-0"
      >
        Connect Google
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>({
    business_id: BUSINESS_ID,
    default_tone: 'professional',
    auto_draft: true,
    include_emoji: false,
    shop_signature: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings?businessId=${BUSINESS_ID}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            business_id: BUSINESS_ID,
            default_tone: data.settings.default_tone ?? 'professional',
            auto_draft: data.settings.auto_draft ?? true,
            include_emoji: data.settings.include_emoji ?? false,
            shop_signature: data.settings.shop_signature ?? '',
          });
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function set<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="text-sm text-[var(--muted)] animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--muted)] mt-1">Outkasts Barbershop</p>
      </div>

      {/* Business Info */}
      <section>
        <h2 className="text-base font-semibold mb-4">Business Info</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {[
            { label: 'Business Name', value: 'Outkasts Barbershop' },
            { label: 'Address', value: 'Back of building, 6004 Yonge St, North York, ON M2M 3V7' },
            { label: 'Google Rating', value: '4.9 ⭐ (545 reviews)' },
            { label: 'Category', value: 'Barbershop' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-[var(--muted)]">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* AI Settings */}
      <section>
        <h2 className="text-base font-semibold mb-1">AI Reply Settings</h2>
        <p className="text-xs text-[var(--muted)] mb-4">Controls how AI generates reply suggestions for your reviews.</p>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">

          {/* Default Tone */}
          <div className="p-5">
            <label className="text-sm font-medium block mb-3">Default Tone</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set('default_tone', t.value)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    settings.default_tone === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-[var(--border)] hover:bg-[var(--background)]'
                  }`}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-draft toggle */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">Auto-draft replies</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Automatically generate a draft reply when a new review arrives</p>
            </div>
            <button
              onClick={() => set('auto_draft', !settings.auto_draft)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.auto_draft ? 'bg-brand-500' : 'bg-[var(--border)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.auto_draft ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Include emoji toggle */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">Include emoji in replies</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Add relevant emoji to make replies feel more personal</p>
            </div>
            <button
              onClick={() => set('include_emoji', !settings.include_emoji)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.include_emoji ? 'bg-brand-500' : 'bg-[var(--border)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.include_emoji ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Shop Signature */}
          <div className="px-5 py-4">
            <label className="text-sm font-medium block mb-1">Shop Signature</label>
            <p className="text-xs text-[var(--muted)] mb-3">Appended to the end of every AI reply (optional)</p>
            <input
              type="text"
              value={settings.shop_signature}
              onChange={(e) => set('shop_signature', e.target.value)}
              placeholder="— The team at Outkasts Barbershop"
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </section>

      {/* Google Business Profile */}
      <section>
        <h2 className="text-base font-semibold mb-1">Google Business Profile</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Connect your Google account to post review replies directly from RankVibe.
        </p>
        <GoogleConnectSection businessId={BUSINESS_ID} />
      </section>

      {/* Notification Settings */}
      <section>
        <h2 className="text-base font-semibold mb-1">Notifications</h2>
        <p className="text-xs text-[var(--muted)] mb-4">Coming soon — requires account setup.</p>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] opacity-50 pointer-events-none">
          {[
            { label: 'New review alert',     desc: 'Get notified when a new Google review arrives' },
            { label: 'Negative review alert', desc: 'Immediate alert for 1–3 star reviews' },
            { label: 'Weekly report',         desc: 'Sunday summary of the week\'s activity' },
            { label: 'Competitor alert',      desc: 'When a nearby competitor gets a surge in reviews' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{item.desc}</p>
              </div>
              <div className="relative w-11 h-6 rounded-full bg-[var(--border)] flex-shrink-0">
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
