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
