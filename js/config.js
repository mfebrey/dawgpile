// ============================================================
// CANVAS & HiDPI
// ============================================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 720, H = 560;

const DPR = window.devicePixelRatio || 1;
canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(DPR, DPR);

// ============================================================
// RESPONSIVE SCALING
// ============================================================
const _gameEl = document.getElementById('game');

function resizeGame() {
  const gameAspect = W / H;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const winAspect = winW / winH;

  let displayW, displayH;
  if(winAspect > gameAspect) {
    displayH = winH;
    displayW = displayH * gameAspect;
  } else {
    displayW = winW;
    displayH = displayW / gameAspect;
  }

  const offsetX = Math.floor((winW - displayW) / 2);
  const offsetY = Math.floor((winH - displayH) / 2);

  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';

  _gameEl.style.width = displayW + 'px';
  _gameEl.style.height = displayH + 'px';
  _gameEl.style.left = offsetX + 'px';
  _gameEl.style.top = offsetY + 'px';
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', () => { setTimeout(resizeGame, 100); });
resizeGame();

// ============================================================
// LARGE POINTER CURSOR (2x size for map)
// ============================================================
const _cursorCanvas = document.createElement('canvas');
_cursorCanvas.width = 32; _cursorCanvas.height = 32;
const _cc = _cursorCanvas.getContext('2d');
_cc.fillStyle = '#fff';
_cc.strokeStyle = '#000';
_cc.lineWidth = 1.5;
_cc.lineJoin = 'round';
_cc.beginPath();
_cc.moveTo(2, 2);
_cc.lineTo(2, 24);
_cc.lineTo(8, 19);
_cc.lineTo(13, 28);
_cc.lineTo(17, 26);
_cc.lineTo(12, 17);
_cc.lineTo(20, 17);
_cc.closePath();
_cc.fill(); _cc.stroke();
const bigPointerCursor = 'url(' + _cursorCanvas.toDataURL() + ') 2 2, pointer';

// ============================================================
// GRID CONSTANTS
// ============================================================
const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 35;
const GRID_LEFT = (W - GRID_COLS * CELL_SIZE) / 2;
const GRID_TOP = 50;
const GRID_BOTTOM = GRID_TOP + GRID_ROWS * CELL_SIZE;

const AIM_AREA_X = W - 80;
const AIM_AREA_Y = H - 20;
const BALL_ORIGIN_X = W / 2;
const BALL_DRAW_Y = H - 45;

const SPRITE_OVERFLOW = 1.0;
const BOUNCE_DURATION = 400;

// ============================================================
// SQUIRREL CONSTANTS
// ============================================================
const SQUIRREL_Y = 505;
const SQUIRREL_SIZE = 117;
const HIT_ZONE_TOP = GRID_BOTTOM;
const HIT_ZONE_BOTTOM = H;
const SQUIRREL_HIT_RADIUS = 50;
const ACORN_SPEED = 800;
const SQUIRREL_ALERT_DURATION = 1000;

// ============================================================
// LEVEL DATA
// ============================================================
const LEVELS = [
  {time: 75, breeds: 3},
  {time: 70, breeds: 4},
  {time: 70, breeds: 4},
  {time: 65, breeds: 5},
  {time: 60, breeds: 6},
];
const LEVEL_NAMES = ['Park', 'Forest', 'Pool', 'Desert', 'Base'];

// Star rating thresholds (score required for each star)
const STAR_THRESHOLDS = [
  [300, 500, 800],     // Level 1 (Park)
  [400, 650, 1000],    // Level 2 (Forest)
  [450, 750, 1100],    // Level 3 (Pool)
  [500, 850, 1200],    // Level 4 (Desert)
  [600, 1000, 1500],   // Level 5 (Base)
];

// ============================================================
// GAME STATE
// ============================================================
let grid = [];
let score = 0;
let acorns = 0;
let gameRunning = false;
let currentDog = null;
let dropping = false;
let matchingCells = [];
let animatingMatch = false;
let matchPulseStart = 0;

let currentLevel = 0;
let timerStart = 0;
let timeRemaining = 60;
let timerRunning = false;

let floatingTexts = [];

let bouncing = false;
let bounceStartTime = 0;
let bounceCells = [];

let chainLevel = 0;

let packStats = {3: 0, 4: 0, 5: 0};

let nudging = false;
let nudgeStartTime = 0;
let nudgeCells = [];
let nudgeDirection = 0;
const NUDGE_DURATION = 150;

let dragging = false;
let dragStartRow = -1;
let dragStartCol = -1;
let dragStartCells = null;
let dragMouseX = 0;
let dragMouseY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragDidMove = false;

let hoverRow = -1;
let hoverCol = -1;

let ballGrabbed = false;
let ballGrabStartX = 0;
let ballGrabStartY = 0;
let ballDragX = 0;
let ballDragY = 0;
const BALL_GRAB_RADIUS = 80;

let aimTargetCol = 4;
let mouseCanvasX = W / 2;
let mouseCanvasY = H / 2;

let throwing = false;
let throwStartTime = 0;
let throwLandRow = -1;
let throwLandCol = -1;
let ballCurrentPos = null;
let dogCurrentPos = null;
let inFlightDogs = [];

let levelBreeds = [];

// Squirrel state
let squirrelActive = false;
let squirrelAlertActive = false;
let squirrelAlertStart = 0;
let squirrelX = 0;
let squirrelDir = 1;
let squirrelSpeed = 80;
let squirrelFromLeft = true;
let squirrelRetreating = false;
let squirrelHitTime = 0;
let squirrelLastReverseCheck = 0;
let squirrelReversed = false;
let squirrelReverseEnd = 0;
let squirrelFrame = 0;
let squirrelFrameTime = 0;
let squirrelNextSpawnTime = 0;
let squirrelLastUpdateTime = 0;
let squirrelCurrentY = SQUIRREL_Y;
let squirrelRotation = 0;
let squirrelIsSpace = false;
let squirrelIsBoat = false;
let squirrelIsPool = false;
const POOL_SQUIRREL_Y = H - 50;
const POOL_SQUIRREL_SCALE = 0.8;
const POOL_SWIM_WOBBLE = 0.1;
const POOL_BOB_AMP = 3;
const SPACE_SQUIRREL_Y = 280;
const SPACE_SQUIRREL_FLOAT_AMP = 25;
const BOAT_SQUIRREL_Y = H - 60;
const BOAT_SQUIRREL_SCALE = 0.8;
const BOAT_ROCK_AMP = 0.08;
const BOAT_BOB_AMP = 4;
let acornProjectiles = [];
let starbursts = [];

// Screen state
const SCREEN = { WELCOME: 0, MAP: 1, GAMEPLAY: 2, INSTRUCTIONS: 3, SCENE2: 4 };
let scene2BtnHovered = false;
const SCENE2_BTN = { x: W - 120, y: H - 45, w: 180, h: 42 };
let gameScreen = SCREEN.WELCOME;
let activeBgLevel = 0;

// Map data (null = not completed, 0-3 = stars earned)
let completedLevels = [null, null, null, null, null];

// Selection state for click-to-swap feature
let selectedDogCells = null;
const MAP_IMG_W = 1536, MAP_IMG_H = 1024;
const MAP_SCALE_X = W / MAP_IMG_W;
const MAP_SCALE_Y = H / MAP_IMG_H;
const MAP_LEVELS = [
  {x: Math.round(475 * MAP_SCALE_X) + 15,  y: Math.round(560 * MAP_SCALE_Y) + 10,  name: 'Park'},
  {x: Math.round(311 * MAP_SCALE_X) + 15,  y: Math.round(339 * MAP_SCALE_Y) + 10,  name: 'Forest'},
  {x: Math.round(725 * MAP_SCALE_X) + 15,  y: Math.round(509 * MAP_SCALE_Y) + 10,  name: 'Pool'},
  {x: Math.round(1061 * MAP_SCALE_X) + 15, y: Math.round(706 * MAP_SCALE_Y) + 10,  name: 'Desert'},
  {x: Math.round(1043 * MAP_SCALE_X) + 15, y: Math.round(316 * MAP_SCALE_Y) + 10,  name: 'Base'}
];
console.log('Map image:', MAP_IMG_W + 'x' + MAP_IMG_H, '→ canvas:', W + 'x' + H,
  '| scaleX:', MAP_SCALE_X.toFixed(4), 'scaleY:', MAP_SCALE_Y.toFixed(4));
console.log('MAP_LEVELS:', MAP_LEVELS.map(l => l.name + ': (' + l.x + ', ' + l.y + ')').join(', '));
const MAP_CLICK_RADIUS = 35;
const MAP_OVAL_RX = 23;
const MAP_OVAL_RY = 14;
let mapHoveredLevel = -1;
let welcomeBtnHovered = false;
const WELCOME_BTN = { x: W - 70, y: H - 70, r: 40 };
let gotItBtnHovered = false;
const GOT_IT_BTN = { x: W / 2, y: H - 45, w: 160, h: 45 };

// Iris transition
let iris = { active: false, phase: 'close', startTime: 0, radius: 0, onMid: null, onDone: null };
const IRIS_MAX_R = Math.sqrt(W * W + H * H) / 2;
const IRIS_CLOSE = 500, IRIS_PAUSE = 200, IRIS_OPEN = 500;

// Paw path animation
let pawPath = { active: false, from: 0, to: 1, startTime: 0, duration: 1800 };

// Map button state (top-right: info, reset, mute)
let mapResetHovered = false;
let mapMuteHovered = false;
let mapInfoHovered = false;
const MAP_BTN_R = 14;
const MAP_BTN_TOP_Y = MAP_BTN_R + 8;
const MAP_MUTE_BTN = { cx: W - MAP_BTN_R - 8, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };
const MAP_RESET_BTN = { cx: W - MAP_BTN_R * 3 - 16, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };
const MAP_INFO_BTN = { cx: W - MAP_BTN_R * 5 - 24, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };

// Game screen mute button (top-right)
const GAME_MUTE_BTN = { cx: W - MAP_BTN_R - 8, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };

// Fullscreen buttons (next to mute on game/scene2, next to info on map)
const MAP_FS_BTN = { cx: W - MAP_BTN_R * 7 - 32, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };
const GAME_FS_BTN = { cx: W - MAP_BTN_R * 3 - 16, cy: MAP_BTN_TOP_Y, r: MAP_BTN_R };
let mapFsHovered = false;
let isFullscreen = false;
const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const _isStandalone = window.navigator.standalone === true;
let iosPromptVisible = false;
const IOS_PROMPT_BTN = { x: W / 2, y: H / 2 + 100, w: 140, h: 40 };

// Throw animation state
let throwBallArc = [];
let throwDogArc = [];
let aimPeakY = GRID_TOP + 60;
let throwBallDuration = 420;
let throwDogDelay = 180;
let throwDogDuration = 350;
let throwBounceHeight = 18;

// Squirrel hit animation
let squirrelHitAnim = false;
let squirrelHitAnimStart = 0;
const SQUIRREL_HIT_ANIM_DURATION = 800;

// Collapse state
let collapseActive = false;
let collapseStartTime = 0;
let collapseDogs = [];
const COLLAPSE_DURATION = 1000;

// Star animation state (tracks when each star was earned for pulse effect)
let starEarnedTimes = [0, 0, 0];
let prevStarsEarned = 0;
