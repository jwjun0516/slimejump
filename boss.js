// 파이썬 boss.py 를 옮긴 것

// ====================== 보스 공격 (모두 맞으면 목숨 -1 + 넉백) ======================
// 공통: update(tiles, dt) -> 계속 남아있으면 true, rect, dir(넉백 방향, 0이면 맞은 위치 기준),
//       harmful(지금 맞으면 아픈지), draw(ctx, cameraX, time)

class Shockwave {
  // 불꽃 대왕이 착지할 때 바닥을 타고 퍼지는 불길
  static W = 30;
  static H = 26;

  constructor(x, groundY, direction, speed, left, right) {
    this.W = Shockwave.W; this.H = Shockwave.H;
    this.rect = new Rect(0, 0, this.W, this.H);
    this.rect.midbottom = [x, groundY];
    this.x = this.rect.x;
    this.dir = direction;
    this.speed = speed;
    this.left = left; this.right = right;
    this.harmful = true;
    this.pierce = true;   // 맞아도 사라지지 않음
  }

  update(tiles, dt) {
    this.x += this.dir * this.speed;
    this.rect.x = round(this.x);
    return this.left <= this.rect.centerx && this.rect.centerx <= this.right;
  }

  draw(ctx, cameraX, time) {
    const r = this.rect.move(-cameraX, 0);
    for (let i = 0; i < 3; i++) {
      const h = this.H * (0.6 + 0.4 * Math.abs(Math.sin(time * 20 + i * 2 + this.x * 0.05)));
      const x0 = r.x + i * 10;
      draw.polygon(ctx, FIRE_OUT, [[x0, r.bottom], [x0 + 12, r.bottom], [x0 + 6, r.bottom - h]]);
      draw.polygon(ctx, FIRE_IN, [[x0 + 3, r.bottom], [x0 + 9, r.bottom], [x0 + 6, r.bottom - h * 0.5]]);
    }
  }
}

class Bolt {
  // 하늘에서 떨어지는 번개. 먼저 바닥에 표시가 깜빡이고(예고), 잠시 뒤 내리친다.
  static W = 44;

  constructor(x, groundY, warn) {
    this.x = x;
    this.groundY = groundY;
    this.warn = warn;
    this.strike = BOLT_STRIKE;
    this.rect = new Rect(x - (Bolt.W >> 1), 0, Bolt.W, groundY);
    this.dir = 0;
    this.pierce = true;
  }

  get harmful() { return this.warn <= 0; }

  update(tiles, dt) {
    if (this.warn > 0) this.warn -= dt;
    else this.strike -= dt;
    return this.strike > 0;
  }

  draw(ctx, cameraX, time) {
    const x = this.x - cameraX;
    const g = this.groundY;
    if (this.warn > 0) {
      // 예고: 바닥 표시 + 희미한 세로선 (점점 빠르게 깜빡임)
      if (int(time * (8 + 12 * (1 - this.warn))) % 2 === 0) {
        draw.ellipse(ctx, ZAP, new Rect(x - 24, g - 8, 48, 14), 3);
        draw.line(ctx, SPARK, [x, 0], [x, g], 1);
      }
      return;
    }
    // 내리침: 굵은 번개 + 바닥 섬광
    draw.rect(ctx, [...SPARK, 60], new Rect(x - Bolt.W, 0, Bolt.W * 2, g));
    drawZigzag(ctx, ZAP, [x, 0], [x, g], 10, 14, 9, time * 25);
    drawZigzag(ctx, SPARK_CORE, [x, 0], [x, g], 10, 14, 3, time * 25);
    draw.ellipse(ctx, SPARK_CORE, new Rect(x - 30, g - 10, 60, 16));
  }
}

class Orb {
  // 바닥을 통통 튀며 굴러오는 전기 구슬. 점프로 넘어야 한다.
  constructor(pos, direction, speed, groundY, left, right) {
    [this.x, this.y] = pos;
    this.R = 14;
    this.dir = direction;
    this.vx = direction * speed;
    this.vy = -4.0;
    this.groundY = groundY;
    this.left = left; this.right = right;
    this.harmful = true;
  }

  get rect() { return new Rect(this.x - this.R, this.y - this.R, this.R * 2, this.R * 2); }

  update(tiles, dt) {
    this.vy += 0.4;
    this.x += this.vx;
    this.y += this.vy;
    if (this.y + this.R >= this.groundY) {
      this.y = this.groundY - this.R;
      this.vy = -8.5;
    }
    return this.left - this.R < this.x && this.x < this.right + this.R;
  }

  draw(ctx, cameraX, time) {
    const c = [this.x - cameraX, this.y];
    draw.circle(ctx, ZAP_DARK, c, this.R + 2);
    draw.circle(ctx, SPARK, c, this.R);
    draw.circle(ctx, SPARK_CORE, c, this.R >> 1);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + time * 8;
      const end = [c[0] + Math.cos(a) * (this.R + 8), c[1] + Math.sin(a) * (this.R + 8)];
      drawZigzag(ctx, ZAP, c, end, 3, 3, 2, time * 30 + i);
    }
  }
}

function drawXEyes(ctx, color, ex, ey, s, w) {
  draw.line(ctx, color, [ex - s, ey - s], [ex + s, ey + s], w);
  draw.line(ctx, color, [ex - s, ey + s], [ex + s, ey - s], w);
}

// ====================== 보스 공통 ======================

class Boss {
  // 등장 → 포효 → (걷기 → 공격 패턴) 반복. 공격 패턴은 하위 클래스가 정한다.
  static W = 120;
  static H = 110;
  static MAX_HP = BOSS_HP;
  static PATTERNS = [];
  static WINDUP = {};          // 패턴별 예고 시간 (초)
  static AFTER_STUN = "walk";  // 어지러움이 끝나면 할 행동

  constructor(x, groundY, arenaLeft, arenaRight) {
    const C = this.constructor;
    this.W = C.W; this.H = C.H; this.MAX_HP = C.MAX_HP;
    this.PATTERNS = C.PATTERNS; this.WINDUP = C.WINDUP; this.AFTER_STUN = C.AFTER_STUN;
    this.rect = new Rect(0, 0, this.W, this.H);
    this.rect.midbottom = [x, -20];        // 하늘에서 떨어지며 등장
    this.groundY = groundY;
    this.left = arenaLeft; this.right = arenaRight;
    this.hp = this.MAX_HP;
    this.state = "intro";
    this.timer = 0;
    this.vx = 0;
    this.vy = 0;
    this.face = -1;
    this.hurtTimer = 0;
    this.patternI = 0;
    this.time = 0;
    this.shake = 0;                        // 게임이 읽어서 화면을 흔든다
    this.dead = false;
  }

  get power() {
    // 남은 체력 비율이 줄수록 빨라짐
    const ratio = this.hp / this.MAX_HP;
    if (ratio >= 0.7) return 1.0;
    if (ratio >= 0.3) return 1.3;
    return 1.6;
  }

  get enraged() {
    // 남은 체력이 1/5 이하면 분노
    return this.hp <= Math.max(1, Math.floor(this.MAX_HP / 5));
  }

  get canBeHit() { return this.hurtTimer <= 0 && this.state !== "intro" && this.state !== "dying"; }
  get harmful() { return this.state !== "intro" && this.state !== "dying"; }
  get electrified() { return false; }   // true 면 밟아도 보스가 아니라 플레이어가 다침
  get floorActive() { return false; }

  hit() {
    this.hp -= 1;
    this.hurtTimer = BOSS_HIT_INVINCIBLE;
    this.shake = 0.3;
    if (this.hp <= 0) {
      this.go("dying", 1.8);
      this.vx = 0;
    }
  }

  go(state, timer) { this.state = state; this.timer = timer; }

  update(dt, playerRect, shots) {
    this.time += dt;
    this.timer -= dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.shake = Math.max(0, this.shake - dt);
    const m = this.power;
    const toward = playerRect.centerx < this.rect.centerx ? -1 : 1;
    const s = this.state;

    if (s === "intro") {
      this.vy += GRAVITY;
      this.rect.y += round(this.vy);
      if (this.rect.bottom >= this.groundY) {
        this.rect.bottom = this.groundY;
        this.vy = 0;
        this.shake = 0.6;
        this.go("roar", 1.0);
      }
    } else if (s === "roar") {
      this.face = toward;
      if (this.timer <= 0) this.go("walk", 1.0);
    } else if (s === "walk") {
      this.face = toward;
      this.walk(playerRect, toward, m);
      if (this.timer <= 0) {
        this.vx = 0;
        const p = this.PATTERNS[this.patternI % this.PATTERNS.length];
        this.patternI += 1;
        this.go(p + "_wind", this.WINDUP[p] / m);
      }
    } else if (s === "stunned") {
      if (this.timer <= 0) this.go(this.AFTER_STUN, 0.8);
    } else if (s === "recover") {
      if (this.timer <= 0) this.go("walk", 1.0 / m);
    } else if (s === "dying") {
      this.shake = 0.1;
      if (this.timer <= 0) this.dead = true;
    } else {
      this.updatePattern(s, playerRect, shots, toward, m);
    }

    // 가로 이동 + 경기장 밖으로 못 나감
    this.rect.x += round(this.vx);
    this.rect.left = Math.max(this.rect.left, this.left);
    this.rect.right = Math.min(this.rect.right, this.right);
  }

  walk(playerRect, toward, m) {
    // 기본: 땅에서 플레이어 쪽으로 걸어감
    this.vx = toward * BOSS_WALK_SPEED * m;
  }

  updatePattern() {}

  draw(ctx, cameraX) {
    if (this.dead) return;
    this.drawEffects(ctx, cameraX);
    // 맞은 직후 / 죽는 중에는 깜빡임
    if ((this.hurtTimer > 0 || this.state === "dying") && int(this.time * 16) % 2) return;
    const r = this.rect.move(-cameraX, 0);
    this.drawBody(ctx, r, this.face, this.state);
    if (this.state === "stunned") this.drawDizzy(ctx, r);
  }

  drawEffects() {}

  squashFor(s) {
    // 예고 동작: 웅크림 / 부풀기
    if (s.endsWith("_wind")) return 0.85 + 0.03 * Math.sin(this.time * 40);
    if (s === "slam_air") return 1.12;
    if (s === "walk") return 1.0 + 0.03 * Math.sin(this.time * 8);
    return 1.0;
  }

  bodyRect(r, s) {
    const q = this.squashFor(s);
    const body = new Rect(0, 0, int(r.width / q), int(r.height * q));
    body.midbottom = r.midbottom;
    return body;
  }

  drawEyes(ctx, body, d, s, brow = true) {
    for (const ox of [6, 30]) {
      const ex = body.centerx + d * ox, ey = body.y + 36;
      if (s === "stunned") { drawXEyes(ctx, BLACK, ex, ey, 6, 4); continue; }
      draw.circle(ctx, WHITE, [ex, ey], 10);
      draw.circle(ctx, BLACK, [ex + d * 3, ey + 1], 5);
      if (brow) {
        const tilt = ox === 6 ? 5 : -5;
        draw.line(ctx, BLACK, [ex - 11, ey - 16 - tilt * d], [ex + 11, ey - 16 + tilt * d], 4);
      }
    }
  }

  drawDizzy(ctx, r) {
    for (let i = 0; i < 3; i++) {
      const a = this.time * 5 + i * 2.1;
      draw.circle(ctx, CROWN, [r.centerx + Math.cos(a) * 40, r.y - 30 + Math.sin(a) * 8], 5);
    }
  }
}

// ====================== 1스테이지: 불꽃 대왕 ======================

class FireBoss extends Boss {
  // 불덩이 연발 / 돌진(벽에 부딪히면 어지러움) / 점프 쿵(충격파)
  static PATTERNS = ["volley", "charge", "slam"];
  static WINDUP = { volley: 0.8, charge: 0.9, slam: 0.6 };

  constructor(...args) {
    super(...args);
    this.shotsLeft = [];
  }

  updatePattern(s, playerRect, shots, toward, m) {
    // 불덩이 연발: 낮은 불(점프로 피함) / 높은 불(서 있으면 안 맞음)
    if (s === "volley_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        const n = this.enraged ? 5 : 3;
        this.shotsLeft = [];
        for (let i = 0; i < n; i++) this.shotsLeft.push(choice(["low", "high"]));
        if (!this.shotsLeft.includes("low")) this.shotsLeft[0] = "low";
        this.go("volley", 0);
      }
    } else if (s === "volley") {
      if (this.timer <= 0) {
        if (!this.shotsLeft.length) {
          this.go("recover", 0.6);
        } else {
          const h = this.shotsLeft.shift();
          const y = this.groundY - (h === "low" ? 16 : 80);
          const mouthX = this.rect.centerx + this.face * (this.W >> 1);
          shots.push(new Fireball([mouthX, y], this.face, BOSS_FIREBALL_SPEED * m, 13));
          this.timer = 0.45 / m;
        }
      }
    // 돌진: 벽에 부딪히면 잠깐 어지러워함 (밟을 기회)
    } else if (s === "charge_wind") {
      this.face = toward;
      if (this.timer <= 0) this.go("charge", 0);
    } else if (s === "charge") {
      this.vx = this.face * BOSS_CHARGE_SPEED * m;
      if (this.rect.left <= this.left || this.rect.right >= this.right) {
        this.vx = 0;
        this.shake = 0.35;
        this.go("stunned", this.enraged ? 0.9 : 1.3);
      }
    // 점프 쿵: 플레이어 위치로 뛰어서 착지하면 양쪽으로 충격파
    } else if (s === "slam_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.vy = -15;
        const air = 2 * 15 / GRAVITY;
        this.vx = clamp((playerRect.centerx - this.rect.centerx) / air, -8, 8);
        this.go("slam_air", 0);
      }
    } else if (s === "slam_air") {
      this.vy += GRAVITY;
      this.rect.y += round(this.vy);
      if (this.vy > 0 && this.rect.bottom >= this.groundY) {
        this.rect.bottom = this.groundY;
        this.vx = this.vy = 0;
        this.shake = 0.4;
        for (const d of [-1, 1]) {
          shots.push(new Shockwave(this.rect.centerx + d * (this.W >> 1), this.groundY, d,
            BOSS_SHOCKWAVE_SPEED * m, this.left, this.right));
        }
        this.go("recover", 0.7);
      }
    }
  }

  drawBody(ctx, r, d, s) {
    const body = this.bodyRect(r, s);
    let color = BOSS;
    if (this.enraged && int(this.time * 6) % 2) color = [255, 80, 40];
    if (this.hurtTimer > 0) color = WHITE;

    // 등 지느러미
    for (let i = 0; i < 4; i++) {
      const x0 = body.centerx - d * (10 + i * 22);
      draw.polygon(ctx, BOSS_DARK, [[x0 - 12, body.y + 22], [x0 + 12, body.y + 22], [x0 - d * 6, body.y - 18]]);
    }
    draw.ellipse(ctx, BOSS_DARK, body.inflate(6, 6));
    draw.ellipse(ctx, color, body);
    const belly = new Rect(0, 0, body.width >> 1, body.height >> 1);
    belly.midbottom = [body.centerx + d * 8, body.bottom - 4];
    draw.ellipse(ctx, BOSS_BELLY, belly);
    for (const fx of [body.x + 14, body.right - 40]) draw.ellipse(ctx, BOSS_DARK, new Rect(fx, body.bottom - 14, 26, 14));

    // 왕관
    const cx = body.centerx - d * 4, top = body.y + 4;
    const crown = [[cx - 26, top], [cx - 26, top - 22], [cx - 13, top - 10], [cx, top - 28],
      [cx + 13, top - 10], [cx + 26, top - 22], [cx + 26, top]];
    draw.polygon(ctx, CROWN, crown);
    draw.polygon(ctx, BOSS_DARK, crown, 2);

    // 입: 불덩이 예고 때 노랗게 달아오름
    const mouth = new Rect(0, 0, 30, 20);
    mouth.center = [body.centerx + d * ((body.width >> 1) - 14), body.bottom - 34];
    const hot = s === "volley_wind" || s === "volley";
    draw.ellipse(ctx, hot ? FIRE_IN : BLACK, mouth);
    if (hot) draw.ellipse(ctx, FIRE_OUT, mouth, 3);

    this.drawEyes(ctx, body, d, s);
  }
}

// ====================== 2스테이지: 번개 대왕 ======================

class ThunderBoss extends Boss {
  // 번개 내리치기 / 전기 구슬 / 바닥 전기(발판으로 피함, 끝나면 지쳐서 멈춤)
  static PATTERNS = ["bolts", "orbs", "floor"];
  static WINDUP = { bolts: 0.7, orbs: 0.7, floor: FLOOR_WARN };

  constructor(...args) {
    super(...args);
    this.pending = [];
  }

  get floorActive() { return this.state === "floor"; }
  get electrified() { return this.state === "floor"; }
  get canBeHit() { return super.canBeHit && !this.electrified; }

  updatePattern(s, playerRect, shots, toward, m) {
    // 번개: 플레이어 위치 + 무작위 위치에 예고 후 내리침
    if (s === "bolts_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.pending = boltSpots(playerRect.centerx, this.enraged ? 5 : 3, this.left, this.right);
        this.go("bolts", 0);
      }
    } else if (s === "bolts") {
      if (this.timer <= 0) {
        if (!this.pending.length) {
          this.go("recover", 1.0);
        } else {
          shots.push(new Bolt(this.pending.shift(), this.groundY, BOLT_WARN / m));
          this.timer = 0.3 / m;
        }
      }
    // 전기 구슬: 통통 튀며 굴러옴
    } else if (s === "orbs_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.pending = this.enraged ? [0, 1, 2] : [0, 1];
        this.go("orbs", 0);
      }
    } else if (s === "orbs") {
      if (this.timer <= 0) {
        if (!this.pending.length) {
          this.go("recover", 0.8);
        } else {
          const i = this.pending.shift();
          const pos = [this.rect.centerx + this.face * (this.W >> 1), this.groundY - 40];
          shots.push(new Orb(pos, this.face, (ORB_SPEED + i * 0.8) * m, this.groundY, this.left, this.right));
          this.timer = 0.6 / m;
        }
      }
    // 바닥 전기: 예고(바닥이 지직거림) → 전기 흐름 → 지쳐서 멈춤 (밟을 기회)
    } else if (s === "floor_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.shake = 0.3;
        this.go("floor", FLOOR_TIME);
      }
    } else if (s === "floor") {
      if (this.timer <= 0) this.go("stunned", this.enraged ? 1.0 : 1.5);
    }
  }

  drawEffects(ctx, cameraX) {
    // 바닥 전기: 예고 때는 희미하게 지직, 발동하면 경기장 바닥 전체에 번개
    if (this.state !== "floor_wind" && this.state !== "floor") return;
    const g = this.groundY;
    const x0 = this.left - cameraX, x1 = this.right - cameraX;
    if (this.state === "floor_wind") {
      if (int(this.time * 12) % 2 === 0) drawZigzag(ctx, SPARK, [x0, g - 3], [x1, g - 3], 30, 3, 1, this.time * 10);
      return;
    }
    draw.rect(ctx, [...SPARK, 70], new Rect(x0, g - 30, x1 - x0, 30));
    for (let k = 0; k < 3; k++) {
      drawZigzag(ctx, k ? ZAP : SPARK_CORE, [x0, g - 6 - k * 7], [x1, g - 6 - k * 7], 40, 6, 3 - (k > 0 ? 1 : 0), this.time * 30 + k * 5);
    }
  }

  drawBody(ctx, r, d, s) {
    const body = this.bodyRect(r, s);
    let color = ZAP;
    if (this.enraged && int(this.time * 6) % 2) color = [255, 250, 150];
    if ((s === "floor_wind" || s === "floor") && int(this.time * 20) % 2) color = SPARK;
    if (this.hurtTimer > 0) color = WHITE;

    // 번개 모양 뿔 두 개
    for (const side of [-1, 1]) {
      const hx = body.centerx + side * 30, top = body.y + 10;
      draw.polygon(ctx, ZAP_DARK, [[hx - 8, top + 10], [hx + 6 * side, top - 14], [hx - 2 * side, top - 14],
        [hx + 10 * side, top - 40], [hx - 10 * side, top - 8], [hx, top - 8], [hx + 8, top + 10]]);
    }

    // 전기 공격 중에는 몸 주변으로 스파크
    if (["bolts_wind", "orbs_wind", "floor_wind", "floor", "bolts"].includes(s)) {
      for (let i = 0; i < 5; i++) {
        const a = i * 2 * Math.PI / 5 + this.time * 4;
        const start = [body.centerx + Math.cos(a) * body.width * 0.45, body.centery + Math.sin(a) * body.height * 0.45];
        const end = [body.centerx + Math.cos(a) * body.width * 0.75, body.centery + Math.sin(a) * body.height * 0.7];
        drawZigzag(ctx, SPARK_CORE, start, end, 3, 4, 2, this.time * 25 + i);
      }
    }

    draw.ellipse(ctx, ZAP_DARK, body.inflate(6, 6));
    draw.ellipse(ctx, color, body);
    // 배에 번개 무늬
    const bx = body.centerx + d * 6, by = body.bottom - 46;
    draw.polygon(ctx, ZAP_DARK, [[bx + 4, by], [bx - 8, by + 18], [bx, by + 18], [bx - 6, by + 36], [bx + 10, by + 12], [bx + 2, by + 12]]);
    for (const fx of [body.x + 14, body.right - 40]) draw.ellipse(ctx, ZAP_DARK, new Rect(fx, body.bottom - 14, 26, 14));

    // 지그재그 입
    const mx = body.centerx + d * ((body.width >> 1) - 26), my = body.bottom - 34;
    const pts = [];
    for (let i = 0; i < 5; i++) pts.push([mx - 14 + i * 7, my + (i % 2 ? 5 : -5)]);
    draw.lines(ctx, BLACK, false, pts, 3);

    this.drawEyes(ctx, body, d, s);
  }
}

function boltSpots(playerX, n, left, right) {
  // 번개 위치: 플레이어 위치 + 서로 90px 이상 떨어진 무작위 위치
  const xs = [playerX];
  while (xs.length < n) {
    const x = randint(left + 30, right - 30);
    if (xs.every(o => Math.abs(x - o) > 90)) xs.push(x);
  }
  return xs;
}

class Feather {
  // 폭풍 독수리가 플레이어를 겨냥해 쏘는 깃털
  constructor(pos, target, speed) {
    [this.x, this.y] = pos;
    this.R = 8;
    const dx = target[0] - this.x, dy = target[1] - this.y;
    const d = hypot(dx, dy) || 1;
    this.vx = dx / d * speed; this.vy = dy / d * speed;
    this.dir = this.vx > 0 ? 1 : -1;
    this.life = 3.0;
    this.harmful = true;
  }

  get rect() { return new Rect(this.x - this.R, this.y - this.R, this.R * 2, this.R * 2); }

  update(tiles, dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt;
    return this.life > 0 && this.rect.collidelist(tiles) === -1;
  }

  draw(ctx, cameraX) {
    // 진행 방향으로 뾰족한 깃털
    const d = hypot(this.vx, this.vy) || 1;
    const ux = this.vx / d, uy = this.vy / d;
    const cx = this.x - cameraX, cy = this.y;
    const tip = [cx + ux * 14, cy + uy * 14];
    const tail = [cx - ux * 14, cy - uy * 14];
    const side = [-uy * 6, ux * 6];
    const pts = [tip, [cx + side[0], cy + side[1]], tail, [cx - side[0], cy - side[1]]];
    draw.polygon(ctx, FEATHER, pts);
    draw.polygon(ctx, BIRD_DARK, pts, 2);
    draw.line(ctx, BIRD_DARK, tail, tip, 2);
  }
}

// ====================== 3스테이지: 폭풍 독수리 ======================

class EagleBoss extends Boss {
  // 공중에서 플레이어를 따라다니며 급강하 / 깃털 발사 / 낮게 휩쓸기.
  // 급강하 뒤에는 땅에 처박혀 어지러워함 (밟을 기회).
  static W = 130;
  static H = 90;
  static PATTERNS = ["dive", "feathers", "sweep"];
  static WINDUP = { dive: 0.8, feathers: 0.7, sweep: 0.7 };
  static AFTER_STUN = "rise";
  static HOVER = 170;          // 공중에 떠 있을 때 몸 아래쪽 높이 (y)

  constructor(...args) {
    super(...args);
    this.HOVER = EagleBoss.HOVER;
    this.rect.midbottom = [this.rect.centerx, -10];
    this.pending = 0;
    this.vel = [0, 0];
    this.arrived = false;
  }

  update(dt, playerRect, shots) {
    if (this.state === "intro") {
      // 하늘에서 날아 내려와 공중에 멈춤
      this.time += dt;
      this.shake = Math.max(0, this.shake - dt);
      this.rect.y += 4;
      if (this.rect.bottom >= this.HOVER) {
        this.rect.bottom = this.HOVER;
        this.shake = 0.4;
        this.go("roar", 1.0);
      }
      return;
    }
    super.update(dt, playerRect, shots);
  }

  walk(playerRect, toward, m) {
    // 플레이어 머리 위를 따라다니며 둥실둥실
    this.vx = clamp((playerRect.centerx - this.rect.centerx) * 0.04, -3 * m, 3 * m);
    const bob = this.HOVER + Math.sin(this.time * 3) * 10;
    this.rect.bottom += round((bob - this.rect.bottom) * 0.1);
  }

  flyTo(x, bottom, speed) {
    const dx = x - this.rect.centerx, dy = bottom - this.rect.bottom;
    const d = hypot(dx, dy);
    if (d <= speed) {
      this.rect.midbottom = [round(x), round(bottom)];
      this.vx = 0;
      return true;
    }
    this.vx = 0;
    this.rect.x += round(dx / d * speed);
    this.rect.y += round(dy / d * speed);
    return false;
  }

  updatePattern(s, playerRect, shots, toward, m) {
    // 급강하: 노린 위치로 대각선 돌진 → 땅에 처박혀 어지러움
    if (s === "dive_wind") {
      this.face = toward;
      this.vx = 0;
      if (this.timer <= 0) {
        const dx = playerRect.centerx - this.rect.centerx;
        const dy = playerRect.centery - this.rect.centery;
        const d = hypot(dx, dy) || 1;
        this.vel = [dx / d * EAGLE_DIVE_SPEED * m, Math.max(dy / d, 0.5) * EAGLE_DIVE_SPEED * m];
        this.go("dive", 0);
      }
    } else if (s === "dive") {
      this.vx = this.vel[0];
      this.rect.y += round(this.vel[1]);
      if (this.rect.bottom >= this.groundY) {
        this.rect.bottom = this.groundY;
        this.vx = 0;
        this.shake = 0.4;
        this.go("stunned", this.enraged ? 1.0 : 1.4);
      }
    // 다시 날아오름
    } else if (s === "rise") {
      this.vx = 0;
      this.rect.y -= 4;
      if (this.rect.bottom <= this.HOVER) {
        this.rect.bottom = this.HOVER;
        this.go("walk", 1.0);
      }
    // 깃털: 플레이어를 겨냥해 하나씩
    } else if (s === "feathers_wind") {
      this.face = toward;
      this.vx = 0;
      if (this.timer <= 0) {
        this.pending = this.enraged ? 5 : 3;
        this.go("feathers", 0);
      }
    } else if (s === "feathers") {
      this.face = toward;
      if (this.timer <= 0) {
        if (this.pending <= 0) {
          this.go("recover", 0.6);
        } else {
          this.pending -= 1;
          const mouth = [this.rect.centerx + Math.floor(this.face * this.W / 2), this.rect.centery];
          shots.push(new Feather(mouth, playerRect.center, EAGLE_FEATHER_SPEED * m));
          this.timer = 0.35 / m;
        }
      }
    // 휩쓸기: 플레이어에게서 먼 벽 쪽 바닥으로 내려가 → 번쩍 → 반대편 벽까지 낮게 돌진
    } else if (s === "sweep_wind") {
      if (!this.arrived) {
        const farLeft = Math.abs(playerRect.centerx - this.left) > Math.abs(playerRect.centerx - this.right);
        const x = farLeft ? this.left + (this.W >> 1) + 4 : this.right - (this.W >> 1) - 4;
        this.face = farLeft ? 1 : -1;
        this.arrived = this.flyTo(x, this.groundY - 4, 7);
        this.timer = this.WINDUP.sweep / m;      // 도착한 뒤부터 예고 시작
      } else if (this.timer <= 0) {
        this.arrived = false;
        this.go("sweep", 0);
      }
    } else if (s === "sweep") {
      this.vx = this.face * EAGLE_SWEEP_SPEED * m;
      if ((this.face > 0 && this.rect.right >= this.right) || (this.face < 0 && this.rect.left <= this.left)) {
        this.vx = 0;
        this.go("rise", 0);
      }
    }
  }

  drawBody(ctx, r, d, s) {
    const body = new Rect(0, 0, 100, 74);
    body.midbottom = [r.centerx, r.bottom - 6];
    let color = BIRD;
    if (this.enraged && int(this.time * 6) % 2) color = [150, 120, 255];
    if (s.endsWith("_wind") && int(this.time * 16) % 2) color = [240, 80, 80];   // 공격 예고: 빨갛게 번쩍
    if (this.hurtTimer > 0) color = WHITE;

    // 날개: 날 때 퍼덕, 급강하/휩쓸기 때 뒤로 접음, 어지러울 땐 축 늘어짐
    let flap;
    if (s === "dive" || s === "sweep") flap = 0.15;
    else if (s === "stunned") flap = -0.6;
    else flap = 0.7 * Math.sin(this.time * 9);
    for (const side of [-1, 1]) drawWing(ctx, BIRD_DARK, [body.centerx + side * 20, body.centery - 6], 85, flap, side);

    // 꼬리 깃털
    const tx = body.centerx - d * 48;
    for (const k of [-1, 0, 1]) {
      draw.polygon(ctx, BIRD_DARK, [[tx, body.centery], [tx - d * 34, body.centery - 14 + k * 14], [tx - d * 30, body.centery + k * 14]]);
    }
    draw.ellipse(ctx, BIRD_DARK, body.inflate(6, 6));
    draw.ellipse(ctx, color, body);
    const belly = new Rect(0, 0, 54, 40);
    belly.midbottom = [body.centerx - d * 4, body.bottom - 4];
    draw.ellipse(ctx, BIRD_BELLY, belly);
    // 발톱
    for (const fx of [-14, 10]) {
      draw.lines(ctx, BEAK, false, [[body.centerx + fx, body.bottom - 2], [body.centerx + fx, body.bottom + 8],
        [body.centerx + fx + 6, body.bottom + 8]], 3);
    }
    // 부리
    const bx = body.centerx + d * ((body.width >> 1) - 4), by = body.centery - 4;
    const beak = [[bx, by - 10], [bx + d * 30, by + 2], [bx + d * 8, by + 6], [bx, by + 10]];
    draw.polygon(ctx, BEAK, beak);
    draw.polygon(ctx, [180, 100, 20], beak, 2);
    // 왕관
    const cx = body.centerx - d * 4, top = body.y + 4;
    const crown = [[cx - 22, top], [cx - 22, top - 18], [cx - 11, top - 8], [cx, top - 24],
      [cx + 11, top - 8], [cx + 22, top - 18], [cx + 22, top]];
    draw.polygon(ctx, CROWN, crown);
    draw.polygon(ctx, BIRD_DARK, crown, 2);
    // 눈 하나 (옆모습) + 화난 눈썹
    const ex = body.centerx + d * 26, ey = body.y + 22;
    if (s === "stunned") {
      drawXEyes(ctx, BLACK, ex, ey, 6, 4);
    } else {
      draw.circle(ctx, WHITE, [ex, ey], 10);
      draw.circle(ctx, BLACK, [ex + d * 3, ey + 1], 5);
      draw.line(ctx, BLACK, [ex - d * 12, ey - 16], [ex + d * 10, ey - 8], 4);
    }
  }
}

// ====================== 4스테이지: 마왕 드래곤 ======================

class DragonBoss extends EagleBoss {
  // 폭풍 독수리처럼 날아다니며(급강하 포함) 불덩이 연사, 번개, 전기 구슬을 섞어 쓴다
  static W = 140;
  static H = 100;
  static MAX_HP = DRAGON_HP;
  static PATTERNS = ["fire", "bolts", "dive", "orbs"];
  static WINDUP = { fire: 0.7, bolts: 0.7, dive: 0.8, orbs: 0.7 };

  updatePattern(s, playerRect, shots, toward, m) {
    const mouth = [this.rect.centerx + this.face * ((this.W >> 1) - 6), this.rect.centery + 6];

    // 불덩이 연사: 플레이어를 겨냥해서 하나씩
    if (s === "fire_wind") {
      this.face = toward; this.vx = 0;
      if (this.timer <= 0) {
        this.pending = this.enraged ? 5 : 3;
        this.go("fire", 0);
      }
    } else if (s === "fire") {
      this.face = toward;
      if (this.timer <= 0) {
        if (this.pending <= 0) {
          this.go("recover", 0.6);
        } else {
          this.pending -= 1;
          shots.push(new AimedFireball(mouth, playerRect.center, DRAGON_FIRE_SPEED * m));
          this.timer = 0.4 / m;
        }
      }
    // 번개: 번개 대왕과 같은 방식
    } else if (s === "bolts_wind") {
      this.face = toward; this.vx = 0;
      if (this.timer <= 0) {
        this.boltXs = boltSpots(playerRect.centerx, this.enraged ? 5 : 3, this.left, this.right);
        this.go("bolts", 0);
      }
    } else if (s === "bolts") {
      if (this.timer <= 0) {
        if (!this.boltXs.length) {
          this.go("recover", 1.0);
        } else {
          shots.push(new Bolt(this.boltXs.shift(), this.groundY, BOLT_WARN / m));
          this.timer = 0.3 / m;
        }
      }
    // 전기 구슬: 입에서 떨어뜨리면 바닥을 통통 튀며 굴러감
    } else if (s === "orbs_wind") {
      this.face = toward; this.vx = 0;
      if (this.timer <= 0) {
        this.pending = this.enraged ? 3 : 2;
        this.go("orbs", 0);
      }
    } else if (s === "orbs") {
      if (this.timer <= 0) {
        if (this.pending <= 0) {
          this.go("recover", 0.8);
        } else {
          this.pending -= 1;
          shots.push(new Orb(mouth, this.face, (ORB_SPEED + this.pending * 0.8) * m, this.groundY, this.left, this.right));
          this.timer = 0.6 / m;
        }
      }
    } else {   // 급강하 / 날아오름은 폭풍 독수리와 같음
      super.updatePattern(s, playerRect, shots, toward, m);
    }
  }

  drawBody(ctx, r, d, s) {
    const body = new Rect(0, 0, 108, 80);
    body.midbottom = [r.centerx, r.bottom - 6];
    let color = DRAGON;
    if (this.enraged && int(this.time * 6) % 2) color = [170, 60, 130];
    if (s.endsWith("_wind") && int(this.time * 16) % 2) color = s === "fire_wind" || s === "dive_wind" ? [240, 80, 80] : SPARK;
    if (this.hurtTimer > 0) color = WHITE;

    // 박쥐 날개
    let flap;
    if (s === "dive") flap = 0.15;
    else if (s === "stunned") flap = -0.6;
    else flap = 0.7 * Math.sin(this.time * 8);
    for (const side of [-1, 1]) {
      drawWing(ctx, DRAGON_WING, [body.centerx + side * 22, body.centery - 8], 95, flap, side);
      drawWing(ctx, DRAGON_DARK, [body.centerx + side * 22, body.centery - 8], 70, flap - 0.2, side);
    }

    // 꼬리 (끝이 번개 모양)
    const tx = body.centerx - d * 50, ty = body.centery + 10;
    draw.polygon(ctx, DRAGON_DARK, [[tx, ty - 8], [tx - d * 40, ty + 14], [tx - d * 30, ty + 18], [tx, ty + 8]]);
    const bx = tx - d * 38, by = ty + 16;
    draw.polygon(ctx, ZAP, [[bx, by - 10], [bx - d * 10, by + 2], [bx - d * 4, by + 2], [bx - d * 12, by + 14],
      [bx + d * 4, by - 2], [bx - d * 2, by - 2]]);

    // 공격 중 몸 주변 스파크
    if (["bolts_wind", "bolts", "orbs_wind", "orbs"].includes(s)) {
      for (let i = 0; i < 5; i++) {
        const a = i * 2 * Math.PI / 5 + this.time * 4;
        const start = [body.centerx + Math.cos(a) * 50, body.centery + Math.sin(a) * 38];
        const end = [body.centerx + Math.cos(a) * 80, body.centery + Math.sin(a) * 60];
        drawZigzag(ctx, SPARK_CORE, start, end, 3, 4, 2, this.time * 25 + i);
      }
    }

    draw.ellipse(ctx, DRAGON_DARK, body.inflate(6, 6));
    draw.ellipse(ctx, color, body);
    const belly = new Rect(0, 0, 56, 42);
    belly.midbottom = [body.centerx + d * 6, body.bottom - 4];
    draw.ellipse(ctx, DRAGON_BELLY, belly);
    for (let k = 0; k < 3; k++) {   // 배 줄무늬
      const y = belly.y + 10 + k * 10;
      draw.line(ctx, [200, 120, 90], [belly.x + 10, y], [belly.right - 10, y], 2);
    }
    // 발톱
    for (const fx of [-16, 12]) {
      draw.lines(ctx, DRAGON_DARK, false, [[body.centerx + fx, body.bottom - 2], [body.centerx + fx, body.bottom + 9],
        [body.centerx + fx + 7 * d, body.bottom + 9]], 4);
    }

    // 주둥이 + 입 (불 쏠 때 달아오름)
    const sx = body.centerx + d * ((body.width >> 1) - 8), sy = body.centery - 4;
    const snout = new Rect(0, 0, 44, 28);
    snout.center = [sx + d * 12, sy];
    draw.ellipse(ctx, DRAGON_DARK, snout.inflate(4, 4));
    draw.ellipse(ctx, color, snout);
    const hot = s === "fire_wind" || s === "fire";
    const mouth = new Rect(0, 0, 22, 10);
    mouth.center = [sx + d * 18, sy + 8];
    draw.ellipse(ctx, hot ? FIRE_IN : BLACK, mouth);
    draw.circle(ctx, BLACK, [sx + d * 26, sy - 6], 2);   // 콧구멍

    // 번개 모양 뿔 + 왕관
    for (const side of [-1, 1]) {
      const hx = body.centerx + d * 10 + side * 18, top = body.y + 8;
      draw.polygon(ctx, ZAP, [[hx - 5, top], [hx + side * 4, top - 16], [hx - side * 2, top - 16],
        [hx + side * 8, top - 34], [hx - side * 8, top - 10], [hx + 2, top - 10], [hx + 5, top]]);
    }
    const cx = body.centerx + d * 10, top = body.y + 4;
    const crown = [[cx - 16, top], [cx - 16, top - 14], [cx - 8, top - 6], [cx, top - 18],
      [cx + 8, top - 6], [cx + 16, top - 14], [cx + 16, top]];
    draw.polygon(ctx, CROWN, crown);
    draw.polygon(ctx, DRAGON_DARK, crown, 2);

    // 눈 (옆모습) + 화난 눈썹
    const ex = body.centerx + d * 30, ey = body.y + 20;
    if (s === "stunned") {
      drawXEyes(ctx, BLACK, ex, ey, 6, 4);
    } else {
      draw.circle(ctx, [255, 230, 80], [ex, ey], 10);
      draw.ellipse(ctx, BLACK, new Rect(ex + d * 2 - 3, ey - 7, 6, 14));   // 세로 동공
      draw.line(ctx, BLACK, [ex - d * 12, ey - 16], [ex + d * 10, ey - 8], 4);
    }
  }
}

// ====================== 5스테이지: ??? (검은 거대 슬라임) ======================

class GooWave extends Shockwave {
  // 거대 슬라임이 착지할 때 바닥을 타고 퍼지는 검은 슬라임 파도
  draw(ctx, cameraX, time) {
    const r = this.rect.move(-cameraX, 0);
    for (let i = 0; i < 3; i++) {
      const h = this.H * (0.5 + 0.5 * Math.abs(Math.sin(time * 14 + i * 1.7 + this.x * 0.04)));
      const blob = new Rect(r.x + i * 9, r.bottom - h, 14, h + 4);
      draw.ellipse(ctx, GOO_EDGE, blob.inflate(4, 4));
      draw.ellipse(ctx, GOO, blob);
    }
  }
}

class GooBall {
  // 거대 슬라임이 뱉는 슬라임 덩어리. 포물선으로 날아가 바닥에 닿으면 사라진다.
  static G = 0.35;

  constructor(pos, targetX, groundY, vy = -9.0) {
    [this.x, this.y] = pos;
    this.R = 13;
    this.vy = vy;
    // 바닥에 닿을 때까지 걸리는 프레임 수를 구해서, 그때 targetX 에 떨어지도록 가로 속도를 정함
    const G = GooBall.G;
    const h = groundY - this.y;
    const frames = (-vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
    this.vx = (targetX - this.x) / frames;
    this.dir = this.vx > 0 ? 1 : -1;
    this.groundY = groundY;
    this.harmful = true;
  }

  get rect() { return new Rect(this.x - this.R, this.y - this.R, this.R * 2, this.R * 2); }

  update(tiles, dt) {
    this.vy += GooBall.G;
    this.x += this.vx;
    this.y += this.vy;
    return this.y + this.R < this.groundY;
  }

  draw(ctx, cameraX, time) {
    const c = [int(this.x - cameraX), int(this.y)];
    const wob = int(2 * Math.sin(time * 20 + this.x));
    const R = this.R;
    draw.ellipse(ctx, GOO_EDGE, new Rect(c[0] - R - 2, c[1] - R - 2 + wob, R * 2 + 4, R * 2 + 4 - wob));
    draw.ellipse(ctx, GOO, new Rect(c[0] - R, c[1] - R + wob, R * 2, R * 2 - wob));
    draw.circle(ctx, BIG_SLIME_LIGHT, [c[0] - 4, c[1] - 4], 3);
  }
}

class GiantSlimeBoss extends Boss {
  // ???: 주인공을 닮은 검은 거대 슬라임. 연속 점프(마지막 착지에 파도) / 슬라임 뱉기 /
  // 초고공 내려찍기(그림자 예고, 착지 후 어지러움) / 돌진(벽에 부딪히면 어지러움)
  static W = 150;
  static H = 130;
  static MAX_HP = GIANT_HP;
  static PATTERNS = ["hops", "spit", "pound", "dash"];
  static WINDUP = { hops: 0.5, spit: 0.6, pound: 0.5, dash: 0.8 };

  constructor(...args) {
    super(...args);
    this.pending = 0;
    this.air = false;
    this.spitOffsets = [];
  }

  waves(shots, speed) {
    for (const d of [-1, 1]) {
      shots.push(new GooWave(this.rect.centerx + d * (this.W >> 1), this.groundY, d, speed, this.left, this.right));
    }
  }

  updatePattern(s, playerRect, shots, toward, m) {
    // 연속 점프: 플레이어 쪽으로 쿵쿵, 마지막 착지에 슬라임 파도
    if (s === "hops_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.pending = this.enraged ? 4 : 3;
        this.air = false;
        this.go("hops", 0);
      }
    } else if (s === "hops") {
      if (!this.air) {
        if (this.timer <= 0) {
          if (this.pending <= 0) { this.go("recover", 0.8); return; }
          this.pending -= 1;
          this.face = toward;
          this.vy = -12;
          const air = 2 * 12 / GRAVITY;
          this.vx = clamp((playerRect.centerx - this.rect.centerx) / air, -6 * m, 6 * m);
          this.air = true;
        }
      } else {
        this.vy += GRAVITY;
        this.rect.y += round(this.vy);
        if (this.vy > 0 && this.rect.bottom >= this.groundY) {
          this.rect.bottom = this.groundY;
          this.vx = this.vy = 0;
          this.air = false;
          this.shake = 0.15;
          this.timer = 0.25 / m;
          if (this.pending <= 0) {
            this.shake = 0.35;
            this.waves(shots, GOO_WAVE_SPEED * m);
          }
        }
      }
    // 슬라임 뱉기: 플레이어 근처 여러 곳으로 포물선
    } else if (s === "spit_wind") {
      this.face = toward;
      if (this.timer <= 0) {
        this.spitOffsets = [0, -90, 90, -45, 45].slice(0, this.enraged ? 5 : 3);
        this.go("spit", 0);
      }
    } else if (s === "spit") {
      this.face = toward;
      if (this.timer <= 0) {
        if (!this.spitOffsets.length) {
          this.go("recover", 0.7);
        } else {
          const tx = clamp(playerRect.centerx + this.spitOffsets.shift(), this.left + 20, this.right - 20);
          const mouth = [this.rect.centerx + this.face * 40, this.rect.top + 30];
          shots.push(new GooBall(mouth, tx, this.groundY));
          this.timer = 0.35 / m;
        }
      }
    // 내려찍기: 화면 위로 사라짐 → 플레이어 위에 그림자 → 쿵 → 큰 파도 + 어지러움
    } else if (s === "pound_wind") {
      if (this.timer <= 0) this.go("pound_up", 0);
    } else if (s === "pound_up") {
      this.rect.y -= 22;
      if (this.rect.bottom < -40) this.go("pound_aim", 1.0 / m);
    } else if (s === "pound_aim") {
      const x = clamp(playerRect.centerx, this.left + (this.W >> 1), this.right - (this.W >> 1));
      this.rect.centerx += round((x - this.rect.centerx) * 0.2);
      if (this.timer <= 0) this.go("pound_fall", 0);
    } else if (s === "pound_fall") {
      this.rect.y += 22;
      if (this.rect.bottom >= this.groundY) {
        this.rect.bottom = this.groundY;
        this.shake = 0.7;
        this.waves(shots, GOO_WAVE_SPEED * 1.3 * m);
        this.go("stunned", this.enraged ? 1.1 : 1.6);
      }
    // 돌진: 미끄러지듯 벽까지, 부딪히면 어지러움
    } else if (s === "dash_wind") {
      this.face = toward;
      if (this.timer <= 0) this.go("dash", 0);
    } else if (s === "dash") {
      this.vx = this.face * GIANT_DASH_SPEED * m;
      if (this.rect.left <= this.left || this.rect.right >= this.right) {
        this.vx = 0;
        this.shake = 0.35;
        this.go("stunned", this.enraged ? 0.9 : 1.2);
      }
    }
  }

  get harmful() { return !["intro", "dying", "pound_up", "pound_aim"].includes(this.state); }

  drawEffects(ctx, cameraX) {
    // 내려찍기 예고: 떨어질 자리에 그림자 (가까워질수록 커지고 진해짐)
    if (this.state !== "pound_aim" && this.state !== "pound_fall") return;
    const near = this.state === "pound_fall" ? 1.0 : 0.5 + 0.5 * Math.sin(this.time * 20) ** 2;
    const w = int(this.W * (0.6 + 0.4 * near));
    const r = new Rect(this.rect.centerx - cameraX - (w >> 1), this.groundY - 12, w, 22);
    draw.ellipse(ctx, [0, 0, 0, int(90 + 90 * near)], r);
    if (this.state === "pound_aim" && int(this.time * 10) % 2) draw.ellipse(ctx, BIG_SLIME_EYE, r, 3);
  }

  squashFor(s) {
    if (s === "hops" && this.air) return 1.18;
    if (s === "pound_up" || s === "pound_fall") return 1.25;
    if (s === "dash") return 0.85;
    if (s === "hops") return 0.8;          // 착지 직후 납작
    return super.squashFor(s);
  }

  drawBody(ctx, r, d, s) {
    let body = this.bodyRect(r, s);
    const wob = ["walk", "roar", "recover"].includes(s) ? 0.03 * Math.sin(this.time * 5) : 0;
    body = body.inflate(int(body.width * wob), -int(body.height * wob));
    body.bottom = r.bottom;
    const color = this.hurtTimer > 0 ? WHITE : BIG_SLIME;

    // 몸: 주인공 슬라임과 같은 모양 (위는 둥글고 아래는 평평)
    draw.ellipse(ctx, BIG_SLIME_EDGE, body.inflate(8, 8));
    draw.ellipse(ctx, color, body);
    const flat = Math.floor(body.height / 3);
    draw.rect(ctx, BIG_SLIME_EDGE, new Rect(body.x - 4, body.bottom - flat, body.width + 8, flat + 4));
    draw.rect(ctx, color, new Rect(body.x, body.bottom - flat, body.width, flat));
    // 하이라이트
    const hl = new Rect(0, 0, Math.floor(body.width / 4), Math.floor(body.height / 6));
    hl.center = [body.x + body.width * 0.3, body.y + body.height * 0.25];
    draw.ellipse(ctx, BIG_SLIME_LIGHT, hl);

    // 눈: 빨갛게 빛남, 바라보는 쪽으로 치우침. 분노하면 더 크게 이글거림
    const eyeY = body.y + int(body.height * 0.45);
    for (const ox of [-24, 24]) {
      const ex = body.centerx + ox + d * 16;
      if (s === "stunned") { drawXEyes(ctx, BIG_SLIME_EYE, ex, eyeY, 9, 5); continue; }
      const glowR = this.enraged ? 16 : 12;
      draw.circle(ctx, [...BIG_SLIME_EYE, 70], [ex, eyeY], glowR * 2);
      draw.ellipse(ctx, BIG_SLIME_EYE, new Rect(ex - 10, eyeY - 12, 20, 24));
      draw.circle(ctx, WHITE, [ex + d * 4, eyeY - 3], 4);
      // 화난 눈썹: 가운데로 갈수록 내려감
      const inner = ox < 0 ? 1 : -1;
      draw.line(ctx, BIG_SLIME_EDGE, [ex - 14, eyeY - 20 + inner * 5], [ex + 14, eyeY - 20 - inner * 5], 5);
    }
  }
}

const BOSSES = { fire: FireBoss, thunder: ThunderBoss, eagle: EagleBoss, dragon: DragonBoss, giant: GiantSlimeBoss };
