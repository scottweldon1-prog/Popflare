// Popflare v8 – fixed UK Pop and Viral sections (full working build)
import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// 🔑 YouTube API key
const API_KEY = "AIzaSyDIxaDGxCh_PrdXqhN_h6Y8kHp2Bq6Y0Jw";
const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

/* -------------------- Helper Functions -------------------- */

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

function uniqueById(arr) {
  const seen = new Set();
  return arr.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

/* -------------------- Builder -------------------- */

async function buildSection(name, queries, filter, limit = 100) {
  let all = [];
  for (const q of queries) {
    console.log(`🔍 Searching YouTube for ${q}...`);
    const items = await youtubeSearch(q, 50);
    all = all.concat(items);
  }

  const BAD = /(reaction|lyric|lyrics|sped|slowed|nightcore|fan edit|audio|visualizer|teaser|shorts)/i;
  const filtered = all.filter(v => filter(v) && !BAD.test(v.title));
  const unique = uniqueById(filtered).slice(0, limit);

  writeFileSync(
    join(outDir, `${name}.json`),
    JSON.stringify({ updatedAt: new Date().toISOString(), items: unique }, null, 2)
  );
  console.log(`✅ Written ${name}: ${unique.length}`);
}

/* -------------------- Build All Sections -------------------- */

(async () => {
  // ⚽ Football highlights
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

  // 🎬 Movie trailers
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

  // 🎵 UK Pop Top 100
  await buildSection(
    "ukpop",
    [
      "Official UK Top 40 music video 2025",
      "Official Charts Top 100 music videos",
      "BBC Radio 1 Official Chart 2025 music videos",
      "UK pop hits 2025 official video",
      "Top UK songs 2025 Vevo",
      "UK top chart hits 2025 music video",
      "Top 100 UK songs 2025 official video"
    ],
    v =>
      /(official|music|video)/i.test(v.title) &&
      !/(reaction|lyric|sped|slowed|nightcore|remix)/i.test(v.title)
  );

  // 🌍 Viral / Trending
  await buildSection(
    "viral",
    [
      "funny viral videos 2025",
      "failarmy 2025",
      "try not to laugh 2025",
      "crazy moments caught on camera 2025",
      "sports viral clips 2025",
      "best funny moments 2025",
      "epic fails 2025",
      "amazing people 2025",
      "unbelievable moments 2025",
      "top TikTok compilations 2025"
    ],
    v =>
      /(funny|viral|fail|amazing|crazy|epic|moment|caught|try not to laugh)/i.test(v.title)
  );

  console.log("🎬 All feeds built successfully.");

  try {
    execSync("git add public/content/*.json");
    execSync('git commit -m "Auto-update Popflare feeds (v8 full results)"');
    execSync("git push origin main");
    console.log("✅ Pushed updated feeds to GitHub.");
  } catch (err) {
    console.warn("⚠️ Git push skipped or failed:", err.message);
  }
})();
