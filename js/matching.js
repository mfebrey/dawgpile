// ============================================================
// MATCH-3 LOGIC
// ============================================================
function findMatchGroups() {
  const groups = [];
  for(let r = 0; r < GRID_ROWS; r++) {
    let runStart = 0, runBreed = null;
    for(let c = 0; c <= GRID_COLS; c++) {
      const cell = c < GRID_COLS ? getCell(r, c) : null;
      const breed = cell ? cell.breed : null;
      if(breed === runBreed && breed !== null) continue;
      const runLen = c - runStart;
      const dogCount = Math.floor(runLen / 2);
      if(runBreed && dogCount >= 3) {
        const cells = [];
        for(let i = runStart; i < c; i++) cells.push({row: r, col: i});
        groups.push({cells, count: dogCount});
      }
      runStart = c; runBreed = breed;
    }
  }
  for(let c = 0; c < GRID_COLS - 1; c++) {
    let runStart = 0, runBreed = null;
    for(let r = 0; r <= GRID_ROWS; r++) {
      const cellL = r < GRID_ROWS ? getCell(r, c) : null;
      const cellR = r < GRID_ROWS ? getCell(r, c + 1) : null;
      const breed = (cellL && cellR && cellL.breed === cellR.breed) ? cellL.breed : null;
      if(breed === runBreed && breed !== null) continue;
      if(runBreed && r - runStart >= 3) {
        const cells = [];
        for(let i = runStart; i < r; i++) {
          cells.push({row: i, col: c});
          cells.push({row: i, col: c + 1});
        }
        groups.push({cells, count: r - runStart});
      }
      runStart = r; runBreed = breed;
    }
  }
  return groups;
}

function findMatches() {
  const groups = findMatchGroups();
  const seen = new Set();
  const result = [];
  for(const g of groups) {
    for(const c of g.cells) {
      const key = `${c.row},${c.col}`;
      if(!seen.has(key)) { seen.add(key); result.push(c); }
    }
  }
  return result;
}

function scoreForMatch(count) {
  if(count >= 5) return {points: 500, acorns: 3};
  if(count >= 4) return {points: 250, acorns: 2};
  return {points: 100, acorns: 1};
}

function removeMatches(matches) {
  const groups = findMatchGroups();
  let totalPoints = 0;
  let totalAcorns = 0;
  for(const g of groups) {
    const reward = scoreForMatch(g.count);
    let pts = reward.points;
    if(chainLevel > 0) pts = Math.floor(pts * Math.pow(1.5, chainLevel));
    totalPoints += pts;
    totalAcorns += reward.acorns;
    const packKey = Math.min(g.count, 5);
    if(packStats[packKey] !== undefined) packStats[packKey]++;
    else if(g.count >= 5) packStats[5]++;
    const avgRow = g.cells.reduce((s, c) => s + c.row, 0) / g.cells.length;
    const avgCol = g.cells.reduce((s, c) => s + c.col, 0) / g.cells.length;
    const fx = GRID_LEFT + (avgCol + 0.5) * CELL_SIZE;
    const fy = GRID_TOP + avgRow * CELL_SIZE;
    const chainTxt = chainLevel > 0 ? ' x' + (chainLevel + 1) : '';
    let label = g.count + ' Pack! +' + pts + chainTxt;
    spawnFloat(label, fx, fy, '#fff', 34, 'rgba(255,180,0,0.92)');
    spawnFloat('\u{1F330} +' + reward.acorns, fx, fy + 38, '#fff', 26, 'rgba(180,120,30,0.9)');
  }
  score += totalPoints;
  acorns += totalAcorns;
  matches.forEach(({row, col}) => setCell(row, col, null));
  updateUI();
}

async function processMatches() {
  const matches = findMatches();
  if(matches.length > 0) {
    matchingCells = matches;
    animatingMatch = true;
    matchPulseStart = performance.now();
    playSfx(matchSound);
    await new Promise(resolve => setTimeout(resolve, 700));
    removeMatches(matches);
    matchingCells = [];
    animatingMatch = false;
    await new Promise(resolve => setTimeout(resolve, 200));
    while(applyGravity()) await new Promise(resolve => setTimeout(resolve, 200));
    chainLevel++;
    await processMatches();
  }
}

// ============================================================
// ADJACENT BREED BONUS
// ============================================================
function checkAdjacentBonus(landRow, landCol, breed, orientation, skipSet) {
  const dogCells = [{row: landRow, col: landCol}];
  if(orientation === 'h') dogCells.push({row: landRow, col: landCol + 1});
  else dogCells.push({row: landRow + 1, col: landCol});

  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  let bonus = 0;
  const checked = new Set();
  for(const dc of dogCells) {
    for(const [dr, dcc] of dirs) {
      const nr = dc.row + dr, nc = dc.col + dcc;
      if(dogCells.some(oc => oc.row === nr && oc.col === nc)) continue;
      const key = `${nr},${nc}`;
      if(checked.has(key)) continue;
      checked.add(key);
      if(skipSet && skipSet.has(key)) continue;
      const cell = getCell(nr, nc);
      if(cell && cell.breed === breed) {
        bonus += 5;
        const fx = GRID_LEFT + ((dc.col + nc) / 2 + 0.5) * CELL_SIZE;
        const fy = GRID_TOP + ((dc.row + nr) / 2 + 0.5) * CELL_SIZE;
        spawnFloat('Buddies! +5', fx, fy, '#fff', 20, 'rgba(60,180,120,0.85)');
      }
    }
  }
  if(bonus > 0) { score += bonus; updateUI(); }
}
