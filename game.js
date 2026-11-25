'use strict';

/* ==================== 常量 ==================== */
const TILE = 40;            // 每块地图砖的像素
const COLS = 16;
const ROWS = 16;
const GAME_W = COLS * TILE; // 640
const GAME_H = ROWS * TILE; // 640
const TANK = 36;            // 坦克碰撞盒尺寸
const BULLET = 6;           // 子弹尺寸
const MAX_ENEMIES_ON_FIELD = 4;
const BULLET_MAX_BOUNCES = 4; // 子弹最多反弹次数
const BULLET_LIFE = 6;        // 子弹最长存活时间（秒）

// 地图格子类型
const T = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, GRASS: 4, BASE: 5, RUBBLE: 6 };

const DIRS = {
  up:    { x: 0,  y: -1, angle: 0 },
  right: { x: 1,  y: 0,  angle: Math.PI / 2 },
  down:  { x: 0,  y: 1,  angle: Math.PI },
  left:  { x: -1, y: 0,  angle: -Math.PI / 2 },
};

/*
 * 地图图例：
 *   . 空地   B 砖墙(可击破)   S 钢墙(不可摧毁)
 *   W 河流(挡坦克)   G 草丛(可隐蔽)   E 基地
 */
const LEVELS = [
  [
    '................',
    '................',
    '.BB..BB..BB..BB.',
    '.BB..BB..BB..BB.',
    '.BB..BB..BB..BB.',
    '.BB..BBSSBB..BB.',
    '.BB..BBSSBB..BB.',
    '......BBBB......',
    'WW....BBBB....WW',
    'WW............WW',
    '....BB....BB....',
    '....BB....BB....',
    '.G..BB.BB.BB..G.',
    '.G.....BB.....G.',
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
    '.....B....B.....',
    'BBB..B.BB.B..BBB',
    '.....B.BB.B.....',
    '.WW..........WW.',
    '.WW..BB..BB..WW.',
    '......B..B......',
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
    '.GG.BB....BB.GG.',
    '.GG..........GG.',
    '....BB.BB.BB....',
    '....BB.BB.BB....',
    '.......BB.......',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '.BB.SS....SS.BB.',
    '.BB.SS.BB.SS.BB.',
    '.......BB.......',
    'WW.BB..BB..BB.WW',
    'WW.BB..BB..BB.WW',
    '.....SS..SS.....',
    '.BB..SS..SS..BB.',
    '.BB..........BB.',
    '....GG.BB.GG....',
    '....GG.BB.GG....',
    '.SS....BB....SS.',
    '.SS.BB.BB.BB.SS.',
    '......BBBB......',
    '......BEEB......',
    '......BEEB......',
  ],
  [
    '................',
    '..BB..SSSS..BB..',
    '..BB..SSSS..BB..',
    '................',
    '.GG..BB..BB..GG.',
    '.GG..BB..BB..GG.',
    '......WWWW......',
    '.SS...WWWW...SS.',
    '.SS..........SS.',
    '....BB.BB.BB....',
    '....BB.BB.BB....',
    '.BB..........BB.',
    '.BB..GG..GG..BB.',
    '......BBBB......',
    '......BEEB......',
    '......BEEB......',
  ],
];

// 敌方坦克型号（elite 精英 / boss 首领 为高难关卡新增）
const ENEMY_DEFS = {
  basic: { color: '#b8b8b8', dark: '#6e6e6e', speed: 75,  hp: 1,  score: 100 },
  fast:  { color: '#5ec8f2', dark: '#2f86b8', speed: 130, hp: 1,  score: 200 },
  heavy: { color: '#e05a4e', dark: '#9e2f26', speed: 55,  hp: 2,  score: 300 },
  elite: { color: '#c77dff', dark: '#8a3ffc', speed: 95,  hp: 3,  score: 500 },
  boss:  { color: '#ff2e63', dark: '#a1002e', speed: 45,  hp: 10, score: 1000 },
};

// 每关出场的敌人构成（最后一关压轴为 BOSS）
const LEVEL_COMP = [
  ['basic', 'basic', 'fast', 'basic', 'basic', 'fast', 'basic', 'basic'],
  ['basic', 'fast', 'basic', 'heavy', 'fast', 'basic', 'fast', 'basic', 'heavy', 'basic'],
  ['fast', 'basic', 'elite', 'fast', 'heavy', 'basic', 'elite', 'fast', 'heavy', 'basic', 'fast', 'basic'],
  ['fast', 'elite', 'heavy', 'fast', 'elite', 'heavy', 'fast', 'elite', 'heavy', 'fast', 'elite', 'heavy', 'fast', 'elite'],
  ['elite', 'fast', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'fast', 'heavy', 'elite', 'boss'],
];

// 敌人逐关增强：speed 移速倍率 / fire 射速倍率 / aim 瞄准玩家概率 / burst 连发数
const LEVEL_MOD = [
  { speed: 1.0, fire: 1.0, aim: 0.0,  burst: 1 },
  { speed: 1.1, fire: 1.2, aim: 0.2,  burst: 1 },
  { speed: 1.2, fire: 1.4, aim: 0.35, burst: 1 },
  { speed: 1.3, fire: 1.6, aim: 0.5,  burst: 2 },
  { speed: 1.4, fire: 1.8, aim: 0.65, burst: 2 },
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

// roundRect 兼容旧浏览器
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

/* ==================== 音效（WebAudio 合成，无外部文件） ==================== */
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 不支持则静默 */ }
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
  explosions: [],
  flashes: [],
  spawnQueue: [],
  spawnTimer: 0,
  baseAlive: true,
  buffs: null,      // 玩家已获得的强化（数值型）
  buffNames: [],    // 已获得强化名称（用于 HUD 展示）
  buffChoices: [],  // 当前三选一的候选
};

function defaultBuffs() {
  return {
    maxBullets: 2,    // 同屏炮弹上限
    cooldown: 0.32,   // 射击冷却
    speed: 140,       // 移动速度
    damage: 1,        // 炮弹伤害
    pierce: false,    // 穿透弹
    blast: false,     // 爆破弹
    frost: false,     // 冰冻弹
    armor: false,     // 基地外壳钢墙化
  };
}
game.buffs = defaultBuffs();

/* ==================== Buff 定义 ==================== */
const BUFFS = [
  { name: '炮管扩容', desc: '同屏炮弹数量 +1', apply: () => { game.buffs.maxBullets += 1; } },
  { name: '极速射速', desc: '射击冷却时间 -30%', apply: () => { game.buffs.cooldown *= 0.7; } },
  { name: '引擎强化', desc: '移动速度 +25%', apply: () => { game.buffs.speed *= 1.25; if (game.player) game.player.speed = game.buffs.speed; } },
  { name: '增援坦克', desc: '生命 +1', apply: () => { game.lives += 1; } },
  { name: '高爆弹头', desc: '炮弹伤害 +1，可一击摧毁重型坦克', apply: () => { game.buffs.damage += 1; } },
  { name: '穿透弹', desc: '炮弹击穿敌人后继续飞行', apply: () => { game.buffs.pierce = true; } },
  { name: '爆破弹', desc: '炮弹命中时爆炸，摧毁周围砖墙并波及附近敌人', apply: () => { game.buffs.blast = true; } },
  { name: '冰冻弹', desc: '被击中的敌人减速 50%，持续 3 秒', apply: () => { game.buffs.frost = true; } },
  { name: '基地加固', desc: '每关开始时基地外壳变为钢墙', apply: () => { game.buffs.armor = true; } },
];

/* ==================== 工具函数 ==================== */
function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

const tankSolid   = (t) => t === T.BRICK || t === T.STEEL || t === T.WATER || t === T.BASE || t === T.RUBBLE;
const bulletSolid = (t) => t === T.BRICK || t === T.STEEL || t === T.BASE || t === T.RUBBLE;

// 返回矩形覆盖的所有地图格子
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

// 移动坦克，带网格吸附，返回是否移动成功
function moveTank(t, dir, dist) {
  t.dir = dir;
  const d = DIRS[dir];
  let nx = t.x + d.x * dist;
  let ny = t.y + d.y * dist;

  // 垂直移动时向最近的纵向网格线吸附，水平移动同理（便于穿过窄通道）
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
  // 吸附导致碰撞时，退化为只沿主轴移动
  const mx = t.x + d.x * dist;
  const my = t.y + d.y * dist;
  if (!tankCollides(t, mx, my)) {
    t.tread += dist;
    t.x = mx; t.y = my;
    return true;
  }
  return false;
}

function perpendiculars(dir) {
  return (dir === 'up' || dir === 'down') ? ['left', 'right'] : ['up', 'down'];
}

function spawnBullet(t, dir) {
  const d = DIRS[dir];
  const cx = t.x + TANK / 2;
  const cy = t.y + TANK / 2;
  game.bullets.push({
    x: cx + d.x * (TANK / 2) - BULLET / 2,
    y: cy + d.y * (TANK / 2) - BULLET / 2,
    dir,
    owner: t,
    isPlayer: t.isPlayer,
    speed: t.isPlayer ? 380 : 260,
    damage: t.isPlayer ? game.buffs.damage : 1,
    pierce: t.isPlayer && game.buffs.pierce,
    blast: t.isPlayer && game.buffs.blast,
    frost: t.isPlayer && game.buffs.frost,
    bounces: 0,
    maxBounces: BULLET_MAX_BOUNCES,
    life: BULLET_LIFE,
    hitSet: new Set(),  // 穿透弹已击中过的坦克
    dead: false,
  });
}

function shoot(t) {
  if (t.cooldown > 0 || !t.alive) return;
  const cap = t.isPlayer ? game.buffs.maxBullets : (t.type === 'boss' ? 6 : 1);
  if (game.bullets.filter((b) => b.owner === t && !b.dead).length >= cap) return;

  // BOSS 三向散射（正前方 + 两侧垂直方向）
  const dirs = t.type === 'boss' ? [t.dir, ...perpendiculars(t.dir)] : [t.dir];
  for (const dir of dirs) spawnBullet(t, dir);

  t.cooldown = t.isPlayer ? game.buffs.cooldown : 0.4;
  Sound.shoot();
}

function addExplosion(x, y, dur, r) {
  game.explosions.push({ x, y, t: 0, dur, r });
}

function addSpawnFlash(x, y) {
  game.flashes.push({ x, y, t: 0, dur: 0.5 });
}

/* ==================== 实体创建 ==================== */
function createPlayer() {
  return {
    x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y,
    dir: 'up', speed: game.buffs.speed,
    color: '#ffd23f', dark: '#a87e0b',
    isPlayer: true, alive: true,
    hp: 1, maxHp: 1,
    cooldown: 0, invincible: 2.5, tread: 0, slow: 0,
  };
}

function createEnemy(type, x, y) {
  const def = ENEMY_DEFS[type];
  const mod = LEVEL_MOD[game.level];
  // 第 4 关起，快速型与精英会双连发
  const burst = mod.burst > 1 && (type === 'fast' || type === 'elite') ? 2 : 1;
  return {
    x, y, dir: 'down',
    speed: def.speed * mod.speed,
    hp: def.hp, maxHp: def.hp,
    color: def.color, dark: def.dark, score: def.score,
    isPlayer: false, alive: true,
    cooldown: 0, invincible: 1, tread: 0, slow: 0,
    aiTimer: 0, fireTimer: 0.8 + Math.random(),
    burst, burstLeft: 0, burstDelay: 0,
    type,
  };
}

/* ==================== 关卡 ==================== */
const CHAR_TO_TILE = { '.': T.EMPTY, B: T.BRICK, S: T.STEEL, W: T.WATER, G: T.GRASS, E: T.BASE };

// 基地外壳（8 格）钢墙化
function reinforceBase() {
  const shell = [[13, 6], [13, 7], [13, 8], [13, 9], [14, 6], [15, 6], [14, 9], [15, 9]];
  for (const [r, c] of shell) game.grid[r][c] = T.STEEL;
}

function loadLevel(idx) {
  game.grid = LEVELS[idx].map((row) => [...row].map((ch) => CHAR_TO_TILE[ch]));
  if (game.buffs.armor) reinforceBase();
  game.enemies = [];
  game.bullets = [];
  game.explosions = [];
  game.flashes = [];
  game.spawnQueue = [...LEVEL_COMP[idx]];
  game.spawnTimer = 1.2;
  game.baseAlive = true;
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
  } else {
    p.alive = false;
    gameOver('你的坦克被击毁了！');
  }
}

/* ==================== 伤害与爆炸 ==================== */
function damageTank(t, dmg) {
  t.hp -= dmg;
  if (t.hp <= 0) {
    t.alive = false;
    game.score += t.score;
    addExplosion(t.x + TANK / 2, t.y + TANK / 2, t.type === 'boss' ? 0.7 : 0.4, t.type === 'boss' ? 44 : 26);
    Sound.explode();
  } else {
    Sound.hitWall();
  }
}

// 爆破弹：摧毁 3x3 砖墙并波及范围内坦克（发射者与直接命中目标除外）
function blastAt(x, y, owner, exclude) {
  addExplosion(x, y, 0.35, 36);
  Sound.explode();
  const c0 = Math.floor(x / TILE);
  const r0 = Math.floor(y / TILE);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && game.grid[r][c] === T.BRICK) {
        game.grid[r][c] = T.EMPTY;
      }
    }
  }
  for (const t of allTanks()) {
    if (!t.alive || t === owner || t === exclude || t.invincible > 0) continue;
    const cx = t.x + TANK / 2;
    const cy = t.y + TANK / 2;
    if (Math.hypot(cx - x, cy - y) <= 60) {
      if (t.isPlayer) killPlayer();
      else damageTank(t, 1);
    }
  }
}

/* ==================== 敌人 AI ==================== */
function pickDir(e) {
  const r = Math.random();
  if (r < 0.3) return 'down';
  if (r < 0.5) {
    // 朝玩家或基地的大致方向推进
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

// 朝玩家方向瞄准（按差距较大的轴）
function aimedDir(e) {
  const p = game.player;
  if (!p || !p.alive) return e.dir;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function fireEnemy(e) {
  const mod = LEVEL_MOD[game.level];
  if (e.type !== 'boss' && Math.random() < mod.aim) e.dir = aimedDir(e);
  shoot(e);
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (!e.alive) continue;
    e.cooldown -= dt;
    e.invincible -= dt;
    e.aiTimer -= dt;
    e.fireTimer -= dt;
    e.slow = Math.max(0, e.slow - dt);

    if (e.aiTimer <= 0) {
      e.dir = pickDir(e);
      e.aiTimer = 1 + Math.random() * 2;
    }
    const speed = e.speed * (e.slow > 0 ? 0.5 : 1);
    if (!moveTank(e, e.dir, speed * dt)) {
      e.dir = pickDir(e);
      e.aiTimer = 1 + Math.random() * 1.5;
    }
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
    game.spawnTimer = 2.2;
    return;
  }
  game.spawnTimer = 0.6; // 出生点全被堵住，稍后再试
}

/* ==================== 子弹 ==================== */
function setBulletDir(b, dir) {
  if (b.dir === dir) return;
  b.dir = dir;
  b.bounces += 1;
  if (b.bounces > b.maxBounces) {
    b.dead = true;
    addExplosion(b.x + BULLET / 2, b.y + BULLET / 2, 0.2, 8);
  }
}

function updateBullets(dt) {
  for (const b of game.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) {
      b.dead = true;
      addExplosion(b.x + BULLET / 2, b.y + BULLET / 2, 0.2, 8);
      continue;
    }
    const d = DIRS[b.dir];
    b.x += d.x * b.speed * dt;
    b.y += d.y * b.speed * dt;

    // 边界反弹
    if (b.x < 0) { b.x = 0; setBulletDir(b, 'right'); }
    else if (b.x + BULLET > GAME_W) { b.x = GAME_W - BULLET; setBulletDir(b, 'left'); }
    if (b.y < 0) { b.y = 0; setBulletDir(b, 'down'); }
    else if (b.y + BULLET > GAME_H) { b.y = GAME_H - BULLET; setBulletDir(b, 'up'); }
    if (b.dead) continue;

    // 命中地形：砖墙被击破，子弹反弹
    const hits = rectTiles(b.x, b.y, BULLET).filter((h) => bulletSolid(h.t));
    if (hits.length) {
      let broke = false;
      let hitBase = false;
      for (const h of hits) {
        if (h.t === T.BRICK) {
          game.grid[h.r][h.c] = T.EMPTY;
          broke = true;
        } else if (h.t === T.BASE || h.t === T.RUBBLE) {
          hitBase = true;
        }
      }
      if (hitBase) {
        b.dead = true;
        destroyBase();
        continue;
      }
      if (b.blast) blastAt(b.x + BULLET / 2, b.y + BULLET / 2, b.owner, null);
      // 推出墙体并反向
      const h0 = hits[0];
      if (b.dir === 'right') { b.x = h0.c * TILE - BULLET; setBulletDir(b, 'left'); }
      else if (b.dir === 'left') { b.x = (h0.c + 1) * TILE; setBulletDir(b, 'right'); }
      else if (b.dir === 'down') { b.y = h0.r * TILE - BULLET; setBulletDir(b, 'up'); }
      else { b.y = (h0.r + 1) * TILE; setBulletDir(b, 'down'); }
      if (b.dead) continue;
      addExplosion(b.x + BULLET / 2, b.y + BULLET / 2, 0.12, 7);
      if (broke) Sound.hitWall();
      else Sound.clank();
      continue;
    }

    // 命中坦克（不会击中发射者自己；敌人之间会误伤）
    for (const t of allTanks()) {
      if (!t.alive || t === b.owner || b.hitSet.has(t) || t.invincible > 0) continue;
      if (!overlap(b.x, b.y, BULLET, BULLET, t.x, t.y, TANK, TANK)) continue;
      const cx = b.x + BULLET / 2;
      const cy = b.y + BULLET / 2;
      if (t.isPlayer) {
        b.dead = true;
        killPlayer();
      } else {
        damageTank(t, b.damage);
        if (b.frost && t.alive) t.slow = 3;
        if (b.blast) blastAt(cx, cy, b.owner, t);
        if (b.pierce && !b.dead) b.hitSet.add(t);
        else b.dead = true;
      }
      addExplosion(cx, cy, 0.15, 9);
      break;
    }
    if (b.dead) continue;

    // 敌我子弹对撞抵消
    for (const o of game.bullets) {
      if (o.dead || o === b || o.isPlayer === b.isPlayer) continue;
      if (overlap(b.x, b.y, BULLET, BULLET, o.x, o.y, BULLET, BULLET)) {
        b.dead = true;
        o.dead = true;
        addExplosion((b.x + o.x) / 2, (b.y + o.y) / 2, 0.15, 9);
        break;
      }
    }
  }
  game.bullets = game.bullets.filter((b) => !b.dead);
}

/* ==================== 特效 ==================== */
function updateEffects(dt) {
  for (const ex of game.explosions) ex.t += dt;
  game.explosions = game.explosions.filter((ex) => ex.t < ex.dur);
  for (const f of game.flashes) f.t += dt;
  game.flashes = game.flashes.filter((f) => f.t < f.dur);
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

/* ==================== 主更新 ==================== */
const Input = {
  stack: [],
  fire: false,
  desiredDir() {
    return this.stack[this.stack.length - 1] || null;
  },
};

function update(dt) {
  game.time += dt;

  const p = game.player;
  if (p && p.alive) {
    p.cooldown -= dt;
    p.invincible -= dt;
    const dir = Input.desiredDir();
    if (dir) moveTank(p, dir, p.speed * dt);
    if (Input.fire) shoot(p);
  }

  updateEnemies(dt);
  updateSpawning(dt);
  updateBullets(dt);
  updateEffects(dt);

  // 过关判定
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
      } else if (t === T.GRASS) {
        drawGrass(x, y);
      }
    }
  }
}

function drawTank(t) {
  if (!t.alive) return;
  const cx = t.x + TANK / 2;
  const cy = t.y + TANK / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(DIRS[t.dir].angle);

  // 履带
  ctx.fillStyle = t.dark;
  ctx.fillRect(-18, -18, 9, 36);
  ctx.fillRect(9, -18, 9, 36);
  // 履带纹理（随移动滚动）
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  const off = t.tread % 6;
  for (let yy = -18 + off; yy < 18; yy += 6) {
    ctx.fillRect(-18, yy, 9, 2);
    ctx.fillRect(9, yy, 9, 2);
  }
  // 车身
  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.roundRect(-11, -14, 22, 28, 4);
  ctx.fill();
  // 炮塔
  ctx.fillStyle = t.dark;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  // 炮管
  ctx.fillRect(-2.5, -19, 5, 13);
  // BOSS 标记
  if (t.type === 'boss') drawStar(0, 3, 5, 6, 2.6, '#ffd23f');

  ctx.restore();

  // 多血坦克血条
  if (t.maxHp > 1) {
    const w = 30;
    const ratio = t.hp / t.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, t.y - 9, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7cf29c' : ratio > 0.25 ? '#ffd23f' : '#ff6b6b';
    ctx.fillRect(cx - w / 2 + 1, t.y - 8, (w - 2) * ratio, 3);
  }
  // 被冰冻减速标记
  if (t.slow > 0) {
    ctx.strokeStyle = 'rgba(140,220,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 无敌护盾（闪烁光圈）
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
    ctx.arc(b.x + BULLET / 2, b.y + BULLET / 2, BULLET / 2 + 0.5, 0, Math.PI * 2);
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
  drawTiles(false);   // 砖/钢/水
  drawBase();
  drawBullets();
  if (game.player) drawTank(game.player);
  for (const e of game.enemies) drawTank(e);
  drawTiles(true);    // 草丛盖在坦克上方
  drawExplosions();
  drawFlashes();
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

/* ==================== 键盘输入 ==================== */
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
loadLevel(0); // 作为开始界面背景
updateHUD();
showOverlay(`
  <h1>坦克大战</h1>
  <p>🎮 方向键 / WASD 移动　🚀 空格射击</p>
  <p>🎱 炮弹会在墙壁间反弹，直到击中坦克！</p>
  <p>🎁 每关通过后可三选一强化，共 5 关，最终 BOSS 等着你！</p>
  <p class="blink">按 Enter 开始游戏</p>
`);
requestAnimationFrame(loop);
