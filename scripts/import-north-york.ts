/**
 * Import North York barbershop data from Apify Google Places scrape
 * Run: tsx scripts/import-north-york.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials from apps/web/.env.local
const envVars: Record<string, string> = {};
try {
  fs.readFileSync(path.join(process.cwd(), 'apps/web/.env.local'), 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [k, ...v] = line.split('=');
      if (k && v.length) envVars[k.trim()] = v.join('=').trim();
    });
} catch { /* fall back to process.env */ }

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Accept file path as CLI arg or fall back to default
// Usage: tsx scripts/import-north-york.ts /path/to/dataset.json
const DATA_FILE =
  process.argv[2] ??
  path.join(
    process.env.HOME!,
    'Downloads',
    'dataset_crawler-google-places-task-1_2026-04-12_02-10-55-153.json'
  );

if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ File not found: ${DATA_FILE}`);
  console.error('Usage: tsx scripts/import-north-york.ts /path/to/dataset.json');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ApifyReview {
  reviewId: string;
  name: string;
  stars: number;
  text: string | null;
  textTranslated: string | null;
  publishedAtDate: string | null;
  [key: string]: unknown;
}

interface ApifyPlace {
  title: string;
  placeId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  location: { lat: number; lng: number };
  phone: string | null;
  website: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  reviews: ApifyReview[];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n========================================');
  console.log('📦 NORTH YORK DATA IMPORT');
  console.log('========================================\n');

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const places: ApifyPlace[] = JSON.parse(raw);

  console.log(`📍 Total places in file: ${places.length}`);

  const active = places.filter((p) => !p.permanentlyClosed);
  console.log(`✅ Active businesses: ${active.length}`);
  console.log(`🚫 Skipping permanently closed: ${places.length - active.length}\n`);

  let bizCreated = 0;
  let bizUpdated = 0;
  let reviewsInserted = 0;
  let reviewsSkipped = 0;
  let reviewsFailed = 0;

  for (let i = 0; i < active.length; i++) {
    const place = active[i];
    console.log(`[${i + 1}/${active.length}] Processing: ${place.title}`);

    const bizPayload = {
      name: place.title,
      google_place_id: place.placeId,
      address: place.address,
      city: place.city || 'North York',
      state: place.state || 'Ontario',
      zip: place.postalCode || '',
      latitude: place.location?.lat ?? 0,
      longitude: place.location?.lng ?? 0,
      phone: place.phone || null,
      website: place.website || null,
      google_rating: place.totalScore || null,
      google_review_count: place.reviewsCount || null,
      category: 'barbershop',
      is_tracked: false,
      is_customer: false,
    };

    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('google_place_id', place.placeId)
      .maybeSingle();

    let businessId: string;

    if (existingBiz) {
      await supabase
        .from('businesses')
        .update({ ...bizPayload, updated_at: new Date().toISOString() })
        .eq('id', existingBiz.id);
      businessId = existingBiz.id;
      bizUpdated++;
      console.log(`  📝 Updated`);
    } else {
      const { data: newBiz, error } = await supabase
        .from('businesses')
        .insert(bizPayload)
        .select('id')
        .single();

      if (error || !newBiz) {
        console.error(`  ❌ Failed to insert business:`, error?.message);
        continue;
      }
      businessId = newBiz.id;
      bizCreated++;
      console.log(`  ✨ Created`);
    }

    const reviews = place.reviews || [];
    console.log(`  💬 Reviews to import: ${reviews.length}`);

    for (const review of reviews) {
      if (!review.reviewId) {
        reviewsFailed++;
        continue;
      }

      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('google_review_id', review.reviewId)
        .maybeSingle();

      if (existing) {
        reviewsSkipped++;
        continue;
      }

      const reviewText = review.text || review.textTranslated || null;

      let publishedAt: string | null = null;
      if (review.publishedAtDate) {
        const d = new Date(review.publishedAtDate);
        if (!isNaN(d.getTime())) publishedAt = d.toISOString();
      }

      const { error } = await supabase.from('reviews').insert({
        business_id: businessId,
        google_review_id: review.reviewId,
        author_name: review.name || 'Anonymous',
        rating: review.stars || 0,
        text: reviewText,
        published_at: publishedAt,
        raw_data: review,
      });

      if (error) {
        console.error(`    ❌ Review insert failed:`, error.message);
        reviewsFailed++;
      } else {
        reviewsInserted++;
      }
    }

    if ((i + 1) % 10 === 0) {
      console.log('\n  ⏳ Pausing 1s...\n');
      await sleep(1000);
    }
  }

  console.log('\n========================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('========================================');
  console.log(`✨ Businesses created : ${bizCreated}`);
  console.log(`📝 Businesses updated : ${bizUpdated}`);
  console.log(`📄 Reviews inserted  : ${reviewsInserted}`);
  console.log(`⏭️  Reviews skipped   : ${reviewsSkipped}`);
  console.log(`❌ Reviews failed    : ${reviewsFailed}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
