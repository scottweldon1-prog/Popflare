// Popflare v7 – Full YouTube API feed builder (clean version)
import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// 🔑 Your YouTube Data API key
const API_KEY = "AIzaSyDIxaDGxCh_PrdXqhN_h6Y8kHp2Bq6Y0Jw";
const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

// Helper to call YouTube API
async function youtubeSearch(query, maxResults = 50) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
    query
  )}&key=${API_KEY}&regionCode=GB&relevanceLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️ YouTube API request failed for ${query}`);
    return [];
  }
  const data = await res.json();
  return data.items.map(v => ({
    id: v.id.videoId,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${v.id.videoId}`,
    published: v.snippet.publishedAt
  }));
}

// Remove duplicates
function uniqueById(arr) {
  const seen = new Set();
  return arr.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

// Core builder
async function buildSection(name, queries, filter, limit = 100) {
  let all = [];
  for (const q of queries) {
    console.log(`🔍 Searching YouTube for ${q}...`);
    const items = await youtubeSearch(q, 50);
    all = all.concat(items);
  }

  const BAD = /(reaction|lyric|lyrics|sped|slowed|nightcore|edit|fan|audio|shorts)/i;
  const filtered = all.filter(v => filter(v) && !BAD.test(v.title));
  const unique = uniqueById(filtered).slice(0, limit);

  writeFileSync(
    join(outDir, `${name}.json`),
    JSON.stringify({ updatedAt: new Date().toISOString(), items: unique }, null, 2)
  );
  console.log(`✅ Written ${name}: ${unique.length}`);
}

// Build all categories
(async () => {
  await buildSection(
    "football",
    [
      "Premier League highlights 2025",
      "EFL Championship highlights 2025",
      "La Liga highlights 2025",
      "Serie A highlights 2025",
      "Bundesliga highlights 2025",
      "Ligue 1 highlights 2025",
      "Champions League highlights 2025",
      "Europa League highlights 2025",
      "FA Cup highlights 2025",
      "UEFA Conference League highlights 2025"
    ],
    v => /(highlights|goals|extended)/i.test(v.title)
  );

  await buildSection(
    "trailers",
    [
      "official trailer 2025",
      "new movie trailer 2025",
      "upcoming movies english trailer 2025",
      "hollywood trailer 2025"
    ],
    v => /trailer/i.test(v.title)
  );

  await buildSection(
    "ukpop",
    [
      "Official UK Top 40 music video 2025",
      "BBC Radio 1 Official Chart music video",
      "Top UK songs 2025",
      "UK pop hits 2025",
      "Official Charts Top 40 2025"
    ],
    v => /(official|music).*(video)/i.test(v.title)
  );

  await buildSection(
    "viral",
    [
      "funny viral videos 2025",
      "failarmy 2025",
      "try not to laugh 2025",
      "crazy moments caught on camera 2025",
      "sports viral clips 2025"
    ],
    () => true
  );

  console.log("🎬 All feeds built successfully.");

  try {
    execSync("git add public/content/*.json");
    execSync('git commit -m "Auto-update Popflare feeds (v7)"');
    execSync("git push origin main");
    console.log("✅ Pushed updated feeds to GitHub.");
  } catch (err) {
    console.warn("⚠️ Git push skipped or failed:", err.message);
  }
})();





