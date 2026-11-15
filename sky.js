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
      { name: 'SUMMIT 峰頂', r: 0, th: 0, row: 1.07, r0: 0.1 },
      { name: 'CAMP 營地', r: 0.55, th: 0.8, row: 0.38, r0: 0.76 },
      { name: 'TRAIL 步道', r: 0.38, th: 2.6, row: 0.74, r0: 0.36 },
      { name: 'RIDGE 稜線', r: 0.45, th: 4.3, row: 0.56, r0: 0.55 },
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

    // HUD callouts. Each label owns a fixed row and has only two possible spots (left or right
    // flank of the mountain), so the text stays still while its point moves. Labels fade in and
    // out, switch sides only after the point is clearly across, and refresh numbers 4x a second.
    ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'left'; ctx.lineWidth = 1;
    let av = null;   // area taken by the title text, so labels never sit behind it
    if (copy) { const a = copy.getBoundingClientRect(), b = cv.getBoundingClientRect(); av = { l: a.left - b.left - 10, r: a.right - b.left + 10, t: a.top - b.top - 6, b: a.bottom - b.top + 6 }; }
    const narrow = W < 760, pad4 = v => String(Math.max(0, Math.round(v))).padStart(4, '0');
    let tracked = 0;
    if (M.lock === undefined || t - M.lockT > 3200) {      // lock moves on to the next visible point
      for (let k = 1; k <= M.targets.length; k++) { const j = ((M.lock ?? -1) + k) % M.targets.length; if ((M.targets[j].seen || 0) > 0.5) { M.lock = j; break; } }
      M.lockT = t;
    }
    M.targets.forEach((p, n) => {
      const q = project(p.x, p.h, p.z, ca, sa);
      const ix = (q.sx / cell) | 0, iy = (q.sy / cell) | 0, i = iy * cols + ix;
      const seen = ix >= 0 && iy >= 0 && ix < cols && iy < rows && q.d >= z[i] - 0.06;
      p.seen = Math.max(0, Math.min(1, (p.seen || 0) + (seen ? 0.07 : -0.07)));
      if (p.seen > 0.5) tracked++;
      if (p.seen < 0.02) return;
      const locked = n === M.lock;
      ctx.globalAlpha = p.seen;
      ctx.strokeStyle = 'rgba(220,230,255,.6)';
      ctx.strokeRect(Math.round(q.sx) - 4.5, Math.round(q.sy) - 4.5, 9, 9);
      if (locked) { ctx.strokeStyle = 'rgba(120,255,200,.9)'; ctx.strokeRect(Math.round(q.sx) - 14.5, Math.round(q.sy) - 14.5, 29, 29); }
      if (M.noLabels) { ctx.globalAlpha = 1; return; }
      if (!p.txt || t - p.tt > 250) { p.tt = t; p.txt = narrow ? p.name : `${p.name}  X ${pad4(q.sx)} Y ${pad4(q.sy)}`; }
      const tw = ctx.measureText(p.txt).width, pw = tw + 12;
      const ry = Math.round(M.baseY - p.row * M.K * ce * M.S), off = p.r0 * M.S + 16;
      const xr = (q.sx - M.cx) / M.S;
      if (p.side === undefined) p.side = xr >= 0 ? 1 : -1;
      else if (xr * p.side < -0.16) p.side = -p.side;
      const spot = d => Math.max(4, Math.min(W - pw - 4, d > 0 ? M.cx + off : M.cx - off - pw));
      const blocked = x => av && x < av.r && x + pw > av.l && ry + 10 > av.t && ry - 10 < av.b;
      let x = spot(p.side);
      if (blocked(x)) { x = spot(-p.side); if (blocked(x)) { ctx.globalAlpha = 1; return; } }
      p.lx = p.lx === undefined ? x : (Math.abs(x - p.lx) < 0.6 ? x : p.lx + (x - p.lx) * 0.12);
      const bx = Math.round(p.lx);
      ctx.strokeStyle = 'rgba(220,230,255,.5)';
      ctx.beginPath(); ctx.moveTo(q.sx, q.sy); ctx.lineTo(q.sx > bx + pw / 2 ? bx + pw : bx, ry); ctx.stroke();
      // plate: dark with light text; the locked one is inverted (反白)
      ctx.fillStyle = locked ? 'rgba(244,239,207,.97)' : 'rgba(5,6,9,.86)';
      ctx.fillRect(bx, ry - 9, pw, 18);
      ctx.strokeStyle = locked ? 'rgba(120,255,200,.95)' : 'rgba(220,230,255,.4)';
      ctx.strokeRect(bx + 0.5, ry - 8.5, pw - 1, 17);
      ctx.fillStyle = locked ? '#05060a' : 'rgba(240,244,255,.98)';
      ctx.fillText(p.txt, bx + 6, ry + 4);
      ctx.globalAlpha = 1;
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
    if (!reduce && !paused) requestAnimationFrame(frame);
  }

  /* ---------- one control that pauses all motion on the page ---------- */
  let paused = false;
  try { paused = localStorage.getItem('motion') === 'off'; } catch (e) {}
  const hero = document.querySelector('.hero');
  if (hero && !reduce) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'motion-btn';
    const paint = () => {
      btn.dataset.zh = paused ? '▶ 播放動態' : '❚❚ 暫停動態';
      btn.dataset.en = paused ? '▶ PLAY MOTION' : '❚❚ PAUSE MOTION';
      btn.textContent = document.documentElement.lang === 'en' ? btn.dataset.en : btn.dataset.zh;
      btn.setAttribute('aria-pressed', String(paused));
      document.documentElement.classList.toggle('paused', paused);
    };
    btn.addEventListener('click', () => {
      paused = !paused; paint();
      try { localStorage.setItem('motion', paused ? 'off' : 'on'); } catch (e) {}
      if (!paused) requestAnimationFrame(frame);
    });
    paint(); hero.append(btn);
  }

  function resize() { sizeStars(); sizeMountain(); if (reduce || paused) frame(performance.now()); }
  addEventListener('resize', resize);
  resize();
  if (!reduce && !paused) requestAnimationFrame(frame);
})();
