// 파이썬 enemy.py 를 옮긴 것

function drawZigzag(ctx, color, start, end, segments, jitter, width, seed) {
  // 번개 모양 지그재그 선. seed 를 시간으로 주면 지직거리며 모양이 바뀜
  const [x0, y0] = start, [x1, y1] = end;
  const pts = [start];
  const dx = x1 - x0, dy = y1 - y0;
  const length = hypot(dx, dy) || 1;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const off = jitter * Math.sin(seed * 13.7 + i * 2.3) * (i % 2 ? 1 : -1);
    // 진행 방향에 수직으로 흔들기
    pts.push([x0 + dx * t - dy / length * off, y0 + dy * t + dx / length * off]);
  }
  pts.push(end);
  draw.lines(ctx, color, false, pts, width);
}

class Enemy {
  static W = 34;
  static H = 30;

  constructor(x, y) {
    const W = this.constructor.W, H = this.constructor.H;
    this.W = W; this.H = H;
    // 타일 바닥에 맞춰 세움
    this.rect = new Rect(x + Math.floor((TILE - W) / 2), y + TILE - H, W, H);
    this.dir = -1;
    this.vy = 0;
    this.time = 0;
  }

  update(tiles, dt) {
    this.time += dt;

    // 좌우 이동, 벽에 닿으면 방향 전환
    this.rect.x += round(this.dir * ENEMY_SPEED);
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.dir > 0) this.rect.right = t.left;
        else this.rect.left = t.right;
        this.dir *= -1;
        break;
      }
    }

    // 중력
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    this.rect.y += round(this.vy);
    let onGround = false;
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.vy > 0) {
          this.rect.bottom = t.top;
          onGround = true;
        } else {
          this.rect.top = t.bottom;
        }
        this.vy = 0;
      }
    }

    // 발판 끝에서 돌아서기: 진행 방향 앞발 아래에 블록이 없으면 전환
    if (onGround) {
      const footX = this.dir > 0 ? this.rect.right + 1 : this.rect.left - 2;
      const probe = new Rect(footX, this.rect.bottom + 1, 1, 4);
      if (probe.collidelist(tiles) === -1) this.dir *= -1;
    }
  }

  draw(ctx, cameraX) {
    const r = this.rect.move(-cameraX, 0);
    // 걸을 때 몸이 조금씩 들썩임
    const bob = int(2 * Math.sin(this.time * 10));
    const body = new Rect(r.x, r.y + bob, r.width, r.height - bob);

    // 등에 난 가시
    for (let i = 0; i < 4; i++) {
      const x0 = body.x + 4 + i * 8;
      draw.polygon(ctx, ENEMY_DARK, [[x0, body.y + 10], [x0 + 8, body.y + 10], [x0 + 4, body.y - 6]]);
    }
    draw.ellipse(ctx, ENEMY_DARK, body.inflate(4, 4));
    draw.ellipse(ctx, ENEMY, body);

    // 발
    for (const fx of [body.x + 6, body.right - 14]) draw.ellipse(ctx, ENEMY_DARK, new Rect(fx, body.bottom - 6, 8, 6));

    // 화난 눈: 진행 방향으로 치우침
    const dx = 5 * this.dir;
    const ey = body.y + (body.height >> 1);
    for (const ox of [-7, 7]) {
      const ex = body.centerx + ox + dx;
      draw.ellipse(ctx, WHITE, new Rect(ex - 5, ey - 5, 10, 10));
      draw.circle(ctx, BLACK, [ex + 2 * this.dir, ey], 3);
      // 눈썹
      const browY = ey - 7;
      if (ox < 0) draw.line(ctx, BLACK, [ex - 6, browY - 2], [ex + 5, browY + 1], 2);
      else draw.line(ctx, BLACK, [ex - 5, browY + 1], [ex + 6, browY - 2], 2);
    }
  }
}

class FireBreather extends Enemy {
  // 좌우로 순찰하면서 플레이어 쪽으로 주기적으로 불덩이를 뿜는 괴물. 밟으면 처치.
  static W = 40;
  static H = 38;

  constructor(x, y) {
    super(x, y);
    this.usesPlayer = true;
    this.cooldown = FIRE_INTERVAL * 0.5;   // 첫 발은 조금 빨리
    this.face = -1;   // 바라보는(불 뿜는) 방향. 걷는 방향 dir 과 별개
  }

  update(tiles, dt, playerRect = null, fireballs = null) {
    super.update(tiles, dt);
    if (!playerRect) return;
    this.face = playerRect.centerx < this.rect.centerx ? -1 : 1;
    const inRange = Math.abs(playerRect.centerx - this.rect.centerx) < FIRE_RANGE * TILE;
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      if (inRange && fireballs) {
        const mouth = [this.rect.centerx + Math.floor(this.face * this.W / 2), this.rect.bottom - 16];
        fireballs.push(new Fireball(mouth, this.face));
      }
      this.cooldown = FIRE_INTERVAL;
    }
  }

  get warming() { return this.cooldown < FIRE_WARN; }

  draw(ctx, cameraX) {
    const r = this.rect.move(-cameraX, 0);
    const d = this.face;
    // 걸을 때 들썩임 + 뿜기 직전에는 몸이 부풀어 오름
    const puff = this.warming && int(this.time * 12) % 2 ? 3 : 0;
    const bob = int(2 * Math.sin(this.time * 10));
    const body = r.inflate(puff * 2, puff).move(0, bob);

    // 등 지느러미
    for (let i = 0; i < 3; i++) {
      const x0 = body.centerx - d * (4 + i * 9);
      draw.polygon(ctx, BREATHER_DARK, [[x0 - 5, body.y + 8], [x0 + 5, body.y + 8], [x0 - d * 3, body.y - 8]]);
    }
    draw.ellipse(ctx, BREATHER_DARK, body.inflate(4, 4));
    draw.ellipse(ctx, BREATHER, body);
    const belly = new Rect(0, 0, body.width >> 1, body.height >> 1);
    belly.midbottom = [body.centerx + d * 3, body.bottom - 2];
    draw.ellipse(ctx, BREATHER_BELLY, belly);

    // 입: 뿜기 직전엔 노랗게 달아오름
    const mouth = new Rect(0, 0, 12, 10);
    mouth.center = [body.centerx + d * ((body.width >> 1) - 4), body.bottom - 16];
    draw.ellipse(ctx, this.warming ? FIRE_IN : BLACK, mouth);

    // 눈 하나, 화난 눈썹
    const ex = body.centerx + d * 8, ey = body.y + 13;
    draw.circle(ctx, WHITE, [ex, ey], 6);
    draw.circle(ctx, BLACK, [ex + d * 2, ey], 3);
    draw.line(ctx, BLACK, [ex - d * 7, ey - 9], [ex + d * 6, ey - 5], 3);
  }
}

class Fireball {
  constructor(pos, direction, speed = FIREBALL_SPEED, radius = null) {
    [this.x, this.y] = pos;
    this.dir = direction;
    this.speed = speed;
    this.R = radius || 9;
    this.harmful = true;
    this.life = FIREBALL_LIFE;
    this.trail = [];
  }

  get rect() { return new Rect(this.x - this.R, this.y - this.R, this.R * 2, this.R * 2); }

  update(tiles, dt) {
    // 벽에 닿거나 수명이 다하면 false
    this.trail = [[this.x, this.y], ...this.trail].slice(0, 5);
    this.x += this.dir * this.speed;
    this.life -= dt;
    return this.life > 0 && this.rect.collidelist(tiles) === -1;
  }

  draw(ctx, cameraX, time) {
    this.trail.forEach(([tx, ty], i) => draw.circle(ctx, FIRE_OUT, [tx - cameraX, ty], this.R - 2 - i));
    const flick = int(2 * Math.sin(time * 30 + this.x));
    const c = [this.x - cameraX, this.y];
    draw.circle(ctx, FIRE_OUT, c, this.R + flick);
    draw.circle(ctx, FIRE_IN, c, Math.floor(this.R / 2) + 1);
  }
}

class ZapEnemy extends Enemy {
  // 전기 괴물. 순찰하다 멈춰서 충전하고, 몸 주변으로 전기를 방출한다.
  // 평소엔 밟아서 처치할 수 있지만, 방출 중에는 밟아도 감전된다.
  static W = 34;
  static H = 32;

  constructor(x, y) {
    super(x, y);
    this.phase = "idle";
    // 괴물마다 방출 타이밍이 다르게
    this.timer = ZAP_IDLE * (0.3 + 0.7 * (Math.floor(x / TILE) % 5) / 5);
  }

  get discharging() { return this.phase === "discharge"; }

  get dangerRect() {
    // 방출 중에는 몸보다 넓은 범위가 위험
    return this.discharging ? this.rect.inflate(ZAP_RADIUS * 2, ZAP_RADIUS * 2) : this.rect;
  }

  update(tiles, dt) {
    this.timer -= dt;
    if (this.phase === "idle") {
      super.update(tiles, dt);
      if (this.timer <= 0) { this.phase = "charge"; this.timer = ZAP_CHARGE; }
    } else {
      // 충전/방출 중에는 제자리 (중력만)
      this.time += dt;
      this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
      this.rect.y += round(this.vy);
      for (const t of tiles) {
        if (this.rect.colliderect(t) && this.vy > 0) {
          this.rect.bottom = t.top;
          this.vy = 0;
        }
      }
      if (this.timer <= 0) {
        if (this.phase === "charge") { this.phase = "discharge"; this.timer = ZAP_DISCHARGE; }
        else { this.phase = "idle"; this.timer = ZAP_IDLE; }
      }
    }
  }

  draw(ctx, cameraX) {
    const r = this.rect.move(-cameraX, 0);
    const t = this.time;
    const shake = this.phase === "charge" ? int(2 * Math.sin(t * 60)) : 0;
    const bob = this.phase === "idle" ? int(2 * Math.sin(t * 10)) : 0;
    const body = r.move(shake, bob);

    // 방출: 몸 주변 전기 고리 + 사방으로 튀는 번개
    if (this.discharging) {
      const c = body.center;
      const rad = (Math.max(r.width, r.height) >> 1) + ZAP_RADIUS;
      draw.circle(ctx, [...SPARK, 90], c, rad);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + t * 3;
        const end = [c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad];
        drawZigzag(ctx, SPARK_CORE, c, end, 4, 4, 2, t * 20 + i);
      }
    }

    // 머리 위 번개 더듬이
    const ax = body.centerx;
    draw.polygon(ctx, ZAP_DARK, [[ax - 2, body.y + 4], [ax + 6, body.y - 6], [ax + 1, body.y - 6], [ax + 7, body.y - 16],
      [ax - 5, body.y - 3], [ax + 1, body.y - 3]]);

    draw.ellipse(ctx, ZAP_DARK, body.inflate(4, 4));
    draw.ellipse(ctx, this.phase === "charge" && int(t * 20) % 2 ? SPARK : ZAP, body);

    // 충전 중: 몸 위로 작은 스파크
    if (this.phase === "charge") {
      for (let i = 0; i < 3; i++) {
        const sx = body.x + 6 + i * 11;
        drawZigzag(ctx, SPARK_CORE, [sx, body.y + 4], [sx + 4, body.y - 10], 3, 3, 2, t * 30 + i);
      }
    }

    // 눈: 진행 방향, 지그재그 입
    const d = this.dir;
    const ey = body.y + (body.height >> 1) - 3;
    for (const ox of [-7, 7]) {
      const ex = body.centerx + ox + 4 * d;
      draw.ellipse(ctx, WHITE, new Rect(ex - 5, ey - 5, 10, 10));
      draw.circle(ctx, BLACK, [ex + 2 * d, ey], 3);
    }
    const my = body.y + body.height - 9;
    const mouth = [];
    for (let i = 0; i < 5; i++) mouth.push([body.centerx - 8 + 4 * d + i * 4, my + (i % 2 ? 2 : -2)]);
    draw.lines(ctx, BLACK, false, mouth, 2);
  }
}

function drawWing(ctx, color, root, span, angle, side) {
  // 날개: 뿌리(root)에서 바깥쪽(side)으로 뻗은 삼각형, angle 로 위아래 퍼덕임
  const [rx, ry] = root;
  const tip = [rx + side * span * Math.cos(angle), ry - span * Math.sin(angle)];
  const back = [rx + side * span * 0.55 * Math.cos(angle - 0.5), ry - span * 0.55 * Math.sin(angle - 0.5) + span * 0.25];
  draw.polygon(ctx, color, [[rx, ry - 4], tip, back, [rx, ry + 6]]);
}

class BirdEnemy extends Enemy {
  // 새 괴물. 공중에서 좌우로 순찰하다가, 플레이어가 가까우면 번쩍인 뒤 직선으로 돌진한다.
  // 중력을 받지 않고 구름(블록)도 통과한다. 위에서 밟으면 처치.
  static W = 36;
  static H = 26;

  constructor(x, y) {
    super(x, y);
    this.usesPlayer = true;
    this.rect = new Rect(0, 0, this.W, this.H);
    this.rect.center = [x + TILE / 2, y + TILE / 2];
    this.home = this.rect.center;
    [this.fx, this.fy] = this.rect.center;
    this.time = (x * 0.37) % 6;       // 괴물마다 날갯짓 박자가 다르게
    this.phase = "patrol";
    this.timer = 0;
    this.cooldown = 1.0;
    this.vel = [0, 0];
    this.target = [0, 0];
  }

  moveTo(x, y) {
    this.fx = x; this.fy = y;
    this.rect.center = [round(x), round(y)];
  }

  update(tiles, dt, playerRect = null) {
    this.time += dt;
    this.timer -= dt;
    this.cooldown -= dt;
    const [hx, hy] = this.home;

    if (this.phase === "patrol") {
      // 집 주변 3타일을 왕복 + 둥실둥실
      const x = hx + Math.sin(this.time * 0.8) * TILE * 3;
      this.dir = Math.cos(this.time * 0.8) > 0 ? 1 : -1;
      this.moveTo(x, hy + Math.sin(this.time * 3) * 6);
      if (playerRect && this.cooldown <= 0
          && Math.abs(playerRect.centerx - this.rect.centerx) < BIRD_RANGE * TILE
          && playerRect.centery > this.rect.centery - TILE) {
        this.phase = "aim"; this.timer = BIRD_AIM;
      }
    } else if (this.phase === "aim") {
      // 제자리에서 부르르 떨며 플레이어를 노림
      if (playerRect) {
        this.dir = playerRect.centerx < this.rect.centerx ? -1 : 1;
        this.target = playerRect.center;
      }
      if (this.timer <= 0) {
        const dx = this.target[0] - this.fx, dy = this.target[1] - this.fy;
        const d = hypot(dx, dy) || 1;
        this.vel = [dx / d * BIRD_DASH_SPEED, dy / d * BIRD_DASH_SPEED];
        this.phase = "dash"; this.timer = BIRD_DASH_TIME;
      }
    } else if (this.phase === "dash") {
      this.moveTo(this.fx + this.vel[0], this.fy + this.vel[1]);
      if (this.timer <= 0) this.phase = "return";
    } else if (this.phase === "return") {
      // 집으로 천천히 돌아감 (순찰 경로의 현재 위치로)
      const tx = hx + Math.sin(this.time * 0.8) * TILE * 3;
      const dx = tx - this.fx, dy = hy - this.fy;
      const d = hypot(dx, dy);
      if (d < 4) {
        this.phase = "patrol"; this.cooldown = BIRD_COOLDOWN;
      } else {
        this.dir = dx > 0 ? 1 : -1;
        this.moveTo(this.fx + dx / d * 2.5, this.fy + dy / d * 2.5);
      }
    }
  }

  draw(ctx, cameraX) {
    let r = this.rect.move(-cameraX, 0);
    const d = this.dir;
    const aiming = this.phase === "aim";
    if (aiming) r = r.move(int(2 * Math.sin(this.time * 60)), 0);
    const bodyColor = aiming && int(this.time * 16) % 2 ? [240, 70, 70] : BIRD;
    // 날개: 돌진 중에는 뒤로 접음
    const flap = this.phase === "dash" ? 0.2 : 0.6 * Math.sin(this.time * 14);
    for (const side of [-1, 1]) drawWing(ctx, BIRD_DARK, [r.centerx + side * 6, r.centery - 2], 22, flap, side);
    draw.ellipse(ctx, BIRD_DARK, r.inflate(4, 4));
    draw.ellipse(ctx, bodyColor, r);
    const belly = new Rect(0, 0, r.width >> 1, r.height >> 1);
    belly.midbottom = [r.centerx - d * 2, r.bottom - 2];
    draw.ellipse(ctx, BIRD_BELLY, belly);
    // 부리
    const bx = r.centerx + d * ((r.width >> 1) - 2);
    draw.polygon(ctx, BEAK, [[bx, r.centery - 4], [bx + d * 12, r.centery + 1], [bx, r.centery + 5]]);
    // 화난 눈
    const ex = r.centerx + d * 7, ey = r.y + 9;
    draw.circle(ctx, WHITE, [ex, ey], 5);
    draw.circle(ctx, BLACK, [ex + d * 2, ey], 2);
    draw.line(ctx, BLACK, [ex - d * 6, ey - 7], [ex + d * 5, ey - 3], 2);
  }
}

class HopEnemy extends Enemy {
  // 뛰는 괴물. 잠깐 웅크렸다가 플레이어 쪽으로 깡충 뛴다.
  // 착지할 곳이 없으면(낭떠러지) 제자리에서 뛴다. 위에서 밟으면 처치.
  static W = 34;
  static H = 28;

  constructor(x, y) {
    super(x, y);
    this.usesPlayer = true;
    this.vx = 0;
    this.onGround = false;
    this.timer = HOP_WAIT * (0.4 + 0.6 * (Math.floor(x / TILE) % 4) / 4);
  }

  update(tiles, dt, playerRect = null) {
    this.time += dt;
    if (this.onGround) {
      this.timer -= dt;
      if (this.timer <= 0) {
        let toward = this.dir;
        if (playerRect && Math.abs(playerRect.centerx - this.rect.centerx) < HOP_RANGE * TILE) {
          toward = playerRect.centerx < this.rect.centerx ? -1 : 1;
        }
        this.dir = toward;
        // 착지 예상 지점 아래에 블록이 있을 때만 앞으로 뜀
        const air = 2 * -HOP_VY / GRAVITY;
        const landX = this.rect.centerx + toward * HOP_VX * air;
        const probe = new Rect(landX - 2, this.rect.bottom + 1, 4, 4);
        this.vx = probe.collidelist(tiles) !== -1 ? toward * HOP_VX : 0;
        this.vy = HOP_VY;
        this.onGround = false;
        this.timer = HOP_WAIT;
      }
    }

    this.rect.x += round(this.vx);
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.vx > 0) this.rect.right = t.left;
        else if (this.vx < 0) this.rect.left = t.right;
        this.vx = 0;
      }
    }
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);
    this.rect.y += round(this.vy);
    this.onGround = false;
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.vy > 0) {
          this.rect.bottom = t.top;
          this.onGround = true;
          this.vx = 0;
        } else {
          this.rect.top = t.bottom;
        }
        this.vy = 0;
      }
    }
  }

  draw(ctx, cameraX) {
    const r = this.rect.move(-cameraX, 0);
    const d = this.dir;
    // 뛰기 직전 웅크림, 공중에서는 길쭉
    let q = 1.0;
    if (this.onGround && this.timer < 0.3) q = 0.7;
    else if (!this.onGround) q = 1.2;
    const body = new Rect(0, 0, int(r.width / q), int(r.height * q));
    body.midbottom = r.midbottom;
    // 뒷다리
    for (const side of [-1, 1]) draw.ellipse(ctx, HOP_DARK, new Rect(body.centerx + side * 12 - 8, body.bottom - 10, 16, 10));
    draw.ellipse(ctx, HOP_DARK, body.inflate(4, 4));
    draw.ellipse(ctx, HOP, body);
    const belly = new Rect(0, 0, body.width >> 1, body.height >> 1);
    belly.midbottom = [body.centerx + d * 3, body.bottom - 2];
    draw.ellipse(ctx, HOP_BELLY, belly);
    // 머리 위로 튀어나온 큰 눈
    for (const ox of [-8, 8]) {
      const ex = body.centerx + ox + d * 3, ey = body.y + 2;
      draw.circle(ctx, HOP_DARK, [ex, ey], 8);
      draw.circle(ctx, WHITE, [ex, ey], 6);
      draw.circle(ctx, BLACK, [ex + d * 2, ey], 3);
    }
    // 입
    draw.arc(ctx, BLACK, new Rect(body.centerx - 8 + d * 4, body.y + 8, 16, 10), Math.PI, 2 * Math.PI, 2);
  }
}

class AimedFireball {
  // 목표 지점을 겨냥해 직선으로 날아가는 불덩이 (작은 용, 마왕 드래곤)
  constructor(pos, target, speed, radius = 12) {
    [this.x, this.y] = pos;
    const dx = target[0] - this.x, dy = target[1] - this.y;
    const d = hypot(dx, dy) || 1;
    this.vx = dx / d * speed; this.vy = dy / d * speed;
    this.dir = this.vx > 0 ? 1 : -1;
    this.R = radius;
    this.harmful = true;
    this.life = FIREBALL_LIFE;
  }

  get rect() { return new Rect(this.x - this.R, this.y - this.R, this.R * 2, this.R * 2); }

  update(tiles, dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt;
    return this.life > 0 && this.rect.collidelist(tiles) === -1;
  }

  draw(ctx, cameraX, time) {
    const c = [this.x - cameraX, this.y];
    for (let i = 1; i < 4; i++) {   // 꼬리
      draw.circle(ctx, FIRE_OUT, [c[0] - this.vx * i * 1.5, c[1] - this.vy * i * 1.5], Math.max(2, this.R - 3 * i));
    }
    const flick = int(2 * Math.sin(time * 30 + this.x));
    draw.circle(ctx, FIRE_OUT, c, this.R + flick);
    draw.circle(ctx, FIRE_IN, c, Math.floor(this.R / 2) + 1);
  }
}

class WyrmEnemy extends BirdEnemy {
  // 작은 용. 새 괴물처럼 공중을 순찰하지만 돌진하지 않고, 플레이어를 겨냥해 불덩이를 쏜다.
  // (불덩이는 넉백만, 몸에 부딪히면 목숨 -1). 밟으면 처치.
  static W = 40;
  static H = 30;

  constructor(x, y) {
    super(x, y);
    this.cooldown = WYRM_INTERVAL * (0.4 + 0.6 * (Math.floor(x / TILE) % 5) / 5);
  }

  get warming() { return this.cooldown < WYRM_WARN; }

  update(tiles, dt, playerRect = null, fireballs = null) {
    this.time += dt;
    const [hx, hy] = this.home;
    const x = hx + Math.sin(this.time * 0.7) * TILE * 2.5;
    this.moveTo(x, hy + Math.sin(this.time * 2.5) * 8);
    if (!playerRect) return;
    this.dir = playerRect.centerx < this.rect.centerx ? -1 : 1;
    const inRange = Math.abs(playerRect.centerx - this.rect.centerx) < WYRM_RANGE * TILE;
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      if (inRange && fireballs) {
        const mouth = [this.rect.centerx + this.dir * ((this.W >> 1) + 6), this.rect.centery + 2];
        fireballs.push(new AimedFireball(mouth, playerRect.center, WYRM_FIRE_SPEED, 9));
      }
      this.cooldown = WYRM_INTERVAL;
    }
  }

  draw(ctx, cameraX) {
    const r = this.rect.move(-cameraX, 0);
    const d = this.dir;
    const flap = 0.6 * Math.sin(this.time * 10);
    for (const side of [-1, 1]) drawWing(ctx, WYRM_DARK, [r.centerx + side * 6, r.centery - 4], 26, flap, side);
    // 꼬리
    const tx = r.centerx - d * 18;
    draw.polygon(ctx, WYRM_DARK, [[tx, r.centery - 3], [tx - d * 18, r.centery + 8], [tx, r.centery + 6]]);
    draw.ellipse(ctx, WYRM_DARK, r.inflate(4, 4));
    draw.ellipse(ctx, WYRM, r);
    const belly = new Rect(0, 0, r.width >> 1, r.height >> 1);
    belly.midbottom = [r.centerx, r.bottom - 2];
    draw.ellipse(ctx, WYRM_BELLY, belly);
    // 주둥이 + 입 (쏘기 전 달아오름)
    const snout = new Rect(0, 0, 18, 12);
    snout.center = [r.centerx + d * ((r.width >> 1) + 2), r.centery + 1];
    draw.ellipse(ctx, WYRM_DARK, snout.inflate(2, 2));
    draw.ellipse(ctx, WYRM, snout);
    if (this.warming) draw.circle(ctx, FIRE_IN, [snout.centerx + d * 6, snout.centery + 2], 4);
    // 작은 뿔 두 개 + 눈
    for (const k of [-4, 4]) {
      const hx = r.centerx + d * 4 + k;
      draw.polygon(ctx, WYRM_DARK, [[hx - 3, r.y + 3], [hx + 3, r.y + 3], [hx - d * 2, r.y - 7]]);
    }
    const ex = r.centerx + d * 9, ey = r.y + 10;
    draw.circle(ctx, [255, 230, 80], [ex, ey], 5);
    draw.ellipse(ctx, BLACK, new Rect(ex + d - 1, ey - 4, 3, 8));
  }
}
