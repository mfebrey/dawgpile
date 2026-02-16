// ============================================================
// IRIS TRANSITION
// ============================================================
function startIris(onMid, onDone) {
  iris.active = true;
  iris.phase = 'close';
  iris.startTime = performance.now();
  iris.radius = IRIS_MAX_R;
  iris.onMid = onMid || null;
  iris.onDone = onDone || null;
}

function updateIris(now) {
  if(!iris.active) return;
  const elapsed = now - iris.startTime;

  if(iris.phase === 'close') {
    const t = Math.min(elapsed / IRIS_CLOSE, 1.0);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
    iris.radius = IRIS_MAX_R * (1 - e);
    if(t >= 1.0) {
      iris.phase = 'pause';
      iris.startTime = now;
      iris.radius = 0;
      if(iris.onMid) { iris.onMid(); iris.onMid = null; }
    }
  } else if(iris.phase === 'pause') {
    if(elapsed >= IRIS_PAUSE) {
      iris.phase = 'open';
      iris.startTime = now;
    }
  } else if(iris.phase === 'open') {
    const t = Math.min(elapsed / IRIS_OPEN, 1.0);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
    iris.radius = IRIS_MAX_R * e;
    if(t >= 1.0) {
      iris.active = false;
      iris.radius = IRIS_MAX_R;
      if(iris.onDone) { iris.onDone(); iris.onDone = null; }
    }
  }
}

function drawIris() {
  if(!iris.active) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(W / 2, H / 2, Math.max(0, iris.radius), 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
