import { createServerClient } from '@/lib/supabase-server';
import AiRepliesClient from './AiRepliesClient';

export const revalidate = 0;

async function getData() {
  const supabase = createServerClient();

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('is_customer', true)
    .limit(1);

  const business = businesses?.[0] ?? null;
  if (!business) return { business: null, reviews: [], settings: null };

  const [{ data: reviews }, { data: settings }] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
        id, author_name, rating, text, sentiment, published_at, summary,
        ai_replies ( id, suggested_reply, tone, is_approved, is_posted, approved_at )
      `)
      .eq('business_id', business.id)
      .not('text', 'is', null)
      .order('published_at', { ascending: false })
      .limit(60),
    supabase
      .from('ai_settings')
      .select('default_tone, shop_signature')
      .eq('business_id', business.id)
      .maybeSingle(),
  ]);

  return {
    business,
    reviews: reviews ?? [],
    settings,
  };
}

export default async function AiRepliesPage() {
  const { business, reviews, settings } = await getData();

  if (!business) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI Replies</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-sm text-[var(--muted)]">No customer business configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] border border-[var(--border)] rounded px-3 py-1.5 inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {business.name}
      </div>

      <AiRepliesClient
        reviews={reviews}
        defaultTone={(settings?.default_tone as 'professional' | 'friendly' | 'empathetic' | 'warm' | 'playful') ?? 'professional'}
        shopSignature={settings?.shop_signature ?? ''}
      />
    </div>
  );
}
