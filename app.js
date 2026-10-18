const moods = document.querySelectorAll('.mood');
moods.forEach((mood) => mood.addEventListener('click', () => mood.classList.toggle('active')));
const themeToggle = document.querySelector('#theme-toggle');
const setTheme = (theme) => { document.body.classList.toggle('dark-theme', theme === 'dark'); themeToggle.textContent = theme === 'dark' ? '☀️' : '☾'; localStorage.setItem('citywalk-theme', theme); };
setTheme(localStorage.getItem('citywalk-theme') || 'light');
themeToggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark'));
document.querySelectorAll('.time-option').forEach((option) => option.addEventListener('click', () => {
  document.querySelectorAll('.time-option').forEach((item) => item.classList.remove('active'));
  option.classList.add('active');
}));

document.querySelectorAll('.save').forEach((save) => save.addEventListener('click', () => {
  save.textContent = save.textContent === '♡' ? '♥' : '♡';
  const name = save.closest('.route-card').querySelector('h3').textContent;
  let saved = JSON.parse(localStorage.getItem('citywalk-saved') || '[]');
  saved = save.textContent === '♥' ? [...new Set([...saved, name])] : saved.filter((item) => item !== name);
  localStorage.setItem('citywalk-saved', JSON.stringify(saved));
  savedPlaces = saved;
  if (typeof renderSaved === 'function') renderSaved();
}));

const cityMap = L.map('city-map', { zoomControl: false }).setView([51.125, 71.43], 12.5);
L.control.zoom({ position: 'bottomright' }).addTo(cityMap);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>' }).addTo(cityMap);
let locations = [];
let markers = [];
const markerLayer = L.layerGroup().addTo(cityMap);
const categoryInfo = {
  cafe: { icon: '☕', label: 'Кафе и еда', filters: '["amenity"~"cafe|restaurant|fast_food|bar"]' },
  architecture: { icon: '🏛️', label: 'Архитектура и культура', filters: '["tourism"~"museum|attraction|gallery|viewpoint"]' },
  park: { icon: '🌳', label: 'Парки и природа', filters: '["leisure"~"park|garden|nature_reserve"]' },
  photo: { icon: '📸', label: 'Места для фото', filters: '["tourism"~"attraction|viewpoint"]' },
};
const fallbackLocations = [
  { id: 'fallback-baiterek', name: 'Байтерек', type: 'Архитектура и культура', category: 'architecture', lat: 51.1283, lng: 71.4304, icon: '🏛️' },
  { id: 'fallback-museum', name: 'Национальный музей', type: 'Архитектура и культура', category: 'architecture', lat: 51.1256, lng: 71.4681, icon: '🏛️' },
  { id: 'fallback-garden', name: 'Ботанический сад', type: 'Парки и природа', category: 'park', lat: 51.0904, lng: 71.4171, icon: '🌳' },
  { id: 'fallback-expo', name: 'Территория EXPO', type: 'Архитектура и культура', category: 'architecture', lat: 51.0907, lng: 71.4188, icon: '🏛️' },
  { id: 'fallback-park', name: 'Парк Влюблённых', type: 'Парки и природа', category: 'park', lat: 51.1322, lng: 71.4237, icon: '🌳' },
  { id: 'fallback-cafe', name: 'Кофейни на Нуржол', type: 'Кафе и еда', category: 'cafe', lat: 51.1288, lng: 71.4318, icon: '☕' },
];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const pinIcon = (icon) => L.divIcon({ className: 'custom-pin-wrap', html: `<div class="custom-pin"><span>${icon}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
const placeCategory = (tags = {}) => {
  if (tags.amenity) return 'cafe';
  if (tags.leisure) return 'park';
  return tags.tourism ? 'architecture' : 'photo';
};
const formatPlace = (element) => {
  const tags = element.tags || {};
  const center = element.center || element;
  const category = placeCategory(tags);
  return { id: `${element.type}-${element.id}`, name: tags['name:ru'] || tags.name || tags['name:en'] || 'Место без названия', type: categoryInfo[category].label, category, lat: Number(center.lat), lng: Number(center.lon), icon: categoryInfo[category].icon };
};
const renderMapMarkers = () => {
  markerLayer.clearLayers(); markers = [];
  locations.forEach((place) => {
    const marker = L.marker([place.lat, place.lng], { icon: pinIcon(place.icon) }).addTo(markerLayer).bindPopup(`<b>${escapeHtml(place.name)}</b><br><span style="color:#74858b">${escapeHtml(place.type)}</span>`);
    markers.push(marker);
  });
};
const overpassQuery = (center) => {
  const selected = [...document.querySelectorAll('.mood.active')].map((item) => item.dataset.category).filter((category) => categoryInfo[category]);
  const categories = selected.length ? selected : Object.keys(categoryInfo);
  const statements = categories.map((category) => `nwr(around:3500,${center[0]},${center[1]})${categoryInfo[category].filters};`).join('');
  return `[out:json][timeout:25];(${statements});out center tags;`;
};
const loadPlaces = async (center, notify = false) => {
  if (!locations.length) { locations = fallbackLocations; renderMapMarkers(); renderNearby(center); }
  let data;
  const selected = [...document.querySelectorAll('.mood.active')].map((item) => item.dataset.category).filter((category) => categoryInfo[category]);
  try {
    const response = await fetch(`/api/places?lat=${center[0]}&lon=${center[1]}&categories=${encodeURIComponent(selected.join(','))}`);
    if (!response.ok) throw new Error('Local places proxy error');
    data = await response.json();
  } catch (error) {
    const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    for (const endpoint of endpoints) {
      try { const response = await fetch(`${endpoint}?data=${encodeURIComponent(overpassQuery(center))}`); if (!response.ok) throw new Error('Overpass error'); data = await response.json(); break; } catch (fallbackError) { data = null; }
    }
  }
  if (!data) {
    locations = fallbackLocations;
    renderMapMarkers(); renderNearby(center);
    if (notify) showToast('Показали базовые места: сервис карт временно недоступен');
    return;
  }
  const unique = new Map();
  (data.elements || []).map(formatPlace).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)).forEach((place) => { if (!unique.has(place.name)) unique.set(place.name, place); });
  locations = [...unique.values()].sort((a, b) => distance(center, a) - distance(center, b)).slice(0, 80);
  selectedPlaces = selectedPlaces.filter((selected) => locations.some((place) => place.id === selected.id));
  renderMapMarkers(); renderNearby(center);
  if (notify) showToast(`Нашли ${locations.length} мест рядом`);
};

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
const featuredFallback = [
  { name: 'Байтерек', lat: 51.1283, lon: 71.4304, icon: '🏛️', description: 'Главный символ Астаны и одна из самых узнаваемых точек города.' },
  { name: 'Национальный музей Казахстана', lat: 51.1256, lon: 71.4681, icon: '🏺', description: 'Большой музейный комплекс с экспозициями об истории и культуре Казахстана.' },
  { name: 'Хан Шатыр', lat: 51.1326, lon: 71.4037, icon: '🏙️', description: 'Крупный торгово-развлекательный центр в необычном архитектурном здании.' },
  { name: 'Дворец мира и согласия', lat: 51.1235, lon: 71.4694, icon: '🔺', description: 'Оригинальное здание в форме пирамиды рядом с важными городскими достопримечательностями.' },
  { name: 'Территория EXPO', lat: 51.0907, lon: 71.4188, icon: '🌐', description: 'Современное пространство с архитектурными объектами и прогулочными зонами.' },
  { name: 'Ботанический сад', lat: 51.0904, lon: 71.4171, icon: '🌳', description: 'Большая зелёная территория для спокойной прогулки и отдыха.' },
];
const renderPopular = (places) => {
  const grid = document.querySelector('#popular-grid');
  grid.innerHTML = places.map((place) => `<article class="popular-card"><div class="popular-photo">${place.image ? `<img src="${escapeHtml(place.image)}" alt="${escapeHtml(place.name)}" loading="lazy">` : `<div class="popular-photo-fallback">${place.icon || '✦'}</div>`}<span class="popular-badge">Популярное место</span></div><div class="popular-body"><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml((place.description || 'Место для прогулки в Астане.').slice(0, 210))}${(place.description || '').length > 210 ? '…' : ''}</p><div class="popular-meta"><span class="popular-source">${place.image ? 'Фото Wikimedia' : 'Место на карте'}</span><button class="popular-open" data-lat="${place.lat}" data-lon="${place.lon}" data-name="${escapeHtml(place.name)}">На карте →</button></div>${place.article ? `<div class="popular-credit">Описание: <a href="${escapeHtml(place.article)}" target="_blank" rel="noreferrer">Wikipedia</a></div>` : ''}</div></article>`).join('');
  grid.querySelectorAll('.popular-open').forEach((button) => button.addEventListener('click', () => { const lat = Number(button.dataset.lat); const lon = Number(button.dataset.lon); cityMap.flyTo([lat, lon], 16, { duration: .8 }); showToast(`Открыли на карте: ${button.dataset.name}`); document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
};
fetch('/api/popular').then((response) => { if (!response.ok) throw new Error('popular'); return response.json(); }).then(renderPopular).catch(() => renderPopular(featuredFallback));

const profileModal = document.querySelector('#profile-modal');
const notesList = document.querySelector('#notes-list');
const notesCount = document.querySelector('#notes-count');
const noteInput = document.querySelector('#note-input');
const savedCount = document.querySelector('#saved-count');
let notes = JSON.parse(localStorage.getItem('citywalk-notes') || '[]');
const savedList = document.querySelector('#saved-list');
let savedPlaces = JSON.parse(localStorage.getItem('citywalk-saved') || '[]');
const renderSaved = () => {
  savedCount.textContent = savedPlaces.length;
  savedList.innerHTML = savedPlaces.length ? savedPlaces.map((place) => `<button class="saved-place" data-saved="${place}"><span>♡</span><b>${place}</b><strong>›</strong></button>`).join('') : '<p class="empty-notes">Нажми ♡ на карточке места, чтобы сохранить его.</p>';
  savedList.querySelectorAll('[data-saved]').forEach((item) => item.addEventListener('click', () => { const place = locations.find((location) => location.name === item.dataset.saved); if (place) { cityMap.flyTo([place.lat, place.lng], 16); markers[locations.indexOf(place)].openPopup(); profileModal.classList.remove('open'); } }));
};
const renderNotes = () => {
  notesCount.textContent = notes.length;
  notesList.innerHTML = notes.length ? notes.map((note, index) => `<div class="note-item"><span>✦</span><p>${note.replace(/[<>]/g, '')}</p><button data-note="${index}" aria-label="Удалить заметку">×</button></div>`).join('') : '<p class="empty-notes">Пока нет заметок. Добавь первую идею прогулки.</p>';
  notesList.querySelectorAll('[data-note]').forEach((button) => button.addEventListener('click', () => { notes.splice(Number(button.dataset.note), 1); localStorage.setItem('citywalk-notes', JSON.stringify(notes)); renderNotes(); }));
};
const storedName = localStorage.getItem('citywalk-name') || '';
const avatarOptions = [['🐱', 'Кот-путешественник'], ['🐶', 'Собака-путешественник'], ['🦒', 'Жираф-путешественник'], ['🦏', 'Носорог-путешественник'], ['🦩', 'Фламинго-путешественник']];
document.querySelectorAll('#avatar-picker [data-avatar]').forEach((avatar, index) => { const [icon, title] = avatarOptions[index]; avatar.dataset.avatar = icon; avatar.textContent = icon; avatar.title = title; });
const storedAvatar = avatarOptions.map(([icon]) => icon).includes(localStorage.getItem('citywalk-avatar')) ? localStorage.getItem('citywalk-avatar') : '🐱';
document.querySelector('#profile-name').value = storedName;
document.querySelector('#profile-title').textContent = storedName ? `Привет, ${storedName}` : 'Мой профиль';
document.querySelector('#avatar-current').textContent = storedAvatar;
document.querySelector('#profile-open').textContent = storedAvatar;
document.querySelectorAll('#avatar-picker [data-avatar]').forEach((avatar) => avatar.addEventListener('click', () => { const value = avatar.dataset.avatar; localStorage.setItem('citywalk-avatar', value); document.querySelector('#avatar-current').textContent = value; document.querySelector('#profile-open').textContent = value; showToast('Аватар обновлён'); }));
document.querySelector('#name-save').addEventListener('click', () => { const name = document.querySelector('#profile-name').value.trim(); localStorage.setItem('citywalk-name', name); document.querySelector('#profile-title').textContent = name ? `Привет, ${name}` : 'Мой профиль'; showToast('Имя сохранено'); });
const openProfile = () => { profileModal.classList.add('open'); profileModal.setAttribute('aria-hidden', 'false'); renderNotes(); renderSaved(); };
document.querySelector('#profile-open').addEventListener('click', openProfile);
document.querySelector('#profile-close').addEventListener('click', () => { profileModal.classList.remove('open'); profileModal.setAttribute('aria-hidden', 'true'); });
profileModal.addEventListener('click', (event) => { if (event.target === profileModal) profileModal.classList.remove('open'); });
document.querySelector('#note-add').addEventListener('click', () => { const value = noteInput.value.trim(); if (!value) return showToast('Напиши текст заметки'); notes.unshift(value); localStorage.setItem('citywalk-notes', JSON.stringify(notes)); noteInput.value = ''; renderNotes(); showToast('Заметка сохранена'); });
noteInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') document.querySelector('#note-add').click(); });
renderSaved();
renderNotes();
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
let currentLocation = null;
let userMarker = null;
const routeBuild = document.querySelector('#route-build');
const routeResult = document.querySelector('#route-result');
const geocode = async (query) => {
  if (currentLocation && query === 'Моё местоположение') return currentLocation;
  const known = locations.find((place) => query.toLowerCase().includes(place.name.toLowerCase()));
  if (known) return [known.lat, known.lng];
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kz&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
  const places = await response.json();
  if (!places.length) throw new Error(`Не нашли: ${query}`);
  return [Number(places[0].lat), Number(places[0].lon)];
};
const distance = (a, b) => Math.hypot((a[0] - b.lat) * 111, (a[1] - b.lng) * 69);
let activeCenter = [51.1283, 71.4304];
const renderNearby = (center = [51.1283, 71.4304]) => {
  const selectedCategories = [...document.querySelectorAll('.mood.active')].map((item) => item.dataset.category).filter((category) => categoryInfo[category]);
  const nearby = locations.filter((place) => !selectedCategories.length || selectedCategories.includes(place.category)).sort((a, b) => distance(center, a) - distance(center, b)).slice(0, 10);
  document.querySelector('#nearby-count').textContent = `(${nearby.length})`;
  document.querySelector('#nearby-list').innerHTML = nearby.length ? nearby.map((place) => `<label class="nearby-place"><input type="checkbox" value="${place.id}" ${selectedPlaces.some((item) => item.id === place.id) ? 'checked' : ''}><span class="nearby-icon">${place.icon}</span><span><b>${escapeHtml(place.name)}</b><small>${escapeHtml(place.type)} · ${(distance(center, place)).toFixed(1)} км рядом</small></span></label>`).join('') : '<p class="empty-map">По этим фильтрам мест не найдено.</p>';
  document.querySelector('#map-places').innerHTML = nearby.length ? nearby.slice(0, 8).map((place) => `<button class="map-place" data-place-id="${place.id}"><span class="legend-dot">${place.icon}</span><span><b>${escapeHtml(place.name)}</b><small>${escapeHtml(place.type)} · ${(distance(center, place)).toFixed(1)} км</small></span><strong>›</strong></button>`).join('') : '<p class="empty-map">Места появятся после поиска.</p>';
  document.querySelectorAll('.nearby-place input').forEach((input) => input.addEventListener('change', () => { const place = locations.find((item) => item.id === input.value); if (!place) return; selectedPlaces = input.checked ? [...selectedPlaces.filter((item) => item.id !== place.id), place] : selectedPlaces.filter((item) => item.id !== place.id); }));
  document.querySelectorAll('.map-place[data-place-id]').forEach((button) => button.addEventListener('click', () => { const place = locations.find((item) => item.id === button.dataset.placeId); const marker = markers[locations.indexOf(place)]; if (place && marker) { cityMap.flyTo([place.lat, place.lng], 16, { duration: 0.8 }); marker.openPopup(); } }));
};
loadPlaces(activeCenter).catch(() => { document.querySelector('#nearby-list').innerHTML = '<p class="empty-map">Не удалось загрузить места. Попробуйте ещё раз.</p>'; document.querySelector('#map-places').innerHTML = '<p class="empty-map">Сервис мест временно недоступен.</p>'; });
document.querySelector('#area-search-btn').addEventListener('click', async () => { const query = document.querySelector('#area-query').value.trim(); if (!query) return showToast('Напиши район или точку'); try { const center = await geocode(query); activeCenter = center; cityMap.flyTo(center, 14); await loadPlaces(center, true); } catch (error) { showToast(error.message || 'Точку не удалось найти'); } });
const setUserLocation = (coordinates) => {
  currentLocation = coordinates;
  document.querySelector('#area-query').value = 'Моё местоположение';
  activeCenter = currentLocation;
  cityMap.flyTo(currentLocation, 15, { duration: 1 });
  loadPlaces(currentLocation, true).catch(() => showToast('Места рядом не удалось загрузить'));
  if (userMarker) cityMap.removeLayer(userMarker);
  userMarker = L.circleMarker(currentLocation, { radius: 9, color: '#fff', weight: 3, fillColor: '#e56f61', fillOpacity: 1 }).addTo(cityMap).bindPopup('<b>Вы здесь</b><br><small>Начало маршрута</small>').openPopup();
  document.querySelector('#location-status').textContent = 'Местоположение определено — маршрут начнётся отсюда';
  return currentLocation;
};
const requestUserLocation = () => new Promise((resolve, reject) => {
  const status = document.querySelector('#location-status');
  if (!navigator.geolocation) { status.textContent = 'Этот браузер не поддерживает геолокацию.'; reject(new Error('Геолокация недоступна')); return; }
  if (!window.isSecureContext) { status.textContent = 'Геолокация работает только через http://localhost или HTTPS.'; reject(new Error('Открой проект через start-citywalk.cmd')); return; }
  status.textContent = 'Определяем ваше местоположение…';
  navigator.geolocation.getCurrentPosition((position) => {
    const coordinates = setUserLocation([position.coords.latitude, position.coords.longitude]);
    showToast('Местоположение найдено — маршрут начнётся здесь');
    resolve(coordinates);
  }, (error) => {
    const messages = { 1: 'Доступ к геопозиции запрещён. Разреши Location для localhost:8000 в настройках браузера.', 2: 'Координаты сейчас недоступны. Проверь Wi-Fi или GPS.', 3: 'Истекло время ожидания координат. Попробуй ещё раз на открытом месте.' };
    status.textContent = messages[error.code] || 'Не удалось определить местоположение.';
    showToast(error.code === 1 ? 'Разреши доступ к геопозиции в браузере' : 'Не удалось определить местоположение');
    reject(error);
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});
document.querySelector('#location-btn').addEventListener('click', () => requestUserLocation().catch(() => {}));
setTimeout(() => { if (!currentLocation) requestUserLocation().catch(() => {}); }, 700);
document.querySelectorAll('.mood').forEach((mood) => mood.addEventListener('click', () => setTimeout(() => loadPlaces(activeCenter).catch(() => showToast('Не удалось обновить фильтр')), 0)));
document.querySelector('#clear-selection').addEventListener('click', () => { selectedPlaces = []; document.querySelectorAll('.nearby-place input').forEach((input) => { input.checked = false; }); if (routeLine) { cityMap.removeLayer(routeLine); routeLine = null; } routeResult.textContent = 'Выбор очищен'; showToast('Выбор мест сброшен'); });
document.querySelector('#add-interest').addEventListener('click', () => { const input = document.querySelector('#custom-interest'); const value = input.value.trim(); if (!value) return showToast('Напиши свой интерес'); const button = document.createElement('button'); button.className = 'mood active custom-mood'; button.dataset.category = `custom-${Date.now()}`; button.innerHTML = `✦ <span>${value}</span>`; button.addEventListener('click', () => { button.classList.toggle('active'); renderNearby(); }); document.querySelector('.mood-list').appendChild(button); input.value = ''; showToast(`Интерес «${value}» добавлен`); });

const weatherCodes = { 0: ['☀️', 'Ясно'], 1: ['🌤️', 'Преимущественно ясно'], 2: ['⛅', 'Переменная облачность'], 3: ['☁️', 'Облачно'], 45: ['🌫️', 'Туман'], 48: ['🌫️', 'Изморозь'], 51: ['🌦️', 'Морось'], 53: ['🌦️', 'Морось'], 55: ['🌧️', 'Сильная морось'], 61: ['🌧️', 'Небольшой дождь'], 63: ['🌧️', 'Дождь'], 65: ['🌧️', 'Сильный дождь'], 71: ['🌨️', 'Небольшой снег'], 73: ['❄️', 'Снег'], 75: ['❄️', 'Сильный снег'], 80: ['🌦️', 'Ливни'], 81: ['🌧️', 'Ливни'], 82: ['⛈️', 'Сильные ливни'], 95: ['⛈️', 'Гроза'], 96: ['⛈️', 'Гроза с градом'], 99: ['⛈️', 'Гроза с градом'] };
const formatTime = (value) => value ? new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
const updateClock = () => { document.querySelector('#weather-clock').textContent = `Сейчас ${new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' }).format(new Date())}`; };
updateClock(); setInterval(updateClock, 1000);
const loadWeather = async () => {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491&current=temperature_2m,wind_speed_10m,is_day,weather_code&daily=sunrise,sunset&timezone=Asia%2FAlmaty&forecast_days=1');
    const data = await response.json(); const current = data.current; const [icon, text] = weatherCodes[current.weather_code] || ['🌡️', 'Погода обновлена'];
    document.querySelector('#weather-icon').textContent = current.is_day ? icon : '🌙'; document.querySelector('#weather-temp').textContent = `${Math.round(current.temperature_2m)}°`; document.querySelector('#weather-text').textContent = current.is_day ? text : 'Сейчас ночь'; document.querySelector('#weather-wind').textContent = `${Math.round(current.wind_speed_10m)} км/ч`; document.querySelector('#weather-sun').textContent = `Рассвет ${formatTime(data.daily.sunrise[0])} · закат ${formatTime(data.daily.sunset[0])}`; document.querySelector('#weather-art').classList.toggle('night', !current.is_day);
  } catch { document.querySelector('#weather-text').textContent = 'Погода временно недоступна'; }
};
loadWeather();
routeBuild.addEventListener('click', async () => {
  const area = document.querySelector('#area-query').value.trim();
  if (!area && !currentLocation) return showToast('Разрешите геолокацию или укажите район');
  routeBuild.disabled = true;
  routeBuild.innerHTML = 'Ищем маршрут…';
  const time = document.querySelector('.time-option.active').textContent;
  const interests = [...document.querySelectorAll('.mood.active')].map((item) => item.textContent.trim()).join(', ');
  try {
    let start = currentLocation;
    if (!start) {
      try { start = await requestUserLocation(); } catch { start = await geocode(area); }
    }
    const chosen = selectedPlaces.length ? selectedPlaces : locations.filter((place) => distance(start, place) < 3).slice(0, 3);
    if (!chosen.length) throw new Error('Выберите хотя бы одно место рядом');
    const waypoints = [start, ...chosen.map((place) => [place.lat, place.lng])];
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
