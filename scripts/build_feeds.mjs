// Popflare v12 — Netlify-safe build (no embedded secrets)
import 'dotenv/config';
import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Get key ONLY from environment (never hardcoded)
const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("❌ Missing YOUTUBE_API_KEY environment variable.");
  process.exit(1);
}

const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

// ---------------------- HELPERS ----------------------

async function youtubeSearch(query, maxResults = 50) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
    query
  )}&key=${API_KEY}&regionCode=GB&relevanceLanguage=en`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(v => ({
      id: v.id.videoId,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${v.id.videoId}`,
      published: v.snippet.publishedAt
    }));
  } catch (e) {
    console.warn(`⚠️ YouTube API failed for ${query}: ${e.message}`);
    return [];
  }
}

function unique(arr) {
  const seen = new Set();
  return arr.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

async function buildSection(name, queries, test, limit = 100) {
  let all = [];
  for (const q of queries) {
    console.log(`🔍 Searching ${q}...`);
    const items = await youtubeSearch(q, 50);
    all = all.concat(items);
  }
  const BAD = /(reaction|lyric|lyrics|sped|slowed|nightcore|fan|remix|shorts|edit|teaser)/i;
  const keep = unique(all.filter(v => test(v) && !BAD.test(v.title))).slice(0, limit);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ updatedAt: new Date().toISOString(), items: keep }, null, 2));
  console.log(`✅ Written ${name}: ${keep.length}`);
}

// ---------------------- BUILD ----------------------

(async () => {
  await buildSection("football", [
    "Premier League highlights",
    "EFL Championship highlights",
    "La Liga highlights",
    "Serie A highlights",
    "Bundesliga highlights",
    "Ligue 1 highlights",
    "Champions League highlights",
    "Europa League highlights",
    "FA Cup highlights"
  ], v => /(highlight|goal|extended)/i.test(v.title));

  await buildSection("trailers", [
    "official movie trailer 2025",
    "new movie trailers",
    "upcoming movies english trailer",
    "hollywood movie trailers",
    "netflix trailer"
  ], v => /trailer/i.test(v.title));

  await buildSection("ukpop", [
    "Official UK Top 40 music video",
    "Official Charts Top 100 music videos",
    "BBC Radio 1 Official Chart",
    "UK pop hits official video",
    "Top UK songs Vevo"
  ], v => /(official|music|video)/i.test(v.title));

  await buildSection("viral", [
    "funny viral videos",
    "failarmy",
    "try not to laugh",
    "crazy moments caught on camera",
    "sports viral clips",
    "best funny moments",
    "epic fails",
    "amazing people",
    "top tiktok compilations"
  ], v => /(funny|viral|fail|amazing|crazy|epic|moment|caught)/i.test(v.title));

  console.log("🎬 All feeds built successfully.");

  try {
    execSync("git add public/content/*.json");
    execSync('git commit -m "Popflare v12 — Netlify-safe build"');
    execSync("git push origin main");
    console.log("✅ Feeds pushed to GitHub.");
  } catch (err) {
    console.warn("⚠️ Git push skipped:", err.message);
  }
})();
