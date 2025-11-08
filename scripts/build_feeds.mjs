// scripts/build_feeds.mjs
// Popflare v5 — builds JSON feeds for each tab from official YouTube sources.
// Run:  node scripts/build_feeds.mjs public/content

import fetch from "node-fetch";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const outDir = process.argv[2] || "public/content";
mkdirSync(outDir, { recursive: true });

/* -------------------- Time helpers (Europe/London) -------------------- */

function tzDateParts(d, tz = "Europe/London") {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  //  dd/mm/yyyy hh:mm:ss
  const [dd, mm, yyyy] = [parts.day, parts.month, parts.year].map(x => parseInt(x, 10));
  const [HH, MM, SS] = [parts.hour, parts.minute, parts.second].map(x => parseInt(x, 10));
  return { yyyy, mm, dd, HH, MM, SS };
}

function startOfDayInTZ(d, tz = "Europe/London") {
  const { yyyy, mm, dd } = tzDateParts(d, tz);
  // construct a Date as if it’s midnight in that TZ by using the offset at that time
  const guess = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0)); // noon UTC same day (safe anchor)
  const offsetMinutes = -new Date(guess.toLocaleString("en-US", { timeZone: tz })).getTimezoneOffset?.() ?? 0;
  // Fallback: use Intl again to create local midnight in tz and read back in UTC:
  const localMid = new Date(new Date(`${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}T00:00:00`).toLocaleString("en-US", { timeZone: tz }));
  return new Date(Date.UTC(localMid.getFullYear(), localMid.getMonth(), localMid.getDate(), 0, 0, 0));
}

function lastNightRangeLondon(now = new Date()) {
  // “Last night” in UK: previous calendar day 00:00–23:59:59 in Europe/London.
  const todayStart = startOfDayInTZ(now, "Europe/London");
  const start = new Date(todayStart.getTime() - 24 * 3600 * 1000);
  const end = new Date(todayStart.getTime() - 1000); // 23:59:59 previous day
  return { start, end };
}

function inRangeLondon(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

/* -------------------- YouTube helpers -------------------- */

function parseFeed(xml) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const getText = (src, tag) => {
    const m = src.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
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
    const title = getText(e, "title").trim();
    const author = getText(e, "name") || getText(e, "author");
    const published = getText(e, "published") || getText(e, "updated");
    const idMatch = (link || "").match(/[?&]v=([A-Za-z0-9_\-]+)/) || e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = idMatch ? idMatch[1] : null;
    if (videoId) {
      items.push({
        id: videoId,
        title,
        channel: (author || "").trim(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        published
      });
    }
  }
  return items;
}

async function rssSearch(query) {
  const url = `https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 PopflareBot" } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml);
  } catch {
    return [];
  }
}

async function channelFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 PopflareBot" } });
    if (!res.ok) return [];
    return parseFeed(await res.text());
  } catch {
    return [];
  }
}

function uniqueById(arr) {
  const set = new Set();
  const out = [];
  for (const i of arr) {
    if (!set.has(i.id)) {
      set.add(i.id);
      out.push(i);
    }
  }
  return out;
}

/* -------------------- Sources & filters -------------------- */

// Channels (stable) for highlights (official only)
const FOOTBALL_CHANNELS = [
  // Premier League
  "UCEg25rdRZXg32iwai6N6l0w", // Premier League
  "UCFxGUE7GJi0A6GZ2T9S8vAQ", // Sky Sports Football
  "UC8-5-0goCA8W4Q6qWQ795GA", // Sky Sports Premier League
  "UCgkzM7IL2ezJ-hZyOQGIDjA", // TNT Sports

  // LaLiga
  "UCQ0z5gR3UAn4hZ-ld0hZyXg", // LALIGA (main / ENG)
  "UCqZQlzSHbVJrwrn5Xvzf5Nw", // LALIGA (ESP)

  // Serie A
  "UCWwWbVXtTnAwP6mZ2IHtF3w", // Serie A

  // Bundesliga
  "UCqZQlzSHbVJrwrn5Xvzf5Nw", // (placeholder safeguard – most Bundesliga on main channel)
  "UCVCk2hWq3xZCPR_Mv5dQKjA", // Bundesliga

  // Ligue 1
  "UC7Vb6kZ4bC0h2YtHqLQhSVA", // Ligue 1 Uber Eats (EN)
];

// Fallback text search (used lightly)
const FOOTBALL_QUERIES = [
  { q: "Premier League highlights", allow: ["Premier League", "Sky Sports", "TNT Sports"] },
  { q: "LaLiga highlights", allow: ["LALIGA"] },
  { q: "Serie A highlights", allow: ["Serie A", "Legaseriea"] },
  { q: "Bundesliga highlights", allow: ["Bundesliga"] },
  { q: "Ligue 1 highlights", allow: ["Ligue 1"] }
];

// Official trailers
const TRAILER_CHANNELS = [
  "UCjmJDM5pRKbUlVIzDYYWb6g", // Warner Bros. Pictures
  "UCz97F7dMxBNOfGYu3rx8aCw", // Sony Pictures Entertainment
  "UCq0OueAsdxH6b8nyAspwViw", // Universal Pictures
  "UCZ9Z0gl2C2cIrQ6zduKQ4Sw", // Paramount Pictures
  "UCiaZbz_0ZdOczSJ4Zz1JZ1g", // 20th Century Studios
  "UCWOA1ZGywLbqmigxE4Qlvuw", // Netflix
  "UCi8e0iOVk1fEOogdfu4YgfA", // Movieclips Trailers
  "UCCmGz1YVwe6OCQZ2GXaQW6w"  // Rotten Tomatoes Trailers
];

// Viral
const VIRAL_CHANNELS = [
  "UCF1d0-5V4ZkOFay8Zz5dZ4w", // FailArmy
  "UCR3lqaa4qfH5_a77Uj5UuQA", // LADbible TV
  "UCk2be0S4D22W8dDk8KZ0g-Q", // UNILAD
  "UCp3hHhY4ZzvXhzl7cY5GKEA", // People Are Awesome
  "UCiWLfSweyRNmLpgEHekhoAg"  // SportsCenter
];

// UK Pop — we’ll prefer Official Charts + “VEVO” + top artists’ official channels
const UKPOP_QUERIES = [
  { q: "Official Charts Top 40 official video", allow: ["Official Charts"] },
  { q: "UK Top 40 official video", allow: ["Vevo", "Official Charts", "BBC Radio 1"] }
];

const BAD_WORDS = /(audio only|lyric|lyrics|teaser|reaction|review|instrumental|sped\s*up|slowed|nightcore|visualizer|shorts)/i;

/* -------------------- Build sections -------------------- */

async function buildFootball() {
  // Time window = last night (UK)
  const { start, end } = lastNightRangeLondon();

  let all = [];
  // 1) channel feeds
  for (const ch of FOOTBALL_CHANNELS) {
    const f = await channelFeed(ch);
    const subset = f.filter(
      v =>
        /highlight/i.test(v.title) &&
        inRangeLondon(v.published, start, end)
    );
    all = all.concat(subset);
  }
  // 2) light search fallback
  for (const s of FOOTBALL_QUERIES) {
    const f = await rssSearch(s.q);
    const subset = f.filter(
      v =>
        /highlight/i.test(v.title) &&
        s.allow.some(a => (v.channel || "").toLowerCase().includes(a.toLowerCase())) &&
        inRangeLondon(v.published, start, end)
    );
    all = all.concat(subset);
  }
  all = uniqueById(all).slice(0, 60);
  writeFileSync(join(outDir, "football.json"), JSON.stringify({ updatedAt: new Date().toISOString(), items: all }, null, 2));
  console.log("Written football:", all.length);
}

async function buildTrailers() {
  let all = [];
  for (const ch of TRAILER_CHANNELS) {
    const f = await channelFeed(ch);
    const subset = f.filter(v => /official\s+trailer/i.test(v.title) && !BAD_WORDS.test(v.title));
    all = all.concat(subset);
  }
  if (all.length < 40) {
    const extra = await rssSearch("official trailer 2025");
    all = all.concat(extra.filter(v => /official\s+trailer/i.test(v.title)));
  }
  all = uniqueById(all).slice(0, 40);
  writeFileSync(join(outDir, "trailers.json"), JSON.stringify({ updatedAt: new Date().toISOString(), items: all }, null, 2));
  console.log("Written trailers:", all.length);
}

async function buildViral() {
  let all = [];
  for (const ch of VIRAL_CHANNELS) {
    const f = await channelFeed(ch);
    const subset = f.filter(v => !/compilation removed|copyright/i.test(v.title));
    all = all.concat(subset);
  }
  if (all.length < 100) {
    const f1 = await rssSearch("funny fails 2025");
    const f2 = await rssSearch("try not to laugh 2025");
    all = all.concat(f1, f2);
  }
  all = uniqueById(all)
    .filter(v => !BAD_WORDS.test(v.title))
    .slice(0, 100);
  writeFileSync(join(outDir, "viral.json"), JSON.stringify({ updatedAt: new Date().toISOString(), items: all }, null, 2));
  console.log("Written viral:", all.length);
}

async function buildUKPop() {
  let all = [];
  for (const s of UKPOP_QUERIES) {
    const f = await rssSearch(s.q);
    const subset = f.filter(v => {
      const title = v.title.toLowerCase();
      const ch = (v.channel || "").toLowerCase();
      const looksOfficial =
        /official (music )?video/.test(title) &&
        !BAD_WORDS.test(title);
      const goodChannel = s.allow.some(a => ch.includes(a.toLowerCase())) || ch.includes("vevo");
      return looksOfficial && goodChannel;
    });
    all = all.concat(subset);
  }
  all = uniqueById(all).slice(0, 100);
  writeFileSync(join(outDir, "ukpop.json"), JSON.stringify({ updatedAt: new Date().toISOString(), items: all }, null, 2));
  console.log("Written ukpop:", all.length);
}

(async () => {
  await buildFootball();
  await buildTrailers();
  await buildUKPop();
  await buildViral();
  console.log("All feeds built.");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
