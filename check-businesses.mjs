import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = './apps/web/.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getBusinesses() {
  const { data: allBusinesses } = await supabase.from('businesses').select('*');
  
  console.log('\n📍 Current Businesses in Database:');
  if (allBusinesses && allBusinesses.length > 0) {
    for (const b of allBusinesses) {
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', b.id);
      
      console.log(`\n${b.name}`);
      console.log(`   📍 ${b.city}, ${b.state}`);
      console.log(`   ⭐ ${b.googleRating || 'N/A'} rating (${reviewCount} reviews)`);
      console.log(`   Tracked: ${b.isTracked ? '✅' : '❌'}, Customer: ${b.isCustomer ? '✅' : '❌'}`);
    }
  }
}

getBusinesses();
