// Raw SQL seeder bypassing all Prisma client module resolution bugs
const { Client } = require('pg');
require('dotenv').config();

// Small random IDs to replace `cuid()` default (sufficient for hackathon mock)
function generateMockId() {
  return Math.random().toString(36).substring(2, 9);
}

async function main() {
  console.log('Seeding Database for Lemontree InsightEngine V1 via raw pg driver...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // 1. Seed Census Data (Mock real NYC Poverty Indices)
    const censusData = [
      { id: generateMockId(), tractId: 'BKN-001', povertyIndex: 0.42, population: 4500 },
      { id: generateMockId(), tractId: 'BKN-002', povertyIndex: 0.38, population: 3800 },
      { id: generateMockId(), tractId: 'BRX-001', povertyIndex: 0.55, population: 6200 },
      { id: generateMockId(), tractId: 'MHT-001', povertyIndex: 0.12, population: 8000 },
    ];

    console.log('Clearing old data...');
    await client.query('DELETE FROM "CensusData"');
    await client.query('DELETE FROM "Pantry"');
    await client.query('DELETE FROM "Feedback"');

    console.log('Inserting CensusData...');
    for (const data of censusData) {
      await client.query(
        'INSERT INTO "CensusData" (id, "tractId", "povertyIndex", population, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [data.id, data.tractId, data.povertyIndex, data.population]
      );
    }

    // 2. Seed Pantries
    const pantries = [
      { id: generateMockId(), name: 'Downtown Community Food Hub', location: '120 Broadway, New York, NY', latitude: 40.7081, longitude: -74.0113, hours: 'Mon-Fri 9AM-5PM', description: 'Primary Manhattan distribution center.' },
      { id: generateMockId(), name: 'Brooklyn Resilience Pantry', location: '150 Court St, Brooklyn, NY', latitude: 40.6908, longitude: -73.9928, hours: 'Tue, Thu, Sat 10AM-4PM', description: 'Serving downtown Brooklyn families.' },
      { id: generateMockId(), name: 'Bronx Care Nutrition Center', location: '1650 Grand Concourse, Bronx, NY', latitude: 40.8427, longitude: -73.9113, hours: 'Mon, Wed, Fri 8AM-2PM', description: 'Critical coverage for high SNAP density area.' },
      { id: generateMockId(), name: 'East Harlem Food Bank', location: '172 E 104th St, New York, NY', latitude: 40.7915, longitude: -73.9458, hours: 'Thursdays 12PM-6PM', description: 'Specializes in fresh produce.' },
    ];

    console.log('Inserting Pantries...');
    for (const p of pantries) {
      await client.query(
        'INSERT INTO "Pantry" (id, name, location, latitude, longitude, hours, description, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
        [p.id, p.name, p.location, p.latitude, p.longitude, p.hours, p.description]
      );
    }

    // 3. Seed AI Categorized Feedback
    const feedbacks = [
      { id: generateMockId(), text: "The line was wrapping around the block, I had to wait 2 hours.", sentiment: "Negative", tags: ["Wait Time", "Capacity"] },
      { id: generateMockId(), text: "I loved the fresh kale and apples this week! Thank you.", sentiment: "Positive", tags: ["Food Quality", "Produce"] },
      { id: generateMockId(), text: "It's really hard to get here on the subway with a stroller.", sentiment: "Negative", tags: ["Transportation", "Accessibility"] },
      { id: generateMockId(), text: "Staff was incredibly kind to my children.", sentiment: "Positive", tags: ["Staff", "Welcoming"] },
      { id: generateMockId(), text: "They ran out of milk before I got to the front of the line.", sentiment: "Negative", tags: ["Inventory", "Dairy"] },
      { id: generateMockId(), text: "The new Thursday evening hours help me so much since I work days.", sentiment: "Positive", tags: ["Hours", "Accessibility"] },
    ];

    console.log('Inserting Feedback...');
    for (const f of feedbacks) {
      // Postgres exact array syntax requirement natively
      const tagsArrayStr = `{${f.tags.join(',')}}`;
      await client.query(
        'INSERT INTO "Feedback" (id, text, sentiment, tags, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [f.id, f.text, f.sentiment, tagsArrayStr]
      );
    }

    console.log('✅ Seeding Complete via raw PG driver! V1 Ready.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.end();
  }
}

main();
