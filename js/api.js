const OMDB = "https://www.omdbapi.com/";

async function request(params) {
  const qs = new URLSearchParams(params);
  let url;
  if (CONFIG.useProxy) {
    url = `/api/movies?${qs}`;
  } else {
    qs.set("apikey", CONFIG.apiKey);
    url = `${OMDB}?${qs}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  if (data.Response === "False") throw new Error(data.Error || "No results found.");
  return data;
}

function searchMovies({ query, type, year, page }) {
  const p = { s: query, page };
  if (type) p.type = type;
  if (year) p.y = year;
  return request(p);
}

function getMovie(id) {
  return request({ i: id, plot: "full" });
}