// 파이썬 level.py 를 옮긴 것

function drawStrawberry(ctx, center, size, color = BERRY, seed = BERRY_SEED, outline = [140, 10, 30]) {
  // 아래로 뾰족한 몸통 + 씨 + 초록 꼭지 (색을 바꾸면 황금 딸기)
  const [cx, cy] = center;
  const h = size;
  const body = [[cx - h * 0.45, cy - h * 0.2], [cx - h * 0.3, cy - h * 0.35], [cx + h * 0.3, cy - h * 0.35],
    [cx + h * 0.45, cy - h * 0.2], [cx + h * 0.3, cy + h * 0.25], [cx, cy + h * 0.5],
    [cx - h * 0.3, cy + h * 0.25]];
  draw.polygon(ctx, color, body);
  draw.polygon(ctx, outline, body, 2);
  for (const [sx, sy] of [[-0.2, -0.1], [0.15, -0.15], [0, 0.1], [-0.12, 0.25], [0.18, 0.15], [0.3, -0.05], [-0.3, 0]]) {
    draw.circle(ctx, seed, [cx + sx * h, cy + sy * h], Math.max(1, Math.floor(h / 14)));
  }
  for (const lx of [-0.3, -0.1, 0.1, 0.3]) {
    draw.polygon(ctx, LEAF, [[cx, cy - h * 0.3], [cx + lx * h - h * 0.08, cy - h * 0.45], [cx + lx * h + h * 0.08, cy - h * 0.45]]);
  }
  draw.line(ctx, LEAF, [cx, cy - h * 0.35], [cx + 2, cy - h * 0.55], 3);
}

function drawHeart(ctx, center, size, color = HEART, outline = HEART_DARK) {
  // 원 두 개 + 아래 삼각형으로 하트 모양
  const [cx, cy] = center;
  const r = Math.floor(size / 4);
  const half = Math.floor(size / 2), rh = Math.floor(r / 2);
  const pts = [[cx - half, cy - rh], [cx + half, cy - rh], [cx, cy + half]];
  for (const [col, grow] of [[outline, 2], [color, 0]]) {
    draw.circle(ctx, col, [cx - r, cy - rh], r + grow);
    draw.circle(ctx, col, [cx + r, cy - rh], r + grow);
    draw.polygon(ctx, col, [[pts[0][0] - grow, pts[0][1]], [pts[1][0] + grow, pts[1][1]], [pts[2][0], pts[2][1] + grow]]);
  }
}

class Level {
  constructor(stage) {
    let rows = stage.rows;
    this.sky = stage.sky;
    this.groundColor = stage.ground;
    this.topColor = stage.top;
    this.clouds = stage.clouds || false;   // 하늘 스테이지: 배경 구름
    const width = Math.max(...rows.map(r => r.length));
    rows = rows.map(r => r.padEnd(width, "."));

    this.tiles = [];
    this.coins = [];
    this.hearts = [];
    this.berries = [];
    this.fires = [];
    this.spikes = [];
    this.hazards = [];       // 닿으면 죽는 충돌 박스 (불 + 가시)
    this.spawns = { E: [], D: [], Z: [], V: [], J: [], R: [] };
    this.flag = null;
    this.bossSpawn = null;
    this.gateX = null;
    this.gateTiles = [];
    this.golden = null;      // 보스 처치 후 나타나는 황금 딸기
    this.playerStart = [TILE, TILE];
    this.gateClosedAt = null;

    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c], x = c * TILE, y = r * TILE;
        if (ch === "X") this.tiles.push(new Rect(x, y, TILE, TILE));
        else if (ch === "P") this.playerStart = [x, y];
        else if (ch === "C") this.coins.push(new Rect(x + 10, y + 10, 20, 20));
        else if (ch === "S") this.berries.push(new Rect(x + 6, y + 6, 28, 28));
        else if (ch === "H") this.hearts.push(new Rect(x + 8, y + 8, 24, 24));
        else if (ch in this.spawns) this.spawns[ch].push([x, y]);
        else if (ch === "~") {
          this.fires.push(new Rect(x, y, TILE, TILE));
          this.hazards.push(new Rect(x + 6, y + 12, TILE - 12, TILE - 12));
        } else if (ch === "^") {
          this.spikes.push(new Rect(x, y, TILE, TILE));
          this.hazards.push(new Rect(x + 6, y + TILE / 2, TILE - 12, TILE / 2));
        } else if (ch === "B") this.bossSpawn = [x + TILE / 2, y + TILE];
        else if (ch === "|") {
          this.gateX = x;
          this.gateTiles = [];
          for (let gy = 0; gy <= r; gy++) this.gateTiles.push(new Rect(x, gy * TILE, TILE, TILE));
        } else if (ch === "F") {
          this.flag = new Rect(x + TILE / 2 - 3, y - TILE * 3, 6, TILE * 4);
        }
      }
    });

    this.width = width * TILE;
    this.height = rows.length * TILE;
    this.time = 0;
    // 블록 위/아래가 비었는지 미리 계산 (그리기용)
    const key = (t) => t.x + "," + t.y;
    this.tileSet = new Set(this.tiles.map(key));
  }

  update(dt) { this.time += dt; }

  get gateClosed() { return this.gateClosedAt !== null; }

  closeGate() {
    this.tiles.push(...this.gateTiles);
    this.gateClosedAt = this.time;
  }

  // ---------- 그리기 ----------
  draw(ctx, cameraX) {
    const view = new Rect(cameraX - TILE, 0, WIDTH + TILE * 2, this.height);
    if (this.clouds) this.drawBgClouds(ctx, cameraX);

    const has = (x, y) => this.tileSet.has(x + "," + y);
    for (const t of this.tiles) {
      if (!view.colliderect(t) || this.gateTiles.includes(t)) continue;
      const r = t.move(-cameraX, 0);
      // 이음새가 안 보이게 살짝 겹쳐 그림
      ctx.fillStyle = css(this.groundColor);
      ctx.fillRect(r.x, r.y, TILE + 0.5, TILE + 0.5);
      if (!has(t.x, t.y - TILE)) draw.rect(ctx, this.topColor, new Rect(r.x, r.y, TILE, 8));
      if (this.clouds && !has(t.x, t.y + TILE)) {
        // 구름 발판 아래쪽 그림자: 배경 구름과 구분되게
        draw.rect(ctx, [170, 195, 230], new Rect(r.x, r.bottom - 8, TILE, 8));
      }
    }

    // 보스 방 문: 위에서 쿵 내려옴
    if (this.gateClosed) {
      const drop = Math.min(1, (this.time - this.gateClosedAt) * 4);
      const off = int((1 - drop) * -this.gateTiles.length * TILE);
      for (const t of this.gateTiles) {
        const r = t.move(-cameraX, off);
        draw.rect(ctx, GATE, r);
        draw.rect(ctx, [60, 60, 70], r, 3);
      }
    }

    for (const s of this.spikes) if (view.colliderect(s)) this.drawSpike(ctx, s.move(-cameraX, 0));
    for (const f of this.fires) if (view.colliderect(f)) this.drawFire(ctx, f.move(-cameraX, 0));
    for (const c of this.coins) if (view.colliderect(c)) this.drawCoin(ctx, c.move(-cameraX, 0));

    for (const h of this.hearts) {
      if (view.colliderect(h)) {
        // 둥실둥실 떠 있는 하트
        const bob = int(4 * Math.sin(this.time * 3 + h.x * 0.05));
        drawHeart(ctx, [h.centerx - cameraX, h.centery + bob], 24);
      }
    }
    for (const b of this.berries) {
      if (view.colliderect(b)) {
        const bob = int(5 * Math.sin(this.time * 4));
        drawStrawberry(ctx, [b.centerx - cameraX, b.centery + bob], 30);
      }
    }
    if (this.golden) {
      const g = this.golden;
      const bob = int(6 * Math.sin(this.time * 3));
      const c = [g.centerx - cameraX, g.centery + bob];
      for (let i = 0; i < 8; i++) {   // 반짝이는 빛줄기
        const a = this.time * 2 + i * Math.PI / 4;
        draw.line(ctx, GOLD_SEED, c, [c[0] + Math.cos(a) * 46, c[1] + Math.sin(a) * 46], 2);
      }
      drawStrawberry(ctx, c, 48, GOLD, GOLD_SEED, GOLD_DARK);
    }
    if (this.flag && view.colliderect(this.flag)) this.drawFlag(ctx, this.flag.move(-cameraX, 0));
  }

  drawBgClouds(ctx, cameraX) {
    // 멀리 있는 구름: 카메라보다 천천히 움직이고, 하늘색에 섞어 흐리게 (밟을 수 있는 구름과 구분)
    const faded = this.sky.map(c => (c + 255) >> 1);
    for (let i = 0; i < 14; i++) {
      const span = WIDTH + 300;
      const x = mod(i * 397 - cameraX * 0.3, span) - 150;
      const y = 40 + (i * 131) % 260;
      const s = 0.6 + (i % 3) * 0.3;
      for (const [ox, oy, rw, rh] of [[0, 10, 90, 34], [24, -4, 70, 40], [56, 8, 80, 32]]) {
        draw.ellipse(ctx, faded, { x: x + ox * s, y: y + oy * s, w: rw * s, h: rh * s });
      }
    }
  }

  drawSpike(ctx, r) {
    // 타일 하나에 가시 3개
    const w = Math.floor(TILE / 3);
    for (let i = 0; i < 3; i++) {
      const x0 = r.x + i * w;
      const pts = [[x0, r.bottom], [x0 + w, r.bottom], [x0 + Math.floor(w / 2), r.bottom - TILE / 2 - 4]];
      draw.polygon(ctx, SPIKE, pts);
      draw.polygon(ctx, SPIKE_DARK, pts, 2);
    }
  }

  drawFire(ctx, r) {
    // 시간과 위치에 따라 흔들리는 불꽃
    const flick = Math.sin(this.time * 14 + r.x * 0.1);
    const h = TILE * 0.8 + flick * 5;
    const cx = r.centerx + flick * 3;
    const base = r.bottom;
    draw.polygon(ctx, FIRE_OUT, [[r.x + 4, base], [r.right - 4, base], [r.right - 8, base - h * 0.5],
      [cx + 4, base - h], [cx - 2, base - h * 0.6], [r.x + 8, base - h * 0.45]]);
    draw.polygon(ctx, FIRE_IN, [[r.x + 12, base], [r.right - 12, base], [cx + 2, base - h * 0.55], [cx - 3, base - h * 0.35]]);
  }

  drawCoin(ctx, r) {
    // 가로폭을 바꿔서 회전하는 것처럼 보이게
    const w = Math.max(4, int(r.width * Math.abs(Math.cos(this.time * 4 + r.x * 0.05))));
    const cr = new Rect(0, 0, w, r.height);
    cr.center = r.center;
    draw.ellipse(ctx, COIN_DARK, cr.inflate(4, 4));
    draw.ellipse(ctx, COIN, cr);
  }

  drawFlag(ctx, r) {
    draw.rect(ctx, FLAG_POLE, r);
    draw.circle(ctx, COIN, [r.centerx, r.top], 6);
    draw.polygon(ctx, FLAG, [[r.right, r.top + 6], [r.right + 32, r.top + 20], [r.right, r.top + 34]]);
  }
}
