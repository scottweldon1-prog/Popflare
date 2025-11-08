// Popflare v7 — broader football results
import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const API_KEY = "AIzaSyDIxaDGxCh_PrdXqhN_h6Y8kHp2Bq6Y0Jw";
const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

async function youtubeSearch(query, maxResults = 50) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
    query
  )}&key=${API_KEY}&regionCode=GB&relevanceLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
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

const BAD = /(reaction|lyric|lyrics|sped|slowed|nightcore|fan edit|audio only|shorts)/i;

async function buildSection(name, queries, filter, limit = 100) {
  let all = [];
  for (const q of queries) {
    console.log(`🔍 Searching for ${q}`);
    const items = await youtubeSearch(q, 50);
    all = all.concat(items);
  }
  const filtered = all.filter(v => filter(v) && !BAD.test(v.title));
  const unique = [];
  const seen = new Set();
  for (const v of filtered) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      unique.push(v);
    }
  }
  const final = unique.slice(0, limit);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ updatedAt: new Date(), items: final }, null, 2));
  console.log(`✅ Written ${name}: ${final.length}`);
}

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
    ["official trailer 2025", "new movie trailer 2025", "upcoming english movies 2025"],
    v => /trailer/i.test(v.title)
  );

  await buildSection(
    "ukpop",
    ["Official UK Top 40 music video 2025", "BBC Radio 1 Official Chart music video", "Top UK songs 2025"],
    v => /(official|music).*(video)/i.test(v.title)
  );

  await buildSection(
    "viral",
    ["funny viral videos 2025", "failarmy 2025", "try not to laugh 2025", "crazy moments caught on camera 2025"],
    () => true
  );

  console.log("🎬 All feeds built successfully.");
  try {
    execSync("git add public/content/*.json");
    execSync('git commit -m "Auto-update feeds with wider football sources"');
    execSync("git push origin main");
    console.log("✅ Pushed updated feeds to GitHub.");
  } catch (e) {
    console.warn("⚠️ Git push skipped or failed:", e.message);
  }
})();




