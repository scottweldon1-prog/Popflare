// Popflare – Netlify-safe feeds builder (no literals, no pushes)
import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("❌ Missing YOUTUBE_API_KEY env var. Set it in Netlify → Site settings → Build & deploy → Environment.");
  process.exit(1);
}

const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

async function youtubeSearch(query, maxResults = 50) {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&maxResults=${maxResults}&q=${encodeURIComponent(query)}` +
    `&key=${API_KEY}&regionCode=GB&relevanceLanguage=en`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map((v) => ({
      id: v.id?.videoId,
      title: v.snippet?.title ?? "",
      channel: v.snippet?.channelTitle ?? "",
      url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${v.id?.videoId}`,
      published: v.snippet?.publishedAt ?? null,
    })).filter(x => x.id);
  } catch (e) {
    console.warn(`⚠️ YouTube API failed for ${query}: ${e.message}`);
    return [];
  }
}

function uniqueById(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (!x?.id) continue;
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
}

async function buildSection(name, queries, predicate, limit = 100) {
  let all = [];
  for (const q of queries) {
    console.log(`🔍 Searching ${q}...`);
    const items = await youtubeSearch(q, 50);
    all = all.concat(items);
  }
  const BAD = /(reaction|lyric|lyrics|sped|slowed|nightcore|fan|remix|shorts|edit|teaser)/i;
  const keep = uniqueById(all).filter(v => predicate(v) && !BAD.test(v.title)).slice(0, limit);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ updatedAt: new Date().toISOString(), items: keep }, null, 2));
  console.log(`✅ Written ${name}: ${keep.length}`);
}

(async () => {
  await buildSection("football", [
    "Premier League highlights 2025",
    "EFL Championship highlights 2025",
    "La Liga highlights 2025",
    "Serie A highlights 2025",
    "Bundesliga highlights 2025",
    "Ligue 1 highlights 2025",
    "Champions League highlights 2025",
    "Europa League highlights 2025",
    "FA Cup highlights 2025",
  ], v => /(highlight|goal|extended)/i.test(v.title));

  await buildSection("trailers", [
    "official movie trailer 2025",
    "new movie trailers 2025",
    "upcoming movies english trailer 2025",
    "hollywood movie trailers 2025",
    "netflix trailer 2025",
  ], v => /trailer/i.test(v.title));

  await buildSection("ukpop", [
    "Official UK Top 40 music video 2025",
    "Official Charts Top 100 music videos",
    "BBC Radio 1 Official Chart 2025",
    "UK pop hits official video 2025",
    "Top UK songs Vevo 2025",
  ], v => /(official|music).*(video)/i.test(v.title));

  await buildSection("viral", [
    "funny viral videos 2025",
    "failarmy 2025",
    "try not to laugh 2025",
    "crazy moments caught on camera 2025",
    "sports viral clips 2025",
    "best funny moments 2025",
    "epic fails 2025",
    "amazing people 2025",
    "top tiktok compilations 2025",
  ], () => true);

  console.log("🎬 All feeds built successfully.");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
