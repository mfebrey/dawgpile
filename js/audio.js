// ============================================================
// AUDIO — Web Audio API for SFX, HTML Audio for music
// ============================================================
// SFX: decoded into AudioBuffers for instant, unlimited plays.
// Music: HTML Audio elements routed through MediaElementSource
//        for streaming + gain control, connected lazily on first
//        user gesture so the AudioContext is guaranteed running.

let musicMuted = false;
const MUSIC_VOLUME = 0.4;
const CROSSFADE_MS = 300;

// ============================================================
// WEB AUDIO CONTEXT
// ============================================================
let _audioCtx = null;

function _getAudioCtx() {
  if(!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

let _masterGain = null;
function _getMasterGain() {
  if(!_masterGain) {
    _masterGain = _getAudioCtx().createGain();
    _masterGain.gain.value = 1;
    _masterGain.connect(_getAudioCtx().destination);
  }
  return _masterGain;
}

// ============================================================
// MUSIC ELEMENTS (created early for preloading)
// ============================================================
const bgMusic = new Audio('sound/background-sound-v1.mp3');
bgMusic.loop = true;
bgMusic.preload = 'auto';
bgMusic.volume = MUSIC_VOLUME;

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

function _allMusicElements() {
  return [bgMusic, squirrelMusic, scene2Music, ...levelMusicTracks];
}

// Kick off preloading
_allMusicElements().forEach(a => { try { a.load(); } catch(e) {} });

// ============================================================
// MUSIC ROUTING (deferred to first gesture)
// ============================================================
// createMediaElementSource MUST happen after AudioContext is
// running (resumed). We defer all connections to the first
// user gesture, then route through GainNodes for volume control.

const _musicGains = new Map();
let _musicConnected = false;

function _connectAllMusic() {
  if(_musicConnected) return;
  const ctx = _getAudioCtx();
  if(ctx.state === 'suspended') return; // not ready yet
  _musicConnected = true;

  _allMusicElements().forEach(audio => {
    try {
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = audio.volume; // capture current volume
      source.connect(gain);
      gain.connect(_getMasterGain());
      _musicGains.set(audio, gain);
      audio.volume = 1; // gain node handles volume now
    } catch(e) {
      console.warn('Could not connect music:', e);
    }
  });
  console.log('Music routed through AudioContext:', _musicGains.size, 'tracks');
}

function _setMusicVolume(audio, vol) {
  const gain = _musicGains.get(audio);
  if(gain) {
    gain.gain.value = vol;
  } else {
    audio.volume = vol;
  }
}

function _getMusicVolume(audio) {
  const gain = _musicGains.get(audio);
  return gain ? gain.gain.value : audio.volume;
}

// Helper: ensure context is running before playing music
function _playMusic(audio) {
  const ctx = _getAudioCtx();
  if(ctx.state === 'suspended') {
    ctx.resume().then(() => {
      _connectAllMusic();
      audio.play().catch(() => {});
    }).catch(() => {});
  } else {
    _connectAllMusic();
    audio.play().catch(() => {});
  }
}

// ============================================================
// AUDIO UNLOCK — runs on user gestures
// ============================================================
let _audioUnlocked = false;

function _unlockAudio() {
  const ctx = _getAudioCtx();

  // Resume suspended context
  if(ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if(_audioUnlocked) return;

  // Play a tiny silent buffer to fully unlock the context on iOS
  try {
    const silentBuf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = silentBuf;
    src.connect(ctx.destination);
    src.start(0);
  } catch(e) {}

  // Defer music connection until context is confirmed running
  if(ctx.state === 'running') {
    _connectAllMusic();
    _audioUnlocked = true;
  } else {
    ctx.resume().then(() => {
      _connectAllMusic();
      _audioUnlocked = true;
      console.log('Audio fully unlocked after resume');
    }).catch(() => {});
  }

  // Touch each music element to unlock HTML Audio on iOS
  // Stagger to avoid iOS choking on parallel plays
  _allMusicElements().forEach((a, i) => {
    setTimeout(() => {
      const v = a.volume;
      a.muted = true;
      const p = a.play();
      if(p && p.then) {
        p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; a.volume = v; })
         .catch(() => { a.muted = false; a.volume = v; });
      }
    }, i * 60);
  });

  console.log('Audio unlock triggered, context state:', ctx.state);
}

// Keep retrying on every gesture (context can re-suspend on iOS)
['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
  document.addEventListener(evt, () => {
    _unlockAudio();
    const ctx = _getAudioCtx();
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
  }, { passive: true });
});

// ============================================================
// SFX (decoded AudioBuffers — instant, unlimited concurrent)
// ============================================================
const _sfxBuffers = {};
const _sfxLoading = {};

function _loadSfxBuffer(src) {
  if(_sfxBuffers[src]) return Promise.resolve(_sfxBuffers[src]);
  if(_sfxLoading[src]) return _sfxLoading[src];
  _sfxLoading[src] = fetch(src)
    .then(r => r.arrayBuffer())
    .then(buf => _getAudioCtx().decodeAudioData(buf))
    .then(decoded => { _sfxBuffers[src] = decoded; return decoded; })
    .catch(err => { console.warn('SFX load failed:', src, err); return null; });
  return _sfxLoading[src];
}

function createSfx(src, volume) {
  _loadSfxBuffer(src);
  return { src: src, volume: volume };
}

const wooshSound = createSfx('sound/woosh.mp3', 0.5);
const woofSound = createSfx('sound/woof.mp3', 0.6);
const levelClearedSound = createSfx('sound/level-cleared.mp3', 0.6);
const levelFailedSound = createSfx('sound/level-failed.mp3', 0.6);
const matchSound = createSfx('sound/match-sound.mp3', 0.5);
const squirrelWinSound = createSfx('sound/squirrel-win.mp3', 0.6);

function playSfx(sfx) {
  if(musicMuted) return;
  const ctx = _getAudioCtx();
  if(ctx.state === 'suspended') {
    ctx.resume().then(() => {
      _playSfxFromBuffer(sfx);
    }).catch(() => {});
    return;
  }
  _playSfxFromBuffer(sfx);
}

function _playSfxFromBuffer(sfx) {
  const buffer = _sfxBuffers[sfx.src];
  if(!buffer) {
    _loadSfxBuffer(sfx.src).then(buf => {
      if(buf && !musicMuted) _doPlayBuffer(buf, sfx.volume);
    });
    return;
  }
  _doPlayBuffer(buffer, sfx.volume);
}

function _doPlayBuffer(buffer, volume) {
  try {
    const ctx = _getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  } catch(e) {}
}

// ============================================================
// FADE UTILITY
// ============================================================
const _fadeIntervals = new Map();

function fadeAudio(audio, toVol, duration, onDone) {
  if(_fadeIntervals.has(audio)) clearInterval(_fadeIntervals.get(audio));
  const steps = 15;
  const stepTime = duration / steps;
  const startVol = _getMusicVolume(audio);
  const volStep = (toVol - startVol) / steps;
  let step = 0;
  const id = setInterval(() => {
    step++;
    _setMusicVolume(audio, Math.max(0, Math.min(1, startVol + volStep * step)));
    if(step >= steps) {
      clearInterval(id);
      _fadeIntervals.delete(audio);
      _setMusicVolume(audio, Math.max(0, Math.min(1, toVol)));
      if(toVol === 0) audio.pause();
      if(onDone) onDone();
    }
  }, stepTime);
  _fadeIntervals.set(audio, id);
  return id;
}

// ============================================================
// LEVEL MUSIC
// ============================================================
function startLevelMusic(level) {
  levelMusicTracks.forEach((t, i) => {
    if(i !== level) { t.pause(); _setMusicVolume(t, 0); t.currentTime = 0; }
  });
  squirrelMusic.pause();
  _setMusicVolume(squirrelMusic, 0);
  activeLevelTrack = level;
  levelMusicPaused = false;
  const track = levelMusicTracks[level];
  if(!track) return;
  track.currentTime = 0;
  if(musicMuted) return;
  _setMusicVolume(track, MUSIC_VOLUME);
  _playMusic(track);
}

function stopLevelMusic() {
  levelMusicTracks.forEach(t => { t.pause(); _setMusicVolume(t, 0); });
  squirrelMusic.pause();
  _setMusicVolume(squirrelMusic, 0);
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
    _setMusicVolume(scene2Music, MUSIC_VOLUME);
    _playMusic(scene2Music);
  }
}

function stopScene2Music() {
  scene2Music.pause();
  _setMusicVolume(scene2Music, 0);
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
    _setMusicVolume(squirrelMusic, 0);
    _playMusic(squirrelMusic);
    fadeAudio(squirrelMusic, MUSIC_VOLUME, CROSSFADE_MS);
  }
}

function stopSquirrelMusicOverride() {
  levelMusicPaused = false;
  if(!musicMuted) {
    fadeAudio(squirrelMusic, 0, CROSSFADE_MS);
    if(activeLevelTrack >= 0) {
      const lvlTrack = levelMusicTracks[activeLevelTrack];
      _playMusic(lvlTrack);
      fadeAudio(lvlTrack, MUSIC_VOLUME, CROSSFADE_MS);
    }
  } else {
    squirrelMusic.pause();
    _setMusicVolume(squirrelMusic, 0);
  }
}

// ============================================================
// MUTE TOGGLE
// ============================================================
function toggleMute() {
  musicMuted = !musicMuted;
  if(musicMuted) {
    bgMusic.muted = true;
    scene2Music.pause();
    if(activeLevelTrack >= 0) {
      levelMusicTracks[activeLevelTrack].pause();
      squirrelMusic.pause();
    }
  } else {
    bgMusic.muted = false;
    if(gameScreen === SCREEN.SCENE2) {
      _setMusicVolume(scene2Music, MUSIC_VOLUME);
      _playMusic(scene2Music);
    }
    if(activeLevelTrack >= 0) {
      if(levelMusicPaused) {
        _setMusicVolume(squirrelMusic, MUSIC_VOLUME);
        _playMusic(squirrelMusic);
      } else {
        _setMusicVolume(levelMusicTracks[activeLevelTrack], MUSIC_VOLUME);
        _playMusic(levelMusicTracks[activeLevelTrack]);
      }
    }
  }
}
