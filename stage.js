/* stage.js — тяжёлые интерактивы: 3D-скан зуба, живой пар, шторка «до/после» */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- utils */
  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height, ctx };
  }
  function onVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { threshold: 0.05 }).observe(el);
  }

  /* ============================================================ 3D TOOTH ==
     Программно построенный меш зуба (коронка + два корня), софт-рендер
     в canvas 2D: перспектива, z-сортировка, ламберт + блик, скан-линия. */
  function buildTooth() {
    const verts = [], tris = [];
    const push = (v) => verts.push(v) - 1;

    /* ---- коронка: замкнутый купол с четырьмя буграми ---- */
    const CU = 40, CV = 18, cBase = verts.length;
    for (let v = 0; v <= CV; v++) {
      const t = v / CV;                                  // 0 — макушка, 1 — шейка
      for (let u = 0; u < CU; u++) {
        const a2 = (u / CU) * Math.PI * 2;
        const cusp = Math.cos(a2 * 2);
        // профиль: узко сверху, пузо на 0.45, сужение к шейке
        const prof = Math.sin(Math.PI * (0.19 + 0.70 * t));   // пузо посередине, сужение к шейке
        const r = (0.27 + 0.62 * prof) * (1 + cusp * 0.055 * (1 - t));
        const y = 0.84 - t * 1.00 + (1 - t) * (1 - t) * (cusp * 0.11 - 0.04);
        push([Math.cos(a2) * r, y, Math.sin(a2) * r * 0.82]);
      }
    }
    for (let v = 0; v < CV; v++)
      for (let u = 0; u < CU; u++) {
        const u2 = (u + 1) % CU, i = cBase + v * CU;
        tris.push([i + u, i + u2, i + CU + u2], [i + u, i + CU + u2, i + CU + u]);
      }
    // шапка макушки
    const apex = verts.length;
    push([0, 0.95, 0]);
    for (let u = 0; u < CU; u++) tris.push([apex, cBase + ((u + 1) % CU), cBase + u]);

    /* ---- два корня ---- */
    const RU2 = 26, RV2 = 14;
    for (const side of [-1, 1]) {
      const base = verts.length;
      for (let v = 0; v <= RV2; v++) {
        const t = v / RV2;                               // 0 — у шейки, 1 — кончик
        const r = 0.34 * Math.pow(1 - t, 0.58) + 0.012;
        const y = 0.06 - t * 1.44;                       // старт внутри коронки — без стыка
        const bend = side * (0.20 + 0.24 * t + 0.10 * t * t);
        for (let u = 0; u < RU2; u++) {
          const a2 = (u / RU2) * Math.PI * 2;
          push([Math.cos(a2) * r + bend, y, Math.sin(a2) * r * 0.9]);
        }
      }
      for (let v = 0; v < RV2; v++)
        for (let u = 0; u < RU2; u++) {
          const u2 = (u + 1) % RU2, i = base + v * RU2;
          tris.push([i + u, i + u2, i + RU2 + u2], [i + u, i + RU2 + u2, i + RU2 + u]);
        }
    }
    return { verts, tris };
  }

  function initTooth() {
    const canvas = document.querySelector('[data-tooth]');
    if (!canvas) return;
    const mesh = buildTooth();
    let W = 0, H = 0, ctx = null, live = true, raf = 0;
    let rotY = 0.5, rotX = -0.12, targetY = 0.5, targetX = -0.12;
    let dragging = false, lastX = 0, lastY = 0, auto = true, scan = 0;

    const resize = () => { const f = fitCanvas(canvas); W = f.w; H = f.h; ctx = f.ctx; };
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; auto = false; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      targetY += (e.clientX - lastX) * 0.0075;
      targetX = Math.max(-0.85, Math.min(0.85, targetX + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    });
    const stop = () => { dragging = false; canvas.style.cursor = 'grab'; setTimeout(() => { auto = true; }, 2200); };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.style.cursor = 'grab';

    onVisible(canvas, (vis) => { live = vis; if (vis && !raf) raf = requestAnimationFrame(frame); });

    function frame() {
      raf = 0;
      if (!live) return;
      if (auto && !reduced) targetY += 0.0042;
      rotY += (targetY - rotY) * 0.09;
      rotX += (targetX - rotX) * 0.09;
      scan = (scan + 0.0055) % 1;

      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const scale = Math.min(W, H) * 0.30;
      const cxp = W / 2, cyp = H / 2 + scale * 0.12, dist = 6.4;

      const P = mesh.verts.map(([x, y, z]) => {
        let X = x * cy + z * sy, Z = -x * sy + z * cy;
        let Y = y * cx - Z * sx; Z = y * sx + Z * cx;
        const p = dist / (dist - Z);
        return [cxp + X * scale * p, cyp - Y * scale * p, Z];
      });

      ctx.clearRect(0, 0, W, H);

      // мягкая тень-подложка
      const sh = ctx.createRadialGradient(cxp, cyp + scale * 1.25, 2, cxp, cyp + scale * 1.25, scale * 1.5);
      sh.addColorStop(0, 'rgba(19,39,36,.20)'); sh.addColorStop(1, 'rgba(19,39,36,0)');
      ctx.fillStyle = sh;
      ctx.beginPath(); ctx.ellipse(cxp, cyp + scale * 1.22, scale * 1.35, scale * 0.2, 0, 0, 7); ctx.fill();

      const L = [-0.42, 0.72, 0.56];
      const faces = [];
      for (let i = 0; i < mesh.tris.length; i++) {
        const [a, b, c] = mesh.tris[i];
        const A = P[a], B = P[b], C = P[c];
        const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
        if (cross <= 0) continue;                        // backface cull
        const va = mesh.verts[a], vb = mesh.verts[b], vc = mesh.verts[c];
        let nx = (vb[1] - va[1]) * (vc[2] - va[2]) - (vb[2] - va[2]) * (vc[1] - va[1]);
        let ny = (vb[2] - va[2]) * (vc[0] - va[0]) - (vb[0] - va[0]) * (vc[2] - va[2]);
        let nz = (vb[0] - va[0]) * (vc[1] - va[1]) - (vb[1] - va[1]) * (vc[0] - va[0]);
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        let rx = nx * cy + nz * sy, rz = -nx * sy + nz * cy;
        let ry = ny * cx - rz * sx; rz = ny * sx + rz * cx;
        const diff = Math.max(0, rx * L[0] + ry * L[1] + rz * L[2]);
        const spec = Math.pow(Math.max(0, rz), 14);
        const rim = Math.pow(1 - Math.max(0, rz), 3);
        faces.push({ z: (A[2] + B[2] + C[2]) / 3, A, B, C, diff, spec, rim, my: (va[1] + vb[1] + vc[1]) / 3 });
      }
      faces.sort((f, g) => f.z - g.z);

      for (const f of faces) {
        const base = f.my < -0.28 ? [232, 216, 198] : [250, 253, 252];  // корни теплее коронки
        const l = 0.68 + f.diff * 0.36;
        const r = Math.min(255, base[0] * l + f.spec * 120 + f.rim * 4);
        const g = Math.min(255, base[1] * l + f.spec * 120 + f.rim * 16);
        const b = Math.min(255, base[2] * l + f.spec * 120 + f.rim * 15);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.beginPath();
        ctx.moveTo(f.A[0], f.A[1]); ctx.lineTo(f.B[0], f.B[1]); ctx.lineTo(f.C[0], f.C[1]);
        ctx.closePath(); ctx.fill();
      }

      // скан-полоса как у интраорального сканера
      if (!reduced) {
        const top = cyp - scale * 1.35, bottom = cyp + scale * 1.45;
        const y = top + (bottom - top) * scan;
        const grad = ctx.createLinearGradient(0, y - 26, 0, y + 26);
        grad.addColorStop(0, 'rgba(14,157,140,0)');
        grad.addColorStop(0.5, 'rgba(14,157,140,.5)');
        grad.addColorStop(1, 'rgba(14,157,140,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad; ctx.fillRect(0, y - 26, W, 52);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(14,157,140,.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.1, y); ctx.lineTo(W * 0.9, y); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ========================================================== BANYA STEAM ==
     Пар над фото парной: подъёмная сила, завихрение, рассеивание. */
  function initSteam() {
    const canvas = document.querySelector('[data-steam]');
    if (!canvas) return;
    let W = 0, H = 0, ctx = null, live = true, raf = 0, t = 0;
    const N = reduced ? 0 : 46;
    const parts = [];
    const spawn = (i) => ({
      x: 0.24 + Math.random() * 0.52,
      y: 1.02 + Math.random() * 0.25,
      r: 26 + Math.random() * 54,
      v: 0.0016 + Math.random() * 0.0026,
      a: 0.16 + Math.random() * 0.2,
      p: Math.random() * 6.28,
      w: 0.4 + Math.random() * 0.9
    });
    for (let i = 0; i < N; i++) { const p = spawn(i); p.y = Math.random() * 1.2; parts.push(p); }

    const resize = () => { const f = fitCanvas(canvas); W = f.w; H = f.h; ctx = f.ctx; };
    resize(); window.addEventListener('resize', resize);
    onVisible(canvas, (vis) => { live = vis; if (vis && !raf) raf = requestAnimationFrame(frame); });

    function frame() {
      raf = 0; if (!live) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y -= p.v;
        const drift = Math.sin(t * p.w + p.p) * 0.055 + Math.sin(t * p.w * 0.37 + p.p * 2) * 0.03;
        const px = (p.x + drift) * W;
        const py = p.y * H;
        const life = Math.min(1, (1.05 - p.y) * 1.6);           // проявляется у камней
        const fade = Math.min(1, Math.max(0, p.y * 1.9));        // тает вверху
        const alpha = p.a * life * fade;
        if (alpha > 0.002) {
          const rr = p.r * (1 + (1 - p.y) * 1.5);
          const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
          g.addColorStop(0, `rgba(255,246,232,${alpha})`);
          g.addColorStop(0.55, `rgba(240,224,203,${alpha * 0.35})`);
          g.addColorStop(1, 'rgba(240,224,203,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill();
        }
        if (p.y < -0.15) Object.assign(p, spawn());
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ======================================================= BEFORE / AFTER ==
     Перетаскиваемая шторка сравнения + блик по кузову. */
  function initCompare() {
    const root = document.querySelector('[data-compare]');
    if (!root) return;
    const after = root.querySelector('.cmp-after');
    const handle = root.querySelector('.cmp-handle');
    let pos = 0.42, target = 0.42, dragging = false, raf = 0, idle = true;

    const apply = () => {
      after.style.clipPath = `inset(0 0 0 ${pos * 100}%)`;
      handle.style.left = `${pos * 100}%`;
    };
    apply();

    const setFromEvent = (e) => {
      const r = root.getBoundingClientRect();
      target = Math.max(0.04, Math.min(0.96, (e.clientX - r.left) / r.width));
      idle = false;
    };
    root.addEventListener('pointerdown', (e) => { dragging = true; root.setPointerCapture(e.pointerId); setFromEvent(e); tick(); });
    root.addEventListener('pointermove', (e) => { if (dragging) setFromEvent(e); });
    const end = () => { dragging = false; setTimeout(() => { idle = true; }, 3000); };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);

    let t = 0;
    function tick() {
      raf = 0;
      if (idle && !reduced) { t += 0.006; target = 0.5 + Math.sin(t) * 0.3; }
      pos += (target - pos) * 0.12;
      apply();
      raf = requestAnimationFrame(tick);
    }
    onVisible(root, (vis) => { if (vis && !raf) tick(); });
  }

  function boot() { initTooth(); initSteam(); initCompare(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
