// Vercel serverless function: keeps the OMDb key off the browser.
// Set OMDB_API_KEY in Vercel -> Project Settings -> Environment Variables.
export default async function handler(req, res) {
  const key = process.env.OMDB_API_KEY;
  if (!key) return res.status(500).json({ Response: "False", Error: "Server API key missing." });

  const allowed = ["s", "i", "page", "type", "y", "plot"];
  const params = new URLSearchParams({ apikey: key });
  for (const k of allowed) if (req.query[k]) params.set(k, req.query[k]);

  try {
    const upstream = await fetch(`https://www.omdbapi.com/?${params}`);
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json(data);
  } catch {
    res.status(502).json({ Response: "False", Error: "Upstream request failed." });
  }
}