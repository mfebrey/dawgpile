// ============================================================
// AUDIO
// ============================================================
const bgMusic = new Audio('sound/background-sound-v1.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;
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

let activeLevelTrack = -1;
let levelMusicPaused = false;

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

const scene2Music = new Audio('sound/scene2.mp3');
scene2Music.loop = true;
scene2Music.volume = 0;
scene2Music.preload = 'auto';

const wooshSound = new Audio('sound/woosh.mp3');
wooshSound.volume = 0.5;
const woofSound = new Audio('sound/woof.mp3');
woofSound.volume = 0.6;
const levelClearedSound = new Audio('sound/level-cleared.mp3');
levelClearedSound.volume = 0.6;
const levelFailedSound = new Audio('sound/level-failed.mp3');
levelFailedSound.volume = 0.6;
const matchSound = new Audio('sound/match-sound.mp3');
matchSound.volume = 0.5;
const squirrelWinSound = new Audio('sound/squirrel-win.mp3');
squirrelWinSound.volume = 0.6;

function playSfx(sound) {
  if(musicMuted) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

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
