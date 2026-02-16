// ============================================================
// IMAGES
// ============================================================
const bgImgNames = ['park', 'forest', 'pool', 'desert', 'base'];
const bgImgs = [];
for(let i = 0; i < bgImgNames.length; i++) {
  const img = new Image();
  img._loaded = false;
  img.onload = function() { this._loaded = true; };
  img.src = 'img/bg-' + bgImgNames[i] + '.webp';
  bgImgs[i] = img;
}
const bgImg = bgImgs[0];
let bgLoaded = false;
bgImgs[0].addEventListener('load', () => { bgLoaded = true; });

const treeImg = new Image();
let treeLoaded = false;
treeImg.onload = () => treeLoaded = true;
treeImg.src = 'img/tree.webp';

const tennisImg = new Image();
let tennisLoaded = false;
tennisImg.onload = () => tennisLoaded = true;
tennisImg.src = 'img/tennis-ball.webp';

const arrowImg = new Image();
let arrowLoaded = false;
arrowImg.onload = () => { arrowLoaded = true; console.log('Arrow image LOADED:', arrowImg.naturalWidth, 'x', arrowImg.naturalHeight); };
arrowImg.onerror = (e) => console.error('Arrow image FAILED to load:', e);
arrowImg.src = 'img/arrow.webp';

const sqStepImg = new Image();
let sqStepLoaded = false;
sqStepImg.onload = () => { sqStepLoaded = true; console.log('Squirrel step image loaded'); };
sqStepImg.onerror = () => console.error('FAILED to load sq-step.webp');
sqStepImg.src = 'img/dogs/sq-step.webp';

const sqJumpImg = new Image();
let sqJumpLoaded = false;
sqJumpImg.onload = () => { sqJumpLoaded = true; console.log('Squirrel jump image loaded'); };
sqJumpImg.onerror = () => console.error('FAILED to load sq-jump.webp');
sqJumpImg.src = 'img/dogs/sq-jump.webp';

const acornImg = new Image();
let acornLoaded = false;
acornImg.onload = () => { acornLoaded = true; };
acornImg.src = 'img/dogs/acorn.webp';

const sqAcornImg = new Image();
let sqAcornLoaded = false;
sqAcornImg.onload = () => { sqAcornLoaded = true; };
sqAcornImg.src = 'img/dogs/sq-acorn.webp';

const sqBaseStepImg = new Image();
let sqBaseStepLoaded = false;
sqBaseStepImg.onload = () => { sqBaseStepLoaded = true; console.log('Space squirrel image loaded'); };
sqBaseStepImg.onerror = () => console.error('FAILED to load sq-base.webp');
sqBaseStepImg.src = 'img/dogs/sq-base.webp';

const sqForestImg = new Image();
let sqForestLoaded = false;
sqForestImg.onload = () => { sqForestLoaded = true; console.log('Forest squirrel (boat) image loaded'); };
sqForestImg.onerror = () => console.error('FAILED to load sq-forest.webp');
sqForestImg.src = 'img/dogs/sq-forest.webp';

const sqPoolImg = new Image();
let sqPoolLoaded = false;
sqPoolImg.onload = () => { sqPoolLoaded = true; console.log('Pool squirrel image loaded'); };
sqPoolImg.onerror = () => console.error('FAILED to load sq-pool.webp');
sqPoolImg.src = 'img/dogs/sq-pool.webp';

const welcomeImg = new Image();
let welcomeLoaded = false;
welcomeImg.onload = () => { welcomeLoaded = true; };
welcomeImg.src = 'img/welcome.webp';

const scene2Img = new Image();
let scene2Loaded = false;
scene2Img.onload = () => { scene2Loaded = true; };
scene2Img.src = 'img/scene2.webp';

const mapImgNames = ['park', 'forest', 'pool', 'desert', 'base'];
const mapImgs = [];
for(let i = 0; i < mapImgNames.length; i++) {
  const img = new Image();
  img._loaded = false;
  img.onload = function() { this._loaded = true; };
  img.src = 'img/map-level-1-' + mapImgNames[i] + '.webp';
  mapImgs[i] = img;
}

const dogNames = ['chihuahua', 'corgi', 'dachshund', 'frenchie', 'german-sheppard', 'golden-retriever', 'husky', 'mutt', 'poodle', 'sheep-dog'];

const dogSittingImages = {};
const dogSittingFileMap = {
  'chihuahua': 'chihuahua-sitting', 'corgi': 'corgie-sitting',
  'dachshund': 'dachshund-sitting', 'frenchie': 'frenchie-sitting',
  'german-sheppard': 'german-sitting', 'golden-retriever': 'golden-sitting',
  'husky': 'huskie-sitting', 'mutt': 'mutt-sitting',
  'poodle': 'poodle-sitting', 'sheep-dog': 'sheepdog-sitting'
};
dogNames.forEach(name => {
  dogSittingImages[name] = new Image();
  dogSittingImages[name].src = 'img/dogs/sitting/' + dogSittingFileMap[name] + '.webp';
});

const dogJumpingImages = {};
const dogJumpingFileMap = {
  'chihuahua': 'chihuahua-jumping', 'corgi': 'corgi-jumping',
  'dachshund': 'dachshund-jumping', 'frenchie': 'frenchie-jumping',
  'german-sheppard': 'german-jumping', 'golden-retriever': 'golden-jumping',
  'husky': 'husky-jumping', 'mutt': 'mutt-jumping',
  'poodle': 'poodle-jumping', 'sheep-dog': 'sheepdog-jumping'
};
dogNames.forEach(name => {
  dogJumpingImages[name] = new Image();
  dogJumpingImages[name].src = 'img/dogs/jumping/' + dogJumpingFileMap[name] + '.webp';
});

const dogLyingImages = {};
const dogLyingFileMap = {
  'chihuahua': 'chihuahua-lying', 'corgi': 'corgi-lying',
  'dachshund': 'dachshund-lying', 'frenchie': 'frenchie-lying',
  'german-sheppard': 'german-lying', 'golden-retriever': 'golden-lying',
  'husky': 'husky-lying', 'mutt': 'mutt-lying',
  'poodle': 'poodle-lying', 'sheep-dog': 'sheepdog-lying'
};
dogNames.forEach(name => {
  dogLyingImages[name] = new Image();
  dogLyingImages[name].src = 'img/dogs/lying/' + dogLyingFileMap[name] + '.webp';
});
