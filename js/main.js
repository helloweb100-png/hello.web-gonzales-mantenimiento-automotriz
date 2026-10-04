/* ============================================================
   GONZALEZ MANTENIMIENTO AUTOMOTRIZ · main.js
   GSAP + ScrollTrigger + Lenis (CDN).
   Si las librerías no cargan, o el usuario pide menos movimiento,
   la página queda en su versión estática y sigue siendo completa.
   ============================================================ */
(() => {
  'use strict';

  const WA_NUMBER = '525564984840';
  const html = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasLibs      = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animated     = hasLibs && !reduceMotion;

  html.classList.add('is-loading');
  if (!animated) html.classList.add('reduced');
  if (hasLibs) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  let refreshTimer = 0;
  const refreshSoon = () => {
    if (!hasLibs) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 140);
  };

  /* ───────── Medidor (loader y proceso) ───────── */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function buildTicks(group, count = 36) {
    if (!group) return;
    for (let i = 0; i <= count; i++) {
      const major = i % 6 === 0;
      const a = ((-135 + (270 * i) / count) * Math.PI) / 180;
      const r1 = major ? 87 : 91;
      const r2 = 98;
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', (100 + r1 * Math.sin(a)).toFixed(2));
      line.setAttribute('y1', (100 - r1 * Math.cos(a)).toFixed(2));
      line.setAttribute('x2', (100 + r2 * Math.sin(a)).toFixed(2));
      line.setAttribute('y2', (100 - r2 * Math.cos(a)).toFixed(2));
      if (major) line.setAttribute('class', 'is-major');
      group.appendChild(line);
    }
  }
  function setGauge(arc, needle, p) {
    if (arc) arc.style.strokeDashoffset = (100 - p * 100).toFixed(2);
    if (needle) needle.setAttribute('transform', `rotate(${(-135 + p * 270).toFixed(2)} 100 100)`);
  }

  /* ───────── Scroll suave (Lenis) ───────── */
  let lenis = null;
  if (animated && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ───────── Menú móvil ───────── */
  const nav = $('#nav');
  const burger = $('#burger');
  const sheetMenu = $('#sheet-menu');
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    sheetMenu.setAttribute('aria-hidden', String(!open));
    if (open) { nav.classList.remove('is-hidden'); lenis && lenis.stop(); html.style.overflow = 'hidden'; }
    else { lenis && lenis.start(); html.style.overflow = ''; }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  window.matchMedia('(min-width: 1000px)').addEventListener('change', (m) => { if (m.matches && menuOpen) setMenu(false); });

  /* ───────── Anclas con scroll suave ───────── */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const target = $(hash);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      if (lenis) {
        if (hash === '#inicio') lenis.scrollTo(0, { duration: 1.6 });
        else lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      history.replaceState(null, '', hash);
    });
  });

  /* ───────── Barra superior: estado sólido (sin listener de scroll) ───────── */
  (function navSolid() {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(([en]) => nav.classList.toggle('is-solid', !en.isIntersecting)).observe(sentinel);
  })();

  /* ───────── Loader ───────── */
  const loader = $('#loader');
  let heroReady = null;

  (function runLoader() {
    if (!loader) { html.classList.remove('is-loading'); return; }
    buildTicks($('#ld-ticks'));
    const num = $('#ld-num'), arc = $('#ld-arc'), needle = $('#ld-needle'), msg = $('#ld-msg');
    const phases = [[0, 'Calentando motores'], [34, 'Revisando frenos'], [62, 'Afinando detalles'], [95, 'Listo para rodar']];
    const MIN = reduceMotion ? 300 : 2300;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let shown = 0, done = false, lastPhase = -1;

    if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
    setTimeout(() => { loaded = true; }, 7000);

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function frame(now) {
      const elapsed = now - t0;
      const timed = ease(clamp(elapsed / MIN, 0, 1)) * 100;
      const cap = loaded ? 100 : 91;
      const goal = Math.min(timed, cap);
      shown += (goal - shown) * 0.16;
      if (goal >= 99.9 && shown > 99.4) shown = 100;

      num.textContent = Math.round(shown);
      setGauge(arc, needle, shown / 100);
      const ph = phases.reduce((acc, p, i) => (shown >= p[0] ? i : acc), 0);
      if (ph !== lastPhase) { lastPhase = ph; msg.textContent = phases[ph][1]; }

      if (shown >= 100 && !done) { done = true; setTimeout(exitLoader, 220); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  function exitLoader() {
    html.classList.remove('is-loading');
    const finish = () => {
      loader && loader.remove();
      lenis && lenis.start();
      refreshSoon();
      armBubble();
    };
    if (animated && loader) {
      const tl = gsap.timeline({ onComplete: finish });
      tl.to('.ld-core, .ld-streaks', { opacity: 0, scale: 0.94, duration: 0.45, ease: 'power2.in' })
        .to('.ld-curtain--a', { yPercent: -101, duration: 1.05, ease: 'expo.inOut' }, '-=0.05')
        .to('.ld-curtain--b', { yPercent: 101, duration: 1.05, ease: 'expo.inOut' }, '<')
        .add(() => heroReady && heroReady(), '-=0.8');
    } else if (loader) {
      loader.style.transition = 'opacity .5s ease';
      loader.style.opacity = '0';
      setTimeout(finish, 520);
    }
  }

  /* ───────── Canvas del hero: brasas, red y estelas ───────── */
  function initHeroFx() {
    const hero = $('.hero');
    const canvas = $('#hero-fx');
    const noop = { setActive() {} };
    if (!hero || !canvas) return noop;
    const ctx = canvas.getContext('2d');
    if (!ctx) return noop;

    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, dpr = 1, raf = 0, active = false, last = 0;
    let parts = [], streaks = [];

    const sprite = (rgb) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, `rgba(${rgb},1)`);
      grd.addColorStop(0.28, `rgba(${rgb},.5)`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return c;
    };
    const sprites = [sprite('253,238,0'), sprite('253,238,0'), sprite('140,235,0'), sprite('242,247,234')];

    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 20,
        vx: 0.1 + Math.random() * 0.32,
        vy: -(0.14 + Math.random() * 0.42),
        r: 1.2 + Math.random() * 3.2,
        a: 0.35 + Math.random() * 0.6,
        ph: Math.random() * Math.PI * 2,
        s: sprites[(Math.random() * sprites.length) | 0],
      };
    }

    function build() {
      const mobile = w < 700;
      const n = clamp(Math.round((w * h) / (mobile ? 16000 : 15000)), 22, mobile ? 34 : 84);
      parts = Array.from({ length: n }, () => spawn(true));
      streaks = Array.from({ length: mobile ? 3 : 6 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        len: 140 + Math.random() * 280, v: 5 + Math.random() * 9, a: 0.1 + Math.random() * 0.26,
      }));
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (!active) draw();
    }

    function step(k, t) {
      for (const p of parts) {
        p.x += p.vx * k + Math.sin(t * 0.0009 + p.ph) * 0.16 * k;
        p.y += p.vy * k;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22500) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 150) * 2.4 * k;
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }
        if (p.y < -24 || p.x > w + 24) Object.assign(p, spawn(false), { x: Math.random() * w * 0.9 });
      }
      for (const s of streaks) {
        s.x += s.v * k;
        if (s.x - s.len > w) { s.x = -s.len; s.y = Math.random() * h; }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (const s of streaks) {
        const g = ctx.createLinearGradient(s.x - s.len, 0, s.x, 0);
        g.addColorStop(0, 'rgba(253,238,0,0)');
        g.addColorStop(1, `rgba(253,250,190,${s.a})`);
        ctx.fillStyle = g;
        ctx.fillRect(s.x - s.len, s.y, s.len, 1.6);
      }

      if (w >= 900) {
        ctx.lineWidth = 1;
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, d2 = dx * dx + dy * dy;
            if (d2 < 14400) {
              ctx.strokeStyle = `rgba(242,247,234,${(1 - Math.sqrt(d2) / 120) * 0.14})`;
              ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
            }
          }
        }
      }

      for (const p of parts) {
        const s = p.r * 8;
        ctx.globalAlpha = p.a;
        ctx.drawImage(p.s, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!active) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(48, now - last); last = now;
      step(dt / 16.67, now);
      draw();
    }

    function setActive(on) {
      if (reduceMotion) return;
      if (on && !active) { active = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!on && active) { active = false; cancelAnimationFrame(raf); }
    }

    new ResizeObserver(resize).observe(hero);
    resize();
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('visibilitychange', () => setActive(!document.hidden && heroInView));
    let heroInView = true;
    return { setActive: (on) => { heroInView = on; setActive(on && !document.hidden); } };
  }

  /* ───────── Utilidades de texto ───────── */
  function splitHeading(el) {
    const out = document.createElement('div');
    (function walk(node, parent) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            w.appendChild(wi); parent.appendChild(w);
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false);
          parent.appendChild(clone);
          walk(child, clone);
        }
      });
    })(el, out);
    el.textContent = '';
    while (out.firstChild) el.appendChild(out.firstChild);
    return $$('.wi', el);
  }

  function splitPlainWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((txt, i) => {
      const s = document.createElement('span');
      s.className = 'sw-word'; s.textContent = txt;
      el.append(s);
      if (i < words.length - 1) el.append(document.createTextNode(' '));
    });
    return $$('.sw-word', el);
  }

  /* ───────── Animaciones con scroll ───────── */
  function initAnimations() {
    const mm = gsap.matchMedia();
    const fx = initHeroFx();
    fx.setActive(true);

    /* Progreso de lectura */
    gsap.to('#progress-bar', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 0, end: 'max', scrub: 0.2 },
    });

    /* Barra: ocultar al bajar, mostrar al subir; resaltar sección actual */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (menuOpen) return;
        nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 520);
      },
    });
    ['servicios', 'especialidades', 'proceso', 'nosotros', 'contacto'].forEach((id) => {
      const sec = $('#' + id);
      const link = $(`.nav__links a[href="#${id}"]`);
      if (!sec || !link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => link.classList.toggle('is-current', self.isActive),
      });
    });

    /* ── HERO ── */
    const hero = $('.hero');
    gsap.set('.hero__eyebrow', { opacity: 0, y: 20 });
    gsap.set('.hero__eyebrow .eyebrow__bar', { scaleX: 0 });
    gsap.set('.hero__title .ln > span', { yPercent: 118, skewY: 5 });
    gsap.set('.hero__underline path', { strokeDashoffset: 1 });
    gsap.set('.hero__lead', { opacity: 0, y: 24 });
    gsap.set('.hero__cta .btn', { opacity: 0, y: 26 });
    gsap.set('.hero__card', { clipPath: 'inset(100% 0% 0% 0% round 28px)' });
    gsap.set('.hero__ph img', { scale: 1.45 });
    gsap.set('.chip, .badge', { opacity: 0, scale: 0.4 });
    gsap.set('.sw', { strokeDashoffset: 1 });
    gsap.set('.hero__gear', { opacity: 0, scale: 0.7 });

    heroReady = () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to('.sw', { strokeDashoffset: 0, duration: 2.4, stagger: 0.2, ease: 'power3.inOut' }, 0)
        .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 0.9, clearProps: 'transform' }, 0.1)
        .to('.hero__eyebrow .eyebrow__bar', { scaleX: 1, duration: 0.9 }, 0.1)
        .to('.hero__title .ln > span', { yPercent: 0, skewY: 0, duration: 1.3, stagger: 0.12 }, 0.2)
        .to('.hero__underline path', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 1.05)
        .to('.hero__lead', { opacity: 1, y: 0, duration: 1 }, 0.75)
        .to('.hero__cta .btn', { opacity: 1, y: 0, duration: 1, stagger: 0.1, clearProps: 'transform' }, 0.9)
        .to('.hero__card', { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.inOut' }, 0.3)
        .to('.hero__ph img', { scale: 1, duration: 2.2 }, 0.3)
        .to('.chip, .badge', { opacity: 1, scale: 1, duration: 1, stagger: 0.12, ease: 'back.out(1.7)' }, 1.15)
        .to('.hero__gear', { opacity: 1, scale: 1, duration: 1.6 }, 0.5);
      lenis && lenis.start();
    };

    /* Paralaje por puntero (solo ratón) */
    if (finePointer) {
      const items = $$('[data-depth]', hero).map((el) => ({
        d: parseFloat(el.dataset.depth) || 1,
        x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
      }));
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        items.forEach((it) => { it.x(nx * -30 * it.d); it.y(ny * -22 * it.d); });
        hero.style.setProperty('--px', e.clientX - r.left + 'px');
        hero.style.setProperty('--py', e.clientY - r.top + 'px');
      });
      hero.addEventListener('pointerenter', () => hero.classList.add('has-pointer'));
      hero.addEventListener('pointerleave', () => {
        hero.classList.remove('has-pointer');
        items.forEach((it) => { it.x(0); it.y(0); });
      });
    }

    /* El hero se queda fijo y las hojas lo cubren (solo escritorio alto) */
    mm.add('(min-width: 1000px) and (min-height: 720px)', () => {
      gsap.to('.hero__inner', {
        scale: 0.93, opacity: 0.15, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    gsap.to('.hero__ph img', {
      yPercent: 9, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onToggle: (self) => fx.setActive(self.isActive),
    });

    /* Engranes que giran al hacer scroll */
    $$('[data-rotate]').forEach((el) => {
      const inHero = !!el.closest('.hero');
      gsap.to(el, {
        rotation: parseFloat(el.dataset.rotate), ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    /* ── MARQUEE: la velocidad responde al scroll ── */
    const mTrack = $('#marquee-track');
    if (mTrack) {
      const row = $('.marquee__row', mTrack);
      const clone = row.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      mTrack.appendChild(clone);
      mTrack.classList.add('is-js');
      const loop = gsap.to(mTrack, { xPercent: -50, duration: 34, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const dir = self.direction || 1;
          const boost = 1 + clamp(Math.abs(self.getVelocity()) / 160, 0, 8);
          gsap.timeline()
            .to(loop, { timeScale: dir * boost, duration: 0.2, overwrite: true })
            .to(loop, { timeScale: dir, duration: 1 });
        },
      });
    }

    /* ── TÍTULOS: palabras que suben desde una máscara ── */
    $$('[data-split]').filter((el) => !el.closest('.zoom')).forEach((el) => {
      const words = splitHeading(el);
      gsap.set(words, { yPercent: 112, rotate: 4, transformOrigin: '0% 100%' });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.045, ease: 'expo.out' }),
      });
    });

    const fadeUp = (selector, trigger, o = {}) => {
      const els = $$(selector);
      if (!els.length) return;
      gsap.from(els, {
        y: o.y ?? 36, x: o.x ?? 0, opacity: 0, duration: o.duration ?? 1.1, stagger: o.stagger ?? 0.1, ease: 'expo.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: trigger || els[0], start: o.start || 'top 86%', once: true },
      });
    };
    $$('.eyebrow:not(.hero__eyebrow)').forEach((el) => {
      gsap.from(el, { x: -24, opacity: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('.section-sub, .services__sub').forEach((el) => gsap.from(el, { y: 26, opacity: 0, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));

    /* ── INTRO: el texto se ilumina palabra por palabra ── */
    const intro = $('[data-scrub-words]');
    if (intro) {
      const words = splitPlainWords(intro);
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: intro, start: 'top 82%', end: 'bottom 52%', scrub: 0.5 },
      });
    }
    $$('[data-count]').forEach((el) => {
      const end = parseInt(el.dataset.count, 10);
      const pad = parseInt(el.dataset.pad || '0', 10);
      const o = { v: 0 };
      const fmt = (v) => String(Math.round(v)).padStart(pad, '0');
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
    });
    fadeUp('.stat', '.stats', { y: 40, stagger: 0.12 });

    /* ── ZOOM: la imagen crece hasta ocupar toda la pantalla ── */
    const zoomH2 = $('.zoom__text h2');
    if (zoomH2) {
      const zWords = splitHeading(zoomH2);
      mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (ctx) => {
        const desk = ctx.conditions.desktop;
        gsap.set('.zoom__media', { clipPath: desk ? 'inset(15% 26% round 40px)' : 'inset(13% 6% round 28px)' });
        gsap.set('.zoom__media img', { scale: 1.4 });
        gsap.set(zWords, { yPercent: 112, rotate: 4, transformOrigin: '0% 100%' });
        gsap.set('.zoom__text p', { opacity: 0, y: 20 });
        gsap.timeline({
          scrollTrigger: { trigger: '.zoom__pin', start: 'top top', end: '+=140%', pin: true, scrub: 0.7, anticipatePin: 1 },
        })
          .to('.zoom__media', { clipPath: 'inset(0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
          .to('.zoom__media img', { scale: 1, ease: 'none', duration: 1.4 }, 0)
          .to(zWords, { yPercent: 0, rotate: 0, stagger: 0.07, duration: 0.5, ease: 'power3.out' }, 0.62)
          .to('.zoom__text p', { opacity: 1, y: 0, duration: 0.4 }, 1.05)
          .to({}, { duration: 0.35 });
      });
    }

    /* ── SERVICIOS: scroll horizontal anclado (escritorio) ── */
    const track = $('#services-track');
    if (track) {
      gsap.from('.svc', { opacity: 0, duration: 0.9, stagger: 0.08, clearProps: 'opacity', scrollTrigger: { trigger: '.services', start: 'top 70%', once: true } });
      gsap.from('.svc > *:not(.svc__ghost)', { y: 34, opacity: 0, duration: 1, stagger: 0.035, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.services', start: 'top 70%', once: true } });

      mm.add('(min-width: 900px)', () => {
        const bar = $('#services-bar');
        const cur = $('#svc-cur');
        let curIdx = 1;
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const sk = { v: 0 };
        const setSkew = gsap.quickTo(sk, 'v', { duration: 0.5, ease: 'power3.out', onUpdate: () => track.style.setProperty('--skew', sk.v.toFixed(2) + 'deg') });
        const onEnd = () => setSkew(0);
        ScrollTrigger.addEventListener('scrollEnd', onEnd);
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: '.services__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6,
            invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: (self) => {
              if (bar) bar.style.transform = `scaleX(${self.progress})`;
              const idx = Math.min(7, Math.floor(self.progress * 7) + 1);
              if (cur && idx !== curIdx) {
                curIdx = idx;
                cur.textContent = String(idx).padStart(2, '0');
                gsap.fromTo(cur, { yPercent: 25, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
              }
              setSkew(clamp(self.getVelocity() / -650, -4.5, 4.5));
            },
          },
        });
        return () => { ScrollTrigger.removeEventListener('scrollEnd', onEnd); track.style.removeProperty('--skew'); };
      });
    }

    /* ── ESPECIALIDADES: bento con inclinación 3D ── */
    const tiles = $$('.tile');
    if (tiles.length) {
      gsap.from(tiles, {
        y: 90, opacity: 0, scale: 0.94, duration: 1.3, stagger: 0.13, ease: 'expo.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: '.bento', start: 'top 82%', once: true },
      });
      $$('.tile > img').forEach((img) => {
        gsap.fromTo(img, { yPercent: -5 }, {
          yPercent: 5, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
      if (finePointer) {
        $$('[data-tilt]').forEach((tile) => {
          gsap.set(tile, { transformPerspective: 1100 });
          const rx = gsap.quickTo(tile, 'rotationX', { duration: 0.7, ease: 'power3.out' });
          const ry = gsap.quickTo(tile, 'rotationY', { duration: 0.7, ease: 'power3.out' });
          tile.addEventListener('pointermove', (e) => {
            const r = tile.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 9);
            rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
          });
          tile.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
      }
    }

    /* ── PROCESO: el medidor sube con cada paso ── */
    const steps = $$('.pstep');
    if (steps.length) {
      buildTicks($('#dial-ticks'));
      const dNum = $('#dial-num'), dLbl = $('#dial-lbl'), dArc = $('#dial-arc'), dNeedle = $('#dial-needle');
      const st = { p: 0.04 };
      setGauge(dArc, dNeedle, st.p);
      const toP = gsap.quickTo(st, 'p', { duration: 0.7, ease: 'power3.out', onUpdate: () => setGauge(dArc, dNeedle, st.p) });
      const wrap = $('.process__steps');

      const line = document.createElement('span');
      line.className = 'process__line';
      line.innerHTML = '<i></i>';
      wrap.prepend(line);
      gsap.to('.process__line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 60%', end: 'bottom 60%', scrub: true } });

      ScrollTrigger.create({
        trigger: wrap, start: 'top 55%', end: 'bottom 55%',
        onUpdate: (self) => toP(clamp(0.04 + self.progress * 0.96, 0.04, 1)),
      });
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step, start: 'top 55%', end: 'bottom 55%',
          onToggle: (self) => {
            if (!self.isActive) return;
            steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
            dNum.textContent = String(i + 1).padStart(2, '0');
            dLbl.textContent = step.dataset.label || '';
            gsap.fromTo([dNum, dLbl], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'expo.out' });
          },
        });
      });
      gsap.fromTo('.process__bg img', { yPercent: -9 }, {
        yPercent: 9, ease: 'none',
        scrollTrigger: { trigger: '.process', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }

    /* ── NOSOTROS ── */
    const photo = $('[data-reveal-clip]');
    if (photo) {
      const photoImg = $('img', photo);
      gsap.set(photo, { clipPath: 'inset(100% 0% 0% 0% round 28px)' });
      gsap.set(photoImg, { scale: 1.3 });
      gsap.timeline({ scrollTrigger: { trigger: photo, start: 'top 80%', once: true } })
        .to(photo, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.5, ease: 'expo.inOut' })
        .to(photoImg, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
      gsap.to(photoImg, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    fadeUp('.trust__list li', '.trust__list', { x: -34, y: 0, stagger: 0.12 });

    /* ── FAQ, CONTACTO, FOOTER ── */
    fadeUp('.qa', '.faq__list', { y: 30, stagger: 0.08 });
    fadeUp('.form', '.contact__grid', { y: 50 });
    fadeUp('.map', '.contact__grid', { y: 50, start: 'top 80%' });

    const word = $('.footer__word');
    if (word) {
      const txt = word.textContent.trim();
      word.textContent = '';
      txt.split('').forEach((ch) => { const s = document.createElement('span'); s.textContent = ch; word.appendChild(s); });
      gsap.from($$('span', word), {
        yPercent: 110, duration: 1.3, stagger: 0.05, ease: 'expo.out',
        scrollTrigger: { trigger: word, start: 'top 98%', once: true },
      });
    }

    /* ── Botones magnéticos y brillo bajo el cursor (solo ratón) ── */
    if (finePointer) {
      $$('.magnetic').forEach((el) => {
        let xTo, yTo;
        el.addEventListener('pointerenter', () => {
          xTo = xTo || gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
          yTo = yTo || gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
        });
        el.addEventListener('pointermove', (e) => {
          if (!xTo) return;
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
        });
        el.addEventListener('pointerleave', () => { if (xTo) { xTo(0); yTo(0); } });
      });
    }

    window.addEventListener('load', refreshSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshSoon);
  }

  if (finePointer) {
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', e.clientX - r.left + 'px');
        el.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
  }

  function rescueStaticPage() {
    html.classList.add('reduced');
    heroReady = null;
    try {
      ScrollTrigger.getAll().forEach((t) => t.kill(true));
      gsap.globalTimeline.clear();
      $$('main *, .footer *').forEach((el) => el.removeAttribute('style'));
    } catch (e) { /* nada más que hacer */ }
  }

  if (animated) {
    try { initAnimations(); } catch (err) { console.error('Animaciones desactivadas:', err); rescueStaticPage(); }
  }

  /* ───────── FAQ: acordeón animado ───────── */
  const qas = $$('.qa');
  qas.forEach((d) => { if (d.open) d.classList.add('is-open'); });
  function closeQa(d) {
    const ans = $('.qa__a', d);
    if (d._anim) d._anim.cancel();
    d.classList.remove('is-open');
    const a = ans.animate([{ height: ans.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: reduceMotion ? 0 : 360, easing: 'cubic-bezier(.65,0,.35,1)' });
    d._anim = a;
    a.onfinish = () => { d.open = false; d._anim = null; refreshSoon(); };
  }
  function openQa(d) {
    const ans = $('.qa__a', d);
    if (d._anim) d._anim.cancel();
    qas.forEach((o) => { if (o !== d && o.open) closeQa(o); });
    d.open = true;
    d.classList.add('is-open');
    const a = ans.animate([{ height: '0px', opacity: 0 }, { height: ans.scrollHeight + 'px', opacity: 1 }], { duration: reduceMotion ? 0 : 480, easing: 'cubic-bezier(.16,1,.3,1)' });
    d._anim = a;
    a.onfinish = () => { d._anim = null; refreshSoon(); };
  }
  qas.forEach((d) => {
    $('summary', d).addEventListener('click', (e) => {
      e.preventDefault();
      d.classList.contains('is-open') ? closeQa(d) : openQa(d);
    });
  });

  /* ───────── Formulario → WhatsApp ───────── */
  const form = $('#wa-form');
  if (form) {
    const note = $('#form-status');
    const defaultNote = note.textContent;
    const rules = {
      name:    { el: $('#f-name'),    err: $('#e-name'),    ok: (v) => v.trim().length >= 2, msg: 'Escribe tu nombre.' },
      service: { el: $('#f-service'), err: $('#e-service'), ok: (v) => !!v,                  msg: 'Elige un servicio.' },
      message: { el: $('#f-msg'),     err: $('#e-msg'),     ok: (v) => v.trim().length >= 5, msg: 'Cuéntanos brevemente qué le pasa a tu vehículo.' },
    };
    const check = (r) => {
      const valid = r.ok(r.el.value);
      r.el.setAttribute('aria-invalid', String(!valid));
      r.err.textContent = valid ? '' : r.msg;
      return valid;
    };
    Object.values(rules).forEach((r) => {
      r.el.addEventListener('blur', () => check(r));
      r.el.addEventListener('input', () => { if (r.el.getAttribute('aria-invalid') === 'true') check(r); });
      r.el.addEventListener('change', () => { if (r.el.getAttribute('aria-invalid') === 'true') check(r); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = Object.values(rules).map((r) => [r, check(r)]);
      const firstBad = results.find(([, ok]) => !ok);
      if (firstBad) {
        firstBad[0].el.focus();
        note.classList.remove('is-ok');
        note.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }
      const vehicle = $('#f-vehicle').value.trim();
      const lines = [`Hola, soy ${rules.name.el.value.trim()}.`, `Quiero cotizar: ${rules.service.el.value}.`];
      if (vehicle) lines.push(`Vehículo: ${vehicle}.`);
      lines.push('', rules.message.el.value.trim(), '', 'Mensaje enviado desde el sitio web.');
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

      form.classList.add('is-loading');
      const win = window.open(url, '_blank');
      if (win) win.opener = null; else window.location.href = url;

      setTimeout(() => {
        form.classList.remove('is-loading');
        note.classList.add('is-ok');
        note.textContent = '';
        const link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = 'Si no se abrió, toca aquí.';
        link.style.textDecoration = 'underline';
        note.append('Listo, se abrió WhatsApp con tu mensaje. ', link);
        setTimeout(() => { note.classList.remove('is-ok'); note.textContent = defaultNote; }, 12000);
      }, 1100);
    });
  }

  /* ───────── Mapa: se activa al tocar (no atrapa el scroll) ───────── */
  const mapFrame = $('.map__frame');
  if (mapFrame) {
    mapFrame.addEventListener('pointerdown', () => mapFrame.classList.add('is-active'));
    document.addEventListener('pointerdown', (e) => { if (!mapFrame.contains(e.target)) mapFrame.classList.remove('is-active'); });
  }

  /* ───────── WhatsApp flotante: burbuja ───────── */
  const wa = $('#wa');
  function armBubble() {
    if (!wa) return;
    setTimeout(() => {
      wa.classList.add('is-open');
      setTimeout(() => wa.classList.remove('is-open'), 7000);
    }, 8000);
  }
  if (wa) {
    const btn = $('.wa__btn', wa);
    btn.addEventListener('pointerenter', () => wa.classList.add('is-open'));
    btn.addEventListener('pointerleave', () => wa.classList.remove('is-open'));
  }

  /* ───────── Volver arriba ───────── */
  const toTop = $('#totop');
  if (toTop) {
    toTop.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.8 });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();
