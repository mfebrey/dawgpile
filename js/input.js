// ============================================================
// INPUT
// ============================================================
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top) * (H / rect.height)
  };
}

function performNudge(row, col, forceDir) {
  const dogCells = findDogCells(row, col);
  if(!dogCells || dogCells.length < 2) return;
  const leftCol = Math.min(dogCells[0].col, dogCells[1].col);
  const dogRow = dogCells[0].row;
  const dir = forceDir || ((col === leftCol) ? -1 : 1);
  const destCol = (dir === -1) ? leftCol - 1 : leftCol + 2;
  if(destCol < 0 || destCol >= GRID_COLS) return;
  if(getCell(dogRow, destCol) !== null) {
    const fx = GRID_LEFT + (col + 0.5) * CELL_SIZE;
    const fy = GRID_TOP + (row + 0.5) * CELL_SIZE;
    spawnFloat('Blocked!', fx, fy, '#ff4444', 20);
    return;
  }
  const cellL = getCell(dogRow, leftCol);
  const cellR = getCell(dogRow, leftCol + 1);
  setCell(dogRow, leftCol, null);
  setCell(dogRow, leftCol + 1, null);
  if(dir === -1) {
    setCell(dogRow, leftCol - 1, cellL);
    setCell(dogRow, leftCol, cellR);
  } else {
    setCell(dogRow, leftCol + 1, cellL);
    setCell(dogRow, leftCol + 2, cellR);
  }
  nudging = true;
  nudgeStartTime = performance.now();
  nudgeDirection = dir;
  nudgeCells = dir === -1
    ? [{row: dogRow, col: leftCol - 1}, {row: dogRow, col: leftCol}]
    : [{row: dogRow, col: leftCol + 1}, {row: dogRow, col: leftCol + 2}];
  setTimeout(async () => {
    nudging = false;
    chainLevel = 0;
    while(applyGravity()) await new Promise(resolve => setTimeout(resolve, 200));
    await processMatches();
  }, NUDGE_DURATION + 50);
}

function performSwap(cellsA, cellsB) {
  const dataA = cellsA.map(c => ({...c, data: {...getCell(c.row, c.col)}}));
  const dataB = cellsB.map(c => ({...c, data: {...getCell(c.row, c.col)}}));
  dataA.forEach(c => setCell(c.row, c.col, null));
  dataB.forEach(c => setCell(c.row, c.col, null));
  dataA.forEach((c, i) => { if(i < dataB.length) setCell(dataB[i].row, dataB[i].col, c.data); });
  dataB.forEach((c, i) => { if(i < dataA.length) setCell(dataA[i].row, dataA[i].col, c.data); });
  setTimeout(async () => {
    chainLevel = 0;
    await processMatches();
  }, 200);
}

function handlePointerDown(x, y) {
  if(iosPromptVisible) { handleIOSPromptClick(x, y); return; }
  if(iris.active) return;
  if(gameScreen === SCREEN.INSTRUCTIONS) { handleInstructionsClick(x, y); return; }
  if(gameScreen === SCREEN.WELCOME) { handleWelcomeClick(x, y); return; }
  if(gameScreen === SCREEN.MAP) { handleMapClick(x, y); return; }
  if(gameScreen === SCREEN.SCENE2) { handleScene2Click(x, y); return; }
  {
    const gm = GAME_MUTE_BTN;
    if(Math.sqrt((x - gm.cx) * (x - gm.cx) + (y - gm.cy) * (y - gm.cy)) <= gm.r) {
      toggleMute();
      return;
    }
    if(!_isIOS) {
      const fsb = GAME_FS_BTN;
      if(Math.sqrt((x - fsb.cx) * (x - fsb.cx) + (y - fsb.cy) * (y - fsb.cy)) <= fsb.r) {
        toggleFullscreen();
        return;
      }
    }
  }

  if(!gameRunning || animatingMatch || nudging) return;

  const spaceHitZone = squirrelIsSpace && y >= 0 && y <= H;
  const boatHitZone = squirrelIsBoat && y >= HIT_ZONE_TOP - 40 && y <= HIT_ZONE_BOTTOM;
  const poolHitZone = squirrelIsPool && y >= HIT_ZONE_TOP - 40 && y <= HIT_ZONE_BOTTOM;
  const groundHitZone = !squirrelIsSpace && !squirrelIsBoat && !squirrelIsPool && y >= HIT_ZONE_TOP && y <= HIT_ZONE_BOTTOM;
  if((squirrelActive || squirrelAlertActive) && (spaceHitZone || boatHitZone || poolHitZone || groundHitZone)) {
    if(acorns > 0 && squirrelActive && !squirrelRetreating) {
      acorns--;
      updateUI();
      playSfx(wooshSound);
      acornProjectiles.push({
        startX: x, startY: H,
        targetX: x, targetY: y,
        x: x, y: H,
        startTime: performance.now()
      });
    }
    return;
  }

  if(currentDog && !squirrelActive && !squirrelAlertActive) {
    const bx = BALL_ORIGIN_X, by = BALL_DRAW_Y;
    const dist = Math.sqrt((x - bx) * (x - bx) + (y - by) * (y - by));
    if(dist < BALL_GRAB_RADIUS) {
      ballGrabbed = true;
      ballGrabStartX = x;
      ballGrabStartY = y;
      ballDragX = x;
      ballDragY = y;
      selectedDogCells = null;
      dragging = false;
      dragStartCells = null;
      return;
    }
  }

  if(x >= GRID_LEFT && x < GRID_LEFT + GRID_COLS * CELL_SIZE &&
     y >= GRID_TOP && y < GRID_TOP + GRID_ROWS * CELL_SIZE) {
    const col = Math.floor((x - GRID_LEFT) / CELL_SIZE);
    const row = Math.floor((y - GRID_TOP) / CELL_SIZE);
    if(getCell(row, col)) {
      const dogCells = findDogCells(row, col);
      if(dogCells && dogCells.length >= 2) {
        dragging = true;
        dragStartRow = row;
        dragStartCol = col;
        dragStartCells = dogCells;
        dragOriginX = x;
        dragOriginY = y;
        dragMouseX = x;
        dragMouseY = y;
        dragDidMove = false;
      }
    } else {
      // Clicked empty cell in grid - deselect
      selectedDogCells = null;
    }
  }
}

function handlePointerMove(x, y) {
  if(iris.active) return;
  if(gameScreen === SCREEN.INSTRUCTIONS) {
    const gb = GOT_IT_BTN;
    gotItBtnHovered = (x >= gb.x - gb.w / 2 && x <= gb.x + gb.w / 2 &&
                       y >= gb.y - gb.h / 2 && y <= gb.y + gb.h / 2);
    canvas.style.cursor = gotItBtnHovered ? 'pointer' : 'default';
    return;
  }
  if(gameScreen === SCREEN.SCENE2) {
    handleScene2Hover(x, y);
    return;
  }
  if(gameScreen === SCREEN.WELCOME) {
    const b = WELCOME_BTN;
    const bdx = x - b.x, bdy = y - b.y;
    welcomeBtnHovered = (Math.sqrt(bdx*bdx + bdy*bdy) <= b.r);
    canvas.style.cursor = welcomeBtnHovered ? 'pointer' : 'default';
    return;
  }
  if(gameScreen === SCREEN.MAP) {
    mapHoveredLevel = -1;
    const rb = MAP_RESET_BTN;
    const mb = MAP_MUTE_BTN;
    const ib = MAP_INFO_BTN;
    mapResetHovered = (Math.sqrt((x - rb.cx) * (x - rb.cx) + (y - rb.cy) * (y - rb.cy)) <= rb.r);
    mapMuteHovered = (Math.sqrt((x - mb.cx) * (x - mb.cx) + (y - mb.cy) * (y - mb.cy)) <= mb.r);
    mapInfoHovered = (Math.sqrt((x - ib.cx) * (x - ib.cx) + (y - ib.cy) * (y - ib.cy)) <= ib.r);
    const fsb = MAP_FS_BTN;
    mapFsHovered = !_isIOS && (Math.sqrt((x - fsb.cx) * (x - fsb.cx) + (y - fsb.cy) * (y - fsb.cy)) <= fsb.r);
    for(let i = 0; i < MAP_LEVELS.length; i++) {
      const lv = MAP_LEVELS[i];
      const edx = (x - lv.x) / (MAP_OVAL_RX + 10);
      const edy = (y - lv.y) / (MAP_OVAL_RY + 8);
      if(edx*edx + edy*edy <= 1) {
        const isCurrent = (i === currentLevel) && completedLevels[i] === null;
        const isCompleted = completedLevels[i] !== null;
        if(isCurrent || isCompleted) mapHoveredLevel = i;
      }
    }
    canvas.style.cursor = (mapHoveredLevel >= 0 || mapResetHovered || mapMuteHovered || mapInfoHovered || mapFsHovered) ? bigPointerCursor : 'default';
    return;
  }
  if(!gameRunning) return;

  if(ballGrabbed) {
    ballDragX = x;
    ballDragY = y;
    const rawCol = (x - GRID_LEFT) / CELL_SIZE;
    aimTargetCol = Math.round(Math.max(0, Math.min(GRID_COLS - 2, rawCol)));
    aimPeakY = Math.max(GRID_TOP - 30, Math.min(GRID_BOTTOM, y));
    canvas.style.cursor = 'grabbing';
    return;
  }

  mouseCanvasX = x;
  mouseCanvasY = y;

  hoverRow = -1; hoverCol = -1;
  if(x >= GRID_LEFT && x < GRID_LEFT + GRID_COLS * CELL_SIZE &&
     y >= GRID_TOP && y < GRID_TOP + GRID_ROWS * CELL_SIZE) {
    const gc = Math.floor((x - GRID_LEFT) / CELL_SIZE);
    const gr = Math.floor((y - GRID_TOP) / CELL_SIZE);
    if(getCell(gr, gc)) { hoverRow = gr; hoverCol = gc; }
  }

  const bDist = Math.sqrt((x - BALL_ORIGIN_X) * (x - BALL_ORIGIN_X) + (y - BALL_DRAW_Y) * (y - BALL_DRAW_Y));
  const onBall = bDist < BALL_GRAB_RADIUS && currentDog;

  const inHitZone = squirrelActive && (squirrelIsSpace ? (y >= 0 && y <= H) : (squirrelIsBoat || squirrelIsPool) ? (y >= HIT_ZONE_TOP - 40 && y <= HIT_ZONE_BOTTOM) : (y >= HIT_ZONE_TOP && y <= HIT_ZONE_BOTTOM));
  canvas.style.cursor = dragging ? 'grabbing' : (inHitZone ? 'none' : (onBall ? 'grab' : (hoverRow >= 0 ? 'grab' : 'default')));

  if(dragging) {
    const dx = x - dragOriginX;
    const dy = y - dragOriginY;
    if(Math.abs(dx) > 15) dragDidMove = true;
    dragMouseX = x;
    dragMouseY = y;
    // Cancel scoot if vertical movement exceeds threshold
    if(Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) {
      dragging = false;
      dragStartCells = null;
      canvas.style.cursor = 'default';
    }
  }
}

function handlePointerUp(x, y) {
  if(!gameRunning) return;

  if(ballGrabbed) {
    ballGrabbed = false;
    canvas.style.cursor = 'default';
    const pullDist = Math.sqrt((x - ballGrabStartX) * (x - ballGrabStartX) + (y - ballGrabStartY) * (y - ballGrabStartY));
    if(pullDist < 15) return;
    const rawCol = (x - GRID_LEFT) / CELL_SIZE;
    aimTargetCol = Math.round(Math.max(0, Math.min(GRID_COLS - 2, rawCol)));
    if(currentDog) {
      throwDog();
    }
    return;
  }

  if(dragging) {
    dragging = false;
    let handled = false;
    if(dragDidMove && dragStartCells) {
      selectedDogCells = null;
      const col = Math.floor((x - GRID_LEFT) / CELL_SIZE);
      const row = Math.floor((y - GRID_TOP) / CELL_SIZE);
      if(col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        const targetCell = getCell(row, col);
        if(targetCell) {
          const targetDogCells = findDogCells(row, col);
          if(targetDogCells && targetDogCells.length >= 2 &&
             !dragStartCells.some(c => targetDogCells.some(d => d.row === c.row && d.col === c.col))) {
            let adjacent = false;
            for(const a of dragStartCells) {
              for(const b of targetDogCells) {
                if((Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
                   (Math.abs(a.col - b.col) === 1 && a.row === b.row)) { adjacent = true; break; }
              }
              if(adjacent) break;
            }
            if(adjacent) {
              performSwap(dragStartCells, targetDogCells);
              dragStartCells = null;
              handled = true;
            }
          }
        }
      }
      if(!handled && !nudging && dragStartCells) {
        const sdx = Math.abs(x - dragOriginX);
        const sdy = Math.abs(y - dragOriginY);
        // Only scoot on primarily horizontal drags
        if(sdx > sdy && sdy <= 20) {
          const swipeDir = (x - dragOriginX) >= 0 ? 1 : -1;
          performNudge(dragStartRow, dragStartCol, swipeDir);
          handled = true;
        }
      }
    } else if(!dragDidMove) {
      // Click (no drag) on a dog - handle selection / swap
      const clickedCells = dragStartCells;
      if(clickedCells && clickedCells.length >= 2) {
        if(selectedDogCells) {
          const isSame = selectedDogCells.some(c => clickedCells.some(d => d.row === c.row && d.col === c.col));
          if(isSame) {
            selectedDogCells = null;
          } else {
            let adjacent = false;
            for(const a of selectedDogCells) {
              for(const b of clickedCells) {
                if((Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
                   (Math.abs(a.col - b.col) === 1 && a.row === b.row)) { adjacent = true; break; }
              }
              if(adjacent) break;
            }
            if(adjacent) {
              performSwap(selectedDogCells, clickedCells);
              selectedDogCells = null;
            } else {
              selectedDogCells = clickedCells;
            }
          }
        } else {
          selectedDogCells = clickedCells;
        }
      }
    }
    dragStartCells = null;
    return;
  }
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
  const {x, y} = getCanvasPos(e);
  handlePointerDown(x, y);
});
canvas.addEventListener('mousemove', (e) => {
  const {x, y} = getCanvasPos(e);
  handlePointerMove(x, y);
});
canvas.addEventListener('mouseup', (e) => {
  const {x, y} = getCanvasPos(e);
  handlePointerUp(x, y);
});

// Touch events
function getTouchPos(e) {
  const t = e.touches[0] || e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  return {
    x: (t.clientX - rect.left) * (W / rect.width),
    y: (t.clientY - rect.top) * (H / rect.height)
  };
}
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const {x, y} = getTouchPos(e);
  handlePointerDown(x, y);
}, {passive: false});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const {x, y} = getTouchPos(e);
  handlePointerMove(x, y);
}, {passive: false});
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const {x, y} = getTouchPos(e);
  handlePointerUp(x, y);
}, {passive: false});

// Prevent default touch behaviors at document level
document.addEventListener('touchmove', (e) => {
  if(e.target === canvas) {
    e.preventDefault();
  }
}, {passive: false});

// Prevent pull-to-refresh and pinch zoom
document.body.addEventListener('touchmove', (e) => {
  if(e.touches.length > 1) {
    e.preventDefault();
  }
}, {passive: false});

// Button event listeners
document.getElementById('goBtn').addEventListener('click', beginLevel);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
document.getElementById('retryBtn').addEventListener('click', retryLevel);
document.getElementById('restartBtn').addEventListener('click', restartFromGameOver);

// ============================================================
// FULLSCREEN
// ============================================================
function toggleFullscreen() {
  if(_isIOS) return; // iOS doesn't support fullscreen API - button is hidden
  if(!document.fullscreenElement && !document.webkitFullscreenElement) {
    const elem = document.documentElement;
    if(elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if(elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if(elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } else {
    if(document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if(document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function onFullscreenChange() {
  isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  setTimeout(() => {
    resizeGame();
  }, 100);
}

document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// Draw iOS "Add to Home Screen" prompt overlay
function drawIOSPrompt() {
  if(!iosPromptVisible) return;
  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // Box
  const bx = W / 2 - 170, by = H / 2 - 110, bw = 340, bh = 220;
  ctx.save();
  ctx.fillStyle = 'rgba(70,160,200,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 14); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(180,230,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 14); ctx.stroke();
  ctx.restore();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Go Fullscreen on iPhone', W / 2, by + 30);

  // Steps
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const sx = bx + 30, sy = by + 65;
  ctx.fillText('1. Tap the Share button  \u{1F4E4}', sx, sy);
  ctx.fillText('2. Tap "Add to Home Screen"', sx, sy + 30);
  ctx.fillText('3. Open from your home screen', sx, sy + 60);

  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('The app will launch without the browser bar!', W / 2, sy + 95);

  // "Got it!" button
  const btn = IOS_PROMPT_BTN;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ff6b35';
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
  ctx.fillText('Got it!', btn.x, btn.y);
  ctx.restore();
}

// Handle click on iOS prompt "Got it!" button
function handleIOSPromptClick(x, y) {
  if(!iosPromptVisible) return false;
  const btn = IOS_PROMPT_BTN;
  if(x >= btn.x - btn.w / 2 && x <= btn.x + btn.w / 2 &&
     y >= btn.y - btn.h / 2 && y <= btn.y + btn.h / 2) {
    iosPromptVisible = false;
    return true;
  }
  // Clicking anywhere outside the button also dismisses
  iosPromptVisible = false;
  return true;
}

// Auto-prompt fullscreen on mobile first touch (skip iOS)
canvas.addEventListener('touchstart', function onFirstTouch() {
  if(_isIOS) return; // iOS doesn't support fullscreen API
  const isMobile = /Android/i.test(navigator.userAgent);
  if(isMobile && !document.fullscreenElement && !document.webkitFullscreenElement) {
    const elem = document.documentElement;
    if(elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }
  canvas.removeEventListener('touchstart', onFirstTouch);
}, {once: true});

// Debug: Press "S" to force-spawn squirrel
document.addEventListener('keydown', (e) => {
  if(e.key === 's' || e.key === 'S') {
    if(gameRunning && !squirrelActive && !squirrelAlertActive) {
      console.log('DEBUG: Force-spawning squirrel via S key');
      startSquirrelAlert();
    }
  }
});
