import fetch from "node-fetch";
import { writeFileSync } from "fs";
import { join } from "path";

const outDir = process.argv[2] || "public/content";
const now = new Date();

function isFromPreviousNight(dateStr){
  const d = new Date(dateStr);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today); start.setUTCDate(start.getUTCDate()-1);
  const end = new Date(today); end.setUTCHours(23,59,59,999);
  return d >= start && d <= end;
}
function parseFeed(xml){
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const get = (src, tag)=>{ const m = src.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return m?m[1]:""; };
  const getAttr = (src, tag, attr)=>{ const m = src.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`)); return m?m[1]:""; };
  let m;
  while((m = entryRegex.exec(xml))){
    const e = m[1];
    const link = getAttr(e,"link","href");
    const title = get(e,"title");
    const author = get(e,"name") || get(e,"author");
    const published = get(e,"published") || get(e,"updated");
    const idMatch = (link||"").match(/v=([A-Za-z0-9_\-]+)/);
    const videoId = idMatch ? idMatch[1] : get(e,"yt:videoId");
    if(videoId){
      items.push({ id: videoId, title, channel: author, url:`https://www.youtube.com/watch?v=${videoId}`, embedUrl:`https://www.youtube.com/embed/${videoId}`, published });
    }
  }
  return items;
}
async function rssSearch(query){
  const url = `https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {headers:{'user-agent':'Mozilla/5.0'}});
  if(!res.ok) return [];
  return parseFeed(await res.text());
}
const FOOTBALL_SOURCES = [
  {query:"Premier League highlights", allow:["TNT Sports","Sky Sports Premier League","Premier League","Sky Sports Football"]},
  {query:"LaLiga highlights", allow:["LaLiga EA Sports","LaLiga Santander","LALIGA"]},
  {query:"Serie A highlights", allow:["Serie A","Legaseriea"]},
  {query:"Bundesliga highlights", allow:["Bundesliga"]},
  {query:"Ligue 1 highlights", allow:["Ligue 1 Uber Eats","Ligue 1 English","Ligue 1"]},
  {query:"UEFA Champions League highlights", allow:["UEFA","UEFA Champions League","TNT Sports"]}
];
const TRAILER_SOURCES = [
  {query:"official trailer 2025", allow:["Movieclips Trailers","Rotten Tomatoes Trailers","Warner Bros. Pictures","Sony Pictures Entertainment","Universal Pictures","Paramount Pictures","20th Century Studios","Netflix"]}
];
const VIRAL_SOURCES = [
  {query:"funny fails 2025", allow:["FailArmy","LADbible","UNILAD","People Are Awesome","SportsCenter"]},
  {query:"try not to laugh 2025", allow:["FailArmy","LADbible","UNILAD","America's Funniest Home Videos"]}
];
const UKPOP_SOURCES = [
  {query:"Official Charts Top 40 official video", allow:["Official Charts","BBC Radio 1","Vevo UK","TaylorSwiftVEVO","DUALIPA","Ed Sheeran","OliviaRodrigoVEVO","ArianaGrandeVevo","TheWeekndVEVO"]}
];
function uniqueById(arr){ const seen=new Set(); const out=[]; for(const it of arr){ if(!seen.has(it.id)){seen.add(it.id); out.push(it);} } return out; }
async function buildSection(section, sources, filterFn, cap){
  let collected=[];
  for(const s of sources){
    const feed = await rssSearch(s.query);
    const allow = feed.filter(v => s.allow.some(a => (v.channel||'').toLowerCase().includes(a.toLowerCase())));
    const filtered = allow.filter(filterFn);
    collected = collected.concat(filtered);
  }
  collected = uniqueById(collected).slice(0, cap);
  const json = {updatedAt: new Date().toISOString(), items: collected};
  writeFileSync(join(outDir, `${section}.json`), JSON.stringify(json, null, 2));
  console.log(`Written ${section}:`, collected.length);
}
(async()=>{
  await buildSection("football", FOOTBALL_SOURCES, v => /highlight/i.test(v.title) && isFromPreviousNight(v.published), 60);
  await buildSection("trailers", TRAILER_SOURCES, v => /trailer/i.test(v.title), 40);
  await buildSection("ukpop", UKPOP_SOURCES, v => /official|video|performance/i.test(v.title), 100);
  await buildSection("viral", VIRAL_SOURCES, v => true, 100);
  console.log("All feeds built.");
})().catch(e=>{console.error(e); process.exit(1);});
