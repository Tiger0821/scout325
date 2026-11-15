// 325 奎山童軍團 — starfield background + dot-matrix rotating mountain with HUD
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  /* ---------- starfield (every page) ---------- */
  const sc = document.createElement('canvas');
  sc.id = 'stars';
  sc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  document.body.prepend(sc);
  const sx = sc.getContext('2d');
  let stars = [];
  function sizeStars() {
    sc.width = innerWidth * DPR; sc.height = innerHeight * DPR;
    const n = Math.round((innerWidth * innerHeight) / 4500);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * sc.width, y: Math.random() * sc.height,
      s: (Math.random() < 0.88 ? 1 : 2) * DPR,
      p: Math.random() * 6.28, f: 0.4 + Math.random() * 1.6,
    }));
  }
  function drawStars(t) {
    sx.clearRect(0, 0, sc.width, sc.height);
    for (const s of stars) {
      const a = reduce ? 0.7 : 0.3 + 0.7 * Math.abs(Math.sin(s.p + t * 0.001 * s.f));
      sx.fillStyle = `rgba(215,225,255,${a.toFixed(2)})`;
      sx.fillRect(s.x, s.y, s.s, s.s);
    }
  }

  /* ---------- mountain (home page only) ---------- */
  const cv = document.getElementById('mountain');
  const pulse = document.getElementById('pulse');
  const copy = cv && cv.parentElement.querySelector('.hero-copy');
  let M = null;

  function height(r, th) {
    if (r >= 1) return 0;
    const n = 0.22 * Math.sin(3 * th + 1.3) + 0.14 * Math.sin(5 * th + r * 6)
            + 0.08 * Math.sin(11 * th - r * 14) + 0.05 * Math.sin(19 * th + 2);
    const ridge = 0.12 * Math.exp(-((r - 0.45) ** 2) / 0.01) * Math.max(0, Math.sin(2 * th));
    return Math.max(0, Math.pow(1 - r, 1.25) * (1 + n * r * 1.6) + ridge * (1 - r));
  }
  function hxz(x, z) { return height(Math.hypot(x, z), Math.atan2(z, x)); }

  if (cv) {
    const K = 0.95, pts = [];
    for (let ri = 0; ri <= 110; ri++) {
      const r = ri / 110, n = Math.max(6, Math.round(420 * r));
      for (let ti = 0; ti < n; ti++) {
        const th = (ti / n) * Math.PI * 2 + ri * 0.13;
        const x = r * Math.cos(th), z = r * Math.sin(th), h = hxz(x, z), e = 0.004;
        let nx = -K * (hxz(x + e, z) - hxz(x - e, z)) / (2 * e);
        let nz = -K * (hxz(x, z + e) - hxz(x, z - e)) / (2 * e);
        let ny = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        pts.push({ x, z, h, nx, ny, nz, sp: Math.random() < 0.035, snow: h > 0.7 + 0.06 * Math.sin(th * 5) });
      }
    }
    const targets = [
      { name: 'SUMMIT 峰頂', r: 0, th: 0 },
      { name: 'CAMP 營地', r: 0.55, th: 0.8 },
      { name: 'TRAIL 步道', r: 0.38, th: 2.6 },
      { name: 'RIDGE 稜線', r: 0.45, th: 4.3 },
    ].map(p => ({ ...p, x: p.r * Math.cos(p.th), z: p.r * Math.sin(p.th), h: height(p.r, p.th) }));
    M = { ctx: cv.getContext('2d'), pts, targets, K };
  }

  function sizeMountain() {
    if (!M) return;
    const r = cv.getBoundingClientRect();
    M.W = r.width; M.H = r.height;
    cv.width = M.W * DPR; cv.height = M.H * DPR;
    M.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    M.cell = M.W < 600 ? 5 : 6;
    M.cols = Math.ceil(M.W / M.cell); M.rows = Math.ceil(M.H / M.cell);
    M.z = new Float32Array(M.cols * M.rows);
    M.c = new Float32Array(M.cols * M.rows * 3);
    const sub = cv.parentElement.classList.contains('sub'), narrow = M.W < 760;
    if (sub) {
      M.S = narrow ? Math.min(M.W * 0.3, M.H * 0.4) : Math.min(M.W * 0.2, M.H * 0.52);
      M.cx = M.W * (narrow ? 0.7 : 0.74);
      M.baseY = M.H * (narrow ? 0.88 : 0.8);
      M.noLabels = narrow;
    } else {
      M.S = narrow ? Math.min(M.W * 0.44, M.H * 0.36) : Math.min(M.W * 0.3, M.H * 0.42);
      M.cx = M.W * (narrow ? 0.5 : 0.58);
      M.baseY = M.H * 0.7;
    }
    if (pulse) {
      const p = pulse.getBoundingClientRect();
      pulse.width = p.width * DPR; pulse.height = p.height * DPR;
    }
  }

  const tilt = 0.38, ce = Math.cos(tilt), se = Math.sin(tilt);
  const L = (() => { const v = [-0.55, 0.75, 0.55], l = Math.hypot(...v); return v.map(a => a / l); })();

  function project(x, y, z, ca, sa) {
    const xr = x * ca + z * sa, zr = -x * sa + z * ca;
    return {
      sx: M.cx + xr * M.S,
      sy: M.baseY - (M.jump || 0) - y * M.K * ce * M.S + zr * se * M.S * 0.6,
      d: zr * ce + y * M.K * se,
    };
  }

  function drawMountain(t, angle) {
    const { ctx, W, H, cell, cols, rows, z, c } = M;
    ctx.clearRect(0, 0, W, H);

    // ground: perspective rows of dots
    const horizon = M.baseY - 6;
    for (let k = 0, y = horizon; y < H; k++, y += 3 + k * 0.9) {
      const a = Math.min(0.55, 0.06 + k * 0.035);
      for (let x = (k % 2) * cell / 2; x < W; x += cell) {
        const edge = 1 - Math.min(1, Math.abs(x - M.cx) / (W * (0.35 + k * 0.03)));
        if (edge <= 0) continue;
        ctx.fillStyle = `rgba(140,155,190,${(a * edge).toFixed(3)})`;
        ctx.fillRect(x, y, cell * 0.75, 1.4);
      }
    }

    // rasterise point cloud into a z-buffered cell grid
    z.fill(-1e9);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (const p of M.pts) {
      const q = project(p.x, p.h, p.z, ca, sa);
      const ix = (q.sx / cell) | 0, iy = (q.sy / cell) | 0;
      if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) continue;
      const i = iy * cols + ix;
      if (q.d <= z[i]) continue;
      z[i] = q.d;
      const nx = p.nx * ca + p.nz * sa, nz = -p.nx * sa + p.nz * ca;
      const lam = Math.max(0, nx * L[0] + p.ny * L[1] + nz * L[2]);
      const s = 0.25 + 0.75 * lam;
      let r, g, b;
      if (p.sp && lam > 0.35) { r = g = b = 255; }
      else if (p.snow) { r = 200 * s + 40; g = 210 * s + 40; b = 225 * s + 30; }
      else { r = 25 + 70 * s * p.h; g = 70 + 150 * s; b = 50 + 60 * s; }
      c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
    }
    const dw = cell * 0.82, dh = cell * 0.58;
    for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) {
      const i = iy * cols + ix;
      if (z[i] === -1e9) continue;
      ctx.fillStyle = `rgb(${c[i * 3] | 0},${c[i * 3 + 1] | 0},${c[i * 3 + 2] | 0})`;
      ctx.fillRect(ix * cell, iy * cell, dw, dh);
    }

    // HUD callouts on tracked points
    ctx.font = `700 11px ${MONO}`;
    ctx.textAlign = 'left';
    // 反白 text: light on the dark sky, dark wherever it crosses the mountain
    const inv = (text, tx, by, color) => {
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = color; ctx.fillText(text, tx, by);
      const x0 = Math.max(0, ((tx - 3) / cell) | 0), x1 = Math.min(cols - 1, ((tx + tw + 3) / cell) | 0);
      const y0 = Math.max(0, ((by - 12) / cell) | 0), y1 = Math.min(rows - 1, ((by + 4) / cell) | 0);
      ctx.save(); ctx.beginPath();
      let any = false;
      for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
        const i = iy * cols + ix;
        if (z[i] === -1e9) continue;
        any = true;
        ctx.fillStyle = `rgb(${Math.min(255, c[i * 3] + 40) | 0},${Math.min(255, c[i * 3 + 1] + 40) | 0},${Math.min(255, c[i * 3 + 2] + 40) | 0})`;
        ctx.fillRect(ix * cell, iy * cell, cell, cell);
        ctx.rect(ix * cell, iy * cell, cell, cell);
      }
      if (any) { ctx.clip(); ctx.fillStyle = '#03050a'; ctx.fillText(text, tx, by); }
      ctx.restore();
    };
    ctx.lineWidth = 1;
    const lock = Math.floor(t / 2600) % M.targets.length;
    let tracked = 0;
    // area taken by the title text, so labels never sit behind it
    let av = null;
    if (copy) { const a = copy.getBoundingClientRect(), b = cv.getBoundingClientRect(); av = { l: a.left - b.left - 10, r: a.right - b.left + 10, t: a.top - b.top - 6, b: a.bottom - b.top + 6 }; }
    M.targets.forEach((p, n) => {
      const q = project(p.x, p.h, p.z, ca, sa);
      const ix = (q.sx / cell) | 0, iy = (q.sy / cell) | 0;
      const i = iy * cols + ix;
      if (ix < 0 || iy < 0 || ix >= cols || iy >= rows || q.d < z[i] - 0.06) return;
      tracked++;
      if (M.noLabels) { ctx.strokeStyle = 'rgba(220,230,255,.55)'; ctx.strokeRect(q.sx - 4, q.sy - 4, 8, 8); return; }
      const label = `${p.name}  X ${Math.round(q.sx)} Y ${Math.round(q.sy)}`;
      const tw = ctx.measureText(label).width;
      let left = q.sx > M.cx + 10 ? 1 : -1;
      const reach = 50 + n * 6, ly = q.sy - 26 - n * 4;
      if (left < 0 && q.sx - reach - tw - 8 < 0) left = 1;
      if (left > 0 && q.sx + reach + tw + 8 > W) left = -1;
      const place = d => { const lx = q.sx + d * reach; return { lx, tx: Math.max(4, Math.min(W - tw - 4, d > 0 ? lx + 4 : lx - 4 - tw)) }; };
      const blocked = o => av && o.tx < av.r && o.tx + tw > av.l && ly + 6 > av.t && ly - 10 < av.b;
      let o = place(left);
      if (blocked(o)) { left = -left; o = place(left); }
      ctx.strokeStyle = 'rgba(220,230,255,.55)';
      ctx.strokeRect(q.sx - 4, q.sy - 4, 8, 8);
      if (blocked(o) || (av && q.sx > av.l && q.sx < av.r && q.sy > av.t && q.sy < av.b)) return;   // no room: box only
      const lx = o.lx, tx = o.tx;
      ctx.beginPath(); ctx.moveTo(q.sx + left * 4, q.sy - 4); ctx.lineTo(lx, ly); ctx.stroke();
      inv(label, tx, ly + 3, 'rgba(240,244,255,.98)');
      if (n === lock) {
        ctx.strokeStyle = 'rgba(120,255,200,.9)';
        ctx.strokeRect(q.sx - 14, q.sy - 14, 28, 28);
        ctx.fillStyle = 'rgba(120,255,200,.95)';
        inv('LOCK', q.sx + 18, q.sy + 4, 'rgba(120,255,200,1)');
      }
    });
    return tracked;
  }

  /* ---------- pulse line: a heartbeat you can pluck and pump ---------- */
  const P = { bpm: 60, off: 0, last: 0, y: null, v: null, mx: -1, my: 0, step: 4 * DPR, taps: 0 };
  const hudBpm = document.getElementById('hud-bpm'), hint = document.getElementById('hud-hint');
  function beat(u) {       // a little mountain-shaped heartbeat
    if (u > 0.42 && u < 0.5) return (u - 0.42) / 0.08;
    if (u >= 0.5 && u < 0.56) return 1 - (u - 0.5) / 0.06 * 1.35;
    if (u >= 0.56 && u < 0.62) return -0.35 + (u - 0.56) / 0.06 * 0.35;
    if (u > 0.7 && u < 0.8) return 0.18 * Math.sin((u - 0.7) / 0.1 * Math.PI);
    return 0;
  }
  function drawPulse(t) {
    if (!pulse) return;
    const g = pulse.getContext('2d'), w = pulse.width, h = pulse.height;
    const n = Math.ceil(w / P.step) + 1;
    if (!P.y || P.y.length !== n) { P.y = new Float32Array(n); P.v = new Float32Array(n); }
    const dt = Math.min(50, t - P.last || 16); P.last = t;
    P.bpm += (60 - P.bpm) * dt * 0.00022;                    // calms back down to 60
    const f = Math.min(1, (P.bpm - 60) / 150);
    P.off += dt * 0.06 * DPR * (P.bpm / 60);
    // string physics: neighbours pull on each other, everything springs back to rest
    const base = h * 0.66, y = P.y, v = P.v;
    for (let i = 0; i < n; i++) {
      const l = y[i - 1] || 0, r = y[i + 1] || 0;
      v[i] += 0.28 * (l + r - 2 * y[i]) - 0.03 * y[i]; v[i] *= 0.93;
    }
    for (let i = 0; i < n; i++) {
      y[i] += v[i];
      if (P.mx >= 0) {                                         // cursor drags the line toward it
        const d = (i * P.step - P.mx) / (46 * DPR), wgt = Math.exp(-d * d);
        y[i] += ((P.my - base) - y[i]) * wgt * 0.35;
      }
    }
    const col = f < 0.5 ? [110 + 212 * f, 230 - 10 * f, 200 - 252 * f] : [216 + 32 * (f - 0.5), 225 - 320 * (f - 0.5), 74 - 60 * (f - 0.5)];
    const rgb = col.map(c => Math.max(0, Math.min(255, c | 0))).join(',');
    g.clearRect(0, 0, w, h);
    g.strokeStyle = `rgba(${rgb},.95)`; g.lineWidth = (1.5 + f * 1.5) * DPR;
    g.shadowColor = `rgba(${rgb},.9)`; g.shadowBlur = (6 + f * 10) * DPR;
    g.beginPath();
    const period = 140 * DPR, amp = h * (0.42 + 0.14 * f);
    for (let i = 0; i < n; i++) {
      const x = i * P.step, u = ((x + P.off) % period) / period;
      const py = base - beat(u) * amp + y[i];
      i ? g.lineTo(x, py) : g.moveTo(x, py);
    }
    g.stroke();
    if (hudBpm) hudBpm.textContent = `♥ ${String(Math.round(P.bpm)).padStart(3, '0')} BPM` + (P.bpm > 170 ? ' · MAX!!' : '');
    if (hudBpm) hudBpm.classList.toggle('hot', P.bpm > 120);
  }
  if (pulse) {
    const pos = e => { const r = pulse.getBoundingClientRect(); return [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; };
    const pump = x => {
      P.bpm = Math.min(220, P.bpm + 24); P.taps++;
      if (P.v) for (let i = 0; i < P.v.length; i++) { const d = (i * P.step - x) / (30 * DPR); P.v[i] -= 9 * DPR * Math.exp(-d * d); }
      if (M) M.jump = 14;
      if (hint) hint.classList.add('gone');
      if (reduce) frame(performance.now());
    };
    pulse.addEventListener('pointermove', e => { [P.mx, P.my] = pos(e); });
    pulse.addEventListener('pointerleave', () => { P.mx = -1; });
    pulse.addEventListener('pointerdown', e => { const [x] = pos(e); pump(x); });
    pulse.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pump(pulse.width / 2); } });
    pulse.tabIndex = 0; pulse.setAttribute('role', 'button');
    pulse.setAttribute('aria-label', '心跳線：點擊讓心跳加速 / Heartbeat line: tap to speed it up');
  }

  const hudT = document.getElementById('hud-t');
  const hudRot = document.getElementById('hud-rot');
  const hudTrack = document.getElementById('hud-track');

  function frame(t) {
    drawStars(t);
    if (M) {
      const mdt = Math.min(50, t - (M.lt || t)); M.lt = t;
      M.jump = (M.jump || 0) * 0.9;
      M.angle = (M.angle || 0) + mdt * 0.00018 * Math.pow(P.bpm / 60, 1.6);
      const angle = reduce ? 1.0 : M.angle;
      const n = drawMountain(t, angle);
      drawPulse(t);
      if (hudT) hudT.textContent = `t ${(t / 1000).toFixed(2).padStart(6, '0')}s`;
      if (hudRot) hudRot.textContent = (((angle * 180) / Math.PI) % 360).toFixed(2).padStart(6, '0') + '°';
      if (hudTrack) hudTrack.textContent = `TRACKING ${n} POINTS`;
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  function resize() { sizeStars(); sizeMountain(); if (reduce) frame(0); }
  addEventListener('resize', resize);
  resize();
  if (!reduce) requestAnimationFrame(frame);
})();
