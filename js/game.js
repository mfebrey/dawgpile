// ============================================================
// DRAW
// ============================================================
function draw(timestamp) {
  const now = timestamp || performance.now();
  updateIris(now);

  if(gameScreen === SCREEN.WELCOME) {
    drawWelcomeScreen();
    drawIris();
    requestAnimationFrame(draw);
    return;
  }
  if(gameScreen === SCREEN.INSTRUCTIONS) {
    drawInstructionsScreen();
    requestAnimationFrame(draw);
    return;
  }
  if(gameScreen === SCREEN.MAP) {
    drawMapScreen(now);
    drawIris();
    requestAnimationFrame(draw);
    return;
  }
  if(gameScreen === SCREEN.SCENE2) {
    drawScene2Screen(now);
    drawIris();
    requestAnimationFrame(draw);
    return;
  }

  // ---- GAMEPLAY RENDERING ----
  // Update timer
  if(timerRunning && gameRunning) {
    const lvl = LEVELS[currentLevel];
    timeRemaining = Math.max(0, lvl.time - (now - timerStart) / 1000);
    updateUI();
    if(timeRemaining <= 0) {
      timerRunning = false;
      const endStars = getStarsEarned(currentLevel, score);
      if(endStars >= 1) {
        levelComplete();
      } else {
        levelFailed();
      }
    }
  }

  // Track star earned animations
  if(gameRunning) {
    const currentStars = getStarsEarned(currentLevel, score);
    if(currentStars > prevStarsEarned) {
      for(let s = prevStarsEarned; s < currentStars; s++) {
        starEarnedTimes[s] = now;
      }
      prevStarsEarned = currentStars;
    }
  }

  // Update squirrel system
  updateSquirrel(now);
  updateAcornProjectiles(now);

  // Background (per-level, shifted up to show more grass)
  const lvlBg = bgImgs[activeBgLevel] && bgImgs[activeBgLevel]._loaded ? bgImgs[activeBgLevel] : (bgLoaded ? bgImg : null);
  if(lvlBg) {
    const imgR = lvlBg.width / lvlBg.height, canR = W / H;
    let sx = 0, sy = 0, sw = lvlBg.width, sh = lvlBg.height;
    if(imgR > canR) { sw = lvlBg.height * canR; sx = (lvlBg.width - sw) / 2; }
    else { sh = lvlBg.width / canR; sy = (lvlBg.height - sh) / 2; }
    const shift = sh * 0.15;
    sy = Math.min(sy + shift, lvlBg.height - sh);
    ctx.drawImage(lvlBg, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, W, H);
  }

  // Grid background
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(GRID_LEFT, GRID_TOP, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for(let c = 0; c <= GRID_COLS; c++) {
    const gx = GRID_LEFT + c * CELL_SIZE;
    ctx.beginPath(); ctx.moveTo(gx, GRID_TOP); ctx.lineTo(gx, GRID_BOTTOM); ctx.stroke();
  }
  for(let r = 0; r <= GRID_ROWS; r++) {
    const gy = GRID_TOP + r * CELL_SIZE;
    ctx.beginPath(); ctx.moveTo(GRID_LEFT, gy); ctx.lineTo(GRID_LEFT + GRID_COLS * CELL_SIZE, gy); ctx.stroke();
  }

  // Dogs with Z-order
  for(let r = 0; r < GRID_ROWS; r++) {
    const oddRow = (r % 2 === 1);
    const cStart = oddRow ? GRID_COLS - 1 : 0;
    const cEnd = oddRow ? -1 : GRID_COLS;
    const cStep = oddRow ? -1 : 1;

    for(let c = cStart; c !== cEnd; c += cStep) {
      const cell = getCell(r, c);
      if(!cell) continue;
      const gx = GRID_LEFT + c * CELL_SIZE;
      const gy = GRID_TOP + r * CELL_SIZE;

      const isMatching = matchingCells.some(m => m.row === r && m.col === c);
      if(isMatching) {
        const pulseT = (now - matchPulseStart) / 200;
        ctx.fillStyle = `rgba(255,255,0,${0.3 + 0.4 * Math.abs(Math.sin(pulseT * Math.PI))})`;
        ctx.fillRect(gx, gy, CELL_SIZE, CELL_SIZE);
      }

      let nudgeOffsetX = 0;
      if(nudging && nudgeCells.some(nc => nc.row === r && nc.col === c)) {
        const nt = Math.min((now - nudgeStartTime) / NUDGE_DURATION, 1);
        nudgeOffsetX = -nudgeDirection * CELL_SIZE * (1 - nt);
      }

      if(cell.primary) {
        const img = dogLyingImages[cell.breed];
        if(img && img.complete) {
          const ov = SPRITE_OVERFLOW;
          const imgRatio = img.width / img.height;
          const flipH = (r % 2 === 1);

          let extraScale = 1.0;
          let bounceOffsetY = 0;
          if(bouncing && bounceCells.some(bc => bc.row === r && bc.col === c)) {
            const bt = (now - bounceStartTime) / BOUNCE_DURATION;
            if(bt < 1) {
              const bounceCount = 3;
              const phase = bt * bounceCount * Math.PI;
              const decay = 1 - bt;
              bounceOffsetY = -Math.abs(Math.sin(phase)) * throwBounceHeight * decay * decay;
            }
          }
          if(isMatching) {
            const pt = (now - matchPulseStart) / 200;
            extraScale = 1 + 0.15 * Math.abs(Math.sin(pt * Math.PI));
          }

          const areaW = CELL_SIZE * 2 * (1 + ov);
          const areaH = CELL_SIZE * (1 + ov);
          let drawW, drawH;
          if(imgRatio > areaW / areaH) { drawW = areaW; drawH = areaW / imgRatio; }
          else { drawH = areaH; drawW = areaH * imgRatio; }
          drawW *= extraScale; drawH *= extraScale;

          if(cell.orientation === 'h') {
            ctx.save();
            ctx.translate(gx + CELL_SIZE + nudgeOffsetX, gy + CELL_SIZE / 2 + bounceOffsetY);
            if(flipH) ctx.scale(-1, 1);
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
          } else {
            ctx.save();
            ctx.translate(gx + CELL_SIZE / 2 + nudgeOffsetX, gy + CELL_SIZE + bounceOffsetY);
            ctx.rotate(Math.PI / 2);
            if(flipH) ctx.scale(-1, 1);
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
          }
        }
      }
    }
  }

  // ---- COLLAPSE ANIMATION ----
  if(collapseActive) {
    const cElapsed = now - collapseStartTime;
    const fallDuration = 600;
    for(const cd of collapseDogs) {
      const localElapsed = cElapsed - cd.delay;
      if(localElapsed < 0) {
        var t = 0;
      } else {
        var t = Math.min(1, localElapsed / fallDuration);
      }
      const eased = t * t;
      const fallY = eased * (H - GRID_TOP + 100);
      const rot = eased * cd.rotDir * 1.2;
      const alpha = 1 - t * 0.8;
      if(alpha <= 0.01) continue;

      const gx = GRID_LEFT + cd.col * CELL_SIZE;
      const gy = GRID_TOP + cd.row * CELL_SIZE;
      const img = dogLyingImages[cd.breed];
      if(img && img.complete) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        const cx = cd.orientation === 'h' ? gx + CELL_SIZE : gx + CELL_SIZE / 2;
        const cy = cd.orientation === 'h' ? gy + CELL_SIZE / 2 : gy + CELL_SIZE;
        ctx.translate(cx, cy + fallY);
        ctx.rotate(rot);
        const ov = SPRITE_OVERFLOW;
        const areaW = cd.orientation === 'h' ? CELL_SIZE * 2 * (1 + ov) : CELL_SIZE * (1 + ov);
        const areaH = cd.orientation === 'h' ? CELL_SIZE * (1 + ov) : CELL_SIZE * 2 * (1 + ov);
        const imgR = img.width / img.height;
        let dw, dh;
        if(imgR > areaW / areaH) { dw = areaW; dh = areaW / imgR; }
        else { dh = areaH; dw = areaH * imgR; }
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }
    }
  }

  // ---- SQUIRREL: sprite, acorn projectiles, starbursts ----
  if(squirrelActive && gameRunning) {
    // Pick the right squirrel image based on type
    function getSquirrelImg(forHit) {
      if(squirrelIsSpace) {
        return (sqBaseStepLoaded && sqBaseStepImg.complete) ? sqBaseStepImg : sqStepImg;
      }
      if(squirrelIsBoat) {
        return (sqForestLoaded && sqForestImg.complete) ? sqForestImg : sqStepImg;
      }
      if(squirrelIsPool) {
        return (sqPoolLoaded && sqPoolImg.complete) ? sqPoolImg : sqStepImg;
      }
      if(forHit) {
        return (sqAcornLoaded && sqAcornImg.complete) ? sqAcornImg : sqStepImg;
      }
      return squirrelFrame === 0 ? sqStepImg : sqJumpImg;
    }
    function getSquirrelLoaded() {
      if(squirrelIsSpace) return sqBaseStepLoaded;
      if(squirrelIsBoat) return sqForestLoaded;
      if(squirrelIsPool) return sqPoolLoaded;
      return squirrelFrame === 0 ? sqStepLoaded : sqJumpLoaded;
    }
    const centeredDraw = squirrelIsSpace || squirrelIsBoat || squirrelIsPool;

    const sqScale = squirrelIsBoat ? BOAT_SQUIRREL_SCALE : squirrelIsPool ? POOL_SQUIRREL_SCALE : 1.0;

    if(squirrelHitAnim) {
      const hitT = (now - squirrelHitAnimStart) / SQUIRREL_HIT_ANIM_DURATION;
      const useImg = getSquirrelImg(true);
      const hitScale = (1 + hitT * 1.0) * sqScale;
      const hitAlpha = hitT < 0.6 ? 1.0 : 1.0 - ((hitT - 0.6) / 0.4);
      const sqW = SQUIRREL_SIZE * hitScale;
      const sqH = sqW * (useImg.height / useImg.width);
      ctx.save();
      ctx.globalAlpha = Math.max(0, hitAlpha);
      ctx.translate(squirrelX, squirrelCurrentY);
      if(squirrelIsSpace || squirrelIsBoat || squirrelIsPool) ctx.rotate(squirrelRotation);
      const actualMoveDir = squirrelReversed ? -squirrelDir : squirrelDir;
      if(actualMoveDir > 0) ctx.scale(-1, 1);
      ctx.drawImage(useImg, -sqW / 2, centeredDraw ? -sqH / 2 : -sqH, sqW, sqH);
      ctx.restore();
    } else {
      const sqImg = getSquirrelImg(false);
      const sqLoaded = getSquirrelLoaded();
      if(sqLoaded && sqImg.complete) {
        const sqW = SQUIRREL_SIZE * sqScale;
        const sqH = sqW * (sqImg.height / sqImg.width);
        ctx.save();
        const jumpOffset = (squirrelIsSpace || squirrelIsBoat || squirrelIsPool) ? 0 : (squirrelFrame === 1 ? -22 : 0);
        ctx.translate(squirrelX, squirrelCurrentY + jumpOffset);
        if(squirrelIsSpace || squirrelIsBoat || squirrelIsPool) ctx.rotate(squirrelRotation);
        const actualMoveDir = squirrelReversed ? -squirrelDir : squirrelDir;
        if(actualMoveDir > 0) ctx.scale(-1, 1);
        ctx.drawImage(sqImg, -sqW / 2, centeredDraw ? -sqH / 2 : -sqH, sqW, sqH);
        ctx.restore();
      }
    }
  }

  // Acorn projectiles
  for(const p of acornProjectiles) {
    ctx.save();
    const acornSize = 28 * (p.scale || 1);
    if(acornLoaded && acornImg.complete) {
      const aw = acornSize;
      const ah = acornSize * (acornImg.height / acornImg.width);
      ctx.drawImage(acornImg, p.x - aw / 2, p.y - ah / 2, aw, ah);
    } else {
      ctx.font = (acornSize * 0.7) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F330}', p.x, p.y);
    }
    ctx.restore();
  }

  // Starburst effects
  starbursts = starbursts.filter(sb => {
    const elapsed = (now - sb.startTime) / 1000;
    if(elapsed > 0.5) return false;
    const t = elapsed / 0.5;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    for(const pt of sb.particles) {
      const px = sb.x + Math.cos(pt.angle) * pt.speed * t;
      const py = sb.y + Math.sin(pt.angle) * pt.speed * t;
      const sz = pt.size * (1 - t * 0.5);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return true;
  });

  // Custom large crosshair cursor during squirrel attack
  const crosshairVisible = squirrelActive && gameRunning && !ballGrabbed && (
    squirrelIsSpace ? (mouseCanvasY >= 0 && mouseCanvasY <= H) :
    (squirrelIsBoat || squirrelIsPool) ? (mouseCanvasY >= HIT_ZONE_TOP - 40 && mouseCanvasY <= HIT_ZONE_BOTTOM) :
    (mouseCanvasY >= HIT_ZONE_TOP && mouseCanvasY <= HIT_ZONE_BOTTOM)
  );
  if(crosshairVisible) {
    const cx = mouseCanvasX, cy = mouseCanvasY;
    const crossSize = 20;
    ctx.save();
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,34,34,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, crossSize - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // "SQUIRREL!" alert text
  if(squirrelAlertActive && gameRunning) {
    const alertT = (now - squirrelAlertStart) / SQUIRREL_ALERT_DURATION;
    const shakeX = (Math.random() - 0.5) * 8;
    const shakeY = (Math.random() - 0.5) * 6;
    const alertScale = 1 + 0.1 * Math.abs(Math.sin(alertT * 8 * Math.PI));
    const alertText = (currentLevel === 4) ? 'SPACE SQUIRREL!' : 'SQUIRREL!';
    const alertFont = (currentLevel === 4) ? 'bold 40px Arial' : 'bold 48px Arial';
    ctx.save();
    ctx.translate(W / 2 + shakeX, H / 2 - 40 + shakeY);
    ctx.scale(alertScale, alertScale);
    ctx.font = alertFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 5;
    ctx.strokeText(alertText, 0, 0);
    ctx.fillStyle = (currentLevel === 4) ? '#44bbff' : '#ff4422';
    ctx.fillText(alertText, 0, 0);
    ctx.restore();
  }

  // Hover highlight on grid dogs
  if(!dragging && hoverRow >= 0 && hoverCol >= 0 && gameRunning && !animatingMatch) {
    const hDog = findDogCells(hoverRow, hoverCol);
    if(hDog) {
      for(const dc of hDog) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(GRID_LEFT + dc.col * CELL_SIZE, GRID_TOP + dc.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Selected dog highlight (click-to-swap) - BLUE single rectangle
  if(selectedDogCells && selectedDogCells.length >= 2 && gameRunning && !animatingMatch) {
    const minCol = Math.min(...selectedDogCells.map(c => c.col));
    const maxCol = Math.max(...selectedDogCells.map(c => c.col));
    const minRow = Math.min(...selectedDogCells.map(c => c.row));
    const maxRow = Math.max(...selectedDogCells.map(c => c.row));
    const bx = GRID_LEFT + minCol * CELL_SIZE;
    const by = GRID_TOP + minRow * CELL_SIZE;
    const bw = (maxCol - minCol + 1) * CELL_SIZE;
    const bh = (maxRow - minRow + 1) * CELL_SIZE;
    ctx.fillStyle = 'rgba(0,100,255,0.4)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(0,100,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  }

  // Drag visual feedback (scoot) - GREEN single rectangle
  if(dragging && dragStartCells && dragStartCells.length >= 2) {
    const minCol = Math.min(...dragStartCells.map(c => c.col));
    const maxCol = Math.max(...dragStartCells.map(c => c.col));
    const minRow = Math.min(...dragStartCells.map(c => c.row));
    const maxRow = Math.max(...dragStartCells.map(c => c.row));
    const bx = GRID_LEFT + minCol * CELL_SIZE;
    const by = GRID_TOP + minRow * CELL_SIZE;
    const bw = (maxCol - minCol + 1) * CELL_SIZE;
    const bh = (maxRow - minRow + 1) * CELL_SIZE;
    ctx.fillStyle = 'rgba(0,255,100,0.4)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(0,255,100,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    if(dragDidMove) {
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText('\u21D4', dragMouseX, dragMouseY - 20);
      ctx.fillText('\u21D4', dragMouseX, dragMouseY - 20);

      const dhc = Math.floor((dragMouseX - GRID_LEFT) / CELL_SIZE);
      const dhr = Math.floor((dragMouseY - GRID_TOP) / CELL_SIZE);
      if(dhc >= 0 && dhc < GRID_COLS && dhr >= 0 && dhr < GRID_ROWS) {
        const hCell = getCell(dhr, dhc);
        if(hCell) {
          const hDog = findDogCells(dhr, dhc);
          if(hDog && hDog.length >= 2 &&
             !dragStartCells.some(c => hDog.some(d => d.row === c.row && d.col === c.col))) {
            let adj = false;
            for(const a of dragStartCells) {
              for(const b of hDog) {
                if((Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
                   (Math.abs(a.col - b.col) === 1 && a.row === b.row)) { adj = true; break; }
              }
              if(adj) break;
            }
            const color = adj ? 'rgba(100,255,100,0.5)' : 'rgba(255,100,100,0.35)';
            for(const dc of hDog) {
              ctx.fillStyle = color;
              ctx.fillRect(GRID_LEFT + dc.col * CELL_SIZE, GRID_TOP + dc.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
          }
        }
      }
    }
  }

  // Aiming arrow (drawn BEHIND ball, pivot at CENTER of ball)
  if(ballGrabbed && currentDog && gameRunning) {
    const landRow = findLandingRow(aimTargetCol, currentDog.orientation);
    if(landRow >= 0) {
      const targetX = GRID_LEFT + aimTargetCol * CELL_SIZE + CELL_SIZE;
      const targetY = GRID_TOP + landRow * CELL_SIZE + CELL_SIZE / 2;
      const pivotX = BALL_ORIGIN_X;
      const pivotY = BALL_DRAW_Y;
      const angle = Math.atan2(targetY - pivotY, targetX - pivotX);
      const rotation = angle + Math.PI / 2;
      const arrowH = 100;
      const arrowOffset = 40;
      if(arrowLoaded && arrowImg.complete && arrowImg.naturalWidth > 0) {
        const arrowW = arrowH * (arrowImg.width / arrowImg.height);
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(rotation);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(arrowImg, -arrowW / 2, -arrowOffset - arrowH, arrowW, arrowH);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(rotation);
        ctx.globalAlpha = 0.85;
        const tipY = -(arrowOffset + arrowH);
        const baseY = -arrowOffset;
        const grad = ctx.createLinearGradient(0, baseY, 0, tipY);
        grad.addColorStop(0, '#ffcc44');
        grad.addColorStop(1, '#ff8800');
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(0, tipY + 20); ctx.stroke();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(0, tipY + 20); ctx.stroke();
        ctx.fillStyle = '#ff8800';
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-10, tipY + 22);
        ctx.lineTo(10, tipY + 22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Tennis ball at bottom center with floating animation + 3D ring
  if(tennisLoaded && gameRunning && !squirrelActive && !squirrelAlertActive) {
    const ballSize = ballGrabbed ? 96 : 72;
    const floatAmp = 3;
    const floatSpeed = now / 250;
    const ballFloatY = ballGrabbed ? 0 : Math.sin(floatSpeed) * floatAmp;
    const ringFloatY = ballGrabbed ? 0 : Math.sin(floatSpeed) * -floatAmp;
    const bx = BALL_ORIGIN_X;
    const by = BALL_DRAW_Y + ballFloatY;
    const ringW = ballSize * 0.78;
    const ringH = 10;
    const ringY = BALL_DRAW_Y + ringFloatY;

    ctx.save();
    // BACK half of ring (behind ball)
    if(!ballGrabbed) {
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#ff6b00';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(bx, ringY, ringW, ringH, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(bx, ringY, ringW - 3, ringH - 1, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ball
    if(ballGrabbed) {
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 20;
    }
    ctx.drawImage(tennisImg, bx - ballSize / 2, by - ballSize / 2, ballSize, ballSize);

    // FRONT half of ring (in front of ball)
    if(!ballGrabbed) {
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#ff6b00';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(bx, ringY, ringW, ringH, 0, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(bx, ringY, ringW - 3, ringH - 1, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // Aim arc + landing highlight
  if(ballGrabbed && currentDog && gameRunning) {
    const landRow = findLandingRow(aimTargetCol, currentDog.orientation);
    if(landRow >= 0) {
      const points = calculateBallArc(aimTargetCol, landRow, 30, aimPeakY);
      const visiblePoints = points.filter(p => p.y <= H);
      if(visiblePoints.length > 1) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 6;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
        for(let i = 1; i < visiblePoints.length; i++) ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
        ctx.stroke();
        ctx.strokeStyle = '#ffaa22';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
        for(let i = 1; i < visiblePoints.length; i++) ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(100,255,100,0.35)';
      ctx.fillRect(GRID_LEFT + aimTargetCol * CELL_SIZE, GRID_TOP + landRow * CELL_SIZE, CELL_SIZE * 2, CELL_SIZE);
      ctx.strokeStyle = 'rgba(100,255,100,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(GRID_LEFT + aimTargetCol * CELL_SIZE, GRID_TOP + landRow * CELL_SIZE, CELL_SIZE * 2, CELL_SIZE);
    } else {
      ctx.fillStyle = 'rgba(255,80,80,0.7)';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', GRID_LEFT + aimTargetCol * CELL_SIZE + CELL_SIZE / 2, GRID_TOP - 12);
    }
  }

  // Sitting dog (bottom right)
  if(currentDog && gameRunning && !squirrelActive && !squirrelAlertActive) {
    const img = dogSittingImages[currentDog.breed];
    if(img && img.complete) {
      const dogH = 380;
      const dogW = dogH * (img.width / img.height);
      ctx.drawImage(img, AIM_AREA_X - dogW / 2, H - dogH + 60, dogW, dogH);
    }
  }

  // In-flight dog animations
  if(inFlightDogs.length > 0) {
    updateInFlightDogs(now);
    for(const f of inFlightDogs) {
      const elapsed = now - f.startTime;
      // Ball
      if(tennisLoaded && f.ballPos) {
        const bT = Math.min(elapsed / f.ballDuration, 1.0);
        const bSize = 22 * (3.0 - bT * 2.0);
        ctx.drawImage(tennisImg, f.ballPos.x - bSize / 2, f.ballPos.y - bSize / 2, bSize, bSize);
      }
      // Dog
      if(elapsed > f.dogDelay && f.dogPos) {
        const jumpImg = dogJumpingImages[f.breed];
        if(jumpImg && jumpImg.complete) {
          const dE = Math.max(0, elapsed - f.dogDelay);
          const dT = Math.min(dE / f.dogDuration, 1.0);
          const dScale = 3.0 - dT * 2.0;
          const finalH = CELL_SIZE * (1 + SPRITE_OVERFLOW);
          const dH = finalH * dScale;
          const dW = dH * (jumpImg.width / jumpImg.height);
          ctx.drawImage(jumpImg, f.dogPos.x - dW / 2, f.dogPos.y - dH - 5, dW, dH);
        }
      }
    }
  }

  // ---- CENTERED: Level title + Stars + Timer above grid ----
  if(gameRunning) {
    const lvl = LEVELS[currentLevel];
    const secs = timeRemaining;
    const lineY = GRID_TOP - 14;

    // Layout: "Level 1  ★★☆  00:45" centered
    // Level label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const lvlTextX = W / 2 - 50;
    ctx.fillText('Lvl ' + (currentLevel + 1), lvlTextX, lineY);

    // Stars (3 small stars between level and timer)
    const currentStars = getStarsEarned(currentLevel, score);
    const starCenterX = W / 2;
    const starY = lineY - 6;
    const starSpacing = 18;
    const starSize = 8;
    for(let s = 0; s < 3; s++) {
      const sx = starCenterX + (s - 1) * starSpacing;
      const filled = s < currentStars;
      // Glow animation when newly earned
      let glow = 0;
      if(filled && starEarnedTimes[s] > 0) {
        const sinceEarned = (now - starEarnedTimes[s]) / 1000;
        if(sinceEarned < 0.6) {
          glow = 1.0 - sinceEarned / 0.6;
        }
      }
      drawStarIcon(sx, starY, starSize + glow * 4, filled, glow);
    }

    // Timer
    let timerColor = '#fff';
    let timerScale = 1.0;
    if(secs <= 5) {
      timerColor = '#ff3333';
      timerScale = 1 + 0.08 * Math.abs(Math.sin(now / 100 * Math.PI));
    } else if(secs <= 15) {
      timerColor = '#ff8800';
      timerScale = 1 + 0.04 * Math.abs(Math.sin(now / 200 * Math.PI));
    } else if(secs <= 30) {
      timerColor = '#ffcc00';
      timerScale = 1 + 0.02 * Math.abs(Math.sin(now / 400 * Math.PI));
    }
    ctx.save();
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = timerColor;
    const timerX = W / 2 + 34;
    ctx.translate(timerX, lineY);
    ctx.scale(timerScale, timerScale);
    ctx.fillText(formatTime(secs), 0, 0);
    ctx.restore();

    // ---- TOP LEFT: Score + Acorns + Packs panel ----
    const sX = 8, sY = 6;
    const panW = 140, panH = 54;

    ctx.save();
    ctx.fillStyle = 'rgba(200,140,50,0.8)';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(sX, sY, panW, panH, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,220,140,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(sX, sY, panW, panH, 10); ctx.stroke();
    ctx.restore();

    const row1Y = sY + 18;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F3C6}', sX + 10, row1Y);
    ctx.fillText(score.toLocaleString(), sX + 38, row1Y);

    const row2Y = sY + 42;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('\u{1F330}', sX + 12, row2Y);
    ctx.fillText(String(acorns), sX + 38, row2Y);
  }

  // ---- TOP RIGHT: Fullscreen + Mute buttons ----
  {
    const fsb = GAME_FS_BTN;
    drawMapButton(fsb.cx, fsb.cy, fsb.r, false, isFullscreen ? 'exitfullscreen' : 'fullscreen');
    const gm = GAME_MUTE_BTN;
    drawMapButton(gm.cx, gm.cy, gm.r, false, musicMuted ? 'muted' : 'unmuted');
  }

  // Floating texts with rounded background
  floatingTexts = floatingTexts.filter(ft => {
    const t = (now - ft.startTime) / ft.duration;
    if(t >= 1) return false;
    const alpha = 1 - t;
    const rise = t * 70;
    const fontSize = ft.size || 24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + fontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = ft.x, ty = ft.y - rise;
    const metrics = ctx.measureText(ft.text);
    const pw = metrics.width + 20, ph = fontSize + 12;
    const bg = ft.bgColor || 'rgba(0,0,0,0.55)';
    ctx.fillStyle = bg;
    if(ft.bgColor) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.roundRect(tx - pw / 2, ty - ph / 2, pw, ph, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = ft.color || '#ffd700';
    ctx.fillText(ft.text, tx, ty);
    ctx.restore();
    return true;
  });

  drawIris();
  requestAnimationFrame(draw);
}

// ============================================================
// START
// ============================================================
loadProgress();
loadHighScores();
gameScreen = SCREEN.WELCOME;
initGrid();
requestAnimationFrame(draw);
