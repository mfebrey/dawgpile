// ============================================================
// AIMING & THROW
// ============================================================
function findLandingRow(col, orientation) {
  for(let r = GRID_ROWS - (orientation === 'v' ? 2 : 1); r >= 0; r--) {
    if(canPlace(r, col, orientation)) return r;
  }
  return -1;
}

function calcArc(sx, sy, ex, ey, peakY, numPoints) {
  const mx = (sx + ex) / 2;
  const points = [];
  for(let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push({
      x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex,
      y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peakY + t * t * ey
    });
  }
  return points;
}

function controlYForApex(sy, ey, desiredApexY) {
  return 2 * desiredApexY - (sy + ey) / 2;
}

function calculateBallArc(targetCol, landRow, numPoints, aimPeakYParam) {
  numPoints = numPoints || 40;
  const ex = GRID_LEFT + targetCol * CELL_SIZE + CELL_SIZE;
  const ey = GRID_TOP + landRow * CELL_SIZE + CELL_SIZE / 2;
  const desiredPeakY = aimPeakYParam !== undefined ? aimPeakYParam : GRID_TOP + 60;
  const clampedPeak = Math.min(desiredPeakY, ey - 20);
  const peakY = controlYForApex(BALL_DRAW_Y, ey, clampedPeak);
  return calcArc(BALL_ORIGIN_X, BALL_DRAW_Y, ex, ey, peakY, numPoints);
}

function calculateDogArc(targetCol, landRow, numPoints, aimPeakYParam) {
  numPoints = numPoints || 40;
  const sx = AIM_AREA_X, sy = AIM_AREA_Y - 80;
  const ex = GRID_LEFT + targetCol * CELL_SIZE + CELL_SIZE;
  const ey = GRID_TOP + landRow * CELL_SIZE + CELL_SIZE / 2;
  const desiredPeakY = aimPeakYParam !== undefined ? aimPeakYParam : GRID_TOP + 60;
  const clampedPeak = Math.min(desiredPeakY, ey - 20);
  const peakY = controlYForApex(sy, ey, clampedPeak);
  return calcArc(sx, sy, ex, ey, peakY, numPoints);
}

function calculateArcPoints(targetCol, landRow, numPoints) {
  return calculateBallArc(targetCol, landRow, numPoints || 30);
}

function throwDog() {
  if(!currentDog) return;
  const landRow = findLandingRow(aimTargetCol, currentDog.orientation);
  if(landRow < 0) return;

  const ballArc = calculateBallArc(aimTargetCol, landRow, 60, aimPeakY);
  const dogArc = calculateDogArc(aimTargetCol, landRow, 60, aimPeakY);

  const arcSpan = BALL_DRAW_Y - aimPeakY;
  const maxSpan = BALL_DRAW_Y - GRID_TOP + 30;
  const heightRatio = Math.max(0, Math.min(1, arcSpan / maxSpan));
  const dx = Math.abs(BALL_ORIGIN_X - (GRID_LEFT + aimTargetCol * CELL_SIZE + CELL_SIZE));
  const distRatio = dx / (W * 0.5);
  const intensity = Math.max(heightRatio, distRatio);

  const flight = {
    startTime: performance.now(),
    ballArc: ballArc,
    dogArc: dogArc,
    ballDuration: 350 + intensity * 250,
    dogDelay: 120 + intensity * 100,
    dogDuration: 300 + intensity * 200,
    bounceHeight: 6 + intensity * 20,
    landRow: landRow,
    landCol: aimTargetCol,
    breed: currentDog.breed,
    orientation: currentDog.orientation,
    ballPos: {x: BALL_ORIGIN_X, y: BALL_DRAW_Y},
    dogPos: {x: AIM_AREA_X, y: AIM_AREA_Y - 80},
    landed: false
  };

  inFlightDogs.push(flight);
  playSfx(wooshSound);
  setTimeout(() => { playSfx(woofSound); }, 1000);

  // Immediately spawn next dog - ball is ready again
  currentDog = spawnDog();
}

function smoothEase(t) {
  return 1 - Math.pow(1 - t, 3);
}

function updateInFlightDogs(timestamp) {
  for(let i = inFlightDogs.length - 1; i >= 0; i--) {
    const f = inFlightDogs[i];
    if(f.landed) continue;
    const elapsed = timestamp - f.startTime;

    // Update ball position
    const ballT = Math.min(elapsed / f.ballDuration, 1.0);
    const ballEased = smoothEase(ballT);
    const ballIdx = Math.floor(ballEased * (f.ballArc.length - 1));
    f.ballPos = f.ballArc[Math.min(ballIdx, f.ballArc.length - 1)];

    // Update dog position
    const dogElapsed = Math.max(0, elapsed - f.dogDelay);
    const dogT = Math.min(dogElapsed / f.dogDuration, 1.0);
    const dogEased = smoothEase(dogT);
    const dogIdx = Math.floor(dogEased * (f.dogArc.length - 1));
    f.dogPos = f.dogArc[Math.min(dogIdx, f.dogArc.length - 1)];

    if(dogT >= 1.0) {
      f.landed = true;
      landFlightDog(f);
    }
  }
  // Remove landed flights after a brief period (ball animation done)
  inFlightDogs = inFlightDogs.filter(f => !f.landed);
}

function landFlightDog(flight) {
  const landBreed = flight.breed;
  const landOri = flight.orientation;
  const landRow = flight.landRow;
  const landCol = flight.landCol;

  // Check if we can still place here (another dog may have landed first)
  if(!canPlace(landRow, landCol, landOri)) return;

  placeDog(landRow, landCol, landBreed, landOri);
  bouncing = true;
  bounceStartTime = performance.now();
  bounceCells = [{row: landRow, col: landCol}];
  bounceCells.push({row: landRow, col: landCol + 1});

  setTimeout(async () => {
    bouncing = false;
    chainLevel = 0;
    // Apply gravity first (dog may have landed on cells that were removed during a match animation)
    while(applyGravity()) await new Promise(resolve => setTimeout(resolve, 200));
    const preMatches = findMatches();
    const matchSet = new Set(preMatches.map(m => `${m.row},${m.col}`));
    const placedCells = [
      {row: landRow, col: landCol},
      {row: landRow, col: landCol + 1}
    ];
    const placedMatched = placedCells.some(c => matchSet.has(`${c.row},${c.col}`));
    if(!placedMatched) {
      checkAdjacentBonus(landRow, landCol, landBreed, landOri, matchSet);
    }
    await processMatches();
    let canPlaceAnywhere = false;
    for(let r = 0; r < GRID_ROWS && !canPlaceAnywhere; r++)
      for(let c = 0; c < GRID_COLS && !canPlaceAnywhere; c++)
        if(canPlace(r, c, 'h')) canPlaceAnywhere = true;
    if(!canPlaceAnywhere) gameOver();
  }, BOUNCE_DURATION + 50);
}
