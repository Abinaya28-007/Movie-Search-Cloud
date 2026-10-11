const Store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  favorites() { return this.get("favorites", []); },
  isFav(id) { return this.favorites().some(m => m.imdbID === id); },
  toggleFav(movie) {
    let favs = this.favorites();
    if (favs.some(m => m.imdbID === movie.imdbID)) {
      favs = favs.filter(m => m.imdbID !== movie.imdbID);
    } else {
      favs.push({ imdbID: movie.imdbID, Title: movie.Title, Year: movie.Year, Poster: movie.Poster });
    }
    this.set("favorites", favs);
    return favs;
  },
  recent() { return this.get("recent", []); },
  addRecent(term) {
    const list = [term, ...this.recent().filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    this.set("recent", list);
  },
  clearRecent() { this.set("recent", []); }
};