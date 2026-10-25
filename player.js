// 파이썬 player.py 를 옮긴 것

class Player {
  static W = 36;
  static H = 32;   // 충돌 박스 크기

  constructor(x, y) {
    this.rect = new Rect(x, y, Player.W, Player.H);
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;          // 1 = 오른쪽, -1 = 왼쪽
    this.longJumping = false; // 롱점프 중에는 점프키를 떼도 상승 유지
    this.knockback = 0;       // 넉백 남은 프레임 (이동 입력 무시)
    this.kbDir = 0;
    // 슬라임 연출용
    this.squash = 1.0;        // 1보다 작으면 납작, 크면 길쭉
    this.time = 0;
  }

  jump() {
    if (this.onGround) {
      this.vy = JUMP_SPEED;
      this.onGround = false;
      this.squash = 1.35;    // 점프 순간 쭉 늘어남
    }
  }

  longJump() {
    // 높이 점프: 일반 점프보다 훨씬 높이 솟아오름
    if (this.onGround && this.knockback === 0) {
      this.vy = LONG_JUMP_VY;
      this.onGround = false;
      this.longJumping = true;
      this.squash = 1.6;
    }
  }

  cutJump() {
    // 점프키를 일찍 떼면 상승을 끊어서 짧게 점프 (롱점프는 제외)
    if (!this.longJumping && this.vy < JUMP_CUT) this.vy = JUMP_CUT;
  }

  knockBack(direction) {
    // 몬스터에 부딪혔을 때: direction 쪽으로 약 4타일 밀려남
    this.knockback = KNOCKBACK_FRAMES;
    this.kbDir = direction;
    this.vy = KNOCKBACK_VY;
    this.onGround = false;
    this.longJumping = false;
    this.squash = 0.6;
  }

  bounce(speed) {
    // 적을 밟았을 때
    this.vy = speed;
    this.onGround = false;
    this.squash = 1.3;
  }

  // move: -1 왼쪽, 0 없음, 1 오른쪽
  update(move, tiles, dt) {
    this.time += dt;

    if (this.knockback > 0) {
      this.knockback -= 1;
      this.vx = this.knockback ? this.kbDir * KNOCKBACK_SPEED : 0;
    } else if (move) {
      this.vx += move * ACCEL;
      this.vx = clamp(this.vx, -MOVE_SPEED, MOVE_SPEED);
      this.facing = move;
    } else {
      this.vx *= FRICTION;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // 중력
    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL);

    // 축별로 나눠서 충돌 처리 (가로 먼저, 세로 다음)
    this.rect.x += round(this.vx);
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.vx > 0) this.rect.right = t.left;
        else if (this.vx < 0) this.rect.left = t.right;
        this.vx = 0;
      }
    }

    const wasOnGround = this.onGround;
    this.onGround = false;
    this.rect.y += round(this.vy);
    for (const t of tiles) {
      if (this.rect.colliderect(t)) {
        if (this.vy > 0) {
          this.rect.bottom = t.top;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.rect.top = t.bottom;
        }
        this.vy = 0;
      }
    }

    // 착지 순간 납작
    if (this.onGround && !wasOnGround) this.squash = 0.6;
    if (this.onGround) this.longJumping = false;
    // squash 값은 1.0으로 서서히 복귀
    this.squash += (1.0 - this.squash) * 0.15;
  }

  draw(ctx, cameraX = 0) {
    // idle 출렁임: 땅에 있을 때만 살짝
    const wobble = this.onGround ? 0.04 * Math.sin(this.time * 6) : 0;
    const sy = this.squash + wobble;
    const sx = 1 / sy;    // 부피 유지: 세로가 줄면 가로가 늘어남

    const w = int(Player.W * sx);
    const h = int(Player.H * sy);
    const cx = this.rect.centerx - cameraX;
    const bottom = this.rect.bottom;
    const x = cx - (w >> 1);
    const y = bottom - h;

    // 몸통: 위는 둥글고 아래는 평평한 반타원 느낌
    const body = new Rect(x, y, w, h);
    draw.ellipse(ctx, SLIME_DARK, body.inflate(4, 4));
    draw.ellipse(ctx, SLIME, body);
    const third = Math.floor(h / 3);
    draw.rect(ctx, SLIME, new Rect(x, bottom - third, w, third));
    draw.rect(ctx, SLIME_DARK, new Rect(x - 2, bottom - 2, w + 4, 3));

    // 하이라이트
    const hl = new Rect(0, 0, Math.max(6, Math.floor(w / 4)), Math.max(4, Math.floor(h / 5)));
    hl.center = [x + w * 0.3, y + h * 0.3];
    draw.ellipse(ctx, SLIME_LIGHT, hl);

    // 눈: 바라보는 방향으로 치우침
    const eyeDx = 6 * this.facing;
    const eyeY = y + int(h * 0.45);
    for (const ox of [-7, 7]) {
      const ex = cx + ox + eyeDx;
      draw.ellipse(ctx, WHITE, new Rect(ex - 5, eyeY - 6, 10, 12));
      draw.circle(ctx, BLACK, [ex + 2 * this.facing, eyeY], 3);
    }
  }
}
