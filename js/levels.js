// ============================================================
// PROGRESS SAVE/LOAD
// ============================================================
function saveProgress() {
  const frontier = completedLevels.findIndex(s => s === null);
  const lvl = frontier >= 0 ? frontier : LEVELS.length - 1;
  localStorage.setItem('dawgpile_save', JSON.stringify({ v: 4, completed: completedLevels, currentLevel: lvl }));
}

// High scores per level
let highScores = [0, 0, 0, 0, 0];

function saveHighScores() {
  localStorage.setItem('dawgpile_highscores', JSON.stringify(highScores));
}

function loadHighScores() {
  try {
    const d = JSON.parse(localStorage.getItem('dawgpile_highscores'));
    if(d && Array.isArray(d)) {
      highScores = d.map(v => (typeof v === 'number' && v >= 0) ? v : 0);
    }
  } catch(e) {}
  while(highScores.length < LEVELS.length) highScores.push(0);
}
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem('dawgpile_save'));
    if(d && d.completed) {
      if(d.v >= 3) {
        // v3/v4 format: 5 levels [Park, Forest, Pool, Desert, Base]
        completedLevels = d.completed.map(v => (v !== null && v >= 0 && v <= 3) ? v : null);
      } else if(d.v >= 2) {
        // v2 format: 4 levels [Park, Forest, Desert, Base] -> migrate to 5
        const old = d.completed.map(v => (v !== null && v >= 0 && v <= 3) ? v : null);
        completedLevels = [
          old[0] !== undefined ? old[0] : null,
          old[1] !== undefined ? old[1] : null,
          null,  // Pool (new)
          old[2] !== undefined ? old[2] : null,  // Desert was index 2
          old[3] !== undefined ? old[3] : null   // Base was index 3
        ];
      } else {
        // Old format: boolean or 0=not completed, 1-3=stars
        const old = d.completed.map(v => {
          if(typeof v === 'boolean') return v ? 1 : null;
          if(v >= 1 && v <= 3) return v;
          return null;
        });
        completedLevels = [
          old[0] !== undefined ? old[0] : null,
          old[1] !== undefined ? old[1] : null,
          null,
          old[2] !== undefined ? old[2] : null,
          old[3] !== undefined ? old[3] : null
        ];
      }
      // Restore currentLevel from v4+ save, otherwise derive from completedLevels
      if(d.v >= 4 && typeof d.currentLevel === 'number' && d.currentLevel >= 0 && d.currentLevel < LEVELS.length) {
        currentLevel = d.currentLevel;
      } else {
        const frontier = completedLevels.findIndex(s => s === null);
        currentLevel = frontier >= 0 ? frontier : LEVELS.length - 1;
      }
    }
  } catch(e) {}
  // Ensure completedLevels has the right number of entries
  while(completedLevels.length < LEVELS.length) completedLevels.push(null);
}

// ============================================================
// WELCOME SCREEN
// ============================================================
function drawWelcomeScreen() {
  if(welcomeLoaded && welcomeImg.complete) {
    ctx.drawImage(welcomeImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#2a4858';
    ctx.fillRect(0, 0, W, H);
  }
  // Play button only
  const b = WELCOME_BTN;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = welcomeBtnHovered ? 18 : 10;
  ctx.fillStyle = welcomeBtnHovered ? '#ff8555' : '#ff6b35';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const triSize = b.r * 0.45;
  ctx.moveTo(b.x - triSize * 0.7, b.y - triSize);
  ctx.lineTo(b.x - triSize * 0.7, b.y + triSize);
  ctx.lineTo(b.x + triSize, b.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInstructionsScreen() {
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);

  // Container box
  const boxX = 30, boxY = 20, boxW = W - 60, boxH = H - 50;
  ctx.save();
  ctx.fillStyle = 'rgba(70,160,200,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 16); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(180,230,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 16); ctx.stroke();
  ctx.restore();

  // Title - gold gradient with cartoon stroke (matches CSS overlay h1 style)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleY = boxY + 40;
  const titleText = 'HOW TO PLAY';
  ctx.font = 'italic 900 42px Arial';

  // Dark stroke outline
  ctx.strokeStyle = 'rgba(80,40,0,0.8)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(titleText, W / 2, titleY);

  // Gold gradient fill
  const titleGrad = ctx.createLinearGradient(0, titleY - 22, 0, titleY + 22);
  titleGrad.addColorStop(0, '#fff');
  titleGrad.addColorStop(0.3, '#ffe44d');
  titleGrad.addColorStop(0.6, '#ffb800');
  titleGrad.addColorStop(1, '#ff8c00');
  ctx.fillStyle = titleGrad;
  ctx.fillText(titleText, W / 2, titleY);

  // Warm glow (draw behind, but we fake it with shadow on a second pass)
  ctx.shadowColor = 'rgba(255,180,0,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillText(titleText, W / 2, titleY);
  ctx.restore();

  // Game objective - bigger and bolder
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffe066';
  ctx.fillText('Pile up 3 or more of the same breed,', W / 2, boxY + 76);
  ctx.fillText('vertical or horizontal, to earn stars and advance!', W / 2, boxY + 100);
  ctx.restore();

  // Three panels
  const panelY = boxY + 125;
  const panelW = 150, panelH = 150;
  const panelGap = 30;
  const totalPanelW = panelW * 3 + panelGap * 2;
  const panelStartX = (W - totalPanelW) / 2;
  const panels = [
    { label: 'Throw the Ball', steps: ['Click the ball', 'Drag mouse to grid', 'Release'], color: '#4a9' },
    { label: 'Swap Two Dogs', steps: ['Click one dog', 'Click an adjacent dog'], color: '#49a' },
    { label: 'Scoot Over', steps: ['Click a dog', 'Drag left or right', 'Release'], color: '#a94' }
  ];
  const imgNames = ['throw', 'swap', 'scoot'];

  for(let i = 0; i < 3; i++) {
    const px = panelStartX + i * (panelW + panelGap);
    const p = panels[i];

    // Try to load image, fallback to colored rect
    const imgKey = '_instrImg' + i;
    if(!drawInstructionsScreen[imgKey]) {
      const img = new Image();
      img.src = 'img/' + imgNames[i] + '.webp';
      drawInstructionsScreen[imgKey] = img;
    }
    const img = drawInstructionsScreen[imgKey];
    if(img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px, panelY, panelW, panelH);
    } else {
      // Placeholder colored rectangle
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.roundRect(px, panelY, panelW, panelH, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, px + panelW / 2, panelY + panelH / 2);
    }

    // Label below image
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.label, px + panelW / 2, panelY + panelH + 8);

    // Numbered steps
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    const stepsX = px + 12;
    for(let s = 0; s < p.steps.length; s++) {
      ctx.fillText((s + 1) + '. ' + p.steps[s], stepsX, panelY + panelH + 30 + s * 16);
    }
  }

  // Acorn info section
  const infoY = panelY + panelH + 120;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ACORNS \u{1F330}', W / 2, infoY);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '14px Arial';
  ctx.fillText('Earn acorns by making packs (3+ matching dogs).', W / 2, infoY + 24);
  ctx.fillText('Use acorns to throw at squirrels and protect your pile!', W / 2, infoY + 44);

  // "Got it!" button
  const gb = GOT_IT_BTN;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = gotItBtnHovered ? 14 : 8;
  ctx.fillStyle = gotItBtnHovered ? '#ff8555' : '#ff6b35';
  ctx.beginPath();
  ctx.roundRect(gb.x - gb.w / 2, gb.y - gb.h / 2, gb.w, gb.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(gb.x - gb.w / 2, gb.y - gb.h / 2, gb.w, gb.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Got it!', gb.x, gb.y);
  ctx.restore();
}

function handleInstructionsClick(x, y) {
  const gb = GOT_IT_BTN;
  if(x >= gb.x - gb.w / 2 && x <= gb.x + gb.w / 2 &&
     y >= gb.y - gb.h / 2 && y <= gb.y + gb.h / 2) {
    gameScreen = SCREEN.MAP;
    return;
  }
}

function handleWelcomeClick(x, y) {
  const b = WELCOME_BTN;
  const dx = x - b.x, dy = y - b.y;
  if(Math.sqrt(dx*dx + dy*dy) <= b.r) {
    const hasPlayed = localStorage.getItem('dawgpile_hasPlayed');
    if(!hasPlayed) {
      // First-time player: show instructions first
      localStorage.setItem('dawgpile_hasPlayed', '1');
      startIris(() => {
        gameScreen = SCREEN.INSTRUCTIONS;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
      });
    } else {
      // Returning player: go straight to map
      startIris(() => {
        gameScreen = SCREEN.MAP;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
      });
    }
  }
}

// ============================================================
// MAP SCREEN
// ============================================================
function drawMapScreen(now) {
  // Dynamic map image based on current level progress
  const mapIdx = Math.min(currentLevel, mapImgs.length - 1);
  const currentMapImg = mapImgs[mapIdx];
  if(currentMapImg && currentMapImg._loaded && currentMapImg.complete) {
    ctx.drawImage(currentMapImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#4a8868';
    ctx.fillRect(0, 0, W, H);
  }

  // Paw path animation
  if(pawPath.active) {
    const elapsed = now - pawPath.startTime;
    const progress = Math.min(elapsed / pawPath.duration, 1.0);
    const from = MAP_LEVELS[pawPath.from];
    const to = MAP_LEVELS[pawPath.to];
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const numPrints = Math.max(4, Math.floor(dist / 35));
    const visibleCount = Math.floor(numPrints * progress);

    ctx.save();
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for(let i = 0; i <= visibleCount && i < numPrints; i++) {
      const t = i / (numPrints - 1);
      const px = from.x + dx * t;
      const py = from.y + dy * t;
      ctx.globalAlpha = 0.8;
      ctx.fillText('\u{1F43E}', px, py);
    }
    ctx.restore();

    if(progress >= 1.0) {
      pawPath.active = false;
    }
  }

  // Level indicators
  for(let i = 0; i < MAP_LEVELS.length; i++) {
    const lv = MAP_LEVELS[i];
    const isCompleted = completedLevels[i] !== null;
    const stars = isCompleted ? completedLevels[i] : 0;
    const isCurrent = (i === currentLevel) && !isCompleted;
    const isLocked = !isCurrent && !isCompleted;

    ctx.save();

    if(isCompleted) {
      // Stars above level position (no circle)
      const starY = lv.y - MAP_OVAL_RY;
      const starSpacing = 24;
      const starSize = 13;
      for(let s = 0; s < 3; s++) {
        const sx = lv.x + (s - 1) * starSpacing;
        drawStarIcon(sx, starY, starSize, s < stars, 0);
      }
    } else if(isCurrent) {
      // Active level: animated tennis ball bouncing above position
      const ballBounce = Math.abs(Math.sin(now / 350 * Math.PI)) * 12;
      const ballY = lv.y - MAP_OVAL_RY - 2 - ballBounce;
      const ballSize = 28;
      if(tennisLoaded && tennisImg.complete) {
        ctx.drawImage(tennisImg, lv.x - ballSize / 2, ballY - ballSize / 2, ballSize, ballSize);
      } else {
        ctx.fillStyle = '#ccff00';
        ctx.beginPath();
        ctx.arc(lv.x, ballY, ballSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Locked levels: no indicator drawn (locks are in the map image)

    // Level name below (for completed and current only)
    if(isCompleted || isCurrent) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      const labelX = lv.x + (lv.name === 'Pool' ? -5 : 0);
      const labelY = lv.y + MAP_OVAL_RY + 8 + (lv.name === 'Pool' ? -10 : 0);
      ctx.strokeText(lv.name, labelX, labelY);
      ctx.fillStyle = '#fff';
      ctx.fillText(lv.name, labelX, labelY);
    }

    // No hover ring - cursor change handles hover feedback

    ctx.restore();
  }

  // Top-right buttons: Fullscreen (hidden on iOS entirely), Info, Reset, Mute
  if(!_isIOS) {
    drawMapButton(MAP_FS_BTN.cx, MAP_FS_BTN.cy, MAP_BTN_R, mapFsHovered, isFullscreen ? 'exitfullscreen' : 'fullscreen');
  }
  drawMapButton(MAP_INFO_BTN.cx, MAP_INFO_BTN.cy, MAP_BTN_R, mapInfoHovered, 'info');
  drawMapButton(MAP_RESET_BTN.cx, MAP_RESET_BTN.cy, MAP_BTN_R, mapResetHovered, 'reset');
  drawMapButton(MAP_MUTE_BTN.cx, MAP_MUTE_BTN.cy, MAP_BTN_R, mapMuteHovered, musicMuted ? 'muted' : 'unmuted');
}

function drawMapButton(cx, cy, r, hovered, iconType) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = hovered ? 10 : 5;
  ctx.fillStyle = hovered ? '#ff8555' : '#ff6b35';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw white canvas icons (no emoji), scaled for small buttons
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if(iconType === 'info') {
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', cx, cy + 1);
  } else if(iconType === 'reset') {
    // Clean circular arrow
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, -0.6, Math.PI * 1.4);
    ctx.stroke();
    // Arrowhead
    const ax = cx + 6 * Math.cos(-0.6);
    const ay = cy + 6 * Math.sin(-0.6);
    ctx.beginPath();
    ctx.moveTo(ax - 1, ay - 4);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + 4, ay - 1);
    ctx.stroke();
  } else if(iconType === 'unmuted') {
    // Speaker body (centered)
    const ox = cx - 2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox - 3, cy - 2.5);
    ctx.lineTo(ox - 1, cy - 2.5);
    ctx.lineTo(ox + 3, cy - 5);
    ctx.lineTo(ox + 3, cy + 5);
    ctx.lineTo(ox - 1, cy + 2.5);
    ctx.lineTo(ox - 3, cy + 2.5);
    ctx.closePath();
    ctx.fill();
    // Sound waves
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox + 4, cy, 3, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + 4, cy, 6, -0.7, 0.7);
    ctx.stroke();
  } else if(iconType === 'muted') {
    // Speaker body (centered)
    const ox = cx - 2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox - 3, cy - 2.5);
    ctx.lineTo(ox - 1, cy - 2.5);
    ctx.lineTo(ox + 3, cy - 5);
    ctx.lineTo(ox + 3, cy + 5);
    ctx.lineTo(ox - 1, cy + 2.5);
    ctx.lineTo(ox - 3, cy + 2.5);
    ctx.closePath();
    ctx.fill();
    // X mark
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 5, cy - 3);
    ctx.lineTo(ox + 9, cy + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + 9, cy - 3);
    ctx.lineTo(ox + 5, cy + 3);
    ctx.stroke();
  } else if(iconType === 'fullscreen') {
    // Expand arrows - four corner brackets pointing outward
    const s = 5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s + 3); ctx.lineTo(cx - s, cy - s); ctx.lineTo(cx - s + 3, cy - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s - 3, cy - s); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, cy - s + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + s - 3); ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx - s + 3, cy + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s - 3, cy + s); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx + s, cy + s - 3);
    ctx.stroke();
  } else if(iconType === 'exitfullscreen') {
    // Compress arrows - four corner brackets pointing inward
    const s = 5, g = 1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - g); ctx.lineTo(cx - g, cy - g); ctx.lineTo(cx - g, cy - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s, cy - g); ctx.lineTo(cx + g, cy - g); ctx.lineTo(cx + g, cy - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + g); ctx.lineTo(cx - g, cy + g); ctx.lineTo(cx - g, cy + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s, cy + g); ctx.lineTo(cx + g, cy + g); ctx.lineTo(cx + g, cy + s);
    ctx.stroke();
  }
  ctx.restore();
}

function handleMapClick(x, y) {
  if(!_isIOS) {
    const fb = MAP_FS_BTN;
    if(Math.sqrt((x - fb.cx) * (x - fb.cx) + (y - fb.cy) * (y - fb.cy)) <= fb.r) {
      toggleFullscreen();
      return;
    }
  }
  const mb = MAP_MUTE_BTN;
  if(Math.sqrt((x - mb.cx) * (x - mb.cx) + (y - mb.cy) * (y - mb.cy)) <= mb.r) {
    toggleMute();
    return;
  }
  const rb = MAP_RESET_BTN;
  if(Math.sqrt((x - rb.cx) * (x - rb.cx) + (y - rb.cy) * (y - rb.cy)) <= rb.r) {
    if(confirm('Reset Scene 1 progress and high scores? You\'ll start from Level 1.')) {
      completedLevels = [null, null, null, null, null];
      highScores = [0, 0, 0, 0, 0];
      currentLevel = 0;
      score = 0;
      localStorage.removeItem('dawgpile_save');
      localStorage.removeItem('dawgpile_highscores');
      localStorage.removeItem('dawgpile_hasPlayed');
    }
    return;
  }
  const ib = MAP_INFO_BTN;
  if(Math.sqrt((x - ib.cx) * (x - ib.cx) + (y - ib.cy) * (y - ib.cy)) <= ib.r) {
    gameScreen = SCREEN.INSTRUCTIONS;
    return;
  }

  for(let i = 0; i < MAP_LEVELS.length; i++) {
    const lv = MAP_LEVELS[i];
    const dx = (x - lv.x) / (MAP_OVAL_RX + 10);
    const dy = (y - lv.y) / (MAP_OVAL_RY + 8);
    if(dx*dx + dy*dy <= 1) {
      const isCompleted = completedLevels[i] !== null;
      const isCurrent = (i === currentLevel) && !isCompleted;
      if(isCurrent || isCompleted) {
        currentLevel = i;
        showLevelStart();
      }
      return;
    }
  }
}

// ============================================================
// GAME FLOW
// ============================================================
function startGame() {
  currentLevel = 0;
  score = 0;
  completedLevels = [null, null, null, null, null];
  updateUI();
  document.getElementById('gameover-screen').style.display = 'none';
  startIris(() => {
    gameScreen = SCREEN.MAP;
  });
}

function showLevelStart() {
  const lvl = LEVELS[currentLevel];
  levelBreeds = getAvailableBreeds();
  const name = LEVEL_NAMES[currentLevel] || '';
  const thresholds = STAR_THRESHOLDS[currentLevel];
  const best = highScores[currentLevel] || 0;
  document.getElementById('level-scene').textContent = 'Scene 1: Bone Island';
  document.getElementById('level-title').textContent = 'Level ' + (currentLevel + 1) + ': ' + name;
  const bestText = best > 0
    ? '<div style="font-size:16px;margin:6px 0;color:#ffd700">Your Best: ' + best.toLocaleString() + '</div>'
    : '';
  document.getElementById('level-goal-text').innerHTML = bestText;

  // Build breed roster
  const unlockedCount = lvl.breeds;
  const prevCount = currentLevel > 0 ? LEVELS[currentLevel - 1].breeds : 0;
  const roster = document.getElementById('breed-roster');
  if(roster) {
    roster.innerHTML = '';
    for(let i = 0; i < BREED_ORDER.length; i++) {
      const breed = BREED_ORDER[i];
      const isUnlocked = i < unlockedCount;
      const isNew = isUnlocked && i >= prevCount && currentLevel > 0;
      const slot = document.createElement('div');
      slot.className = 'breed-slot ' + (isUnlocked ? (isNew ? 'unlocked new-unlock' : 'unlocked') : 'locked');
      const img = document.createElement('img');
      const standingFile = (typeof dogStandingFileMap !== 'undefined' && dogStandingFileMap[breed])
        ? dogStandingFileMap[breed] : breed + '-standing';
      img.src = 'img/dogs/standing/' + standingFile + '.webp';
      img.alt = breed;
      slot.appendChild(img);
      if(!isUnlocked) {
        const q = document.createElement('div');
        q.className = 'breed-mystery';
        q.textContent = '?';
        slot.appendChild(q);
      } else {
        const label = document.createElement('div');
        label.className = 'breed-name';
        label.textContent = (typeof BREED_DISPLAY_NAMES !== 'undefined' && BREED_DISPLAY_NAMES[breed]) || breed;
        slot.appendChild(label);
      }
      roster.appendChild(slot);
    }
  }

  document.getElementById('level-start-screen').style.display = 'flex';
  gameRunning = false;
  timerRunning = false;
}

function beginLevel() {
  document.getElementById('level-start-screen').style.display = 'none';
  bgMusic.pause();
  startIris(() => {
    gameScreen = SCREEN.GAMEPLAY;
    actuallyBeginLevel();
  }, () => {
    startLevelMusic(currentLevel);
  });
}

function actuallyBeginLevel() {
  activeBgLevel = currentLevel;
  const lvl = LEVELS[currentLevel];
  levelBreeds = getAvailableBreeds();
  initGrid();
  score = 0;
  acorns = 2;
  chainLevel = 0;
  packStats = {3: 0, 4: 0, 5: 0};
  floatingTexts = [];
  bouncing = false;
  nudging = false;
  dragging = false;
  dragStartCells = null;
  selectedDogCells = null;
  ballGrabbed = false;
  currentDog = spawnDog();
  aimTargetCol = 4;
  throwing = false;
  dropping = false;
  inFlightDogs = [];
  matchingCells = [];
  animatingMatch = false;
  ballCurrentPos = null;
  dogCurrentPos = null;
  resetSquirrelState();
  starEarnedTimes = [0, 0, 0];
  prevStarsEarned = 0;
  timeRemaining = lvl.time;
  timerStart = performance.now();
  timerRunning = true;
  gameRunning = true;
  scheduleSquirrel();
  updateUI();
}

function levelComplete() {
  gameRunning = false;
  timerRunning = false;
  stopLevelMusic();
  playSfx(levelClearedSound);

  const stars = getStarsEarned(currentLevel, score);
  // Keep best star count (null = never completed)
  if(completedLevels[currentLevel] === null || stars > completedLevels[currentLevel]) {
    completedLevels[currentLevel] = stars;
  }
  saveProgress();

  // Track high score
  const isNewBest = score > (highScores[currentLevel] || 0);
  if(isNewBest) {
    highScores[currentLevel] = score;
    saveHighScores();
  }

  const name = LEVEL_NAMES[currentLevel] || '';

  let starLine = '';
  for(let i = 0; i < 3; i++) {
    starLine += i < stars ? '\u{1F31F}' : '\u2606';
  }

  // Build "You earned" section for newly unlocked breed(s)
  let earnedHtml = '';
  const currentBreedCount = LEVELS[currentLevel].breeds;
  const nextLevel = currentLevel + 1;
  if(nextLevel < LEVELS.length) {
    const nextBreedCount = LEVELS[nextLevel].breeds;
    const newBreeds = [];
    for(let i = currentBreedCount; i < nextBreedCount; i++) {
      newBreeds.push(BREED_ORDER[i]);
    }
    if(newBreeds.length > 0) {
      const breedImgs = newBreeds.map(b => {
        const standingFile = (typeof dogStandingFileMap !== 'undefined' && dogStandingFileMap[b])
          ? dogStandingFileMap[b] : b + '-standing';
        const displayName = (typeof BREED_DISPLAY_NAMES !== 'undefined' && BREED_DISPLAY_NAMES[b]) || b;
        return '<div style="display:flex;flex-direction:column;align-items:center;margin:0 10px">' +
          '<img src="img/dogs/standing/' + standingFile + '.webp" style="width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));animation:newBreedPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both">' +
          '<div style="font-size:18px;font-weight:bold;color:rgba(255,255,255,0.9);margin-top:4px;text-shadow:0 1px 3px rgba(0,0,0,0.5)">' + displayName + '</div>' +
          '</div>';
      }).join('');
      const label = newBreeds.length === 1
        ? 'New breed unlocked!'
        : 'New breeds unlocked!';
      earnedHtml =
        '<div style="margin:10px 0 2px;text-align:center">' +
        '<div style="font-size:22px;font-weight:bold;color:#7fffaa;letter-spacing:1px;text-shadow:0 0 12px rgba(100,255,150,0.5);margin-bottom:6px">' + label + '</div>' +
        '<div style="display:flex;justify-content:center;align-items:flex-end">' + breedImgs + '</div>' +
        '</div>';
    }
  }

  document.getElementById('complete-stats').innerHTML =
    '<div style="font-size:40px;margin:6px 0;text-align:center">' + starLine + '</div>' +
    '<div style="font-size:14px;margin:2px 0;color:rgba(255,255,255,0.7);text-align:center;letter-spacing:1px">Scene 1: Bone Island</div>' +
    '<div style="font-size:22px;margin:2px 0;color:#fff;text-align:center">Level ' + (currentLevel + 1) + ': ' + name + '</div>' +
    '<div style="font-size:22px;margin:6px 0;color:#ffd700;text-align:center">\u{1F3C6} Score: ' + score.toLocaleString() + '</div>' +
    earnedHtml;

  document.getElementById('level-complete-screen').style.display = 'flex';
  document.getElementById('nextLevelBtn').textContent =
    currentLevel >= LEVELS.length - 1 ? 'SCENE 1 COMPLETE!' : 'CONTINUE';
}

function levelFailed() {
  gameRunning = false;
  timerRunning = false;
  stopLevelMusic();
  playSfx(levelFailedSound);

  const thresholds = STAR_THRESHOLDS[currentLevel];
  const name = LEVEL_NAMES[currentLevel] || '';

  document.getElementById('failed-stats').innerHTML =
    '<div style="font-size:40px;margin:6px 0;text-align:center">\u2606\u2606\u2606</div>' +
    '<div style="font-size:14px;margin:2px 0;color:rgba(255,255,255,0.7);text-align:center;letter-spacing:1px">Scene 1: Bone Island</div>' +
    '<div style="font-size:22px;margin:2px 0;color:#fff;text-align:center">Level ' + (currentLevel + 1) + ': ' + name + '</div>' +
    '<div style="font-size:22px;margin:8px 0;color:#ffd700;text-align:center">\u{1F3C6} Score: ' + score.toLocaleString() + '</div>' +
    '<div style="font-size:16px;margin:8px 0;color:#ff8888;text-align:center">Need ' + thresholds[0].toLocaleString() + ' pts for \u2B50</div>';

  document.getElementById('level-failed-screen').style.display = 'flex';
}

function retryLevel() {
  document.getElementById('level-failed-screen').style.display = 'none';
  startIris(() => {
    gameScreen = SCREEN.GAMEPLAY;
    actuallyBeginLevel();
  }, () => {
    startLevelMusic(currentLevel);
  });
}

function nextLevel() {
  document.getElementById('level-complete-screen').style.display = 'none';
  const playedLevel = currentLevel;
  // Recalculate currentLevel as first uncompleted, or last if all done
  const frontier = completedLevels.findIndex(s => s === null);
  currentLevel = frontier >= 0 ? frontier : LEVELS.length - 1;

  if(frontier < 0) {
    // All levels complete - show Scene 2 coming soon
    startIris(() => {
      gameScreen = SCREEN.SCENE2;
      startScene2Music();
    });
  } else if(frontier === playedLevel + 1) {
    // Just advanced to new level - show paw path
    startIris(() => {
      gameScreen = SCREEN.MAP;
      pawPath.active = true;
      pawPath.from = playedLevel;
      pawPath.to = frontier;
      pawPath.startTime = performance.now();
      bgMusic.currentTime = 0;
      bgMusic.play().catch(() => {});
    });
  } else {
    // Replay finished - just go to map
    startIris(() => {
      gameScreen = SCREEN.MAP;
      bgMusic.currentTime = 0;
      bgMusic.play().catch(() => {});
    });
  }
}

function gameOver() {
  gameRunning = false;
  timerRunning = false;
  stopLevelMusic();
  document.getElementById('final-score').innerHTML = '\u{1F3C6} ' + score + ' | \u{1F330} ' + acorns;
  document.getElementById('gameover-screen').style.display = 'flex';
}

function restartFromGameOver() {
  document.getElementById('gameover-screen').style.display = 'none';
  startIris(() => {
    gameScreen = SCREEN.MAP;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
  });
}

// ============================================================
// SCENE 2 COMING SOON SCREEN
// ============================================================
function drawScene2Screen(now) {
  // Full-screen background image
  if(scene2Loaded && scene2Img.complete) {
    ctx.drawImage(scene2Img, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scene 2 Coming Soon!', W / 2, H / 2);
  }

  // "Replay Scene 1" button in bottom-right corner
  const btn = SCENE2_BTN;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = scene2BtnHovered ? 16 : 8;
  ctx.fillStyle = scene2BtnHovered ? '#ff8555' : '#ff6b35';
  ctx.beginPath();
  ctx.roundRect(btn.x - btn.w / 2, btn.y - btn.h / 2, btn.w, btn.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btn.x - btn.w / 2, btn.y - btn.h / 2, btn.w, btn.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Replay Scene 1', btn.x, btn.y);
  ctx.restore();

  // Top-right buttons: Fullscreen (hidden on iOS entirely), Mute
  if(!_isIOS) {
    drawMapButton(GAME_FS_BTN.cx, GAME_FS_BTN.cy, MAP_BTN_R, false, isFullscreen ? 'exitfullscreen' : 'fullscreen');
  }
  drawMapButton(GAME_MUTE_BTN.cx, GAME_MUTE_BTN.cy, MAP_BTN_R, false, musicMuted ? 'muted' : 'unmuted');
}

function handleScene2Click(x, y) {
  // Fullscreen button (hidden on iOS)
  if(!_isIOS) {
    const fsb = GAME_FS_BTN;
    if(Math.sqrt((x - fsb.cx) * (x - fsb.cx) + (y - fsb.cy) * (y - fsb.cy)) <= fsb.r) {
      toggleFullscreen();
      return;
    }
  }
  // Mute button
  const gm = GAME_MUTE_BTN;
  if(Math.sqrt((x - gm.cx) * (x - gm.cx) + (y - gm.cy) * (y - gm.cy)) <= gm.r) {
    toggleMute();
    return;
  }
  // Replay Scene 1 button
  const btn = SCENE2_BTN;
  if(x >= btn.x - btn.w / 2 && x <= btn.x + btn.w / 2 &&
     y >= btn.y - btn.h / 2 && y <= btn.y + btn.h / 2) {
    stopScene2Music();
    startIris(() => {
      gameScreen = SCREEN.MAP;
      bgMusic.currentTime = 0;
      bgMusic.play().catch(() => {});
    });
  }
}

function handleScene2Hover(x, y) {
  const btn = SCENE2_BTN;
  scene2BtnHovered = (x >= btn.x - btn.w / 2 && x <= btn.x + btn.w / 2 &&
                      y >= btn.y - btn.h / 2 && y <= btn.y + btn.h / 2);
  const gm = GAME_MUTE_BTN;
  const onMute = Math.sqrt((x - gm.cx) * (x - gm.cx) + (y - gm.cy) * (y - gm.cy)) <= gm.r;
  const fsb = GAME_FS_BTN;
  const onFs = Math.sqrt((x - fsb.cx) * (x - fsb.cx) + (y - fsb.cy) * (y - fsb.cy)) <= fsb.r;
  canvas.style.cursor = (scene2BtnHovered || onMute || onFs) ? 'pointer' : 'default';
}
