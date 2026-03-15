export {};
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

function generateMockId() {
  return Math.random().toString(36).substring(2, 9);
}

function randomDate() {
  const start = new Date('2026-03-12');
  const end = new Date('2026-03-15');
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

const reviews = [
  { resourceId: "1", text: "Really kind volunteers, got everything I needed quickly.", sentiment: "Positive", tags: ["Staff"], waitTimeMinutes: 10, rating: 3 },
  { resourceId: "1", text: "The line was out the door and it took almost an hour.", sentiment: "Negative", tags: ["Wait Time"], waitTimeMinutes: 60, rating: 1 },
  { resourceId: "1", text: "Decent selection of produce but they ran out of bread early.", sentiment: "Neutral", tags: ["Food Quality", "Inventory"], waitTimeMinutes: 25, rating: 2 },
  { resourceId: "1", text: "Staff was welcoming and the process was smooth.", sentiment: "Positive", tags: ["Staff", "Accessibility"], waitTimeMinutes: 12, rating: 3 },
  { resourceId: "1", text: "Waited 45 minutes and they didn't have any dairy left.", sentiment: "Negative", tags: ["Wait Time", "Inventory"], waitTimeMinutes: 45, rating: 1 },
  { resourceId: "100", text: "Always have fresh vegetables here, really appreciate it.", sentiment: "Positive", tags: ["Food Quality"], waitTimeMinutes: 15, rating: 3 },
  { resourceId: "100", text: "Hard to get to without a car and the hours are limited.", sentiment: "Negative", tags: ["Transportation", "Hours"], waitTimeMinutes: 35, rating: 1 },
  { resourceId: "100", text: "It was okay. Not much variety but staff was friendly.", sentiment: "Neutral", tags: ["Staff", "Food Quality"], waitTimeMinutes: 20, rating: 2 },
  { resourceId: "100", text: "Showed up 10 minutes before close and they still helped me.", sentiment: "Positive", tags: ["Staff", "Hours"], waitTimeMinutes: 8, rating: 3 },
  { resourceId: "100", text: "The place was clean and organized, no complaints.", sentiment: "Positive", tags: ["Cleanliness"], waitTimeMinutes: 10, rating: 3 },
  { resourceId: "1002", text: "Soup was hot and the portions were generous.", sentiment: "Positive", tags: ["Food Quality"], waitTimeMinutes: 12, rating: 3 },
  { resourceId: "1002", text: "Waited almost 90 minutes, way too long for a soup kitchen.", sentiment: "Negative", tags: ["Wait Time"], waitTimeMinutes: 88, rating: 1 },
  { resourceId: "1002", text: "Friendly staff but the line moves slowly.", sentiment: "Neutral", tags: ["Staff", "Wait Time"], waitTimeMinutes: 30, rating: 2 },
  { resourceId: "1002", text: "They had a good variety today, felt taken care of.", sentiment: "Positive", tags: ["Food Quality", "Staff"], waitTimeMinutes: 15, rating: 3 },
  { resourceId: "1002", text: "Couldn't make it during their hours, scheduling is rough.", sentiment: "Negative", tags: ["Hours"], waitTimeMinutes: 40, rating: 1 },
  { resourceId: "1003", text: "Great experience, they had everything my family needed.", sentiment: "Positive", tags: ["Food Quality", "Staff"], waitTimeMinutes: 10, rating: 3 },
  { resourceId: "1003", text: "The pantry was disorganized and I had to wait a long time.", sentiment: "Negative", tags: ["Wait Time", "Cleanliness"], waitTimeMinutes: 55, rating: 1 },
  { resourceId: "1003", text: "Okay selection, nothing special but got what I needed.", sentiment: "Neutral", tags: ["Food Quality"], waitTimeMinutes: 22, rating: 2 },
  { resourceId: "1003", text: "Volunteers were super helpful carrying bags to my car.", sentiment: "Positive", tags: ["Staff", "Accessibility"], waitTimeMinutes: 7, rating: 3 },
  { resourceId: "1003", text: "They ran out of canned goods before I got to the front.", sentiment: "Negative", tags: ["Inventory"], waitTimeMinutes: 50, rating: 1 },
  { resourceId: "1004", text: "Very well run, in and out in under 15 minutes.", sentiment: "Positive", tags: ["Wait Time"], waitTimeMinutes: 13, rating: 3 },
  { resourceId: "1004", text: "The wait outside was long and it was cold.", sentiment: "Negative", tags: ["Wait Time"], waitTimeMinutes: 70, rating: 1 },
  { resourceId: "1004", text: "Good food quality, rice and vegetables were fresh.", sentiment: "Positive", tags: ["Food Quality"], waitTimeMinutes: 18, rating: 3 },
  { resourceId: "1004", text: "It was fine, staff was neutral but not rude.", sentiment: "Neutral", tags: ["Staff"], waitTimeMinutes: 28, rating: 2 },
  { resourceId: "1004", text: "Hard to find parking nearby and the entrance wasn't clear.", sentiment: "Negative", tags: ["Transportation", "Accessibility"], waitTimeMinutes: 35, rating: 1 },
  { resourceId: "1009", text: "One of the best soup kitchens in the area, very caring staff.", sentiment: "Positive", tags: ["Staff", "Food Quality"], waitTimeMinutes: 9, rating: 3 },
  { resourceId: "1009", text: "Waited over an hour, staff seemed overwhelmed.", sentiment: "Negative", tags: ["Wait Time", "Staff"], waitTimeMinutes: 75, rating: 1 },
  { resourceId: "1009", text: "Solid meal, nothing fancy but filling and warm.", sentiment: "Neutral", tags: ["Food Quality"], waitTimeMinutes: 20, rating: 2 },
  { resourceId: "1009", text: "They remembered my dietary restrictions, really thoughtful.", sentiment: "Positive", tags: ["Staff", "Food Quality"], waitTimeMinutes: 14, rating: 3 },
  { resourceId: "1009", text: "Only open a few days a week which makes it hard to plan.", sentiment: "Negative", tags: ["Hours"], waitTimeMinutes: 30, rating: 1 },
  { resourceId: "1010", text: "Always a warm welcome here, feel respected every time.", sentiment: "Positive", tags: ["Staff"], waitTimeMinutes: 11, rating: 3 },
  { resourceId: "1010", text: "Ran out of produce by the time I got there.", sentiment: "Negative", tags: ["Inventory", "Food Quality"], waitTimeMinutes: 40, rating: 1 },
  { resourceId: "1010", text: "Short wait and decent items, nothing out of the ordinary.", sentiment: "Neutral", tags: ["Wait Time"], waitTimeMinutes: 18, rating: 2 },
  { resourceId: "1010", text: "Staff helped me find the right bus route home, super kind.", sentiment: "Positive", tags: ["Staff", "Transportation"], waitTimeMinutes: 8, rating: 3 },
  { resourceId: "1010", text: "The location is hard to access without a car.", sentiment: "Negative", tags: ["Transportation", "Accessibility"], waitTimeMinutes: 45, rating: 1 },
  { resourceId: "871", text: "They had a wide selection and the staff was patient.", sentiment: "Positive", tags: ["Food Quality", "Staff"], waitTimeMinutes: 16, rating: 3 },
  { resourceId: "871", text: "Line wrapped around the block, waited almost 80 minutes.", sentiment: "Negative", tags: ["Wait Time"], waitTimeMinutes: 78, rating: 1 },
  { resourceId: "871", text: "Average experience, got some basics but not much else.", sentiment: "Neutral", tags: ["Food Quality"], waitTimeMinutes: 25, rating: 2 },
  { resourceId: "871", text: "Really clean facility, felt comfortable the whole time.", sentiment: "Positive", tags: ["Cleanliness", "Accessibility"], waitTimeMinutes: 10, rating: 3 },
  { resourceId: "871", text: "They closed early without notice, wasted a trip.", sentiment: "Negative", tags: ["Hours"], waitTimeMinutes: 0, rating: 1 },
  { resourceId: "clgxwgky0000ule0fcjdl34cf", text: "Beautiful space and the meal was genuinely good.", sentiment: "Positive", tags: ["Food Quality", "Cleanliness"], waitTimeMinutes: 12, rating: 3 },
  { resourceId: "clgxwgky0000ule0fcjdl34cf", text: "Very long wait, took about an hour to get seated.", sentiment: "Negative", tags: ["Wait Time"], waitTimeMinutes: 65, rating: 1 },
  { resourceId: "clgxwgky0000ule0fcjdl34cf", text: "Nice volunteers but the meal options were limited today.", sentiment: "Neutral", tags: ["Staff", "Food Quality"], waitTimeMinutes: 22, rating: 2 },
  { resourceId: "clgxwgky0000ule0fcjdl34cf", text: "Came with my kids and we were treated really well.", sentiment: "Positive", tags: ["Staff", "Accessibility"], waitTimeMinutes: 9, rating: 3 },
  { resourceId: "clgxwgky0000ule0fcjdl34cf", text: "Hard to get to on public transit, no nearby bus stop.", sentiment: "Negative", tags: ["Transportation"], waitTimeMinutes: 38, rating: 1 },
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Deleting old seeded reviews...");
    await client.query(`DELETE FROM "Feedback" WHERE "resourceId" IS NOT NULL`);

    console.log("Seeding fake feedback reviews...");
    for (const review of reviews) {
      const id = generateMockId();
      const tagsArrayStr = `{${review.tags.join(',')}}`;
      const date = randomDate();
      await client.query(
        `INSERT INTO "Feedback" (id, text, sentiment, tags, "resourceId", "waitTimeMinutes", rating, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
        [id, review.text, review.sentiment, tagsArrayStr, review.resourceId, review.waitTimeMinutes, review.rating, date]
      );
    }

    console.log(`Seeded ${reviews.length} reviews.`);
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await client.end();
  }
}

main();