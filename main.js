document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Apply embedded image data ---------- */
  const IMG = window.LAIS_IMG || {};
  document.querySelectorAll('img[data-img]').forEach(img => {
    const key = img.getAttribute('data-img');
    if (IMG[key]) img.src = IMG[key];
  });

  /* ---------- Header scroll state ---------- */
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navToggle.classList.remove('open');
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }));

  /* ---------- Scrollspy ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-desktop a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealObs.observe(el));

  /* ---------- Animated stat counters ---------- */
  const counters = document.querySelectorAll('.stat .num');
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      const span = el.querySelector('span');
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.firstChild.textContent = val;
        if (span) span.textContent = suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      if (span) el.appendChild(span);
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach(el => countObs.observe(el));

  /* ---------- Gallery filter ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const gItems = document.querySelectorAll('.g-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      gItems.forEach(item => {
        const match = f === 'all' || item.dataset.tag === f;
        item.classList.toggle('hide', !match);
      });
    });
  });

  /* ---------- Lightbox ---------- */
  const lightbox = document.querySelector('.lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbCap = lightbox.querySelector('.lb-cap');
  const galleryData = Array.from(gItems).map(item => ({
    src: item.querySelector('img').src,
    cap: item.dataset.caption || ''
  }));
  let lbIndex = 0;

  const openLightbox = (i) => {
    lbIndex = i;
    lbImg.src = galleryData[lbIndex].src;
    lbCap.textContent = galleryData[lbIndex].cap;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };
  const stepLightbox = (dir) => {
    let visible = Array.from(gItems).filter(i => !i.classList.contains('hide'));
    let visIdx = galleryData.map((_, i) => i).filter(i => !gItems[i].classList.contains('hide'));
    let pos = visIdx.indexOf(lbIndex);
    pos = (pos + dir + visIdx.length) % visIdx.length;
    openLightbox(visIdx[pos]);
  };

  gItems.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lb-prev').addEventListener('click', () => stepLightbox(-1));
  lightbox.querySelector('.lb-next').addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });

  /* ---------- Case study image click -> lightbox (standalone) ---------- */
  document.querySelectorAll('.case-media img').forEach(img => {
    img.addEventListener('click', () => {
      lbImg.src = img.src;
      lbCap.textContent = img.dataset.caption || img.alt || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lightbox.querySelectorAll('.lb-nav').forEach(n => n.style.display = 'none');
    });
  });
  lightbox.querySelector('.lb-close').addEventListener('click', () => {
    lightbox.querySelectorAll('.lb-nav').forEach(n => n.style.display = '');
  });

  /* ---------- Audience switch (Para quem) ---------- */
  const switchBtns = document.querySelectorAll('.switch-btn');
  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetId = btn.dataset.target;
      document.querySelectorAll('[data-pane]').forEach(pane => {
        pane.hidden = pane.id !== targetId;
      });
    });
  });

  /* ---------- Current year ---------- */
  const yearEl = document.querySelector('.js-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Compare slider (V-Ray x IA) ---------- */
  document.querySelectorAll('[data-cmp]').forEach(cmp => {
    const over = cmp.querySelector('.over');
    const handle = cmp.querySelector('.handle');
    let dragging = false;

    const setPos = (clientX) => {
      const rect = cmp.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      over.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = pct + '%';
      cmp.classList.add('touched');
    };

    const onDown = (e) => {
      dragging = true;
      cmp.setPointerCapture(e.pointerId);
      setPos(e.clientX);
    };
    const onMove = (e) => {
      if (!dragging) return;
      setPos(e.clientX);
    };
    const onUp = (e) => {
      dragging = false;
      try { cmp.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    cmp.addEventListener('pointerdown', onDown);
    cmp.addEventListener('pointermove', onMove);
    cmp.addEventListener('pointerup', onUp);
    cmp.addEventListener('pointercancel', onUp);
  });

});
