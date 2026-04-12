/**
 * POST /api/snapshots
 * Takes a weekly snapshot of all business metrics.
 * Call this weekly via a cron job (Vercel Cron or external scheduler).
 * Protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Auth guard — must be called with secret header
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('📸 WEEKLY SNAPSHOT JOB');
  console.log('========================================\n');

  // 1. Fetch all businesses
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, name');

  if (bizError || !businesses) {
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }

  console.log(`📍 Processing ${businesses.length} businesses...\n`);

  // 2. Fetch all reviews once (more efficient than per-business queries)
  const { data: allReviews, error: reviewError } = await supabase
    .from('reviews')
    .select('business_id, rating, sentiment, themes, published_at');

  if (reviewError || !allReviews) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }

  // 3. Fetch the most recent snapshot per business (for velocity calculation)
  const { data: lastSnapshots } = await supabase
    .from('review_snapshots')
    .select('business_id, review_count, snapshot_date')
    .order('snapshot_date', { ascending: false });

  // Build a map of businessId → last snapshot
  const lastSnapshotMap: Record<string, { reviewCount: number; snapshotDate: string }> = {};
  for (const snap of lastSnapshots ?? []) {
    if (!lastSnapshotMap[snap.business_id]) {
      lastSnapshotMap[snap.business_id] = {
        reviewCount: snap.review_count,
        snapshotDate: snap.snapshot_date,
      };
    }
  }

  const snapshotDate = new Date().toISOString();
  let created = 0;
  let failed = 0;

  // 4. Compute metrics per business and insert snapshot
  for (const biz of businesses) {
    const bizReviews = allReviews.filter((r) => r.business_id === biz.id);

    if (bizReviews.length === 0) continue;

    const reviewCount = bizReviews.length;
    const avgRating =
      bizReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewCount;

    const positiveCount = bizReviews.filter((r) => r.sentiment === 'positive').length;
    const negativeCount = bizReviews.filter((r) => r.sentiment === 'negative').length;
    const neutralCount = bizReviews.filter((r) => r.sentiment === 'neutral').length;

    // Calculate velocity: new reviews since last snapshot
    const lastSnap = lastSnapshotMap[biz.id];
    const reviewVelocity = lastSnap ? reviewCount - lastSnap.reviewCount : 0;

    // Top themes for this business
    const themeCount: Record<string, number> = {};
    for (const r of bizReviews) {
      if (Array.isArray(r.themes)) {
        for (const t of r.themes as string[]) {
          themeCount[t] = (themeCount[t] ?? 0) + 1;
        }
      }
    }
    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    const { error } = await supabase.from('review_snapshots').insert({
      business_id: biz.id,
      avg_rating: parseFloat(avgRating.toFixed(2)),
      review_count: reviewCount,
      review_velocity: reviewVelocity,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      top_themes: topThemes,
      snapshot_date: snapshotDate,
    });

    if (error) {
      console.error(`  ❌ ${biz.name}: ${error.message}`);
      failed++;
    } else {
      created++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================');
  console.log('📊 SNAPSHOT SUMMARY');
  console.log('========================================');
  console.log(`✅ Snapshots created : ${created}`);
  console.log(`❌ Failed            : ${failed}`);
  console.log(`⏱️  Duration          : ${duration}s`);
  console.log('========================================\n');

  return NextResponse.json({
    status: 'success',
    created,
    failed,
    duration: `${duration}s`,
    snapshotDate,
  });
}
