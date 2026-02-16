// ============================================================
// DOG SPAWNING
// ============================================================
function spawnDog() {
  const breed = levelBreeds[Math.floor(Math.random() * levelBreeds.length)];
  return {breed, orientation: 'h'};
}
