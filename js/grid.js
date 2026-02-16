// ============================================================
// GRID FUNCTIONS
// ============================================================
function initGrid() {
  grid = [];
  for(let r = 0; r < GRID_ROWS; r++) {
    grid[r] = [];
    for(let c = 0; c < GRID_COLS; c++) grid[r][c] = null;
  }
}

function getCell(row, col) {
  if(row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
  return grid[row][col];
}

function setCell(row, col, value) {
  if(row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) grid[row][col] = value;
}

function canPlace(row, col, orientation) {
  if(orientation === 'h') {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col + 1 < GRID_COLS &&
           getCell(row, col) === null && getCell(row, col + 1) === null;
  }
  return row >= 0 && row + 1 < GRID_ROWS && col >= 0 && col < GRID_COLS &&
         getCell(row, col) === null && getCell(row + 1, col) === null;
}

function placeDog(row, col, breed, orientation) {
  if(orientation === 'h') {
    setCell(row, col, {breed, orientation, primary: true});
    setCell(row, col + 1, {breed, orientation, primary: false});
  } else {
    setCell(row, col, {breed, orientation, primary: true});
    setCell(row + 1, col, {breed, orientation, primary: false});
  }
}

function findDogCells(row, col) {
  const cell = getCell(row, col);
  if(!cell) return null;
  let cells;
  if(cell.primary) {
    if(cell.orientation === 'h') cells = [{row, col}, {row, col: col + 1}];
    else cells = [{row, col}, {row: row + 1, col}];
  } else {
    if(cell.orientation === 'h') cells = [{row, col: col - 1}, {row, col}];
    else cells = [{row: row - 1, col}, {row, col}];
  }
  for(const c of cells) {
    const p = getCell(c.row, c.col);
    if(!p || p.breed !== cell.breed) return [{row, col}];
  }
  return cells;
}

function applyGravity() {
  let moved = false;
  for(let r = GRID_ROWS - 2; r >= 0; r--) {
    for(let c = 0; c < GRID_COLS; c++) {
      const cell = getCell(r, c);
      if(!cell || !cell.primary) continue;
      const pc = c + 1;
      if(pc >= GRID_COLS) continue;
      let targetR = r;
      for(let testR = r + 1; testR < GRID_ROWS; testR++) {
        if(getCell(testR, c) === null && getCell(testR, pc) === null) {
          targetR = testR;
        } else {
          break;
        }
      }
      if(targetR > r) {
        const cellL = getCell(r, c);
        const cellR = getCell(r, pc);
        setCell(r, c, null);
        setCell(r, pc, null);
        setCell(targetR, c, cellL);
        setCell(targetR, pc, cellR);
        moved = true;
      }
    }
  }
  return moved;
}
