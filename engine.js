// 파이썬 pygame 의 Rect / draw 를 흉내 낸 작은 도우미 (게임 코드를 파이썬 버전과 거의 같게 옮기기 위해)

class Rect {
  constructor(x, y, w, h) {
    this.x = Math.trunc(x); this.y = Math.trunc(y);
    this.w = Math.trunc(w); this.h = Math.trunc(h);
  }
  get width() { return this.w; }
  get height() { return this.h; }
  get left() { return this.x; }
  set left(v) { this.x = Math.trunc(v); }
  get right() { return this.x + this.w; }
  set right(v) { this.x = Math.trunc(v) - this.w; }
  get top() { return this.y; }
  set top(v) { this.y = Math.trunc(v); }
  get bottom() { return this.y + this.h; }
  set bottom(v) { this.y = Math.trunc(v) - this.h; }
  get centerx() { return this.x + (this.w >> 1); }
  set centerx(v) { this.x = Math.trunc(v) - (this.w >> 1); }
  get centery() { return this.y + (this.h >> 1); }
  set centery(v) { this.y = Math.trunc(v) - (this.h >> 1); }
  get center() { return [this.centerx, this.centery]; }
  set center([cx, cy]) { this.centerx = cx; this.centery = cy; }
  get midbottom() { return [this.centerx, this.bottom]; }
  set midbottom([cx, b]) { this.centerx = cx; this.bottom = b; }
  copy() { return new Rect(this.x, this.y, this.w, this.h); }
  move(dx, dy) { return new Rect(this.x + dx, this.y + dy, this.w, this.h); }
  inflate(dx, dy) {
    return new Rect(this.x - Math.trunc(dx / 2), this.y - Math.trunc(dy / 2), this.w + dx, this.h + dy);
  }
  colliderect(o) {
    return this.x < o.x + o.w && o.x < this.x + this.w && this.y < o.y + o.h && o.y < this.y + this.h;
  }
  collidelist(list) {
    for (let i = 0; i < list.length; i++) if (this.colliderect(list[i])) return i;
    return -1;
  }
}

// 파이썬 round: .5 는 짝수 쪽으로 (JS Math.round 는 -1.5 → -1 이라 왼쪽 이동이 느려짐)
function round(v) {
  const f = Math.floor(v), diff = v - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
const int = Math.trunc;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hypot = Math.hypot;
const randint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
// 파이썬처럼 항상 양수가 나오는 나머지
const mod = (a, b) => ((a % b) + b) % b;

function css(c) {
  return c.length === 4 ? `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---------- pygame.draw 흉내 ----------
const draw = {
  rect(ctx, color, r, width = 0) {
    if (width) {
      ctx.strokeStyle = css(color); ctx.lineWidth = width;
      ctx.strokeRect(r.x + width / 2, r.y + width / 2, r.w - width, r.h - width);
    } else {
      ctx.fillStyle = css(color); ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  },
  ellipse(ctx, color, r, width = 0) {
    const rx = r.w / 2, ry = r.h / 2;
    if (rx <= 0 || ry <= 0) return;
    ctx.beginPath();
    if (width) {
      ctx.ellipse(r.x + rx, r.y + ry, Math.max(0.5, rx - width / 2), Math.max(0.5, ry - width / 2), 0, 0, Math.PI * 2);
      ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.stroke();
    } else {
      ctx.ellipse(r.x + rx, r.y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(color); ctx.fill();
    }
  },
  circle(ctx, color, c, radius, width = 0) {
    if (radius <= 0) return;
    ctx.beginPath();
    ctx.arc(c[0], c[1], radius, 0, Math.PI * 2);
    if (width) { ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.stroke(); }
    else { ctx.fillStyle = css(color); ctx.fill(); }
  },
  polygon(ctx, color, pts, width = 0) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (width) { ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); }
    else { ctx.fillStyle = css(color); ctx.fill(); }
  },
  line(ctx, color, a, b, width = 1) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
  },
  lines(ctx, color, closed, pts, width = 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
    ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  },
  // pygame 의 arc 는 반시계 방향(위쪽이 +) 각도
  arc(ctx, color, r, start, stop, width = 1) {
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, -stop, -start);
    ctx.strokeStyle = css(color); ctx.lineWidth = width; ctx.stroke();
  },
};

// 오래된 사파리(iOS 15 이하)용 roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}
