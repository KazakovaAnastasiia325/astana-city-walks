const moods = document.querySelectorAll('.mood');
moods.forEach((mood) => mood.addEventListener('click', () => {
  moods.forEach((item) => item.classList.remove('active'));
  mood.classList.add('active');
}));

document.querySelector('.build-btn').addEventListener('click', () => {
  const button = document.querySelector('.build-btn');
  button.innerHTML = 'Маршрут готов <span>✓</span>';
  button.style.background = '#3a8d84';
  setTimeout(() => {
    button.innerHTML = 'Построить маршрут <span>→</span>';
    button.style.background = '';
  }, 2200);
});

document.querySelectorAll('.save').forEach((save) => save.addEventListener('click', () => {
  save.textContent = save.textContent === '♡' ? '♥' : '♡';
}));

const cityMap = L.map('city-map', { zoomControl: false }).setView([51.125, 71.43], 12.5);
L.control.zoom({ position: 'bottomright' }).addTo(cityMap);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(cityMap);
const locations = [
  { name: 'Байтерек', type: 'Символ столицы', lat: 51.1283, lng: 71.4304, icon: '⌖' },
  { name: 'Ботанический сад', type: 'Прогулки и природа', lat: 51.0904, lng: 71.4171, icon: '♣' },
  { name: 'Территория EXPO', type: 'Архитектура и события', lat: 51.0907, lng: 71.4188, icon: '☕' },
  { name: 'Национальный музей', type: 'История и культура', lat: 51.1256, lng: 71.4681, icon: '⌖' },
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
