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
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(cityMap);
const locations = [
  { name: 'Байтерек', type: 'Символ столицы', category: 'architecture photo', lat: 51.1283, lng: 71.4304, icon: '⌖' },
  { name: 'Ботанический сад', type: 'Прогулки и природа', category: 'park photo', lat: 51.0904, lng: 71.4171, icon: '♣' },
  { name: 'Территория EXPO', type: 'Архитектура и события', category: 'architecture photo', lat: 51.0907, lng: 71.4188, icon: '☕' },
  { name: 'Национальный музей', type: 'История и культура', category: 'architecture photo', lat: 51.1256, lng: 71.4681, icon: '⌖' },
  { name: 'Кофейня на Нуржол', type: 'Кофейня', category: 'cafe food', lat: 51.1288, lng: 71.4318, icon: '☕' },
  { name: 'Парк Влюблённых', type: 'Парк', category: 'park photo', lat: 51.1322, lng: 71.4237, icon: '♣' },
  { name: 'Арбат Астаны', type: 'Прогулочная улица', category: 'photo architecture', lat: 51.1343, lng: 71.4314, icon: '📸' },
  { name: 'Театр оперы и балета', type: 'Культура и история', category: 'history architecture', lat: 51.1275, lng: 71.4272, icon: '🎭' },
  { name: 'ТРЦ Хан Шатыр', type: 'Покупки и архитектура', category: 'shopping architecture', lat: 51.1326, lng: 71.4037, icon: '🛍️' },
  { name: 'Набережная Ишима', type: 'Вечерняя прогулка', category: 'night photo park', lat: 51.1281, lng: 71.4358, icon: '🌙' },
  { name: 'Ресторан на левом берегу', type: 'Еда и отдых', category: 'food', lat: 51.1267, lng: 71.4311, icon: '🍽️' },
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
const renderNearby = (center = [51.1283, 71.4304]) => {
  const selectedCategories = [...document.querySelectorAll('.mood.active')].map((item) => item.dataset.category);
  const nearby = locations.filter((place) => selectedCategories.some((category) => place.category.includes(category))).sort((a, b) => distance(center, a) - distance(center, b)).slice(0, 6);
  document.querySelector('#nearby-count').textContent = `(${nearby.length})`;
  document.querySelector('#nearby-list').innerHTML = nearby.map((place) => `<label class="nearby-place"><input type="checkbox" value="${place.name}" ${selectedPlaces.some((item) => item.name === place.name) ? 'checked' : ''}><span class="nearby-icon">${place.icon}</span><span><b>${place.name}</b><small>${place.type} · ${(distance(center, place)).toFixed(1)} км рядом</small></span></label>`).join('');
  document.querySelectorAll('.nearby-place input').forEach((input) => input.addEventListener('change', () => { const place = locations.find((item) => item.name === input.value); selectedPlaces = input.checked ? [...selectedPlaces.filter((item) => item.name !== place.name), place] : selectedPlaces.filter((item) => item.name !== place.name); }));
};
renderNearby();
document.querySelector('#area-search-btn').addEventListener('click', async () => { const query = document.querySelector('#area-query').value.trim(); if (!query) return showToast('Напиши район или точку'); try { const center = await geocode(query); cityMap.flyTo(center, 14); renderNearby(center); showToast('Нашли места рядом'); } catch { showToast('Точку не удалось найти'); } });
document.querySelector('#location-btn').addEventListener('click', () => {
  const status = document.querySelector('#location-status');
  if (!navigator.geolocation) return showToast('Этот браузер не поддерживает геолокацию');
  if (!window.isSecureContext) { status.textContent = 'Геолокация работает только через http://localhost или HTTPS.'; return showToast('Запусти CityWalk через start-citywalk.cmd'); }
  status.textContent = 'Определяем ваше местоположение…';
  navigator.geolocation.getCurrentPosition((position) => {
    currentLocation = [position.coords.latitude, position.coords.longitude];
    document.querySelector('#area-query').value = 'Моё местоположение';
    cityMap.flyTo(currentLocation, 15, { duration: 1 });
    renderNearby(currentLocation);
    if (userMarker) cityMap.removeLayer(userMarker);
    userMarker = L.circleMarker(currentLocation, { radius: 8, color: '#fff', weight: 3, fillColor: '#e56f61', fillOpacity: 1 }).addTo(cityMap).bindPopup('<b>Вы находитесь здесь</b>').openPopup();
    status.textContent = 'Местоположение определено — маршрут начнётся отсюда';
    showToast('Местоположение найдено');
  }, (error) => {
    const messages = { 1: 'Доступ к геопозиции запрещён. Разреши Location для localhost:8000 в настройках браузера.', 2: 'Координаты сейчас недоступны. Проверь Wi-Fi или GPS.', 3: 'Истекло время ожидания координат. Попробуй ещё раз на открытом месте.' };
    status.textContent = messages[error.code] || 'Не удалось определить местоположение.';
    showToast(error.code === 1 ? 'Разреши доступ к геопозиции в браузере' : 'Не удалось определить местоположение');
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});
document.querySelectorAll('.mood').forEach((mood) => mood.addEventListener('click', () => setTimeout(() => renderNearby(), 0)));
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
  if (!area) return showToast('Сначала укажите район или точку поиска');
  routeBuild.disabled = true;
  routeBuild.innerHTML = 'Ищем маршрут…';
  const time = document.querySelector('.time-option.active').textContent;
  const interests = [...document.querySelectorAll('.mood.active')].map((item) => item.textContent.trim()).join(', ');
  try {
    const start = await geocode(area);
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
