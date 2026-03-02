// ============================================================
// AUDIO
// ============================================================
const bgMusic = new Audio('sound/background-sound-v1.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;
bgMusic.preload = 'auto';
let musicMuted = false;

// Level-specific music
const MUSIC_VOLUME = 0.4;
const CROSSFADE_MS = 300;
const levelMusicSrcs = ['sound/park.mp3', 'sound/forest.mp3', 'sound/pool.mp3', 'sound/desert.mp3', 'sound/space.mp3'];
const levelMusicTracks = levelMusicSrcs.map(src => {
  const a = new Audio(src);
  a.loop = true;
  a.volume = 0;
  a.preload = 'auto';
  return a;
});

const squirrelMusic = new Audio('sound/squirrel.mp3');
squirrelMusic.loop = true;
squirrelMusic.volume = 0;
squirrelMusic.preload = 'auto';

const scene2Music = new Audio('sound/scene2.mp3');
scene2Music.loop = true;
scene2Music.volume = 0;
scene2Music.preload = 'auto';

let activeLevelTrack = -1;
let levelMusicPaused = false;

// ============================================================
// SFX POOL SYSTEM
// ============================================================
// Each SFX gets a pool of Audio objects so overlapping plays
// work reliably, and we preload + unlock all of them.

const SFX_POOL_SIZE = 3;

function createSfxPool(src, volume) {
  const pool = [];
  for(let i = 0; i < SFX_POOL_SIZE; i++) {
    const a = new Audio(src);
    a.volume = volume;
    a.preload = 'auto';
    pool.push(a);
  }
  return { pool: pool, index: 0, volume: volume };
}

const wooshSound = createSfxPool('sound/woosh.mp3', 0.5);
const woofSound = createSfxPool('sound/woof.mp3', 0.6);
const levelClearedSound = createSfxPool('sound/level-cleared.mp3', 0.6);
const levelFailedSound = createSfxPool('sound/level-failed.mp3', 0.6);
const matchSound = createSfxPool('sound/match-sound.mp3', 0.5);
const squirrelWinSound = createSfxPool('sound/squirrel-win.mp3', 0.6);

function playSfx(sfx) {
  if(musicMuted) return;
  // Round-robin through pool so overlapping plays work
  const audio = sfx.pool[sfx.index];
  sfx.index = (sfx.index + 1) % sfx.pool.length;
  audio.volume = sfx.volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// ============================================================
// COLLECT ALL AUDIO (for unlock + preload)
// ============================================================
function _getAllAudio() {
  const all = [bgMusic, squirrelMusic, scene2Music, ...levelMusicTracks];
  [wooshSound, woofSound, levelClearedSound, levelFailedSound, matchSound, squirrelWinSound].forEach(sfx => {
    sfx.pool.forEach(a => all.push(a));
  });
  return all;
}

// ============================================================
// AUDIO UNLOCK (mobile browsers)
// ============================================================
// Mobile browsers require a user gesture to unlock each Audio.
// We touch-play every Audio object on the first interaction so
// they are primed for subsequent programmatic playback.

let _audioUnlocked = false;

function unlockAllAudio() {
  if(_audioUnlocked) return;
  _audioUnlocked = true;

  const allAudio = _getAllAudio();

  // Play + immediately pause each one at volume 0 to unlock it
  allAudio.forEach(a => {
    const origVol = a.volume;
    a.volume = 0;
    const p = a.play();
    if(p && p.then) {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = origVol;
      }).catch(() => {
        a.volume = origVol;
      });
    } else {
      try { a.pause(); a.currentTime = 0; } catch(e) {}
      a.volume = origVol;
    }
  });

  // Remove listeners after first unlock
  ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
    document.removeEventListener(evt, unlockAllAudio);
  });

  console.log('Audio unlocked: ' + allAudio.length + ' objects');
}

// Attach unlock to common user gestures
['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAllAudio, { passive: true });
});

// Force-load all audio buffers immediately
(function preloadAllAudio() {
  _getAllAudio().forEach(a => {
    if(a.preload !== 'auto') a.preload = 'auto';
    try { a.load(); } catch(e) {}
  });
})();

// ============================================================
// FADE UTILITY
// ============================================================
function fadeAudio(audio, toVol, duration, onDone) {
  const steps = 15;
  const stepTime = duration / steps;
  const startVol = audio.volume;
  const volStep = (toVol - startVol) / steps;
  let step = 0;
  const id = setInterval(() => {
    step++;
    audio.volume = Math.max(0, Math.min(1, startVol + volStep * step));
    if(step >= steps) {
      clearInterval(id);
      audio.volume = Math.max(0, Math.min(1, toVol));
      if(toVol === 0) audio.pause();
      if(onDone) onDone();
    }
  }, stepTime);
  return id;
}

// ============================================================
// LEVEL MUSIC
// ============================================================
function startLevelMusic(level) {
  levelMusicTracks.forEach((t, i) => {
    if(i !== level) { t.pause(); t.volume = 0; t.currentTime = 0; }
  });
  squirrelMusic.pause();
  squirrelMusic.volume = 0;
  activeLevelTrack = level;
  levelMusicPaused = false;
  const track = levelMusicTracks[level];
  if(!track) return;
  track.currentTime = 0;
  if(musicMuted) return;
  track.volume = MUSIC_VOLUME;
  track.play().catch(() => {});
}

function stopLevelMusic() {
  levelMusicTracks.forEach(t => { t.pause(); t.volume = 0; });
  squirrelMusic.pause();
  squirrelMusic.volume = 0;
  activeLevelTrack = -1;
  levelMusicPaused = false;
}

// ============================================================
// SCENE 2 MUSIC
// ============================================================
function startScene2Music() {
  stopLevelMusic();
  bgMusic.pause();
  scene2Music.currentTime = 0;
  if(!musicMuted) {
    scene2Music.volume = MUSIC_VOLUME;
    scene2Music.play().catch(() => {});
  }
}

function stopScene2Music() {
  scene2Music.pause();
  scene2Music.volume = 0;
}

// ============================================================
// SQUIRREL MUSIC CROSSFADE
// ============================================================
function startSquirrelMusicOverride() {
  if(activeLevelTrack < 0) return;
  levelMusicPaused = true;
  if(!musicMuted) {
    const lvlTrack = levelMusicTracks[activeLevelTrack];
    if(lvlTrack) fadeAudio(lvlTrack, 0, CROSSFADE_MS);
    squirrelMusic.currentTime = 0;
    squirrelMusic.volume = 0;
    squirrelMusic.play().catch(() => {});
    fadeAudio(squirrelMusic, MUSIC_VOLUME, CROSSFADE_MS);
  }
}

function stopSquirrelMusicOverride() {
  levelMusicPaused = false;
  if(!musicMuted) {
    fadeAudio(squirrelMusic, 0, CROSSFADE_MS);
    if(activeLevelTrack >= 0) {
      const lvlTrack = levelMusicTracks[activeLevelTrack];
      lvlTrack.play().catch(() => {});
      fadeAudio(lvlTrack, MUSIC_VOLUME, CROSSFADE_MS);
    }
  } else {
    squirrelMusic.pause();
    squirrelMusic.volume = 0;
  }
}

// ============================================================
// MUTE TOGGLE
// ============================================================
function toggleMute() {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  if(musicMuted) {
    scene2Music.pause();
  } else if(gameScreen === SCREEN.SCENE2) {
    scene2Music.volume = MUSIC_VOLUME;
    scene2Music.play().catch(() => {});
  }
  if(activeLevelTrack >= 0) {
    const lvlTrack = levelMusicTracks[activeLevelTrack];
    if(musicMuted) {
      lvlTrack.pause();
      squirrelMusic.pause();
    } else {
      if(levelMusicPaused) {
        squirrelMusic.volume = MUSIC_VOLUME;
        squirrelMusic.play().catch(() => {});
      } else {
        lvlTrack.volume = MUSIC_VOLUME;
        lvlTrack.play().catch(() => {});
      }
    }
  }
}
