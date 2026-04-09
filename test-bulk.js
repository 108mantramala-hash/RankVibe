require('dotenv').config({ path: 'apps/web/.env.local' });

const { ApifyClient } = require('apify-client');

async function testBulkScraper() {
  const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN
  });

  console.log('Listing available actors...');

  try {
    // Try to list actors or search for them
    const searchResult = await client.actors().list({ search: 'google maps scraper', limit: 10 });
    console.log('Search results:', searchResult.items.map(item => item.name));

    // Try the exact name from the task
    console.log('Trying compass/google-maps-scraper...');
    const actor = await client.actor('compass/google-maps-scraper').get();
    console.log('Actor found:', actor.name);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBulkScraper();