// 파이썬 main.py 를 옮긴 것 + 터치 조작(조이스틱/버튼), 시작 화면, 일시정지

const STAGE_CLEAR_TIME = 3.0;   // 황금 딸기를 먹고 다음 스테이지로 넘어가기까지 (초)
const STEP = 1 / FPS;           // 파이썬과 같은 속도로: 화면 주사율과 상관없이 1초에 60번 갱신
const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

const TEXT = {
  hud: "{stage}스테이지   코인 {score}",
  help: "← → 이동   Space 점프   ↑ 롱점프   R 재시작   P 일시정지",
  stage_in: "{stage} 스테이지",
  stage_clear: "황금 딸기 획득! 다음 스테이지로!",
  clear: "모든 스테이지 클리어!",
  boss_fire: "불꽃 대왕",
  boss_thunder: "번개 대왕",
  boss_eagle: "폭풍 독수리",
  boss_dragon: "마왕 드래곤",
  boss_giant: "???",
  boss_in: "{name} 등장!",
  over: "게임 오버",
  again_key: "R 키로 다시 시작",
  again_touch: "화면을 터치하면 다시 시작",
  star: "불사 {t}초",
};
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

function blitText(ctx, size, text, pos = null, center = null) {
  // 그림자 + 흰 글씨
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = center ? "center" : "left";
  ctx.textBaseline = center ? "middle" : "top";
  const [x, y] = center || pos;
  ctx.fillStyle = css(BLACK);
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = css(WHITE);
  ctx.fillText(text, x, y);
}

class Game {
  constructor(startStage = 0) {
    this.startStage = startStage;   // 다시 시작할 때도 이 스테이지부터
    this.reset();
  }

  reset() {
    // 처음부터 (시작 스테이지, 목숨/코인 초기화)
    this.lives = LIVES;
    this.score = 0;
    this.loadStage(this.startStage);
  }

  loadStage(index) {
    // 목숨과 코인은 다음 스테이지로 이어짐
    this.stageI = index;
    this.stage = STAGES[index];
    this.level = new Level(this.stage);
    const sp = this.level.spawns;
    this.enemies = [
      ...sp.E.map(([x, y]) => new Enemy(x, y)),
      ...sp.D.map(([x, y]) => new FireBreather(x, y)),
      ...sp.Z.map(([x, y]) => new ZapEnemy(x, y)),
      ...sp.V.map(([x, y]) => new BirdEnemy(x, y)),
      ...sp.J.map(([x, y]) => new HopEnemy(x, y)),
      ...sp.R.map(([x, y]) => new WyrmEnemy(x, y)),
    ];
    this.fireballs = [];
    this.state = "play";      // play / stage_clear / clear / over
    this.stateTimer = 0;
    this.cameraX = 0;
    this.star = 0;            // 딸기 불사 남은 시간 (초)
    this.boss = null;
    this.bossShots = [];      // 보스 공격 (맞으면 목숨 -1)
    this.shake = 0;
    this.banner = 2.0;        // 큰 글씨 표시 시간
    this.bannerText = fmt(TEXT.stage_in, { stage: this.stage.name });
    this.spawnPlayer();
  }

  spawnPlayer() {
    this.player = new Player(...this.level.playerStart);
    this.invincible = 1.5;    // 리스폰 직후 잠깐 무적 (초)
  }

  hurt(direction, loseLife = true) {
    // 몬스터에 맞음: 목숨 -1 + direction 쪽으로 4타일 밀려남
    // 불뿜는 괴물/불덩이는 loseLife=false: 목숨은 그대로, 밀려나기만
    if (loseLife) {
      this.lives -= 1;
      if (this.lives <= 0) { this.state = "over"; return; }
    }
    this.player.knockBack(direction);
    this.invincible = HIT_INVINCIBLE;
  }

  die() {
    this.lives -= 1;
    if (this.lives <= 0) this.state = "over";
    else this.spawnPlayer();
  }

  awayFrom(x) { return this.player.rect.centerx < x ? -1 : 1; }

  // ---------- 입력 ----------
  jumpPress() { if (this.state === "play") this.player.jump(); }
  jumpRelease() { if (this.state === "play") this.player.cutJump(); }
  longJumpPress() { if (this.state === "play") this.player.longJump(); }

  // ---------- 갱신 ----------
  update(dt, move) {
    this.level.update(dt);
    this.banner = Math.max(0, this.banner - dt);
    this.shake = Math.max(0, this.shake - dt);

    if (this.state === "stage_clear") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.loadStage(this.stageI + 1);
      return;
    }
    if (this.state !== "play") return;

    const p = this.player, lv = this.level;
    p.update(move, lv.tiles, dt);
    // 스테이지 밖으로 못 나가게
    p.rect.left = Math.max(p.rect.left, 0);
    p.rect.right = Math.min(p.rect.right, lv.width);
    // 보스전 중에는 보스 방 밖으로 못 나감 (높이 튀어 올라 문 위로 넘어가는 것도 막음)
    if (this.boss) p.rect.left = Math.max(p.rect.left, lv.gateX + TILE);

    for (const e of this.enemies) e.update(lv.tiles, dt, p.rect, this.fireballs);
    // 낭떠러지로 떨어진 몬스터는 없앰
    this.enemies = this.enemies.filter(e => e.rect.top < lv.height);
    this.fireballs = this.fireballs.filter(f => f.update(lv.tiles, dt));

    this.invincible = Math.max(0, this.invincible - dt);
    this.star = Math.max(0, this.star - dt);

    // 카메라: 플레이어를 화면 40% 지점에 두고 따라감 (보스전 중에는 보스 방 고정)
    if (this.boss) {
      const lock = lv.width - WIDTH;
      this.cameraX += (lock - this.cameraX) * 0.12;
    } else {
      this.cameraX = clamp(p.rect.centerx - WIDTH * 0.4, 0, lv.width - WIDTH);
    }

    this.updateBoss(dt);
    if (this.state !== "play") return;

    // 코인
    lv.coins = lv.coins.filter(c => {
      if (p.rect.colliderect(c)) { this.score += 1; return false; }
      return true;
    });
    // 하트: 목숨 +1
    lv.hearts = lv.hearts.filter(h => {
      if (p.rect.colliderect(h)) { this.lives += 1; return false; }
      return true;
    });

    // 황금 딸기: 보스를 이기면 나타남 → 다음 스테이지 (마지막이면 전체 클리어)
    if (lv.golden && p.rect.colliderect(lv.golden)) {
      lv.golden = null;
      if (this.stageI + 1 < STAGES.length) {
        this.state = "stage_clear";
        this.stateTimer = STAGE_CLEAR_TIME;
      } else {
        this.state = "clear";
      }
      return;
    }

    // 딸기: 30초 불사
    lv.berries = lv.berries.filter(b => {
      if (p.rect.colliderect(b)) { this.star = STAR_TIME; return false; }
      return true;
    });

    // 구덩이 추락
    if (p.rect.top > lv.height) { this.die(); return; }

    // 불사 중: 몬스터와 불덩이는 닿기만 해도 사라지고, 불/가시는 무시
    if (this.star > 0) {
      this.enemies = this.enemies.filter(e => !p.rect.colliderect(e.rect));
      this.fireballs = this.fireballs.filter(f => !p.rect.colliderect(f.rect));
      return;
    }
    if (this.invincible > 0) return;

    // 불 / 가시
    if (p.rect.collidelist(lv.hazards) !== -1) { this.die(); return; }

    // 몬스터: 위에서 떨어지며 닿으면 밟기, 아니면 피해
    for (const e of [...this.enemies]) {
      const zapping = e instanceof ZapEnemy && e.discharging;
      const hitBox = zapping ? e.dangerRect : e.rect;
      if (!p.rect.colliderect(hitBox)) continue;
      if (!zapping && p.vy > 0 && p.rect.bottom - e.rect.top < 16) {
        this.enemies.splice(this.enemies.indexOf(e), 1);
        p.bounce(STOMP_BOUNCE);
      } else {
        // 불뿜는 괴물은 닿아도 목숨이 안 닳고 밀려나기만, 전기 방출은 감전(-1)
        this.hurt(this.awayFrom(e.rect.centerx), !(e instanceof FireBreather));
        return;
      }
    }

    // 불덩이: 목숨은 안 닳고 날아온 방향으로 4타일 밀려남
    for (const f of this.fireballs) {
      if (p.rect.colliderect(f.rect)) {
        this.fireballs.splice(this.fireballs.indexOf(f), 1);
        this.hurt(f.dir, false);
        return;
      }
    }
  }

  updateBoss(dt) {
    const p = this.player, lv = this.level;

    // 보스 방에 들어서면 문이 닫히고 보스 등장
    if (!this.boss && lv.gateX !== null && p.rect.left > lv.gateX + TILE * 2) {
      lv.closeGate();
      this.enemies = [];    // 바깥 몬스터는 정리 (새 괴물이 날아 들어오지 않게)
      this.fireballs = [];
      const [gx, gy] = lv.bossSpawn;
      this.boss = new BOSSES[this.stage.boss](gx, gy, lv.gateX + TILE, lv.width);
      this.banner = 2.0;
      this.bannerText = fmt(TEXT.boss_in, { name: TEXT["boss_" + this.stage.boss] });
    }
    const b = this.boss;
    if (!b || b.dead) return;

    b.update(dt, p.rect, this.bossShots);
    this.bossShots = this.bossShots.filter(f => f.update(lv.tiles, dt));
    this.shake = Math.max(this.shake, b.shake);

    if (b.dead) {
      // 처치! 보스 방 가운데에 황금 딸기 등장
      this.bossShots = [];
      const cx = Math.floor((b.left + b.right) / 2);
      lv.golden = new Rect(cx - 24, b.groundY - 150, 48, 48);
      return;
    }

    const safe = this.star > 0 || this.invincible > 0;

    // 밟기: 위에서 떨어지며 머리에 닿으면 보스 체력 -1 (몸에 전기가 흐를 땐 감전)
    if (p.rect.colliderect(b.rect)) {
      if (p.vy > 0 && p.rect.bottom - b.rect.top < 30 && !b.electrified) {
        if (b.canBeHit) b.hit();
        p.rect.bottom = b.rect.top;
        p.bounce(BOSS_STOMP_BOUNCE);
        return;
      }
      if (b.harmful && !safe) {
        this.hurt(this.awayFrom(b.rect.centerx));
        return;
      }
    }
    if (safe) return;

    // 보스 공격 (불덩이, 충격파, 번개, 전기 구슬, 깃털, 슬라임): 목숨 -1 + 넉백
    for (const f of this.bossShots) {
      if (f.harmful && p.rect.colliderect(f.rect)) {
        // dir 이 0 인 공격(번개)은 맞은 위치에서 바깥쪽으로 밀려남
        this.hurt(f.dir || this.awayFrom(f.rect.centerx));
        if (!f.pierce) this.bossShots.splice(this.bossShots.indexOf(f), 1);
        return;
      }
    }

    // 바닥 전기: 땅에 서 있으면 감전 (발판 위나 공중은 안전)
    if (b.floorActive && p.onGround && p.rect.bottom >= b.groundY) this.hurt(this.awayFrom(b.rect.centerx));
  }

  // ---------- 그리기 ----------
  draw(ctx, touch) {
    // 화면 흔들림: 그리는 동안만 카메라를 살짝 어긋나게
    const realCamera = this.cameraX;
    if (this.shake > 0) this.cameraX += randint(-7, 7);
    this.cameraX = Math.round(this.cameraX);
    this.drawWorld(ctx);
    this.cameraX = realCamera;
    this.drawHud(ctx, touch);
  }

  drawWorld(ctx) {
    ctx.fillStyle = css(this.level.sky);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.level.draw(ctx, this.cameraX);
    for (const e of this.enemies) e.draw(ctx, this.cameraX);
    if (this.boss) this.boss.draw(ctx, this.cameraX);
    for (const f of [...this.fireballs, ...this.bossShots]) f.draw(ctx, this.cameraX, this.level.time);
    if (this.star > 0) this.drawStarGlow(ctx);
    // 무적 중에는 깜빡임 (딸기 불사 중에는 깜빡이지 않음)
    if (this.star > 0 || this.invincible <= 0 || int(this.invincible * 10) % 2 === 0) this.player.draw(ctx, this.cameraX);
  }

  drawHud(ctx, touch) {
    const hud = fmt(TEXT.hud, { stage: this.stage.name, score: this.score });
    // 목숨은 하트 아이콘으로 (많으면 보스 체력바와 겹치지 않게 "하트 ×숫자")
    if (this.lives <= 7) {
      for (let i = 0; i < this.lives; i++) drawHeart(ctx, [24 + i * 30, 26], 22);
    } else {
      drawHeart(ctx, [24, 26], 22);
      blitText(ctx, 22, `× ${this.lives}`, [42, 14]);
    }
    blitText(ctx, 22, hud, [12, 46]);
    if (this.star > 0) {
      drawStrawberry(ctx, [24, 92], 24);
      blitText(ctx, 22, fmt(TEXT.star, { t: int(this.star) + 1 }), [44, 81]);
    }
    if (!touch) blitText(ctx, 20, TEXT.help, [12, HEIGHT - 30]);

    const b = this.boss;
    if (b && !b.dead) {
      // 보스 체력바: 밟아야 할 남은 횟수만큼 칸이 채워짐
      blitText(ctx, 22, TEXT["boss_" + this.stage.boss], null, [WIDTH / 2, 22]);
      const total = b.MAX_HP;
      const seg = Math.min(44, Math.floor(380 / total)), gap = total <= 8 ? 6 : 3;   // 칸이 많으면 좁게
      const x0 = WIDTH / 2 - Math.floor((seg * total + gap * (total - 1)) / 2);
      const bar = { fire: [230, 60, 40], thunder: [250, 210, 40], eagle: [150, 120, 255],
        dragon: [200, 60, 160], giant: [230, 40, 60] }[this.stage.boss];
      for (let i = 0; i < total; i++) {
        const r = new Rect(x0 + i * (seg + gap), 40, seg, 14);
        draw.rect(ctx, BLACK, r.inflate(4, 4));
        draw.rect(ctx, i < b.hp ? bar : [70, 70, 70], r);
      }
    }
    if (this.banner > 0 && this.state === "play") blitText(ctx, 52, this.bannerText, null, [WIDTH / 2, HEIGHT / 2 - 80]);

    if (["stage_clear", "clear", "over"].includes(this.state)) {
      ctx.fillStyle = "rgba(0,0,0,0.47)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      blitText(ctx, 52, TEXT[this.state], null, [WIDTH / 2, HEIGHT / 2 - 30]);
      if (this.state === "stage_clear") {
        drawStrawberry(ctx, [WIDTH / 2, HEIGHT / 2 + 50], 48, GOLD, GOLD_SEED, GOLD_DARK);
      } else {
        blitText(ctx, 24, touch ? TEXT.again_touch : TEXT.again_key, null, [WIDTH / 2, HEIGHT / 2 + 30]);
      }
    }
  }

  drawStarGlow(ctx) {
    // 반짝이는 노란 후광. 끝나기 2초 전부터 빠르게 깜빡여서 곧 끝남을 알림
    if (this.star < 2 && int(this.star * 8) % 2) return;
    const t = this.level.time;
    const c = [this.player.rect.centerx - this.cameraX, this.player.rect.centery];
    const r = 30 + int(4 * Math.sin(t * 12));
    draw.circle(ctx, [...STAR_GLOW, 110], c, r);
    for (let i = 0; i < 6; i++) {
      const a = t * 4 + i * Math.PI / 3;
      draw.circle(ctx, WHITE, [c[0] + Math.cos(a) * (r + 4), c[1] + Math.sin(a) * (r + 4)], 3);
    }
  }
}

// ====================== 화면 / 입력 / 메뉴 ======================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  // 960x540 게임 화면을 비율 그대로 최대한 크게 (남는 곳은 검은 띠)
  const scale = Math.min(w / WIDTH, h / HEIGHT);
  view = { w, h, dpr, scale, ox: (w - WIDTH * scale) / 2, oy: (h - HEIGHT * scale) / 2 };
}
window.addEventListener("resize", resize);
resize();

// 화면 좌표(CSS px) → 게임 좌표(960x540)
const toGame = (x, y) => [(x - view.ox) / view.scale, (y - view.oy) / view.scale];

let touchMode = window.matchMedia("(pointer: coarse)").matches || location.search.includes("touch=1");
let mode = "title";      // title / game
let game = null;
let paused = false;
const params = new URLSearchParams(location.search);

// 시작 화면 / 일시정지 메뉴 버튼 (게임 좌표)
const titleButtons = [];
for (let i = 0; i < STAGES.length; i++) {
  titleButtons.push({ rect: new Rect(WIDTH / 2 - 190 + i * 80, 400, 60, 60), label: String(i + 1), stage: i });
}
const startButton = { rect: new Rect(WIDTH / 2 - 130, 280, 260, 64), label: "시작하기", stage: 0 };
const pauseButton = { rect: new Rect(WIDTH - 62, 10, 50, 50) };
const pauseMenu = [
  { rect: new Rect(WIDTH / 2 - 130, 220, 260, 64), label: "계속하기", act: () => { appFullscreen(); paused = false; } },
  { rect: new Rect(WIDTH / 2 - 130, 300, 260, 64), label: "다시 시작", act: () => { game.reset(); paused = false; } },
  { rect: new Rect(WIDTH / 2 - 130, 380, 260, 64), label: "처음 화면", act: () => { mode = "title"; paused = false; } },
];
const inRect = (r, [x, y]) => x >= r.x && x <= r.right && y >= r.y && y <= r.bottom;

// 홈 화면 아이콘(설치한 앱)으로 열었을 때만 전체화면. 브라우저에서 바로 할 때는 그대로 둠
const launchedAsApp = params.has("app")
  || window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches
  || navigator.standalone === true;

function appFullscreen() {
  if (!launchedAsApp) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: "hide" });
    if (p && p.catch) p.catch(() => {});
  } catch (err) { /* 안 되면 그냥 진행 */ }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

function startGame(stage) {
  appFullscreen();
  game = new Game(stage);
  mode = "game";
  paused = false;
}

// ----- 키보드 (파이썬 버전과 같음) -----
const keys = new Set();
window.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (mode === "title") {
    if (e.code === "Space" || e.code === "Enter") startGame(0);
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= STAGES.length) startGame(n - 1);
    return;
  }
  if (e.code === "KeyP" || e.code === "Escape") { paused = !paused; return; }
  if (paused) return;
  if (e.code === "KeyR") game.reset();
  else if (e.code === "ArrowUp") game.longJumpPress();
  else if (e.code === "Space" || e.code === "KeyW") game.jumpPress();
});
window.addEventListener("keyup", e => {
  keys.delete(e.code);
  if (mode === "game" && (e.code === "Space" || e.code === "KeyW")) game.jumpRelease();
});
window.addEventListener("blur", () => keys.clear());

// ----- 터치: 왼쪽은 떠다니는 조이스틱(브롤스타즈 방식), 오른쪽은 점프 / 롱점프 버튼 -----
const stick = { id: null, bx: 0, by: 0, kx: 0, ky: 0 };   // 조이스틱 중심(b)과 손잡이(k), 화면 좌표
const jumpTouch = { id: null };
let longPressedAt = -1;

function controlSizes() {
  const R = Math.min(view.h * 0.17, 75);             // 조이스틱 반지름
  const B = Math.min(view.h * 0.13, 58);             // 점프 버튼 반지름
  return {
    R,
    home: [R * 1.7, view.h - R * 1.7],               // 손을 안 댔을 때 조이스틱 자리
    jump: { x: view.w - B * 1.6, y: view.h - B * 1.6, r: B },
    long: { x: view.w - B * 3.9, y: view.h - B * 1.25, r: B * 0.8 },
  };
}

function stickMove() {
  // 손잡이가 가로로 충분히 밀렸을 때만 이동 (살짝 닿은 건 무시)
  if (stick.id === null) return 0;
  const dx = (stick.kx - stick.bx) / controlSizes().R;
  return dx < -0.3 ? -1 : dx > 0.3 ? 1 : 0;
}

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  if (e.pointerType === "touch") touchMode = true;
  const g = toGame(e.clientX, e.clientY);

  if (mode === "title") {
    for (const b of [startButton, ...titleButtons]) if (inRect(b.rect, g)) startGame(b.stage);
    return;
  }
  if (paused) {
    for (const b of pauseMenu) if (inRect(b.rect, g)) b.act();
    return;
  }
  if (inRect(pauseButton.rect.inflate(16, 16), g)) { paused = true; return; }
  if (game.state === "over" || game.state === "clear") { game.reset(); return; }

  const c = controlSizes();
  if (e.clientX < view.w * 0.45) {
    // 조이스틱: 처음 닿은 자리에 생김
    if (stick.id === null) {
      stick.id = e.pointerId;
      stick.bx = clamp(e.clientX, c.R, view.w * 0.45);
      stick.by = clamp(e.clientY, c.R, view.h - c.R);
      stick.kx = e.clientX; stick.ky = e.clientY;
    }
  } else {
    // 롱점프 버튼(넉넉하게) 아니면 오른쪽 어디를 눌러도 점프
    if (hypot(e.clientX - c.long.x, e.clientY - c.long.y) < c.long.r * 1.3) {
      game.longJumpPress();
      longPressedAt = performance.now();
    } else if (jumpTouch.id === null) {
      jumpTouch.id = e.pointerId;
      game.jumpPress();
    }
  }
}, { passive: false });

canvas.addEventListener("pointermove", e => {
  if (e.pointerId !== stick.id) return;
  e.preventDefault();
  const R = controlSizes().R;
  stick.kx = e.clientX; stick.ky = e.clientY;
  // 손가락이 원 밖으로 나가면 조이스틱이 따라옴
  const dx = stick.kx - stick.bx, dy = stick.ky - stick.by;
  const d = hypot(dx, dy);
  if (d > R) {
    stick.bx = stick.kx - dx / d * R;
    stick.by = stick.ky - dy / d * R;
  }
}, { passive: false });

function pointerEnd(e) {
  if (e.pointerId === stick.id) stick.id = null;
  if (e.pointerId === jumpTouch.id) {
    jumpTouch.id = null;
    if (mode === "game" && !paused) game.jumpRelease();
  }
}
canvas.addEventListener("pointerup", pointerEnd);
canvas.addEventListener("pointercancel", pointerEnd);
// iOS: 두 번 탭 확대, 길게 눌러 메뉴, 스크롤 막기
document.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
document.addEventListener("contextmenu", e => e.preventDefault());
// 다른 앱으로 가면 자동 일시정지
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "game" && game.state === "play") paused = true;
  stick.id = null; jumpTouch.id = null;
});

// ----- 그리기: 메뉴 / 조작 버튼 -----
function drawButton(b, highlight = false) {
  const r = b.rect;
  ctx.fillStyle = highlight ? "rgba(60,200,80,0.95)" : "rgba(255,255,255,0.9)";
  ctx.strokeStyle = css(SLIME_DARK);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 14);
  ctx.fill(); ctx.stroke();
  ctx.font = `bold ${Math.min(30, r.h * 0.45)}px ${FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = highlight ? "#fff" : css(SLIME_DARK);
  ctx.fillText(b.label, r.centerx, r.centery + 1);
}

const titleSlime = new Player(0, 0);
titleSlime.onGround = true;

function drawTitle(t) {
  ctx.fillStyle = css(SKY);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = css(GROUND);
  ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);
  ctx.fillStyle = css(GROUND_TOP);
  ctx.fillRect(0, HEIGHT - 50, WIDTH, 10);
  // 통통 뛰는 큰 슬라임
  titleSlime.time = t;
  const hop = Math.abs(Math.sin(t * 3));
  titleSlime.squash = hop < 0.15 ? 0.75 : 1.0 + hop * 0.15;
  titleSlime.rect.midbottom = [WIDTH / 2 / 3, 250 / 3 - hop * 18];
  ctx.save();
  ctx.scale(3, 3);
  titleSlime.draw(ctx, 0);
  ctx.restore();
  blitText(ctx, 64, "슬라임 점프", null, [WIDTH / 2, 70]);
  drawButton(startButton, true);
  blitText(ctx, 22, "스테이지 선택", null, [WIDTH / 2, 378]);
  for (const b of titleButtons) drawButton(b);
  if (!touchMode) blitText(ctx, 18, "Space: 시작   1~5: 스테이지 선택", null, [WIDTH / 2, HEIGHT - 22]);
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  blitText(ctx, 52, "일시정지", null, [WIDTH / 2, 150]);
  pauseMenu.forEach((b, i) => drawButton(b, i === 0));
}

function drawPauseIcon() {
  const r = pauseButton.rect;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(r.x + 15, r.y + 13, 7, 24);
  ctx.fillRect(r.x + 28, r.y + 13, 7, 24);
}

function drawControls() {
  // 화면 좌표로 그림 (게임 화면 비율과 상관없이 손가락 크기에 맞게)
  const c = controlSizes();
  const active = stick.id !== null;
  const [bx, by] = active ? [stick.bx, stick.by] : c.home;
  let kx = bx, ky = by;
  if (active) {
    const dx = stick.kx - bx, dy = stick.ky - by, d = hypot(dx, dy);
    const k = d > c.R ? c.R / d : 1;
    kx = bx + dx * k; ky = by + dy * k;
  }
  ctx.globalAlpha = active ? 1 : 0.35;   // 손을 안 댔을 땐 흐리게 (슬라임이 가려지지 않게)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx, by, c.R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 좌우 화살표
  const move = stickMove();
  for (const side of [-1, 1]) {
    ctx.fillStyle = move === side ? "rgba(120,255,140,0.95)" : "rgba(255,255,255,0.6)";
    const ax = bx + side * c.R * 0.72;
    ctx.beginPath();
    ctx.moveTo(ax + side * 12, by);
    ctx.lineTo(ax - side * 6, by - 13);
    ctx.lineTo(ax - side * 6, by + 13);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.arc(kx, ky, c.R * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // 점프 / 롱점프 버튼
  const longOn = performance.now() - longPressedAt < 150;
  const btns = [[c.jump, "점프", jumpTouch.id !== null], [c.long, "롱점프", longOn]];
  for (const [b, label, on] of btns) {
    ctx.fillStyle = on ? "rgba(60,200,80,0.8)" : "rgba(0,0,0,0.3)";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 위 화살표 (롱점프는 두 개)
    ctx.fillStyle = "#fff";
    const n = label === "점프" ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const ay = b.y - b.r * 0.32 - i * b.r * 0.22;
      ctx.beginPath();
      ctx.moveTo(b.x, ay - b.r * 0.2);
      ctx.lineTo(b.x - b.r * 0.22, ay + b.r * 0.05);
      ctx.lineTo(b.x + b.r * 0.22, ay + b.r * 0.05);
      ctx.closePath(); ctx.fill();
    }
    ctx.font = `bold ${Math.round(b.r * 0.36)}px ${FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, b.x, b.y + b.r * 0.3);
  }
}

function drawRotateHint() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = "#1c2833";
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `48px ${FONT}`;
  ctx.fillText("📱↻", view.w / 2, view.h / 2 - 40);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("화면을 가로로 돌려주세요", view.w / 2, view.h / 2 + 20);
}

// ----- 메인 루프 -----
let last = performance.now();
let acc = 0;
let clock = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.1, (now - last) / 1000);   // 오래 멈췄다 돌아와도 한꺼번에 몰아서 움직이지 않게
  last = now;
  const portrait = touchMode && view.h > view.w;

  if (mode === "game" && !paused && !portrait) {
    acc += elapsed;
    while (acc >= STEP) {
      let move = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) move -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) move += 1;
      move = clamp(move + stickMove(), -1, 1);
      game.update(STEP, move);
      acc -= STEP;
    }
  } else {
    acc = 0;
  }
  clock += elapsed;

  if (portrait) { drawRotateHint(); return; }

  // 바깥(검은 띠)
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, view.w, view.h);
  // 게임 화면 (960x540 좌표계)
  const s = view.scale * view.dpr;
  ctx.setTransform(s, 0, 0, s, view.ox * view.dpr, view.oy * view.dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, WIDTH, HEIGHT); ctx.clip();
  if (mode === "title") {
    drawTitle(clock);
  } else {
    game.draw(ctx, touchMode);
    drawPauseIcon();
    if (paused) drawPause();
  }
  ctx.restore();
  // 터치 조작 버튼 (화면 좌표계)
  if (mode === "game" && touchMode && !paused && game.state === "play") {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawControls();
  }
}

// 주소 뒤에 ?stage=5 를 붙이면 그 스테이지부터 바로 시작
if (params.has("stage")) {
  const n = clamp(parseInt(params.get("stage"), 10) || 1, 1, STAGES.length);
  startGame(n - 1);
}
requestAnimationFrame(frame);
