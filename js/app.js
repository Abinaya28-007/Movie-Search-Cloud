const $ = id => document.getElementById(id);
const els = {
  form: $("form"), q: $("q"), type: $("type"), year: $("year"),
  recent: $("recent"), status: $("status"), results: $("results"), more: $("moreBtn"),
  searchView: $("searchView"), favView: $("favView"), favGrid: $("favGrid"), favStatus: $("favStatus"),
  favCount: $("favCount"), tabSearch: $("tabSearch"), tabFav: $("tabFav"),
  theme: $("themeBtn"), dialog: $("detail")
};

const NO_POSTER = "data:image/svg+xml;utf8," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect width='200' height='300' fill='#8893ad'/><text x='100' y='155' fill='#fff' font-size='16' text-anchor='middle'>No poster</text></svg>");

const state = { query: "", type: "", year: "", page: 1, total: 0, loaded: 0 };

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const poster = p => (p && p !== "N/A") ? p : NO_POSTER;

/* ---------- theme ---------- */
function applyTheme(t) { document.documentElement.dataset.theme = t; Store.set("theme", t); }
applyTheme(Store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
els.theme.addEventListener("click", () =>
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

/* ---------- cards ---------- */
function cardHTML(m) {
  const fav = Store.isFav(m.imdbID);
  return `
    <article class="card">
      <button class="open" data-id="${m.imdbID}" aria-label="Details for ${esc(m.Title)}">
        <img src="${poster(m.Poster)}" alt="" loading="lazy">
        <div class="meta"><b>${esc(m.Title)}</b><span>${esc(m.Year)}</span></div>
      </button>
      <button class="heart" data-fav="${m.imdbID}" aria-pressed="${fav}"
        data-title="${esc(m.Title)}" data-year="${esc(m.Year)}" data-poster="${esc(m.Poster)}">
        ${fav ? "Saved" : "Save"}
      </button>
    </article>`;
}

function skeletons(n = 8) {
  return Array.from({ length: n }, () => '<div class="skeleton"></div>').join("");
}

/* ---------- search ---------- */
async function runSearch(reset = true) {
  if (reset) {
    state.query = els.q.value.trim();
    state.type = els.type.value;
    state.year = els.year.value.trim();
    state.page = 1; state.loaded = 0;
    if (!state.query) return;
    Store.addRecent(state.query);
    renderRecent();
    els.results.innerHTML = skeletons();
  }
  els.status.textContent = "Searching...";
  els.more.hidden = true;
  try {
    const data = await searchMovies(state);
    state.total = Number(data.totalResults);
    state.loaded += data.Search.length;
    const html = data.Search.map(cardHTML).join("");
    if (reset) els.results.innerHTML = html; else els.results.insertAdjacentHTML("beforeend", html);
    els.status.textContent = `Showing ${state.loaded} of ${state.total} results for "${state.query}"`;
    els.more.hidden = state.loaded >= state.total;
  } catch (err) {
    if (reset) els.results.innerHTML = "";
    els.status.textContent = err.message;
  }
}

els.form.addEventListener("submit", e => { e.preventDefault(); runSearch(true); });
els.more.addEventListener("click", () => { state.page++; runSearch(false); });

/* ---------- recent searches ---------- */
function renderRecent() {
  const list = Store.recent();
  els.recent.innerHTML = list.length
    ? list.map(t => `<button type="button" data-term="${esc(t)}">${esc(t)}</button>`).join("") +
      `<button type="button" data-clear="1">Clear</button>`
    : "";
}
els.recent.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.clear) { Store.clearRecent(); renderRecent(); return; }
  els.q.value = b.dataset.term;
  runSearch(true);
});

/* ---------- favorites ---------- */
function updateFavCount() { els.favCount.textContent = Store.favorites().length; }

function renderFavorites() {
  const favs = Store.favorites();
  els.favGrid.innerHTML = favs.map(cardHTML).join("");
  els.favStatus.textContent = favs.length ? `${favs.length} saved` : "Nothing saved yet. Use Save on any movie.";
}

function handleFavClick(btn) {
  const id = btn.dataset.fav;
  Store.toggleFav({
    imdbID: id, Title: btn.dataset.title, Year: btn.dataset.year, Poster: btn.dataset.poster
  });
  updateFavCount();
  document.querySelectorAll(`.heart[data-fav="${id}"]`).forEach(h => {
    const on = Store.isFav(id);
    h.setAttribute("aria-pressed", on);
    h.textContent = on ? "Saved" : "Save";
  });
  if (!els.favView.hidden) renderFavorites();
}

/* ---------- tabs ---------- */
function showTab(name) {
  const fav = name === "fav";
  els.searchView.hidden = fav;
  els.favView.hidden = !fav;
  els.tabSearch.classList.toggle("active", !fav);
  els.tabFav.classList.toggle("active", fav);
  if (fav) renderFavorites();
}
els.tabSearch.addEventListener("click", () => showTab("search"));
els.tabFav.addEventListener("click", () => showTab("fav"));

/* ---------- details modal ---------- */
async function openDetail(id) {
  els.dialog.innerHTML = "<p>Loading...</p>";
  els.dialog.showModal();
  try {
    const m = await getMovie(id);
    const fav = Store.isFav(id);
    const ratings = (m.Ratings || []).map(r => `<span>${esc(r.Source)}: ${esc(r.Value)}</span>`).join("");
    els.dialog.innerHTML = `
      <div class="row">
        <img src="${poster(m.Poster)}" alt="Poster of ${esc(m.Title)}">
        <div>
          <h2>${esc(m.Title)} (${esc(m.Year)})</h2>
          <p class="facts">${esc(m.Rated)} | ${esc(m.Runtime)} | ${esc(m.Genre)}</p>
          <div class="ratings">${ratings}</div>
        </div>
      </div>
      <p>${esc(m.Plot)}</p>
      <p class="facts">Director: ${esc(m.Director)}<br>Cast: ${esc(m.Actors)}<br>
        Language: ${esc(m.Language)}<br>Awards: ${esc(m.Awards)}</p>
      <div class="dlg-actions">
        <button class="primary" id="dlgFav" type="button"
          data-fav="${id}" data-title="${esc(m.Title)}" data-year="${esc(m.Year)}" data-poster="${esc(m.Poster)}">
          ${fav ? "Saved" : "Save to favorites"}
        </button>
        <a href="https://www.imdb.com/title/${id}/" target="_blank" rel="noopener"><button type="button">Open on IMDb</button></a>
        <button type="button" id="dlgClose">Close</button>
      </div>`;
    $("dlgClose").addEventListener("click", () => els.dialog.close());
    $("dlgFav").addEventListener("click", e => {
      handleFavClick(e.currentTarget);
      e.currentTarget.textContent = Store.isFav(id) ? "Saved" : "Save to favorites";
    });
  } catch (err) {
    els.dialog.innerHTML = `<p>${esc(err.message)}</p><button type="button" id="dlgClose">Close</button>`;
    $("dlgClose").addEventListener("click", () => els.dialog.close());
  }
}
els.dialog.addEventListener("click", e => { if (e.target === els.dialog) els.dialog.close(); });

/* ---------- shared grid clicks ---------- */
[els.results, els.favGrid].forEach(grid => grid.addEventListener("click", e => {
  const heart = e.target.closest(".heart");
  if (heart) return handleFavClick(heart);
  const open = e.target.closest(".open");
  if (open) openDetail(open.dataset.id);
}));

/* ---------- init ---------- */
renderRecent();
updateFavCount();