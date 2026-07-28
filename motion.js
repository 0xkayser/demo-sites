(function () {
  const scenes = {
    portfolio: `
      <div class="motion-scene motion-portfolio" aria-hidden="true">
        <div class="motion-portfolio-orbit orbit-one"></div>
        <div class="motion-portfolio-orbit orbit-two"></div>
        <div class="motion-portfolio-core"><b>7</b><span>niches</span></div>
        <span class="motion-portfolio-label">objects / not templates</span>
      </div>`,
    editorial: `
      <div class="motion-scene motion-mirror" aria-hidden="true">
        <div class="motion-mirror-card"><span>ЛИЛИЯ</span><b>LIGHT<br>ROOM</b></div>
        <div class="motion-mirror-sheen"></div>
        <span class="motion-mirror-chip">MIRROR 01 / ON</span>
      </div>`,
    terminal: `
      <div class="motion-scene motion-garage" aria-hidden="true">
        <div class="motion-garage-grid"></div>
        <div class="motion-garage-panel"><span>BAY 02 / LIVE</span><strong>READY</strong><i></i><small>scan · lift · release</small></div>
        <div class="motion-garage-signal"></div>
        <span class="motion-garage-label">GARAGE 77 / 12.04.26</span>
      </div>`,
    botanical: `
      <div class="motion-scene motion-body" aria-hidden="true">
        <div class="motion-body-orb"></div>
        <div class="motion-body-ring ring-a"></div>
        <div class="motion-body-ring ring-b"></div>
        <span class="motion-body-label">BREATHE IN / LET GO</span>
        <span class="motion-body-chip">RESET / 60 MIN</span>
      </div>`,
    par: `
      <div class="motion-scene motion-steam" aria-hidden="true">
        <div class="motion-steam-frame">
          <div class="motion-ladle"></div>
          <div class="motion-water"></div>
          <div class="motion-stone"></div>
          <div class="motion-steam-cloud cloud-a"></div>
          <div class="motion-steam-cloud cloud-b"></div>
          <div class="motion-steam-cloud cloud-c"></div>
        </div>
        <span class="motion-steam-label">92° / POUR CYCLE</span>
      </div>`,
    lime: `
      <div class="motion-scene motion-ink" aria-hidden="true">
        <div class="motion-ink-panel"><span>INK / 03</span><b>NEEDLE<br>ACTIVE</b><small>stroke 0.35 mm</small></div>
        <div class="motion-ink-machine"><div class="motion-cartridge"></div><div class="motion-needle"></div></div>
        <i class="motion-ink-drop drop-a"></i><i class="motion-ink-drop drop-b"></i><i class="motion-ink-drop drop-c"></i>
        <span class="motion-ink-label">BLACK / LIME / SKIN</span>
      </div>`,
    mercury: `
      <div class="motion-scene motion-detail" role="button" tabindex="0" aria-label="Перезапустить цикл очистки автомобиля">
        <div class="motion-bay">
          <div class="motion-bay-light"></div>
          <div class="motion-car motion-car-dirty"></div>
          <div class="motion-car motion-car-clean"></div>
          <div class="motion-wash"></div>
          <span class="motion-detail-label dirty-label">STAGE 01 / DUST</span>
          <span class="motion-detail-label clean-label">STAGE 02 / BLIK</span>
        </div>
        <div class="motion-detail-status"><b>LIVE CYCLE</b><span>грязный → ceramic</span></div>
      </div>`,
    health: `
      <div class="motion-scene motion-clinic" aria-hidden="true">
        <div class="motion-clinic-disc"></div>
        <div class="motion-clinic-ring ring-a"></div>
        <div class="motion-clinic-ring ring-b"></div>
        <div class="motion-clinic-beam"></div>
        <div class="motion-clinic-label"><span>EMAL / 01</span><b>SOFT LIGHT</b></div>
      </div>`
  };

  function mountScene(theme) {
    const scene = scenes[theme];
    if (!scene || document.querySelector('.motion-scene')) return;

    const body = document.body;
    const host = theme === 'portfolio'
      ? document.querySelector('.wrap')
      : theme === 'editorial'
        ? document.querySelector('.visual')
        : document.querySelector('.hero');
    if (!host) return;

    host.classList.add('motion-host');
    host.insertAdjacentHTML(theme === 'editorial' ? 'beforeend' : 'afterbegin', scene);
    const mounted = document.querySelector('.motion-scene');
    if (!mounted) return;

    if (theme === 'mercury') {
      const restart = () => {
        mounted.querySelectorAll('.motion-car, .motion-wash, .motion-detail-label').forEach((item) => {
          item.style.animation = 'none';
          void item.offsetWidth;
          item.style.animation = '';
        });
      };
      mounted.addEventListener('click', restart);
      mounted.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          restart();
        }
      });
    }

    mounted.addEventListener('pointermove', (event) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = mounted.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      mounted.style.setProperty('--pointer-x', `${x.toFixed(3)}`);
      mounted.style.setProperty('--pointer-y', `${y.toFixed(3)}`);
    });
    mounted.addEventListener('pointerleave', () => {
      mounted.style.setProperty('--pointer-x', '0');
      mounted.style.setProperty('--pointer-y', '0');
    });
  }

  function revealScenes() {
    const items = document.querySelectorAll('.motion-scene, .card, .st, .stp, .room, .circle');
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-in')); 
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountScene(document.body.dataset.theme);
    revealScenes();
  });
})();
