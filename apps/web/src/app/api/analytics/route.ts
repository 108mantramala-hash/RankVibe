import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('\n========================================');
    console.log('📊 NORTH YORK ANALYTICS');
    console.log('========================================\n');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Overall stats
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('id, rating, sentiment, themes, business_id');

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, google_rating, google_review_count');

    console.log('📈 OVERALL STATISTICS');
    console.log('─────────────────────────────');
    console.log(`Total Businesses: ${businesses?.length || 0}`);
    console.log(`Total Reviews: ${allReviews?.length || 0}`);

    if (allReviews && allReviews.length > 0) {
      const avgRating = (
        allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length
      ).toFixed(2);

      const posCount = allReviews.filter((r) => r.sentiment === 'positive').length;
      const negCount = allReviews.filter((r) => r.sentiment === 'negative').length;
      const neuCount = allReviews.filter((r) => r.sentiment === 'neutral').length;

      console.log(`Average Rating: ${avgRating}⭐`);
      console.log(`Positive: ${posCount} | Negative: ${negCount} | Neutral: ${neuCount}`);
    }
    console.log('────────────────────────────\n');

    // 2. Top themes
    console.log('🏷️  TOP THEMES');
    console.log('─────────────────────────────');

    const themeCount: Record<string, number> = {};
    if (allReviews) {
      for (const review of allReviews) {
        if (review.themes && Array.isArray(review.themes)) {
          for (const theme of review.themes) {
            themeCount[theme] = (themeCount[theme] || 0) + 1;
          }
        }
      }
    }

    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topThemes.forEach(([theme, count], idx) => {
      console.log(`${idx + 1}. ${theme} (${count})`);
    });
    console.log('────────────────────────────\n');

    // 3. Best & worst businesses
    console.log('🏆 BUSINESS RANKINGS');
    console.log('─────────────────────────────');

    const businessMetrics: Record<
      string,
      { name: string; reviews: number; avgRating: number }
    > = {};

    if (businesses) {
      for (const biz of businesses) {
        businessMetrics[biz.id] = {
          name: biz.name,
          reviews: 0,
          avgRating: 0,
        };
      }
    }

    if (allReviews) {
      for (const stat of allReviews) {
        if (businessMetrics[stat.business_id]) {
          businessMetrics[stat.business_id].reviews++;
          businessMetrics[stat.business_id].avgRating += stat.rating || 0;
        }
      }
    }

    // Calculate averages
    for (const id in businessMetrics) {
      const biz = businessMetrics[id];
      if (biz.reviews > 0) {
        biz.avgRating = parseFloat((biz.avgRating / biz.reviews).toFixed(2));
      }
    }

    // Sort by rating
    const rankedBusinesses = Object.values(businessMetrics)
      .filter((b) => b.reviews > 0)
      .sort((a, b) => b.avgRating - a.avgRating);

    console.log('Best Performing:');
    rankedBusinesses.slice(0, 3).forEach((biz, idx) => {
      console.log(
        `  ${idx + 1}. ${biz.name} (${biz.reviews} reviews, Rating: ${biz.avgRating}⭐)`
      );
    });

    if (rankedBusinesses.length > 3) {
      console.log('\nNeeds Improvement:');
      rankedBusinesses.slice(-3).forEach((biz, idx) => {
        console.log(
          `  ${idx + 1}. ${biz.name} (${biz.reviews} reviews, Rating: ${biz.avgRating}⭐)`
        );
      });
    }
    console.log('────────────────────────────\n');

    // Return data for API response
    return NextResponse.json({
      status: 'success',
      statistics: {
        totalBusinesses: businesses?.length || 0,
        totalReviews: allReviews?.length || 0,
        averageRating: allReviews && allReviews.length > 0
          ? parseFloat((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length).toFixed(2))
          : 0,
        sentimentBreakdown: {
          positive: allReviews?.filter((r) => r.sentiment === 'positive').length || 0,
          negative: allReviews?.filter((r) => r.sentiment === 'negative').length || 0,
          neutral: allReviews?.filter((r) => r.sentiment === 'neutral').length || 0,
        },
      },
      topThemes: topThemes.map(([theme, count]) => ({ theme, count })),
      businessRankings: rankedBusinesses,
    });
  } catch (error) {
    console.error('❌ Analytics failed:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
