// ============================================================
// SQUIRREL SYSTEM
// ============================================================
function getSquirrelSpawnInterval() {
  if(currentLevel === 0) return 20000 + Math.random() * 10000;
  if(currentLevel <= 2) return 15000 + Math.random() * 10000;
  return 10000 + Math.random() * 10000;
}

function getSquirrelSpeed() {
  if(currentLevel === 0) return 80;
  if(currentLevel === 1) return 100; // Boat squirrel: slightly slower
  if(currentLevel === 2) return 120; // Pool squirrel: swimming pace
  if(currentLevel === 4) return 100; // Space squirrel: slower, drifting
  return 160;
}

function scheduleSquirrel() {
  squirrelNextSpawnTime = performance.now() + getSquirrelSpawnInterval();
}

function resetSquirrelState() {
  squirrelActive = false;
  squirrelAlertActive = false;
  squirrelRetreating = false;
  squirrelReversed = false;
  squirrelHitAnim = false;
  squirrelIsSpace = false;
  squirrelIsBoat = false;
  squirrelIsPool = false;
  squirrelCurrentY = SQUIRREL_Y;
  squirrelRotation = 0;
  acornProjectiles = [];
  starbursts = [];
}

function startSquirrelAlert() {
  console.log('SQUIRREL ALERT! Acorns:', acorns);
  squirrelAlertActive = true;
  squirrelAlertStart = performance.now();
}

function spawnSquirrel() {
  squirrelIsSpace = (currentLevel === 4);
  squirrelIsBoat = (currentLevel === 1);
  squirrelIsPool = (currentLevel === 2);
  const typeStr = squirrelIsSpace ? 'space' : squirrelIsBoat ? 'boat' : squirrelIsPool ? 'pool' : 'ground';
  console.log('Squirrel spawned! fromLeft:', squirrelFromLeft, 'speed:', getSquirrelSpeed(), 'type:', typeStr);
  squirrelAlertActive = false;
  squirrelActive = true;
  startSquirrelMusicOverride();
  squirrelFromLeft = Math.random() < 0.5;
  squirrelX = squirrelFromLeft ? -SQUIRREL_SIZE : W + SQUIRREL_SIZE;
  squirrelDir = squirrelFromLeft ? 1 : -1;
  squirrelSpeed = getSquirrelSpeed();
  squirrelRetreating = false;
  squirrelReversed = false;
  squirrelLastReverseCheck = performance.now();
  squirrelFrame = 0;
  squirrelFrameTime = performance.now();
  squirrelLastUpdateTime = performance.now();
  squirrelCurrentY = squirrelIsSpace ? SPACE_SQUIRREL_Y : squirrelIsBoat ? BOAT_SQUIRREL_Y : squirrelIsPool ? POOL_SQUIRREL_Y : SQUIRREL_Y;
  squirrelRotation = 0;
}

function hitSquirrel() {
  squirrelRetreating = true;
  squirrelHitAnim = true;
  squirrelHitAnimStart = performance.now();
  squirrelHitTime = performance.now();
  stopSquirrelMusicOverride();
  playSfx(squirrelWinSound);
  acorns++;
  updateUI();
  spawnFloat("Got 'em!", W / 2, H / 2 - 40, '#ffee00', 36, 'rgba(255,140,0,0.9)');
  spawnFloat('+1 \u{1F330}', W / 2, H / 2, '#fff', 22, 'rgba(180,120,30,0.85)');
}

function collapsePile() {
  console.log('SQUIRREL ESCAPED - TRIGGERING COLLAPSE');

  // Immediately and fully reset all squirrel state
  resetSquirrelState();
  stopSquirrelMusicOverride();

  selectedDogCells = null;
  playSfx(levelFailedSound);

  const dogCount = grid.reduce((sum, row) => sum + row.filter(c => c !== null).length, 0);
  console.log('Grid cells occupied before collapse:', dogCount);

  spawnFloat('OH NO!', W / 2, H / 2 - 60, '#ff4444', 42, 'rgba(200,40,40,0.85)');
  spawnFloat('Pile collapsed!', W / 2, H / 2, '#fff', 24, 'rgba(100,40,40,0.85)');

  // Snapshot all dogs for collapse animation BEFORE clearing grid
  collapseDogs = [];
  for(let r = 0; r < GRID_ROWS; r++) {
    for(let c = 0; c < GRID_COLS; c++) {
      const cell = grid[r] && grid[r][c];
      if(cell && cell.primary) {
        collapseDogs.push({
          row: r, col: c,
          breed: cell.breed, orientation: cell.orientation,
          delay: r * 80,
          rotDir: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.7)
        });
      }
    }
  }
  console.log('COLLAPSE ANIMATION - dogs captured:', collapseDogs.length);

  // Clear grid AFTER capturing snapshot
  initGrid();
  collapseActive = true;
  collapseStartTime = performance.now();

  // Reset throw/drop state but keep score, acorns, timer
  throwing = false;
  dropping = false;
  inFlightDogs = [];
  bouncing = false;
  matchingCells = [];
  animatingMatch = false;
  ballCurrentPos = null;
  dogCurrentPos = null;

  // Immediately respawn dog so player can throw right away
  currentDog = spawnDog();

  // After animation: clean up collapse visuals and schedule next squirrel
  setTimeout(() => {
    collapseActive = false;
    collapseDogs = [];
    scheduleSquirrel();
  }, COLLAPSE_DURATION + 300);
}

function updateSquirrel(now) {
  if(!gameRunning || !timerRunning) return;

  if(!squirrelActive && !squirrelAlertActive && now >= squirrelNextSpawnTime) {
    const levelElapsed = (now - timerStart) / 1000;
    if(levelElapsed < 30 || acorns < 2) {
      squirrelNextSpawnTime = now + 3000;
      return;
    }
    startSquirrelAlert();
  }

  if(squirrelAlertActive) {
    if(now - squirrelAlertStart >= SQUIRREL_ALERT_DURATION) {
      spawnSquirrel();
    }
    return;
  }

  if(!squirrelActive) return;

  const dt = (now - squirrelLastUpdateTime) / 1000;
  squirrelLastUpdateTime = now;

  if(squirrelRetreating) {
    if(squirrelHitAnim) {
      const sinceHit = now - squirrelHitAnimStart;
      if(sinceHit >= SQUIRREL_HIT_ANIM_DURATION) {
        squirrelActive = false;
        squirrelHitAnim = false;
        scheduleSquirrel();
      }
      return;
    }
    squirrelActive = false;
    scheduleSquirrel();
    return;
  } else {
    if(now - squirrelLastReverseCheck > 500) {
      squirrelLastReverseCheck = now;
      if(!squirrelReversed && Math.random() < 0.25) {
        squirrelReversed = true;
        squirrelReverseEnd = now + 250 + Math.random() * 100;
      }
    }
    if(squirrelReversed && now >= squirrelReverseEnd) {
      squirrelReversed = false;
    }

    const moveDir = squirrelReversed ? -squirrelDir : squirrelDir;
    squirrelX += moveDir * squirrelSpeed * dt;

    // Special squirrel movement by type
    if(squirrelIsSpace) {
      // Space squirrel: floating sine wave Y + slow rotation
      squirrelCurrentY = SPACE_SQUIRREL_Y + Math.sin(now * 0.002) * SPACE_SQUIRREL_FLOAT_AMP;
      squirrelRotation = Math.sin(now * 0.0012) * 0.22; // ~12 degrees
    } else if(squirrelIsBoat) {
      // Boat squirrel: rocking rotation + vertical bob
      squirrelRotation = Math.sin(now * 0.004) * BOAT_ROCK_AMP;
      squirrelCurrentY = BOAT_SQUIRREL_Y + Math.sin(now * 0.005) * BOAT_BOB_AMP;
    } else if(squirrelIsPool) {
      // Pool squirrel: swimming wobble + bob
      squirrelRotation = Math.sin(now * 0.006) * POOL_SWIM_WOBBLE;
      squirrelCurrentY = POOL_SQUIRREL_Y + Math.sin(now * 0.008) * POOL_BOB_AMP;
    } else {
      squirrelCurrentY = SQUIRREL_Y;
      squirrelRotation = 0;
    }

    if(squirrelFromLeft && squirrelX > W + SQUIRREL_SIZE) {
      collapsePile();
      return;
    }
    if(!squirrelFromLeft && squirrelX < -SQUIRREL_SIZE) {
      collapsePile();
      return;
    }
  }

  if(now - squirrelFrameTime > (squirrelIsSpace ? 250 : (squirrelIsBoat || squirrelIsPool) ? 200 : 150)) {
    squirrelFrame = 1 - squirrelFrame;
    squirrelFrameTime = now;
  }
}

function spawnStarburst(x, y) {
  const particles = [];
  const count = 12;
  const colors = ['#ffdd00', '#ffaa00', '#ff8800', '#ffee44', '#fff176'];
  for(let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    particles.push({
      angle,
      speed: 80 + Math.random() * 120,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  starbursts.push({x, y, startTime: performance.now(), particles});
}

function updateAcornProjectiles(now) {
  acornProjectiles = acornProjectiles.filter(p => {
    const elapsed = (now - p.startTime) / 1000;
    const dx = p.targetX - p.startX;
    const dy = p.targetY - p.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const totalTime = dist / ACORN_SPEED;
    const rawT = Math.min(elapsed / totalTime, 1.0);
    const t = 1 - Math.pow(1 - rawT, 3);
    p.x = p.startX + dx * t;
    const arcHeight = dist * 0.15;
    const arcOffset = -Math.sin(t * Math.PI) * arcHeight;
    p.y = p.startY + dy * t + arcOffset;
    p.scale = 1.5 - t * 0.9;
    if(rawT >= 1.0) {
      if(squirrelActive && !squirrelRetreating) {
        const hitDistX = Math.abs(p.targetX - squirrelX);
        const hitDistY = squirrelIsSpace ? Math.abs(p.targetY - squirrelCurrentY) : 0;
        const hitRadius = squirrelIsSpace ? SQUIRREL_HIT_RADIUS * 1.3 : SQUIRREL_HIT_RADIUS;
        if(hitDistX < hitRadius && hitDistY < hitRadius) {
          spawnStarburst(p.targetX, p.targetY);
          hitSquirrel();
          return false;
        }
      }
      spawnFloat('Miss!', p.targetX, p.targetY - 10, '#ff8888', 18);
      return false;
    }
    return true;
  });
}
