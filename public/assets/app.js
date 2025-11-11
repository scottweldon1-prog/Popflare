// Popflare app.js – final working version (no "Last updated" dependency)

async function loadTab(tab) {
  const grid = document.getElementById("grid");
  const updated = document.getElementById("updated"); // may not exist anymore
  grid.innerHTML = "Loading content…";

  try {
    const res = await fetch(`content/${tab}.json?${Date.now()}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      grid.innerHTML = `<p>No ${tab} videos available yet.</p>`;
      return;
    }

    // Only update timestamp if element exists
    if (updated) {
      updated.textContent = new Date(data.updatedAt).toLocaleString();
    }

    grid.innerHTML = data.items
      .map(
        (v) => `
        <div class="card">
          <iframe src="${v.embedUrl}" loading="lazy" allowfullscreen></iframe>
          <div class="info">
            <h3>${v.title}</h3>
            <p>${v.channel || ""}</p>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    grid.innerHTML = `<p>Error loading ${tab}: ${err.message}</p>`;
  }
}

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add("active");
  loadTab(tab);
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Default tab
loadTab("football");

