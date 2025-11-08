
// assets/app.js — Popflare v5
const TABS = {
  football: "content/football.json",
  trailers: "content/trailers.json",
  ukpop: "content/ukpop.json",
  viral: "content/viral.json",
};

const state = {
  current: "football",
  items: [],
  page: 0,
  pageSize: 12,
  loading: false,
  end: false
};

const grid = document.getElementById("grid");
const updatedEl = document.getElementById("updated");

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === state.current) return;
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    switchTab(btn.dataset.tab);
  });
});

async function switchTab(tab) {
  state.current = tab;
  state.items = [];
  state.page = 0;
  state.end = false;
  grid.innerHTML = "";
  await loadFeed();
}

async function loadFeed() {
  state.loading = true;
  try {
    const res = await fetch(TABS[state.current] + "?t=" + Date.now());
    const data = await res.json();
    updatedEl.textContent = new Date(data.updatedAt || Date.now()).toLocaleString();
    state.items = data.items || [];
    appendPage();
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="card" style="grid-column:span 12; padding:16px">Failed to load content.</div>`;
  } finally {
    state.loading = false;
  }
}

function appendPage() {
  if (state.end) return;
  const start = state.page * state.pageSize;
  const slice = state.items.slice(start, start + state.pageSize);
  if (slice.length === 0) {
    state.end = true;
    return;
  }
  for (const v of slice) grid.appendChild(renderCard(v));
  state.page++;
}

function renderCard(v) {
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <div class="thumb">
      <iframe
        loading="lazy"
        src="${v.embedUrl}?rel=0&showinfo=0"
        title="${escapeHtml(v.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="body">
      <div class="title">${escapeHtml(v.title)}</div>
      <div class="meta-row">
        <span>${escapeHtml(v.channel || "")}</span>
        <span>•</span>
        <span>${new Date(v.published).toLocaleDateString()}</span>
      </div>
    </div>
  `;
  return el;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Infinite scroll
window.addEventListener("scroll", () => {
  if (state.loading || state.end) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 800;
  if (nearBottom) appendPage();
});

// Boot
switchTab(state.current);

// ---- AdSense helper (safe if you don't have an ID yet) ----
(function setupAds() {
  const cfg = window.POPFLARE_ADSENSE || {};
  if (!cfg.enabled || !cfg.client) {
    document.querySelectorAll(".ad-slot").forEach(x => x.textContent = "Ad slot");
    return;
  }
  // inject client
  try {
    // top
    document.getElementById("ad-top").innerHTML =
      `<ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.client}" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    // bottom
    document.getElementById("ad-bottom").innerHTML =
      `<ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.client}" data-ad-slot="1234567891" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    (adsbygoogle = window.adsbygoogle || []).push({});
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.warn("Ads not initialized:", e);
  }
})();
