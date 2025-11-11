// scripts/generate_pages.mjs
// Build static SEO pages from existing Popflare JSON feeds.
// Input:  public/content/{football,trailers,ukpop,viral}.json
// Output: public/{football,trailers,ukpop,viral}/index.html
//         public/v/{videoId}/index.html
//         public/sitemap.xml  public/robots.txt

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUB  = join(ROOT, "public");
const CONTENT_DIR = join(PUB, "content");

// ----------- Site meta (edit to taste) ----------------
const SITE = {
  domain: "https://popflare.co.uk",
  name: "Popflare",
  tagline: "The Pulse of Football, Films & Feels",
  author: "Popflare",
  twitter: "@popflare",       // optional
  locale: "en_GB",
  themeColor: "#0f0f10",
  accent: "#FF3366"
};

// ---------- helpers -----------------------------------
function htmlEscape(s = "") {
  return s.replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function thumb(id) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }
function pageTitle(title) { return `${title} — ${SITE.name}`; }
function canonical(path) { return `${SITE.domain}${path.replace(/\/{2,}/g,"/")}`; }
function dtISO(d) { return new Date(d).toISOString(); }
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { year:"numeric", month:"short", day:"2-digit" }); }
  catch { return ""; }
}
function ensureDir(dir) { mkdirSync(dir, { recursive: true }); }

// ---------- base layout -------------------------------
function baseLayout({ title, description, path, ogImage, body, noIndex = false }) {
  const canonicalUrl = canonical(path);
  const desc = htmlEscape(description || SITE.tagline);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${htmlEscape(pageTitle(title))}</title>
  <meta name="description" content="${desc}"/>
  <meta name="theme-color" content="${SITE.themeColor}"/>
  <link rel="icon" href="/assets/pf-logo.svg" type="image/svg+xml"/>
  <link rel="stylesheet" href="/assets/style.css"/>

  <link rel="canonical" href="${canonicalUrl}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="${SITE.name}"/>
  <meta property="og:title" content="${htmlEscape(title)}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:url" content="${canonicalUrl}"/>
  ${ogImage ? `<meta property="og:image" content="${ogImage}"/>` : ""}

  <meta name="twitter:card" content="summary_large_image"/>
  ${SITE.twitter ? `<meta name="twitter:site" content="${SITE.twitter}"/>` : ""}

  ${noIndex ? `<meta name="robots" content="noindex,follow"/>` : ""}

  <style>
    /* lightweight additions for grid/detail */
    .wrap { max-width: 1100px; margin: 0 auto; padding: 1rem; }
    .page-title { font-size: 1.6rem; margin: 1rem 0; }
    .lead { color:#aaa; margin-bottom: 1rem; }
    .grid-cards { display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); }
    .card a { text-decoration:none; color:inherit; }
    .chip { display:inline-block; padding:.25rem .6rem; border:1px solid #333; border-radius:999px; font-size:.8rem; color:#bbb; }
    .meta-line { color:#999; font-size:.9rem; margin:.25rem 0 .5rem; }
    .thumb { width:100%; aspect-ratio:16/9; background:#111; border-radius:.75rem; overflow:hidden; display:block }
    .thumb img { width:100%; height:100%; object-fit:cover; display:block }
    .footer-links { text-align:center; margin:2rem 0; color:#999; font-size:.9rem}
    .footer-links a{ color:${SITE.accent}; text-decoration:none }
  </style>
</head>
<body>
  <header class="header">
    <div class="wrap">
      <div class="brand">
        <img src="/assets/pf-logo.svg" alt="Popflare Logo" width="32" height="32"/>
        <div class="brand-title">${SITE.name}</div>
      </div>
      <nav class="nav">
        <a class="tab" href="/football/">Last Night’s Football</a>
        <a class="tab" href="/trailers/">Upcoming movie trailers</a>
        <a class="tab" href="/ukpop/">UK Pop Top 100</a>
        <a class="tab" href="/viral/">Viral</a>
        <a class="tab" href="/about.html">About</a>
        <a class="tab" href="/contact.html">Contact</a>
      </nav>
    </div>
  </header>

  <main class="wrap">
    ${body}
    <footer class="footer-links">
      © ${new Date().getFullYear()} ${SITE.name} — ${SITE.tagline}
      <br/>
      <a href="/privacy.html">Privacy Policy</a> •
      <a href="/terms.html">Terms of Use</a> •
      <a href="/contact.html">Contact</a>
    </footer>
  </main>
</body>
</html>`;
}

// ---------- category page -----------------------------
function renderCategory({ slug, title, intro, items, updatedAt }) {
  const path = `/${slug}/`;
  const ogImage = items[0] ? thumb(items[0].id) : `${SITE.domain}/assets/pf-logo.svg`;

  const cards = items.map(v => {
    const safeTitle = htmlEscape(v.title);
    const url = `/v/${encodeURIComponent(v.id)}/`;
    return `
    <article class="card">
      <a href="${url}" title="${safeTitle}">
        <span class="thumb"><img alt="${safeTitle}" src="${thumb(v.id)}" loading="lazy"/></span>
        <h3 class="page-title" style="font-size:1rem;margin:.5rem 0;">${safeTitle}</h3>
        <div class="meta-line">${htmlEscape(v.channel || "")} • ${fmtDate(v.published)}</div>
      </a>
    </article>`;
  }).join("");

  const body = `
    <h1 class="page-title">${htmlEscape(title)}</h1>
    <p class="lead">${htmlEscape(intro || "")}</p>
    <p class="meta-line"><span class="chip">Updated ${fmtDate(updatedAt)}</span></p>
    <section class="grid-cards">${cards}</section>
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": intro || SITE.tagline,
      "dateModified": dtISO(updatedAt),
      "url": canonical(path)
    })}
    </script>
  `;

  return baseLayout({
    title, description: intro || SITE.tagline, path, ogImage, body
  });
}

// ---------- video detail page -------------------------
function renderVideo({ item }) {
  const path = `/v/${encodeURIComponent(item.id)}/`;
  const title = item.title;
  const description = `${item.channel || ""} — ${SITE.name}`;
  const ogImage = thumb(item.id);

  const body = `
    <article>
      <h1 class="page-title">${htmlEscape(title)}</h1>
      <div class="meta-line">${htmlEscape(item.channel || "")} • ${fmtDate(item.published)}</div>
      <div style="margin:1rem 0;border-radius:.75rem;overflow:hidden;aspect-ratio:16/9;background:#000">
        <iframe
          src="https://www.youtube.com/embed/${item.id}"
          title="${htmlEscape(title)}"
          loading="lazy"
          allowfullscreen
          style="width:100%;height:100%;border:0"></iframe>
      </div>
      <p class="lead">Curated by ${SITE.name}. Enjoy more in <a href="/football/">Football</a>,
      <a href="/trailers/">Trailers</a>, <a href="/ukpop/">UK Pop</a>, or <a href="/viral/">Viral</a>.</p>

      <script type="application/ld+json">
      ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title,
        "description": description,
        "thumbnailUrl": ogImage,
        "uploadDate": dtISO(item.published || new Date()),
        "author": item.channel || "Unknown",
        "embedUrl": `https://www.youtube.com/embed/${item.id}`,
        "url": canonical(path),
        "publisher": {
          "@type": "Organization",
          "name": SITE.name
        }
      })}
      </script>
    </article>
  `;

  return baseLayout({ title, description, path, ogImage, body });
}

// ---------- load feeds & build ------------------------
function loadFeed(name) {
  const p = join(CONTENT_DIR, `${name}.json`);
  const raw = JSON.parse(readFileSync(p, "utf8"));
  const items = (raw.items || []).map(x => ({
    id: x.id,
    title: x.title || "",
    channel: x.channel || "",
    published: x.published || x.publishedAt || null
  }));
  return { items, updatedAt: raw.updatedAt || new Date().toISOString() };
}

function writeFile(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
  console.log("📝 wrote", path.replace(PUB, ""));
}

function cleanDir(dir) {
  if (existsSync(dir)) {
    for (const f of readdirSync(dir, { withFileTypes:true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) rmSync(p, { recursive:true, force:true });
      else rmSync(p, { force:true });
    }
  } else {
    mkdirSync(dir, { recursive:true });
  }
}

function buildCategory(slug, title, intro) {
  const { items, updatedAt } = loadFeed(slug);
  // category page
  const html = renderCategory({ slug, title, intro, items, updatedAt });
  writeFile(join(PUB, slug, "index.html"), html);

  // video pages
  for (const item of items) {
    const vhtml = renderVideo({ item });
    writeFile(join(PUB, "v", item.id, "index.html"), vhtml);
  }
  return items.map(i => `/v/${i.id}/`);
}

function buildSitemap(paths) {
  const urls = paths.map(p => `<url><loc>${canonical(p)}</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.domain}/</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE.domain}/football/</loc></url>
  <url><loc>${SITE.domain}/trailers/</loc></url>
  <url><loc>${SITE.domain}/ukpop/</loc></url>
  <url><loc>${SITE.domain}/viral/</loc></url>
  ${urls}
</urlset>`;
  writeFile(join(PUB, "sitemap.xml"), xml);
}

function buildRobots() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE.domain}/sitemap.xml
`;
  writeFile(join(PUB, "robots.txt"), robots);
}

// ---- run ------------------------------------------------
(function run(){
  console.log("🔧 Generating static SEO pages from feeds…");
  ensureDir(PUB);

  // optional: clean old detail pages
  cleanDir(join(PUB, "v"));

  const allDetailPaths = []
    .concat(buildCategory("football", "Last Night’s Football", "The best official highlights and goals from last night’s action across Premier League, EFL, Europe and beyond."))
    .concat(buildCategory("trailers", "Upcoming Movie Trailers", "The freshest official trailers from Hollywood studios and streamers — updated daily."))
    .concat(buildCategory("ukpop", "UK Pop Top 100", "Today’s top official UK music videos, trending tracks and new releases."))
    .concat(buildCategory("viral", "Viral Videos", "Can’t-miss viral clips trending across the web right now."));

  buildSitemap(allDetailPaths);
  buildRobots();

  console.log("✅ Done. Pages + sitemap generated.");
})();
