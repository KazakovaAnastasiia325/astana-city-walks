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
const featuredPlaces = [
  { id: 'featured-baiterek', name: 'Байтерек', wiki: 'Байтерек', lat: 51.1283, lon: 71.4304, icon: '🏛️', description: 'Главный символ Астаны и одна из самых узнаваемых точек города.' },
  { id: 'featured-museum', name: 'Национальный музей Казахстана', wiki: 'Национальный музей Республики Казахстан', lat: 51.1256, lon: 71.4681, icon: '🏺', description: 'Большой музейный комплекс с экспозициями об истории и культуре Казахстана.' },
  { id: 'featured-khan', name: 'Хан Шатыр', wiki: 'Хан-Шатыр', lat: 51.1326, lon: 71.4037, icon: '🏙️', description: 'Крупный торгово-развлекательный центр в необычном архитектурном здании.' },
  { id: 'featured-peace', name: 'Дворец мира и согласия', wiki: 'Дворец мира и согласия', lat: 51.1235, lon: 71.4694, icon: '🔺', description: 'Оригинальное здание в форме пирамиды рядом с важными достопримечательностями.' },
  { id: 'featured-expo', name: 'Территория EXPO', wiki: 'Астана Экспо', lat: 51.0907, lon: 71.4188, icon: '🌐', description: 'Современное пространство с необычной архитектурой и прогулочными зонами.' },
  { id: 'featured-garden', name: 'Ботанический сад', wiki: 'Ботанический сад (Астана)', lat: 51.0904, lon: 71.4171, icon: '🌳', description: 'Большая зелёная территория для спокойной прогулки и отдыха.' },
];
const commonsImage = async (query) => {
  try {
    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${query} Astana`)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
    const response = await fetch(endpoint);
    const data = response.ok ? await response.json() : {};
    const page = Object.values(data.query?.pages || {})[0];
    return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || '';
  } catch (error) { return ''; }
};
const proxyPopular = async (res) => {
  const cards = await Promise.all(featuredPlaces.map(async (place) => {
    try {
      const response = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.wiki)}`);
      const summary = response.ok ? await response.json() : {};
      const image = summary.thumbnail?.source || await commonsImage(place.name);
      return { ...place, description: summary.extract || place.description, image, article: summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
    } catch (error) {
      return { ...place, description: place.description, image: '', article: `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
    }
  }));
  return sendJson(res, 200, cards);
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
  if (req.url.startsWith('/api/popular')) return proxyPopular(res);
  if (req.url.startsWith('/api/places')) return proxyPlaces(req, res);
  const requested = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, requested === '/' ? 'index.html' : requested);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(8000, '127.0.0.1', () => console.log('CityWalk: http://localhost:8000'));
