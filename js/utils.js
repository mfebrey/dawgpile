// ============================================================
// HELPERS
// ============================================================
function getAvailableBreeds() {
  const lvl = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
  const shuffled = dogNames.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, lvl.breeds);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(Math.min(s, 59)).padStart(2, '0');
}
