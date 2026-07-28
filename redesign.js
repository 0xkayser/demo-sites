(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveal() {
    const elements = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduced) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    elements.forEach((element) => observer.observe(element));
  }

  function initTilt() {
    if (reduced || !window.PointerEvent) return;
    document.querySelectorAll('[data-tilt]').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        element.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
        element.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--rx', '0deg');
        element.style.setProperty('--ry', '0deg');
      });
    });
  }

  function initBanyaSteam() {
    const canvas = document.querySelector('[data-steam-canvas]');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const parent = canvas.parentElement;
    const particles = Array.from({ length: 26 }, (_, index) => ({
      x: .48 + ((index * 17) % 31) / 100,
      y: .58 + ((index * 13) % 24) / 100,
      size: 3 + (index % 5),
      speed: .00018 + (index % 4) * .00005,
      phase: index * .67
    }));
    let started = false;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time) => {
      const rect = parent.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      context.strokeStyle = 'rgba(255, 223, 186, .62)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(rect.width * .49, rect.height * .61);
      context.quadraticCurveTo(rect.width * .47, rect.height * .72, rect.width * .43, rect.height * .84);
      context.stroke();
      particles.forEach((particle) => {
        const drift = Math.sin(time * particle.speed + particle.phase) * 18;
        const lift = (time * particle.speed * 26 + particle.phase * 12) % 130;
        const x = rect.width * particle.x + drift;
        const y = rect.height * particle.y - lift;
        const opacity = Math.max(0, .5 - lift / 180);
        context.fillStyle = `rgba(255, 236, 207, ${opacity})`;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
      if (!reduced || !started) requestAnimationFrame(draw);
      started = true;
    };
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  function initInk() {
    const canvas = document.querySelector('[data-ink-canvas]');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const parent = canvas.parentElement;
    const drops = Array.from({ length: 22 }, (_, index) => ({
      x: .28 + ((index * 19) % 55) / 100,
      y: .38 + ((index * 11) % 43) / 100,
      radius: 1 + (index % 4),
      speed: .00028 + (index % 3) * .00007,
      phase: index * .9
    }));
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time) => {
      const rect = parent.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      drops.forEach((drop) => {
        const pulse = (Math.sin(time * drop.speed + drop.phase) + 1) / 2;
        const x = rect.width * drop.x + Math.sin(time * .001 + drop.phase) * 12;
        const y = rect.height * drop.y + Math.cos(time * .0012 + drop.phase) * 18;
        context.fillStyle = `rgba(89, 70, 255, ${.22 + pulse * .58})`;
        context.beginPath();
        context.arc(x, y, drop.radius + pulse * 2, 0, Math.PI * 2);
        context.fill();
      });
      context.strokeStyle = 'rgba(211, 255, 58, .62)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(rect.width * .28, rect.height * .62);
      context.lineTo(rect.width * .68, rect.height * .36);
      context.stroke();
      if (!reduced) requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  function initBanyaCycle() {
    const stage = document.querySelector('[data-banya-stage]');
    const replay = document.querySelector('[data-banya-replay]');
    if (!stage) return;
    const run = () => {
      stage.classList.remove('is-running');
      void stage.offsetWidth;
      stage.classList.add('is-running');
    };
    replay?.addEventListener('click', (event) => { event.stopPropagation(); run(); });
    stage.addEventListener('click', (event) => { if (!event.target.closest('button')) run(); });
    if (!reduced) window.setTimeout(run, 180);
    else stage.classList.add('is-running');
  }

  function initGarageLift() {
    const stage = document.querySelector('[data-garage-lift]');
    const replay = document.querySelector('[data-garage-replay]');
    const status = document.querySelector('[data-lift-status]');
    if (!stage) return;
    let timers = [];
    const clearTimers = () => { timers.forEach((timer) => window.clearTimeout(timer)); timers = []; };
    const run = () => {
      clearTimers();
      stage.classList.remove('is-running');
      void stage.offsetWidth;
      stage.classList.add('is-running');
      if (!status) return;
      status.textContent = 'LIFTING';
      timers.push(window.setTimeout(() => { status.textContent = 'RAISED'; }, 2700));
      timers.push(window.setTimeout(() => { status.textContent = 'LOWERING'; }, 4100));
      timers.push(window.setTimeout(() => { status.textContent = 'LOWERED'; }, 5900));
    };
    replay?.addEventListener('click', (event) => { event.stopPropagation(); run(); });
    stage.addEventListener('click', (event) => { if (!event.target.closest('button')) run(); });
    stage.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(); }
    });
    if (!reduced) window.setTimeout(run, 180);
    else { stage.classList.add('is-running'); if (status) status.textContent = 'RAISED'; }
  }

  function initSalonBrush() {
    const stage = document.querySelector('[data-salon-brush]');
    const replay = document.querySelector('[data-salon-replay]');
    if (!stage) return;
    const run = () => {
      stage.classList.remove('is-painting');
      void stage.offsetWidth;
      stage.classList.add('is-painting');
    };
    replay?.addEventListener('click', (event) => { event.stopPropagation(); run(); });
    if (!reduced) window.setTimeout(run, 220);
    else stage.classList.add('is-painting');
  }

  function initTattooMachine() {
    const stage = document.querySelector('[data-tattoo-machine]');
    const sketches = Array.from(document.querySelectorAll('[data-sketch]'));
    const replay = document.querySelector('[data-tattoo-replay]');
    const counter = document.querySelector('[data-tattoo-counter]');
    if (!stage || !sketches.length) return;
    let current = -1;
    let timer;
    const show = (index) => {
      current = index;
      sketches.forEach((sketch, sketchIndex) => {
        sketch.classList.toggle('is-active', sketchIndex === index);
        if (sketchIndex === index) { void sketch.offsetWidth; }
      });
      if (counter) counter.textContent = `0${index + 1} / 04`;
    };
    const next = () => show((current + 1) % sketches.length);
    const start = () => {
      window.clearInterval(timer);
      next();
      if (!reduced) timer = window.setInterval(next, 4200);
    };
    replay?.addEventListener('click', start);
    stage.classList.add('is-drawing');
    start();
  }

  function initDentalSmile() {
    const stage = document.querySelector('[data-dental-smile]');
    const replay = document.querySelector('[data-dental-replay]');
    if (!stage) return;
    const run = () => {
      stage.classList.remove('is-shining');
      void stage.offsetWidth;
      stage.classList.add('is-shining');
    };
    replay?.addEventListener('click', run);
    if (!reduced) window.setTimeout(run, 260);
    else stage.classList.add('is-shining');
  }

  function initDetailingCycle() {
    const stage = document.querySelector('[data-detail-stage]');
    const replay = document.querySelector('[data-detail-replay]');
    if (!stage) return;
    const run = () => {
      stage.classList.remove('is-running');
      void stage.offsetWidth;
      stage.classList.add('is-running');
    };
    if (replay) replay.addEventListener('click', run);
    stage.addEventListener('click', run);
    if (!reduced) window.setTimeout(run, 160);
    else stage.classList.add('is-running');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initTilt();
    initBanyaSteam();
    initInk();
    initBanyaCycle();
    initGarageLift();
    initSalonBrush();
    initTattooMachine();
    initDentalSmile();
    initDetailingCycle();
  });
})();
