import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env from apps/web/.env.local
const envPath = './apps/web/.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  console.log('🔍 CHECKING DATABASE STATE...\n');
  
  try {
    // Query 1: Count businesses
    const { count: businessCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total businesses: ${businessCount}`);
    
    // Query 2: Count reviews
    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });
    console.log(`📄 Total reviews: ${reviewCount}`);
    
    // Query 3: Reviews with sentiment
    const { count: enrichedCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .not('sentiment', 'is', null);
    console.log(`✅ Reviews enriched (sentiment != NULL): ${enrichedCount}`);
    
    // Query 4: Reviews without sentiment
    const { count: unenrichedCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .is('sentiment', null);
    console.log(`❌ Reviews not enriched (sentiment IS NULL): ${unenrichedCount}`);
    
    // Query 5: Top businesses by review count
    const { data: topBusinesses } = await supabase
      .from('businesses')
      .select('name, googleRating, googleReviewCount')
      .order('googleReviewCount', { ascending: false })
      .limit(5);
    
    console.log('\n🏆 Top 5 businesses by review count:');
    if (topBusinesses && topBusinesses.length > 0) {
      topBusinesses.forEach((b, i) => {
        console.log(`  ${i+1}. ${b.name} - ${b.googleReviewCount} reviews (${b.googleRating} ⭐)`);
      });
    } else {
      console.log('  (No businesses found)');
    }
    
    console.log('\n💡 Status Summary:');
    if (businessCount === 0) {
      console.log('  → Scenario A: No data yet. Need to create scraper and enrich pipeline.');
    } else if (businessCount < 20 || reviewCount < 200) {
      console.log('  → Scenario B: Scrape incomplete. Need to fix scraper and re-run.');
    } else if (unenrichedCount > 0) {
      console.log('  → Scenario C: Scrape done, but enrichment incomplete. Run enrich API.');
    } else {
      console.log('  → Scenario D: Everything complete! Ready for theme analysis.');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

checkDB();
