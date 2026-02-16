// ============================================================
// UI HELPERS
// ============================================================
function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('acorns').textContent = acorns;
}

function spawnFloat(text, x, y, color, size, bgColor) {
  floatingTexts.push({text, x, y, startTime: performance.now(), duration: 1500, color: color || '#ffd700', size: size || 24, bgColor: bgColor || null});
}

// Calculate how many stars the current score earns for a given level
function getStarsEarned(level, currentScore) {
  const thresholds = STAR_THRESHOLDS[level];
  if(!thresholds) return 0;
  let stars = 0;
  for(let i = 0; i < 3; i++) {
    if(currentScore >= thresholds[i]) stars = i + 1;
  }
  return stars;
}

// Draw a single star icon (filled = gold, unfilled = grey outline)
function drawStarIcon(cx, cy, size, filled, glowAmount) {
  const pts = 5;
  const outerR = size;
  const innerR = size * 0.45;
  ctx.save();
  ctx.beginPath();
  for(let s = 0; s < pts * 2; s++) {
    const r = s % 2 === 0 ? outerR : innerR;
    const angle = (s * Math.PI / pts) - Math.PI / 2;
    if(s === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  if(filled) {
    if(glowAmount > 0) {
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 8 + glowAmount * 12;
    }
    const grad = ctx.createRadialGradient(cx, cy - 2, 0, cx, cy, outerR);
    grad.addColorStop(0, '#fff700');
    grad.addColorStop(0.5, '#ffdd00');
    grad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(100,100,100,0.5)';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
