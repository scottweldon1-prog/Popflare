import fetch from "node-fetch";
import { writeFileSync } from "fs";
import { join } from "path";

const outDir = process.argv[2] || "public/content";

// --- Helper functions ---
function parseFeed(xml) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const get = (src, tag) => {
    const m = src.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1] : "";
  };
  const getAttr = (src, tag, attr) => {
    const m = src.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`));
    return m ? m[1] : "";
  };
  let m;
  while ((m = entryRegex.exec(xml))) {
    const e = m[1];
    const link = getAttr(e, "link", "href");
    const title = get(e, "title");
    const author = get(e, "name") || get(e, "author");
    const published = get(e, "published") || get(e, "updated");
    const idMatch = (link || "").match(/v=([A-Za-z0-9_\-]+)/);
    const videoId = idMatch ? idMatch[1] : get(e, "yt:videoId");
    if (videoId) {
      items.push({
        id: videoId,
        title,
        channel: author,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        published,
      });
    }
  }
  return items;
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "accept-language": "en-GB,en;q=0.9",
    },
  });
  if (!res.ok) {
    console.warn(`⚠️ Failed: ${url} (${res.status})`);
    return [];
  }
  return parseFeed(await res.text());
}

function uniqueById(arr) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

// --- Feed sources (official channels/playlists) ---
const FEEDS = {
  football: [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCWwWbVXtTnAwP6mZ2IHtF3w", // Premier League
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCqZQlzSHbVJrwrn5Xvzf5Nw", // Bundesliga
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCxG1UtuK57SnyY3Yx-tBziA", // Serie A
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCW7VTAWRMCG0t1XjQY0yX8w", // Ligue 1
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCpcTrCXblq78GZrTUTLWeBw", // UEFA
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCa9XGQDkZ3yR3pTzYjZ3qYg", // TNT Sports
  ],
  trailers: [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCi8e0iOVk1fEOogdfu4YgfA", // Movieclips Trailers
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCz97F7dMxBNOfGYu3rx8aCw", // KinoCheck International
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCyytiQuL-5S59OX1opqG-bQ", // FilmSelect Trailer
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCi8e0iOVk1fEOogdfu4YgfA", // duplicate for stability
  ],
  ukpop: [
    "https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR732-CN09YykVof2lxdI3MLOZda", // Official Charts (mirror)
    "https://www.youtube.com/feeds/videos.xml?playlist_id=PLFgquLnL59amEA43C1D5eW5pK9G6r2e3K", // Global Top Music
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCqECaJ8Gagnn7YCbPEzWH6g", // Ed Sheeran
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCnnpHCxwwRjDi1mJh3rMGmA", // Dua Lipa
  ],
  viral: [
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCF9imwPMSGz4Vq1NiTWCC7g", // FailArmy
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCw5YeuERMmlnqo4oq8vwUpg", // UNILAD
    "https://www.youtube.com/feeds/videos.xml?channel_id=UChrx0WZduP3z5a7mGZQFUXA", // People Are Awesome
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCpcTrCXblq78GZrTUTLWeBw", // UEFA Funny Moments
  ],
};

// --- Build and write files ---
async function buildSection(name, urls, cap = 100) {
  let all = [];
  for (const url of urls) {
    const feed = await fetchFeed(url);
    all = all.concat(feed);
  }
  all = uniqueById(all).slice(0, cap);
  const json = { updatedAt: new Date().toISOString(), items: all };
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(json, null, 2));
  console.log(`✅ Written ${name}: ${all.length}`);
}

(async () => {
  await buildSection("football", FEEDS.football, 60);
  await buildSection("trailers", FEEDS.trailers, 40);
  await buildSection("ukpop", FEEDS.ukpop, 100);
  await buildSection("viral", FEEDS.viral, 100);
  console.log("🎬 All feeds built successfully.");
})();
