const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const overpassFilters = {
  cafe: '["amenity"~"cafe|restaurant|fast_food|bar"]',
  architecture: '["tourism"~"museum|attraction|gallery|viewpoint"]',
  park: '["leisure"~"park|garden|nature_reserve"]',
  photo: '["tourism"~"attraction|viewpoint"]',
};
const placesQuery = (lat, lon, categories) => {
  const selected = categories.filter((category) => overpassFilters[category]);
  const active = selected.length ? selected : Object.keys(overpassFilters);
  const statements = active.map((category) => `nwr(around:3500,${lat},${lon})${overpassFilters[category]};`).join('');
  return `[out:json][timeout:25];(${statements});out center tags;`;
};
const sendJson = (res, status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(payload)); };
const proxyPlaces = async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost:8000');
  const lat = Number(requestUrl.searchParams.get('lat'));
  const lon = Number(requestUrl.searchParams.get('lon'));
  const categories = (requestUrl.searchParams.get('categories') || '').split(',').filter(Boolean);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return sendJson(res, 400, { error: 'Invalid coordinates' });
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(placesQuery(lat, lon, categories))}`);
      if (response.ok) return sendJson(res, 200, await response.json());
    } catch (error) { /* Try the next public Overpass instance. */ }
  }
  return sendJson(res, 502, { error: 'Places service unavailable' });
};
http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/places')) return proxyPlaces(req, res);
  const requested = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, requested === '/' ? 'index.html' : requested);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(8000, '127.0.0.1', () => console.log('CityWalk: http://localhost:8000'));
