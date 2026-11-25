'use strict';

/* ==================== 常量 ==================== */
const TILE = 40;
const COLS = 16;
const ROWS = 16;
const GAME_W = COLS * TILE;
const GAME_H = ROWS * TILE;
const TANK = 36;
const BR = 3;                 // 子弹半径
const MAX_ENEMIES_ON_FIELD = 5;
const BULLET_MAX_BOUNCES = 4;
const BULLET_LIFE = 6;

// 地图格子类型
const T = {
  EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, GRASS: 4, BASE: 5, RUBBLE: 6,
  P1: 7, P2: 8, P3: 9, P4: 10,   // 传送门（1↔2，3↔4）
  BARREL: 11,                     // 爆炸桶
};
const PORTAL_PAIR = { [T.P1]: T.P2, [T.P2]: T.P1, [T.P3]: T.P4, [T.P4]: T.P3 };
const PORTAL_COLOR = { [T.P1]: '#c77dff', [T.P2]: '#ff9d2e', [T.P3]: '#5ec8f2', [T.P4]: '#7cf29c' };

const DIRS = {
  up:    { x: 0,  y: -1, angle: 0 },
  right: { x: 1,  y: 0,  angle: Math.PI / 2 },
  down:  { x: 0,  y: 1,  angle: Math.PI },
  left:  { x: -1, y: 0,  angle: -Math.PI / 2 },
};

/*
 * 地图图例：
 *   . 空地   B 砖墙(可击破)   S 钢墙(不可摧毁)   W 河流(挡坦克)
 *   G 草丛(可隐蔽)   E 基地   X 爆炸桶
 *   1/2 传送门一对   3/4 传送门一对
 */
const LEVELS = [
  [
    '................',
    '................',
    '.BB..BB..BB..BB.',
    '.BB..BB..BB..BB.',
    '.BB..BBSSBB..BB.',
    '.BB..BBSSBB..BB.',
    '......BBBB......',
    'WW....BBBB....WW',
    'WW.....X......WW',
    '....BB....BB....',
    '....BB....BB....',
    '.G..BB.BB.BB..G.',
    '.G.....BB.....G.',
    '.1....BBBB....2.',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '..SS........SS..',
    '..SS.BBBBBB.SS..',
    '.....B....B.....',
    '.BB..B.WW.B..BB.',
    '.BB..B.WW.B..BB.',
    '.....B.X..B.....',
    'BBB..B.BB.B..BBB',
    '.....B.BB.B.....',
    '.WW..........WW.',
    '.WW..BB..BB..WW.',
    '.1....B..B....2.',
    '.GG...B..B...GG.',
    '.GG....BB....GG.',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '.BBBB......BBBB.',
    '.B....SSSS....B.',
    '.B....S..S....B.',
    '.B.GG.S..S.GG.B.',
    '....GG.WW.GG....',
    '.SS....WW....SS.',
    '.SS.BB.WW.BB.SS.',
    '....BB.WW.BB....',
    '.GG.BB.X..BB.GG.',
    '.GG..........GG.',
    '.3..BB.BB.BB..4.',
    '....BB.BB.BB....',
    '.1.....BB.....2.',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '.BB.SS....SS.BB.',
    '.BB.SS.BB.SS.BB.',
    '...3...BB...4...',
    'WW.BB..BB..BB.WW',
    'WW.BB..BB..BB.WW',
    '.....SS..SS.....',
    '.BB..SSXXSS..BB.',
    '.BB..........BB.',
    '....GG.BB.GG....',
    '....GG.BB.GG....',
    '.SS....BB....SS.',
    '.SS.BB.BB.BB.SS.',
    '.1....BBBB....2.',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '..BB..SSSS..BB..',
    '..BB..SSSS..BB..',
    '.....3....4.....',
    '.GG..BB..BB..GG.',
    '.GG..BB..BB..GG.',
    '......WWWW......',
    '.SS...WWWW...SS.',
    '.SS....XX....SS.',
    '....BB.BB.BB....',
    '....BB.BB.BB....',
    '.BB..........BB.',
    '.BB..GG..GG..BB.',
    '.1....BBBB....2.',
    '......BEEB......',
    '......BEEB......',
  ],
];

// 敌方坦克型号
const ENEMY_DEFS = {
  basic: { color: '#b8b8b8', dark: '#6e6e6e', speed: 75,  hp: 1,  score: 100 },
  fast:  { color: '#5ec8f2', dark: '#2f86b8', speed: 130, hp: 1,  score: 200 },
  heavy: { color: '#e05a4e', dark: '#9e2f26', speed: 55,  hp: 2,  score: 300 },
  elite: { color: '#c77dff', dark: '#8a3ffc', speed: 95,  hp: 3,  score: 500 },
  boss:  { color: '#ff2e63', dark: '#a1002e', speed: 48,  hp: 6,  score: 1000 },
};
const BOSS_HP = [6, 8, 10, 12, 14]; // 每关 BOSS 血量递增

// 每关出场敌人（压轴为 BOSS）
const LEVEL_COMP = [
  ['basic', 'basic', 'fast', 'basic', 'fast', 'basic', 'basic', 'fast', 'basic', 'boss'],
  ['basic', 'fast', 'heavy', 'basic', 'fast', 'basic', 'heavy', 'fast', 'basic', 'fast', 'heavy', 'boss'],
  ['fast', 'elite', 'basic', 'heavy', 'fast', 'elite', 'basic', 'heavy', 'fast', 'elite', 'basic', 'heavy', 'fast', 'boss'],
  ['fast', 'elite', 'heavy', 'fast', 'elite', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'fast', 'elite', 'heavy', 'fast', 'elite', 'boss'],
  ['elite', 'fast', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'fast', 'boss'],
];

// 敌人逐关增强：speed 移速倍率 / fire 射速倍率 / aim 瞄准概率 / burst 连发
const LEVEL_MOD = [
  { speed: 1.0, fire: 1.0, aim: 0.2,  burst: 1 },
  { speed: 1.1, fire: 1.2, aim: 0.35, burst: 1 },
  { speed: 1.2, fire: 1.4, aim: 0.5,  burst: 1 },
  { speed: 1.3, fire: 1.6, aim: 0.6,  burst: 2 },
  { speed: 1.4, fire: 1.8, aim: 0.7,  burst: 2 },
];

const PLAYER_SPAWN = { x: 4 * TILE + 2, y: 15 * TILE + 2 };
const ENEMY_SPAWNS = [
  { x: 2, y: 2 },
  { x: 7 * TILE + 2, y: 2 },
  { x: 15 * TILE + 2, y: 2 },
];

/* ==================== 画布与 DOM ==================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const hud = {
  score: document.getElementById('score'),
  level: document.getElementById('level'),
  lives: document.getElementById('lives'),
  enemies: document.getElementById('enemies'),
  buffs: document.getElementById('buffs'),
};

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

/* ==================== 音效 ==================== */
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 静默 */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  },
  noise(dur, vol) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.ctx.destination);
    s.start();
  },
  shoot()    { this.tone(520, 0.08, 'square', 0.06, 180); },
  hitWall()  { this.tone(160, 0.07, 'triangle', 0.09); },
  clank()    { this.tone(900, 0.05, 'square', 0.05); },
  explode()  { this.noise(0.35, 0.25); this.tone(120, 0.3, 'sawtooth', 0.12, 40); },
  gameOver() { this.tone(220, 0.7, 'sawtooth', 0.15, 55); },
  win()      { this.tone(440, 0.12, 'square', 0.1); setTimeout(() => this.tone(660, 0.12, 'square', 0.1), 130); setTimeout(() => this.tone(880, 0.25, 'square', 0.12), 260); },
  buff()     { this.tone(523, 0.1, 'square', 0.1); setTimeout(() => this.tone(784, 0.18, 'square', 0.1), 110); },
  portal()   { this.tone(300, 0.2, 'sine', 0.12, 900); },
  boss()     { this.tone(80, 0.6, 'sawtooth', 0.2, 60); },
};

/* ==================== 游戏状态 ==================== */
const game = {
  state: 'start',   // start | playing | paused | buffselect | gameover | victory
  level: 0,
  score: 0,
  lives: 3,
  time: 0,
  grid: [],
  player: null,
  enemies: [],
  bullets: [],
  items: [],
  itemTimer: 6,
  explosions: [],
  flashes: [],
  spawnQueue: [],
  spawnTimer: 0,
  baseAlive: true,
  flashScreen: 0,
  buffs: null,
  buffNames: [],
  buffChoices: [],
};

function defaultBuffs() {
  return {
    maxBullets: 2,
    cooldown: 0.32,
    speed: 140,
    damage: 1,
    pierce: false,
    blast: false,
    frost: false,
    spread: false,
    armor: false,
  };
}
game.buffs = defaultBuffs();

/* ==================== 过关 Buff 三选一 ==================== */
const BUFFS = [
  { name: '炮管扩容', desc: '同屏炮弹数量 +1', apply: () => { game.buffs.maxBullets += 1; } },
  { name: '极速射速', desc: '射击冷却时间 -30%', apply: () => { game.buffs.cooldown *= 0.7; } },
  { name: '引擎强化', desc: '移动速度 +25%', apply: () => { game.buffs.speed *= 1.25; if (game.player) game.player.speed = game.buffs.speed; } },
  { name: '增援坦克', desc: '生命 +1', apply: () => { game.lives += 1; } },
  { name: '高爆弹头', desc: '炮弹伤害 +1', apply: () => { game.buffs.damage += 1; } },
  { name: '穿透弹', desc: '炮弹击穿敌人后继续飞行', apply: () => { game.buffs.pierce = true; } },
  { name: '爆破弹', desc: '炮弹命中时爆炸，波及周围敌人', apply: () => { game.buffs.blast = true; } },
  { name: '冰冻弹', desc: '被击中的敌人减速 50%，持续 3 秒', apply: () => { game.buffs.frost = true; } },
  { name: '散弹炮', desc: '一次发射 3 枚扇形炮弹', apply: () => { game.buffs.spread = true; } },
  { name: '基地加固', desc: '每关开始时基地外壳变为钢墙', apply: () => { game.buffs.armor = true; } },
];

/* ==================== 地图道具（双方均可拾取） ==================== */
function addBuffName(name) {
  if (!game.buffNames.includes(name)) {
    game.buffNames.push(name);
    updateBuffHUD();
  }
}

const ITEMS = [
  { icon: '💣', name: '爆破弹', p: () => { game.buffs.blast = true; addBuffName('爆破弹'); },
           e: (t) => { t.blast = true; } },
  { icon: '🎯', name: '穿透弹', p: () => { game.buffs.pierce = true; addBuffName('穿透弹'); },
           e: (t) => { t.pierce = true; } },
  { icon: '❄️', name: '冰冻弹', p: () => { game.buffs.frost = true; addBuffName('冰冻弹'); },
           e: (t) => { t.frost = true; } },
  { icon: '🔱', name: '散弹炮', p: () => { game.buffs.spread = true; addBuffName('散弹炮'); },
           e: (t) => { t.spread = true; } },
  { icon: '⚡', name: '加速',   p: () => { game.buffs.speed *= 1.2; if (game.player) game.player.speed = game.buffs.speed; addBuffName('加速'); },
           e: (t) => { t.speed *= 1.3; } },
  { icon: '🛡️', name: '护盾',   p: () => { if (game.player) game.player.invincible = Math.max(game.player.invincible, 5); },
           e: (t) => { t.invincible = Math.max(t.invincible, 4); } },
  { icon: '❤️', name: '生命',   p: () => { game.lives += 1; },
           e: (t) => { t.hp = Math.min(t.maxHp, t.hp + 2); } },
  { icon: '☢️', name: '核弹',   p: () => nukeAll(),
           e: (t) => damageTank(t, 2) },  // 敌人不会用，反受其害
];

function randomItemDef() {
  return ITEMS[(Math.random() * ITEMS.length) | 0];
}

function spawnItem() {
  for (let tries = 0; tries < 60; tries++) {
    const c = (Math.random() * COLS) | 0;
    const r = (Math.random() * ROWS) | 0;
    if (game.grid[r][c] !== T.EMPTY) continue;
    const x = c * TILE + TILE / 2;
    const y = r * TILE + TILE / 2;
    // 别刷在坦克脚下
    if (allTanks().some((t) => t.alive && Math.hypot(t.x + TANK / 2 - x, t.y + TANK / 2 - y) < 40)) continue;
    game.items.push({ x, y, def: randomItemDef(), life: 15, taken: false });
    return;
  }
}

function dropItem(x, y) {
  game.items.push({ x, y, def: randomItemDef(), life: 12, taken: false });
}

function updateItems(dt) {
  game.itemTimer -= dt;
  if (game.itemTimer <= 0) {
    if (game.items.length < 3) spawnItem();
    game.itemTimer = 8 + Math.random() * 6;
  }
  for (const it of game.items) {
    it.life -= dt;
    if (it.life <= 0 || it.taken) continue;
    for (const t of allTanks()) {
      if (!t.alive) continue;
      if (overlap(it.x - 13, it.y - 13, 26, 26, t.x, t.y, TANK, TANK)) {
        it.taken = true;
        if (t.isPlayer) it.def.p();
        else it.def.e(t);
        addSpawnFlash(it.x, it.y);
        Sound.buff();
        break;
      }
    }
  }
  game.items = game.items.filter((it) => it.life > 0 && !it.taken);
}

function nukeAll() {
  game.flashScreen = 0.4;
  Sound.explode();
  Sound.noise(0.8, 0.35);
  for (const e of game.enemies) {
    if (!e.alive || e.invincible > 0) continue;
    damageTank(e, 3);
  }
}

/* ==================== 工具函数 ==================== */
function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

const tankSolid   = (t) => t === T.BRICK || t === T.STEEL || t === T.WATER || t === T.BASE || t === T.RUBBLE || t === T.BARREL;
const bulletSolid = (t) => t === T.BRICK || t === T.STEEL || t === T.BASE || t === T.RUBBLE || t === T.BARREL;

function rectTiles(x, y, size) {
  const res = [];
  const c0 = Math.max(0, Math.floor(x / TILE));
  const c1 = Math.min(COLS - 1, Math.floor((x + size - 0.01) / TILE));
  const r0 = Math.max(0, Math.floor(y / TILE));
  const r1 = Math.min(ROWS - 1, Math.floor((y + size - 0.01) / TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) res.push({ c, r, t: game.grid[r][c] });
  }
  return res;
}

function allTanks() {
  return game.player ? [game.player, ...game.enemies] : game.enemies;
}

function tankCollides(self, x, y) {
  if (x < 0 || y < 0 || x + TANK > GAME_W || y + TANK > GAME_H) return true;
  if (rectTiles(x, y, TANK).some((h) => tankSolid(h.t))) return true;
  for (const o of allTanks()) {
    if (o === self || !o.alive) continue;
    if (overlap(x, y, TANK, TANK, o.x, o.y, TANK, TANK)) return true;
  }
  return false;
}

function moveTank(t, dir, dist) {
  t.dir = dir;
  const d = DIRS[dir];
  let nx = t.x + d.x * dist;
  let ny = t.y + d.y * dist;

  if (d.x === 0) {
    const aligned = Math.round((t.x - 2) / TILE) * TILE + 2;
    const diff = aligned - t.x;
    if (Math.abs(diff) <= 8) nx = t.x + Math.sign(diff) * Math.min(Math.abs(diff), dist);
  } else {
    const aligned = Math.round((t.y - 2) / TILE) * TILE + 2;
    const diff = aligned - t.y;
    if (Math.abs(diff) <= 8) ny = t.y + Math.sign(diff) * Math.min(Math.abs(diff), dist);
  }

  if (!tankCollides(t, nx, ny)) {
    t.tread += Math.hypot(nx - t.x, ny - t.y);
    t.x = nx; t.y = ny;
    return true;
  }
  const mx = t.x + d.x * dist;
  const my = t.y + d.y * dist;
  if (!tankCollides(t, mx, my)) {
    t.tread += dist;
    t.x = mx; t.y = my;
    return true;
  }
  return false;
}

/* ==================== 传送门 ==================== */
function portalTarget(c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  const pair = PORTAL_PAIR[game.grid[r][c]];
  if (pair === undefined) return null;
  for (let rr = 0; rr < ROWS; rr++) {
    for (let cc = 0; cc < COLS; cc++) {
      if (game.grid[rr][cc] === pair) return { c: cc, r: rr };
    }
  }
  return null;
}

function tryPortal(t) {
  if (t.portalCd > 0 || !t.alive) return;
  const c = Math.floor((t.x + TANK / 2) / TILE);
  const r = Math.floor((t.y + TANK / 2) / TILE);
  const dest = portalTarget(c, r);
  if (!dest) return;
  const nx = dest.c * TILE + (TILE - TANK) / 2;
  const ny = dest.r * TILE + (TILE - TANK) / 2;
  for (const o of allTanks()) {
    if (o !== t && o.alive && overlap(nx, ny, TANK, TANK, o.x, o.y, TANK, TANK)) return;
  }
  addSpawnFlash(t.x + TANK / 2, t.y + TANK / 2);
  t.x = nx;
  t.y = ny;
  t.portalCd = 1;
  addSpawnFlash(nx + TANK / 2, ny + TANK / 2);
  Sound.portal();
}

/* ==================== 子弹（任意角度 + 反弹） ==================== */
function spawnBullet(t, angle) {
  const isP = t.isPlayer;
  const speed = isP ? 420 : 260;
  game.bullets.push({
    x: t.x + TANK / 2 + Math.cos(angle) * (TANK / 2 + 5),
    y: t.y + TANK / 2 + Math.sin(angle) * (TANK / 2 + 5),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    owner: t,
    isPlayer: isP,
    damage: isP ? game.buffs.damage : 1,
    pierce: isP ? game.buffs.pierce : !!t.pierce,
    blast: isP ? game.buffs.blast : !!t.blast,
    frost: isP ? game.buffs.frost : !!t.frost,
    bounces: 0,
    maxBounces: BULLET_MAX_BOUNCES,
    life: BULLET_LIFE,
    portalCd: 0,
    hitSet: new Set(),
    dead: false,
  });
}

function shoot(t, angle) {
  if (t.cooldown > 0 || !t.alive) return;
  const spread = t.isPlayer ? game.buffs.spread : t.spread;
  const cap = (t.isPlayer ? game.buffs.maxBullets : (t.type === 'boss' ? 10 : 2)) * (spread ? 3 : 1);
  if (game.bullets.filter((b) => b.owner === t && !b.dead).length >= cap) return;

  const angles = [];
  if (t.type === 'boss') {
    // BOSS 扇形弹幕，高关卡 5 向
    const n = game.level >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) angles.push(angle + (i - (n - 1) / 2) * 0.28);
  } else if (spread) {
    angles.push(angle - 0.22, angle, angle + 0.22);
  } else {
    angles.push(angle);
  }
  for (const a of angles) spawnBullet(t, a);
  t.cooldown = t.isPlayer ? game.buffs.cooldown : 0.5;
  Sound.shoot();
}

// 沿单轴移动子弹并处理碰撞，返回碰撞类型
function slideAxis(b, axis, dist) {
  const old = b[axis];
  b[axis] += dist;
  if (b.x < BR) { b.x = BR; return 'bounce'; }
  if (b.x > GAME_W - BR) { b.x = GAME_W - BR; return 'bounce'; }
  if (b.y < BR) { b.y = BR; return 'bounce'; }
  if (b.y > GAME_H - BR) { b.y = GAME_H - BR; return 'bounce'; }
  const hits = rectTiles(b.x - BR, b.y - BR, BR * 2).filter((h) => bulletSolid(h.t));
  if (!hits.length) return null;
  if (hits.some((h) => h.t === T.BASE || h.t === T.RUBBLE)) return 'base';
  const barrels = hits.filter((h) => h.t === T.BARREL);
  if (barrels.length) return { barrels };
  let broke = false;
  for (const h of hits) {
    if (h.t === T.BRICK) {
      game.grid[h.r][h.c] = T.EMPTY;
      broke = true;
    }
  }
  b[axis] = old;
  return broke ? 'brick' : 'steel';
}

function onBounce(b) {
  b.bounces += 1;
  if (b.bounces > b.maxBounces) {
    b.dead = true;
    addExplosion(b.x, b.y, 0.2, 8);
  }
}

function handleSlideResult(b, r) {
  // 返回值：true 表示子弹已消亡
  if (r === 'base') {
    b.dead = true;
    destroyBase();
    return true;
  }
  if (r && r.barrels) {
    b.dead = true;
    for (const h of r.barrels) explodeBarrel(h.c, h.r);
    return true;
  }
  if (r) {
    if (b.blast) blastAt(b.x, b.y, b.owner, null);
    if (r === 'brick' || r === 'steel') {
      // 该轴速度反向（由调用处处理）
    }
    onBounce(b);
    if (b.dead) return true;
    addExplosion(b.x, b.y, 0.1, 6);
    if (r === 'brick') Sound.hitWall();
    else Sound.clank();
  }
  return false;
}

function updateBullets(dt) {
  for (const b of game.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) {
      b.dead = true;
      addExplosion(b.x, b.y, 0.2, 8);
      continue;
    }
    if (b.portalCd > 0) b.portalCd -= dt;

    // X 轴
    let r = slideAxis(b, 'x', b.vx * dt);
    if (handleSlideResult(b, r)) continue;
    if (r === 'bounce' || r === 'brick' || r === 'steel') b.vx = -b.vx;
    // Y 轴
    r = slideAxis(b, 'y', b.vy * dt);
    if (handleSlideResult(b, r)) continue;
    if (r === 'bounce' || r === 'brick' || r === 'steel') b.vy = -b.vy;

    // 传送门
    if (b.portalCd <= 0) {
      const dest = portalTarget(Math.floor(b.x / TILE), Math.floor(b.y / TILE));
      if (dest) {
        b.x = dest.c * TILE + TILE / 2;
        b.y = dest.r * TILE + TILE / 2;
        b.portalCd = 0.5;
        addSpawnFlash(b.x, b.y);
      }
    }

    // 命中坦克（不会击中发射者；敌人之间会误伤）
    for (const t of allTanks()) {
      if (!t.alive || t === b.owner || b.hitSet.has(t) || t.invincible > 0) continue;
      if (!overlap(b.x - BR, b.y - BR, BR * 2, BR * 2, t.x, t.y, TANK, TANK)) continue;
      if (t.isPlayer) {
        b.dead = true;
        killPlayer();
      } else {
        damageTank(t, b.damage);
        if (b.frost && t.alive) t.slow = 3;
        if (b.blast) blastAt(b.x, b.y, b.owner, t);
        if (b.pierce && !b.dead) b.hitSet.add(t);
        else b.dead = true;
      }
      addExplosion(b.x, b.y, 0.15, 9);
      break;
    }
    if (b.dead) continue;

    // 敌我子弹对撞抵消
    for (const o of game.bullets) {
      if (o.dead || o === b || o.isPlayer === b.isPlayer) continue;
      if (Math.hypot(o.x - b.x, o.y - b.y) < 6) {
        b.dead = true;
        o.dead = true;
        addExplosion((b.x + o.x) / 2, (b.y + o.y) / 2, 0.15, 9);
        break;
      }
    }
  }
  game.bullets = game.bullets.filter((b) => !b.dead);
}

/* ==================== 爆炸 ==================== */
function addExplosion(x, y, dur, r) {
  game.explosions.push({ x, y, t: 0, dur, r });
}

function addSpawnFlash(x, y) {
  game.flashes.push({ x, y, t: 0, dur: 0.5 });
}

// 爆破弹效果：摧毁 3x3 砖墙/油桶，波及范围内坦克（发射者与直接命中目标除外）
function blastAt(x, y, owner, exclude) {
  addExplosion(x, y, 0.35, 36);
  Sound.explode();
  const c0 = Math.floor(x / TILE);
  const r0 = Math.floor(y / TILE);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (game.grid[r][c] === T.BRICK) game.grid[r][c] = T.EMPTY;
      else if (game.grid[r][c] === T.BARREL) explodeBarrel(c, r);
    }
  }
  for (const t of allTanks()) {
    if (!t.alive || t === owner || t === exclude || t.invincible > 0) continue;
    if (Math.hypot(t.x + TANK / 2 - x, t.y + TANK / 2 - y) <= 60) {
      if (t.isPlayer) killPlayer();
      else damageTank(t, 1);
    }
  }
}

// 爆炸桶：连锁引爆，伤害不分敌我
function explodeBarrel(c, r) {
  if (game.grid[r][c] !== T.BARREL) return;
  game.grid[r][c] = T.EMPTY;
  const x = c * TILE + TILE / 2;
  const y = r * TILE + TILE / 2;
  addExplosion(x, y, 0.4, 42);
  Sound.explode();
  for (let rr = r - 1; rr <= r + 1; rr++) {
    for (let cc = c - 1; cc <= c + 1; cc++) {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      if (game.grid[rr][cc] === T.BRICK) game.grid[rr][cc] = T.EMPTY;
      else if (game.grid[rr][cc] === T.BARREL) explodeBarrel(cc, rr);
    }
  }
  for (const t of allTanks()) {
    if (!t.alive || t.invincible > 0) continue;
    if (Math.hypot(t.x + TANK / 2 - x, t.y + TANK / 2 - y) <= 70) {
      if (t.isPlayer) killPlayer();
      else damageTank(t, 2);
    }
  }
}

/* ==================== 实体 ==================== */
function createPlayer() {
  return {
    x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y,
    dir: 'up', aim: -Math.PI / 2,
    speed: game.buffs.speed,
    color: '#ffd23f', dark: '#a87e0b',
    isPlayer: true, alive: true,
    hp: 1, maxHp: 1,
    cooldown: 0, invincible: 2.5, tread: 0, slow: 0, portalCd: 0,
  };
}

function createEnemy(type, x, y) {
  const def = ENEMY_DEFS[type];
  const mod = LEVEL_MOD[game.level];
  const burst = mod.burst > 1 && (type === 'fast' || type === 'elite') ? 2 : 1;
  const isBoss = type === 'boss';
  const hp = isBoss ? BOSS_HP[game.level] : def.hp;
  return {
    x, y, dir: 'down', aim: Math.PI / 2,
    speed: def.speed * mod.speed * (isBoss ? 1 + game.level * 0.08 : 1),
    hp, maxHp: hp,
    color: def.color, dark: def.dark,
    score: def.score + (isBoss ? game.level * 200 : 0),
    isPlayer: false, alive: true,
    cooldown: 0, invincible: 1, tread: 0, slow: 0, portalCd: 0,
    aiTimer: 0, fireTimer: 0.8 + Math.random(),
    burst, burstLeft: 0, burstDelay: 0,
    blast: false, pierce: false, frost: false, spread: false,
    type,
  };
}

/* ==================== 关卡 ==================== */
const CHAR_TO_TILE = {
  '.': T.EMPTY, B: T.BRICK, S: T.STEEL, W: T.WATER, G: T.GRASS, E: T.BASE,
  X: T.BARREL, 1: T.P1, 2: T.P2, 3: T.P3, 4: T.P4,
};

function reinforceBase() {
  const shell = [[13, 6], [13, 7], [13, 8], [13, 9], [14, 6], [15, 6], [14, 9], [15, 9]];
  for (const [r, c] of shell) {
    if (game.grid[r][c] !== T.BASE) game.grid[r][c] = T.STEEL;
  }
}

function loadLevel(idx) {
  game.grid = LEVELS[idx].map((row) => [...row].map((ch) => CHAR_TO_TILE[ch]));
  if (game.buffs.armor) reinforceBase();
  game.enemies = [];
  game.bullets = [];
  game.items = [];
  game.itemTimer = 5;
  game.explosions = [];
  game.flashes = [];
  game.spawnQueue = [...LEVEL_COMP[idx]];
  game.spawnTimer = 1.2;
  game.baseAlive = true;
  game.flashScreen = 0;
  game.player = createPlayer();
}

function startGame() {
  Sound.ensure();
  game.score = 0;
  game.lives = 3;
  game.level = 0;
  game.buffs = defaultBuffs();
  game.buffNames = [];
  updateBuffHUD();
  loadLevel(0);
  game.state = 'playing';
  hideOverlay();
}

function gameOver(msg) {
  game.state = 'gameover';
  Sound.gameOver();
  showOverlay(`<h1>游戏结束</h1><p>${msg}</p><p>最终得分：<b style="color:#ffd23f">${game.score}</b></p><p class="blink">按 Enter 重新开始</p>`);
}

function destroyBase() {
  if (!game.baseAlive) return;
  game.baseAlive = false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (game.grid[r][c] === T.BASE) game.grid[r][c] = T.RUBBLE;
    }
  }
  addExplosion(8 * TILE, 15 * TILE, 0.8, 46);
  Sound.explode();
  gameOver('基地被摧毁了！');
}

function killPlayer() {
  const p = game.player;
  addExplosion(p.x + TANK / 2, p.y + TANK / 2, 0.45, 28);
  Sound.explode();
  game.lives -= 1;
  if (game.lives > 0) {
    p.x = PLAYER_SPAWN.x;
    p.y = PLAYER_SPAWN.y;
    p.dir = 'up';
    p.cooldown = 0;
    p.invincible = 2.5;
    p.portalCd = 0;
  } else {
    p.alive = false;
    gameOver('你的坦克被击毁了！');
  }
}

function damageTank(t, dmg) {
  t.hp -= dmg;
  if (t.hp <= 0) {
    t.alive = false;
    game.score += t.score;
    addExplosion(t.x + TANK / 2, t.y + TANK / 2, t.type === 'boss' ? 0.7 : 0.4, t.type === 'boss' ? 46 : 26);
    Sound.explode();
    // 击毁掉落道具：BOSS 必掉，普通敌人 22% 概率
    if (t.type === 'boss') {
      dropItem(t.x + TANK / 2, t.y + TANK / 2);
    } else if (Math.random() < 0.22) {
      dropItem(t.x + TANK / 2, t.y + TANK / 2);
    }
  } else {
    Sound.hitWall();
  }
}

/* ==================== 敌人 AI ==================== */
function aimedAngle(e) {
  const p = game.player;
  if (!p || !p.alive) return e.aim;
  return Math.atan2(p.y - e.y, p.x - e.x);
}

function pickDir(e) {
  if (e.type === 'boss' && Math.random() < 0.7) {
    // BOSS 积极追踪玩家
    const p = game.player;
    if (p && p.alive) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'down' : 'up';
    }
  }
  const r = Math.random();
  if (r < 0.3) return 'down';
  if (r < 0.5) {
    const p = game.player;
    const target = p && p.alive && Math.random() < 0.5 ? p : { x: 7.5 * TILE, y: 15 * TILE };
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }
  const pool = ['up', 'down', 'left', 'right'];
  return pool[(Math.random() * 4) | 0];
}

function fireEnemy(e) {
  const mod = LEVEL_MOD[game.level];
  const p = game.player;
  let angle;
  if (e.type === 'boss') {
    angle = aimedAngle(e); // BOSS 始终瞄准玩家
  } else if (Math.random() < mod.aim && p && p.alive) {
    angle = aimedAngle(e) + (Math.random() - 0.5) * 0.25;
  } else {
    const d = DIRS[e.dir];
    angle = Math.atan2(d.y, d.x) + (Math.random() - 0.5) * 0.3;
  }
  e.aim = angle;
  shoot(e, angle);
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (!e.alive) continue;
    e.cooldown -= dt;
    e.invincible -= dt;
    e.aiTimer -= dt;
    e.fireTimer -= dt;
    e.portalCd = Math.max(0, e.portalCd - dt);
    e.slow = Math.max(0, e.slow - dt);

    if (e.aiTimer <= 0) {
      e.dir = pickDir(e);
      e.aiTimer = 1 + Math.random() * 2;
    }
    const speed = e.speed * (e.slow > 0 ? 0.5 : 1);
    if (moveTank(e, e.dir, speed * dt)) {
      // 移动时炮塔跟随车身（瞄准时除外）
      if (e.type !== 'boss') {
        const d = DIRS[e.dir];
        e.aim = Math.atan2(d.y, d.x);
      }
    } else {
      e.dir = pickDir(e);
      e.aiTimer = 1 + Math.random() * 1.5;
    }
    tryPortal(e);

    if (e.fireTimer <= 0) {
      fireEnemy(e);
      if (e.burst > 1) {
        e.burstLeft = e.burst - 1;
        e.burstDelay = 0.18;
      }
      e.fireTimer = (1.1 + Math.random() * 1.6) / LEVEL_MOD[game.level].fire;
    }
    if (e.burstLeft > 0) {
      e.burstDelay -= dt;
      if (e.burstDelay <= 0) {
        fireEnemy(e);
        e.burstLeft -= 1;
        e.burstDelay = 0.18;
      }
    }
  }
  game.enemies = game.enemies.filter((e) => e.alive);
}

function updateSpawning(dt) {
  if (game.spawnQueue.length === 0) return;
  if (game.enemies.length >= MAX_ENEMIES_ON_FIELD) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;

  const spots = [...ENEMY_SPAWNS].sort(() => Math.random() - 0.5);
  for (const s of spots) {
    const blocked = allTanks().some(
      (t) => t.alive && overlap(s.x, s.y, TANK, TANK, t.x, t.y, TANK, TANK)
    );
    if (blocked) continue;
    const type = game.spawnQueue.shift();
    game.enemies.push(createEnemy(type, s.x, s.y));
    addSpawnFlash(s.x + TANK / 2, s.y + TANK / 2);
    if (type === 'boss') {
      Sound.boss();
      addExplosion(s.x + TANK / 2, s.y + TANK / 2, 0.6, 40);
    }
    game.spawnTimer = 2.2;
    return;
  }
  game.spawnTimer = 0.6;
}

/* ==================== Buff 三选一 ==================== */
function offerBuffs() {
  const pool = [...BUFFS];
  game.buffChoices = [];
  while (game.buffChoices.length < 3 && pool.length) {
    const i = (Math.random() * pool.length) | 0;
    game.buffChoices.push(pool.splice(i, 1)[0]);
  }
  game.state = 'buffselect';
  Sound.buff();
  showOverlay(`
    <h1>第 ${game.level + 1} 关通过！</h1>
    <p>选择一项强化（点击卡片或按 1 / 2 / 3）</p>
    <div class="buffs">
      ${game.buffChoices.map((b, i) => `
        <button class="buff" data-i="${i}">
          <b>${b.name}</b>
          <span>${b.desc}</span>
          <em>按 ${i + 1}</em>
        </button>`).join('')}
    </div>`);
  overlay.querySelectorAll('.buff').forEach((btn) => {
    btn.addEventListener('click', () => chooseBuff(Number(btn.dataset.i)));
  });
}

function chooseBuff(i) {
  if (game.state !== 'buffselect') return;
  const b = game.buffChoices[i];
  if (!b) return;
  b.apply();
  game.buffNames.push(b.name);
  updateBuffHUD();
  game.level += 1;
  loadLevel(game.level);
  game.state = 'playing';
  hideOverlay();
}

/* ==================== 输入 ==================== */
const Input = {
  stack: [],
  fire: false,
  desiredDir() {
    return this.stack[this.stack.length - 1] || null;
  },
};
const Mouse = { x: GAME_W / 2, y: GAME_H / 2, down: false };

const KEY_DIR = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

window.addEventListener('keydown', (e) => {
  const dir = KEY_DIR[e.code];
  if (dir) {
    e.preventDefault();
    if (!Input.stack.includes(dir)) Input.stack.push(dir);
    return;
  }
  if (e.code === 'Space' || e.code === 'KeyJ') {
    e.preventDefault();
    Input.fire = true;
  }
  if (e.code === 'Enter') {
    if (game.state === 'start' || game.state === 'gameover' || game.state === 'victory') startGame();
  }
  if (game.state === 'buffselect' && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3')) {
    chooseBuff(Number(e.code.slice(-1)) - 1);
  }
  if (e.code === 'KeyP') {
    if (game.state === 'playing') {
      game.state = 'paused';
      showOverlay('<h1>已暂停</h1><p class="blink">按 P 继续游戏</p>');
    } else if (game.state === 'paused') {
      game.state = 'playing';
      hideOverlay();
    }
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEY_DIR[e.code];
  if (dir) {
    const i = Input.stack.indexOf(dir);
    if (i >= 0) Input.stack.splice(i, 1);
  }
  if (e.code === 'Space' || e.code === 'KeyJ') Input.fire = false;
});

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  Mouse.x = (e.clientX - r.left) * (GAME_W / r.width);
  Mouse.y = (e.clientY - r.top) * (GAME_H / r.height);
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    Mouse.down = true;
    Sound.ensure();
  }
});
window.addEventListener('mouseup', () => { Mouse.down = false; });

/* ==================== 主更新 ==================== */
function update(dt) {
  game.time += dt;

  const p = game.player;
  if (p && p.alive) {
    p.cooldown -= dt;
    p.invincible -= dt;
    p.portalCd = Math.max(0, p.portalCd - dt);
    p.aim = Math.atan2(Mouse.y - (p.y + TANK / 2), Mouse.x - (p.x + TANK / 2));
    const dir = Input.desiredDir();
    if (dir) moveTank(p, dir, p.speed * dt);
    tryPortal(p);
    if (Input.fire || Mouse.down) shoot(p, p.aim);
  }

  updateEnemies(dt);
  updateSpawning(dt);
  updateItems(dt);
  updateBullets(dt);
  updateEffects(dt);

  if (game.baseAlive && game.spawnQueue.length === 0 && game.enemies.length === 0) {
    if (game.level >= LEVELS.length - 1) {
      game.state = 'victory';
      Sound.win();
      showOverlay(`<h1>🏆 胜利！</h1><p>你守住了基地，消灭了所有敌方坦克！</p><p>最终得分：<b style="color:#ffd23f">${game.score}</b></p><p class="blink">按 Enter 再玩一次</p>`);
    } else {
      offerBuffs();
    }
  }

  updateHUD();
}

function updateEffects(dt) {
  game.flashScreen = Math.max(0, game.flashScreen - dt);
  for (const ex of game.explosions) ex.t += dt;
  game.explosions = game.explosions.filter((ex) => ex.t < ex.dur);
  for (const f of game.flashes) f.t += dt;
  game.flashes = game.flashes.filter((f) => f.t < f.dur);
}

/* ==================== 渲染 ==================== */
function drawBrick(x, y) {
  ctx.fillStyle = '#a54a24';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#7d3418';
  ctx.fillRect(x, y + 12, TILE, 3);
  ctx.fillRect(x, y + 26, TILE, 3);
  ctx.fillRect(x + 19, y, 3, 12);
  ctx.fillRect(x + 9, y + 15, 3, 11);
  ctx.fillRect(x + 29, y + 15, 3, 11);
  ctx.fillRect(x + 19, y + 29, 3, 11);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
}

function drawSteel(x, y) {
  ctx.fillStyle = '#8a919a';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#cfd4da';
  ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#8a919a';
  ctx.fillRect(x + 14, y + 6, 4, TILE - 12);
  ctx.fillRect(x + 6, y + 14, TILE - 12, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
}

function drawWater(x, y) {
  ctx.fillStyle = '#0f4cbe';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(120,180,255,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const yy = y + 12 + i * 16;
    ctx.beginPath();
    for (let px = 0; px <= TILE; px += 4) {
      const wy = yy + Math.sin((px + game.time * 60 + x * 3 + y) * 0.18) * 2.5;
      if (px === 0) ctx.moveTo(x + px, wy);
      else ctx.lineTo(x + px, wy);
    }
    ctx.stroke();
  }
}

function drawGrass(x, y) {
  ctx.fillStyle = '#1f7a1f';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#33a833';
  for (let i = 0; i < 6; i++) {
    const px = x + ((i * 17 + x * 3 + y * 7) % 33) + 3;
    const py = y + ((i * 23 + x * 5 + y * 11) % 33) + 3;
    ctx.fillRect(px, py, 4, 4);
  }
}

function drawPortal(x, y, tile) {
  const color = PORTAL_COLOR[tile];
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(game.time * 2.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 5 + i * 5, i * 2.1, i * 2.1 + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBarrel(x, y) {
  ctx.fillStyle = '#8e2f21';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 4, TILE - 12, TILE - 8, 5);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x + 6, y + 9, TILE - 12, 6);
  ctx.fillRect(x + 6, y + TILE - 15, TILE - 12, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(x + 6.5, y + 4.5, TILE - 13, TILE - 9);
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', x + TILE / 2, y + TILE / 2 + 1);
}

function drawStar(cx, cy, spikes, outerR, innerR, color) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBase() {
  const bx = 7 * TILE;
  const by = 14 * TILE;
  if (game.baseAlive) {
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, TILE * 2, TILE * 2);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(bx + 2, by + 2, TILE * 2 - 4, TILE * 2 - 4);
    drawStar(bx + TILE, by + TILE, 5, 24, 10, '#f5c518');
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, TILE * 2, TILE * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx + 8, by + 10, 22, 14);
    ctx.fillRect(bx + 44, by + 34, 26, 18);
    ctx.fillRect(bx + 14, by + 52, 18, 16);
  }
}

function drawTiles(above) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = game.grid[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (!above) {
        if (t === T.BRICK) drawBrick(x, y);
        else if (t === T.STEEL) drawSteel(x, y);
        else if (t === T.WATER) drawWater(x, y);
        else if (t === T.BARREL) drawBarrel(x, y);
        else if (PORTAL_PAIR[t] !== undefined) drawPortal(x, y, t);
      } else if (t === T.GRASS) {
        drawGrass(x, y);
      }
    }
  }
}

function drawItem(it) {
  if (it.life < 3 && Math.floor(game.time * 6) % 2 === 0) return; // 即将消失时闪烁
  const bob = Math.sin(game.time * 3 + it.x * 0.1) * 2;
  ctx.save();
  ctx.translate(it.x, it.y + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,63,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '17px "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(it.def.icon, 0, 1);
  ctx.restore();
}

function drawTank(t) {
  if (!t.alive) return;
  const cx = t.x + TANK / 2;
  const cy = t.y + TANK / 2;

  // 车身（随移动方向）
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(DIRS[t.dir].angle);
  ctx.fillStyle = t.dark;
  ctx.fillRect(-18, -18, 9, 36);
  ctx.fillRect(9, -18, 9, 36);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  const off = t.tread % 6;
  for (let yy = -18 + off; yy < 18; yy += 6) {
    ctx.fillRect(-18, yy, 9, 2);
    ctx.fillRect(9, yy, 9, 2);
  }
  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.roundRect(-11, -14, 22, 28, 4);
  ctx.fill();
  if (t.type === 'boss') drawStar(0, 3, 5, 6, 2.6, '#ffd23f');
  ctx.restore();

  // 炮塔（随瞄准角度）
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t.aim + Math.PI / 2);
  ctx.fillStyle = t.dark;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-2.5, -20, 5, 14);
  ctx.restore();

  // 多血坦克血条
  if (t.maxHp > 1) {
    const w = t.type === 'boss' ? 40 : 30;
    const ratio = t.hp / t.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, t.y - 9, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7cf29c' : ratio > 0.25 ? '#ffd23f' : '#ff6b6b';
    ctx.fillRect(cx - w / 2 + 1, t.y - 8, (w - 2) * ratio, 3);
  }
  if (t.slow > 0) {
    ctx.strokeStyle = 'rgba(140,220,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t.invincible > 0 && Math.floor(game.time * 10) % 2 === 0) {
    ctx.strokeStyle = 'rgba(255,255,140,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bulletColor(b) {
  if (!b.isPlayer) return '#ff6b6b';
  if (b.blast) return '#ff9d2e';
  if (b.pierce) return '#7cf2e8';
  if (b.frost) return '#a8e6ff';
  return '#ffe66d';
}

function drawBullets() {
  for (const b of game.bullets) {
    ctx.fillStyle = bulletColor(b);
    ctx.beginPath();
    ctx.arc(b.x, b.y, BR + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExplosions() {
  for (const ex of game.explosions) {
    const k = ex.t / ex.dur;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#ff9d2e';
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r * k + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, (ex.r * k + 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawFlashes() {
  for (const f of game.flashes) {
    const k = f.t / f.dur;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(k * Math.PI * 2);
    ctx.strokeStyle = `rgba(140,220,255,${1 - k})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  if (!game.grid.length) return;
  drawTiles(false);
  drawBase();
  for (const it of game.items) drawItem(it);
  drawBullets();
  if (game.player) drawTank(game.player);
  for (const e of game.enemies) drawTank(e);
  drawTiles(true);
  drawExplosions();
  drawFlashes();

  // 核弹白闪
  if (game.flashScreen > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, game.flashScreen * 2.5)})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }
}

/* ==================== HUD 与遮罩 ==================== */
function updateHUD() {
  hud.score.textContent = game.score;
  hud.level.textContent = game.level + 1;
  hud.lives.textContent = game.lives;
  hud.enemies.textContent = game.spawnQueue.length + game.enemies.length;
}

function updateBuffHUD() {
  hud.buffs.textContent = game.buffNames.length ? game.buffNames.join('、') : '暂无';
}

function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
}

function hideOverlay() {
  overlay.style.display = 'none';
}

/* ==================== 主循环 ==================== */
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - last) / 1000 || 0, 0.05);
  last = ts;
  if (game.state === 'playing') update(dt);
  render();
}

/* ==================== 启动 ==================== */
loadLevel(0);
updateHUD();
showOverlay(`
  <h1>坦克大战</h1>
  <p>🎮 WASD / 方向键移动　🖱️ 鼠标瞄准，左键射击</p>
  <p>🎱 炮弹会在墙壁间反弹，还能穿过传送门！</p>
  <p>🎁 拾取地图道具获得特殊弹药，小心敌人也会抢！</p>
  <p>👹 每关都有 BOSS 坐镇，共 5 关！</p>
  <p class="blink">按 Enter 开始游戏</p>
`);
requestAnimationFrame(loop);
