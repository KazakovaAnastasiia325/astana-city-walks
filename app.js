const moods = document.querySelectorAll('.mood');
moods.forEach((mood) => mood.addEventListener('click', () => mood.classList.toggle('active')));
document.querySelectorAll('.time-option').forEach((option) => option.addEventListener('click', () => {
  document.querySelectorAll('.time-option').forEach((item) => item.classList.remove('active'));
  option.classList.add('active');
}));

document.querySelectorAll('.save').forEach((save) => save.addEventListener('click', () => {
  save.textContent = save.textContent === '♡' ? '♥' : '♡';
}));

const cityMap = L.map('city-map', { zoomControl: false }).setView([51.125, 71.43], 12.5);
L.control.zoom({ position: 'bottomright' }).addTo(cityMap);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(cityMap);
const locations = [
  { name: 'Байтерек', type: 'Символ столицы', category: 'architecture photo', lat: 51.1283, lng: 71.4304, icon: '⌖' },
  { name: 'Ботанический сад', type: 'Прогулки и природа', category: 'park photo', lat: 51.0904, lng: 71.4171, icon: '♣' },
  { name: 'Территория EXPO', type: 'Архитектура и события', category: 'architecture photo', lat: 51.0907, lng: 71.4188, icon: '☕' },
  { name: 'Национальный музей', type: 'История и культура', category: 'architecture photo', lat: 51.1256, lng: 71.4681, icon: '⌖' },
  { name: 'Кофейня на Нуржол', type: 'Кофейня', category: 'cafe', lat: 51.1288, lng: 71.4318, icon: '☕' },
  { name: 'Парк Влюблённых', type: 'Парк', category: 'park photo', lat: 51.1322, lng: 71.4237, icon: '♣' },
  { name: 'Арбат Астаны', type: 'Прогулочная улица', category: 'photo architecture', lat: 51.1343, lng: 71.4314, icon: '📸' },
];
const pinIcon = (icon) => L.divIcon({ className: 'custom-pin-wrap', html: `<div class="custom-pin"><span>${icon}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
const markers = locations.map((place) => L.marker([place.lat, place.lng], { icon: pinIcon(place.icon) }).addTo(cityMap).bindPopup(`<b>${place.name}</b><br><span style="color:#74858b">${place.type}</span>`));
document.querySelectorAll('.map-place').forEach((button) => button.addEventListener('click', () => { const index = Number(button.dataset.index); cityMap.flyTo([locations[index].lat, locations[index].lng], 15, { duration: 0.8 }); markers[index].openPopup(); }));

const showToast = (message) => {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
};

document.querySelector('.profile-btn').addEventListener('click', () => showToast('Профиль будет доступен в следующей версии'));
document.querySelectorAll('.field').forEach((field) => field.addEventListener('click', () => {
  const strong = field.querySelector('strong');
  const values = strong.textContent.includes('час') ? ['◷ До 1 часа⌄', '◷ До 3 часов⌄', '◷ Весь день⌄'] : ['♧ Пешком⌄', '♧ На велосипеде⌄', '♧ На транспорте⌄'];
  const current = values.indexOf(strong.textContent);
  strong.textContent = values[(current + 1) % values.length];
  showToast(`Выбрано: ${strong.textContent.replace(/[◷♧⌄]/g, '').trim()}`);
}));

document.querySelectorAll('.route-card').forEach((card) => card.addEventListener('click', (event) => {
  if (!event.target.classList.contains('save')) showToast(`Маршрут «${card.querySelector('h3').textContent}» выбран`);
}));

let routeLine;
let selectedPlaces = [];
const routeBuild = document.querySelector('#route-build');
const routeResult = document.querySelector('#route-result');
const geocode = async (query) => {
  const known = locations.find((place) => query.toLowerCase().includes(place.name.toLowerCase()));
  if (known) return [known.lat, known.lng];
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kz&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
  const places = await response.json();
  if (!places.length) throw new Error(`Не нашли: ${query}`);
  return [Number(places[0].lat), Number(places[0].lon)];
};
const distance = (a, b) => Math.hypot((a[0] - b.lat) * 111, (a[1] - b.lng) * 69);
const renderNearby = (center = [51.1283, 71.4304]) => {
  const selectedCategories = [...document.querySelectorAll('.mood.active')].map((item) => item.dataset.category);
  const nearby = locations.filter((place) => selectedCategories.some((category) => place.category.includes(category))).sort((a, b) => distance(center, a) - distance(center, b)).slice(0, 6);
  document.querySelector('#nearby-count').textContent = `(${nearby.length})`;
  document.querySelector('#nearby-list').innerHTML = nearby.map((place) => `<label class="nearby-place"><input type="checkbox" value="${place.name}" ${selectedPlaces.some((item) => item.name === place.name) ? 'checked' : ''}><span class="nearby-icon">${place.icon}</span><span><b>${place.name}</b><small>${place.type} · ${(distance(center, place)).toFixed(1)} км рядом</small></span></label>`).join('');
  document.querySelectorAll('.nearby-place input').forEach((input) => input.addEventListener('change', () => { const place = locations.find((item) => item.name === input.value); selectedPlaces = input.checked ? [...selectedPlaces.filter((item) => item.name !== place.name), place] : selectedPlaces.filter((item) => item.name !== place.name); }));
};
renderNearby();
document.querySelector('#area-search-btn').addEventListener('click', async () => { const query = document.querySelector('#area-query').value.trim(); if (!query) return showToast('Напиши район или точку'); try { const center = await geocode(query); cityMap.flyTo(center, 14); renderNearby(center); showToast('Нашли места рядом'); } catch { showToast('Точку не удалось найти'); } });
document.querySelectorAll('.mood').forEach((mood) => mood.addEventListener('click', () => setTimeout(() => renderNearby(), 0)));
routeBuild.addEventListener('click', async () => {
  const from = document.querySelector('#route-from').value.trim();
  const to = document.querySelector('#route-to').value.trim();
  if (!from || !to) return showToast('Укажите начальную и конечную точки');
  routeBuild.disabled = true;
  routeBuild.innerHTML = 'Ищем маршрут…';
  const time = document.querySelector('.time-option.active').textContent;
  const interests = [...document.querySelectorAll('.mood.active')].map((item) => item.textContent.trim()).join(', ');
  try {
    const [start, finish] = await Promise.all([geocode(from), geocode(to)]);
    const waypoints = [start, ...selectedPlaces.map((place) => [place.lat, place.lng]), finish];
    let routeData;
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${waypoints.map((point) => `${point[1]},${point[0]}`).join(';')}?overview=full&geometries=geojson`);
      const data = await response.json();
      routeData = data.routes?.[0];
    } catch { routeData = null; }
    if (routeLine) cityMap.removeLayer(routeLine);
    const geometry = routeData?.geometry || { type: 'LineString', coordinates: waypoints.map((point) => [point[1], point[0]]) };
    routeLine = L.geoJSON(geometry, { style: { color: '#146b68', weight: 6, opacity: .85, dashArray: routeData ? null : '8 8' } }).addTo(cityMap);
    cityMap.fitBounds(routeLine.getBounds(), { padding: [35, 35] });
    const distance = routeData ? (routeData.distance / 1000).toFixed(1) : waypoints.slice(1).reduce((sum, point, index) => sum + Math.hypot((point[0] - waypoints[index][0]) * 111, (point[1] - waypoints[index][1]) * 69), 0).toFixed(1);
    const minutes = routeData ? Math.max(1, Math.round(routeData.duration / 60)) : Math.max(1, Math.round(Number(distance) * 12));
    routeResult.textContent = `${distance} км · примерно ${minutes} мин пешком`;
    showToast(`Маршрут создан: ${time} · ${interests}`);
  } catch (error) {
    showToast(error.message || 'Не удалось построить маршрут');
    routeResult.textContent = 'Проверьте названия мест';
  } finally {
    routeBuild.disabled = false;
    routeBuild.innerHTML = 'Построить маршрут <span>→</span>';
  }
});
