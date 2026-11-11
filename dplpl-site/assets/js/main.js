/* =====================================================================
   D++ — site behaviour (no dependencies)
   SETTINGS below controls every timing on the page.
   ===================================================================== */
const SETTINGS = {
  parallax: true,          // hero layers follow the pointer
  parallaxStrength: 1,     // 0.5 = subtler, 2 = stronger
  demoStepMs: 260,         // delay between cells in the problem demo
  reviewsAutoplayMs: 6500, // 0 turns autoplay off
  countUpMs: 1600,
  servicesAutoplayMs: 6000, // "What we do" list on the Services page; 0 turns it off
  stepsMs: 1100,           // timeline step speed on the Services page
  povMs: 4200,             // spotlight speed on the service line pages
  soonMessage: 'This page is next on the build list.'
};

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('motion');
  // Reduced motion also freezes SVG path animations (balls rolling and hopping)
  else {
    // Labels that fade with the hero ball: show them all, without the fade
    document.querySelectorAll('animate.chip-fade').forEach(a => { a.parentNode.setAttribute('opacity', '1'); a.remove(); });
    document.querySelectorAll('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
  }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  /* ---------- Links to pages that are not built yet ---------- */
  $$('a[data-soon]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); say(SETTINGS.soonMessage); }));

  /* ---------- Header: shadow on scroll, mobile menu, Solutions menu ---------- */
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navToggle'), links = $('#navLinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#navLinks a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); toggle.setAttribute('aria-expanded', false);
  }));
  // Optional dropdown menu in the nav (a .has-menu item). Skipped when the nav has none.
  const menu = $('.has-menu'), menuBtn = $('.has-menu > button');
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!menu.contains(e.target)) { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }
    });
  }

  /* ---------- Scroll reveal (safety net: everything shows after 4s) ---------- */
  const reveals = $$('.reveal');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => io.observe(el));
  setTimeout(() => reveals.forEach(el => el.classList.add('in')), 4000);

  /* ---------- Count-up numbers ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    if (reduce) return;
    const el = e.target, end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const t0 = performance.now();
    const tick = t => {
      const p = Math.min(1, (t - t0) / SETTINGS.countUpMs);
      el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.5 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Hero parallax ---------- */
  const hero = $('.hero');
  if (hero && SETTINGS.parallax && !reduce && matchMedia('(pointer: fine)').matches) {
    const layers = $$('.scene .layer');
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach(l => {
        const d = (+l.dataset.depth || 0) * SETTINGS.parallaxStrength;
        l.style.transform = `translate(${(x * d * 2).toFixed(1)}px, ${(y * d).toFixed(1)}px)`;
      });
    });
    hero.addEventListener('pointerleave', () => layers.forEach(l => (l.style.transform = '')));
  }

  /* ---------- About: "What working with D++ gets you" rows (one open at a time) ---------- */
  const audRows = $$('.aud-row');
  audRows.forEach(row => {
    const head = $('.aud-head', row);
    head.addEventListener('click', () => {
      const willOpen = !row.classList.contains('open');
      audRows.forEach(r => { r.classList.remove('open'); $('.aud-head', r).setAttribute('aria-expanded', false); });
      if (willOpen) { row.classList.add('open'); head.setAttribute('aria-expanded', true); }
    });
  });

  /* ---------- Services page: line selector, board, "What we do", timeline ---------- */
  if ($('#svcPage')) {
    const LINES = ['strategy', 'data-ai', 'systems', 'people'];
    const CHIP = { strategy: 'peach', 'data-ai': 'lilac', systems: 'sky', people: 'pink' };
    const variants = $$('.svc-variant'), sets = $$('.board-set'), board = $('#board');
    const lists = $$('.svc-list'), lineTabs = $$('#lineTabs [role=tab]'), panel = $('#wwdPanel');
    const picker = $('#picker'), pBtn = $('#pickerBtn'), pText = $('#pickerText'), pChip = $('#pickerChip'), opts = $$('#pickerList li');
    const briefLine = $('#briefLine'), briefCount = $('#briefCount'), briefName = $('#briefName'), briefType = $('#briefType');
    let line = null, svcIndex = 0, svcTimer = null, typeTimer = null, wwdVisible = false, wwdHover = false;

    const replay = (el, cls = 'enter') => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    const currentList = () => lists.find(l => l.dataset.line === line);

    function setLine(next, updateHash = true) {
      if (!LINES.includes(next) || next === line) return;
      line = next;
      variants.forEach(v => { v.hidden = v.dataset.line !== line; if (!v.hidden) replay(v); });
      sets.forEach(s => { s.hidden = s.dataset.line !== line; if (!s.hidden) replay(s); });
      board.dataset.line = line;
      panel.dataset.line = line;
      const variant = variants.find(v => v.dataset.line === line);
      pText.textContent = variant.dataset.name;
      pChip.className = 'chip chip--' + CHIP[line];
      opts.forEach(o => o.setAttribute('aria-selected', o.dataset.line === line));
      lineTabs.forEach(t => t.setAttribute('aria-selected', t.dataset.line === line));
      briefLine.textContent = lineTabs.find(t => t.dataset.line === line).textContent.trim();
      const briefFaq = $('#briefFaq'), briefPage = $('#briefPage');
      if (briefFaq) briefFaq.href = 'faqs.html#' + line;
      if (briefPage) briefPage.href = 'service-' + line + '.html';
      lists.forEach(l => { l.hidden = l.dataset.line !== line; if (!l.hidden) replay(l); });
      selectSvc(0);
      if (updateHash && history.replaceState) { try { history.replaceState(null, '', '#' + line); } catch (e) { /* preview frames may refuse */ } }
    }

    // Hero selector (button + listbox, keyboard friendly)
    let kbd = -1;
    const openPicker = open => { picker.classList.toggle('open', open); pBtn.setAttribute('aria-expanded', open); if (!open) { kbd = -1; opts.forEach(o => o.classList.remove('kbd')); } };
    pBtn.addEventListener('click', () => openPicker(!picker.classList.contains('open')));
    opts.forEach(o => o.addEventListener('click', () => { setLine(o.dataset.line); openPicker(false); pBtn.focus(); }));
    pBtn.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
      if (e.key === 'Escape') { openPicker(false); return; }
      if (!picker.classList.contains('open')) { if (e.key !== 'Enter') { e.preventDefault(); openPicker(true); } return; }
      e.preventDefault();
      if (e.key === 'Enter' && kbd >= 0) { setLine(opts[kbd].dataset.line); openPicker(false); return; }
      kbd = (kbd + (e.key === 'ArrowUp' ? -1 : 1) + opts.length) % opts.length;
      opts.forEach((o, k) => o.classList.toggle('kbd', k === kbd));
    });
    document.addEventListener('click', e => { if (!picker.contains(e.target)) openPicker(false); });

    lineTabs.forEach(t => t.addEventListener('click', () => setLine(t.dataset.line)));

    // "What we do": one service open at a time, auto-advancing
    function typeOut(text) {
      clearInterval(typeTimer);
      if (reduce) { briefType.textContent = text; return; }
      let n = 0;
      briefType.textContent = '';
      briefType.classList.add('typing');
      typeTimer = setInterval(() => {
        briefType.textContent = text.slice(0, ++n);
        if (n >= text.length) { clearInterval(typeTimer); briefType.classList.remove('typing'); }
      }, 22);
    }
    function selectSvc(i) {
      const items = $$('li', currentList());
      svcIndex = (i + items.length) % items.length;
      items.forEach((li, k) => {
        const on = k === svcIndex;
        li.classList.toggle('active', on);
        $('.svc-item', li).setAttribute('aria-expanded', on);
        $('.svc-prog', li).classList.remove('run');
      });
      const li = items[svcIndex];
      briefCount.textContent = (svcIndex + 1) + ' / ' + items.length;
      briefName.textContent = $('.svc-name', li).textContent;
      const body = $('p', li).textContent;
      typeOut((body.match(/^.*?[?.](\s|$)/) || [body])[0].trim());
      restartSvc();
    }
    function restartSvc() {
      clearTimeout(svcTimer);
      const prog = $('li.active .svc-prog', currentList());
      if (!SETTINGS.servicesAutoplayMs || reduce || !wwdVisible || wwdHover) return;
      prog.style.setProperty('--t', SETTINGS.servicesAutoplayMs + 'ms');
      prog.classList.remove('run'); void prog.offsetWidth; prog.classList.add('run');
      svcTimer = setTimeout(() => selectSvc(svcIndex + 1), SETTINGS.servicesAutoplayMs);
    }
    lists.forEach(l => $$('.svc-item', l).forEach((b, k) => b.addEventListener('click', () => selectSvc(k))));
    const wwd = $('.wwd');
    new IntersectionObserver(([e]) => { wwdVisible = e.isIntersecting; restartSvc(); }, { threshold: 0.3 }).observe(wwd);
    wwd.addEventListener('mouseenter', () => { wwdHover = true; restartSvc(); });
    wwd.addEventListener('mouseleave', () => { wwdHover = false; restartSvc(); });

    // Open the line named in the link, e.g. services.html#data-ai
    const fromHash = () => location.hash.slice(1);
    setLine(LINES.includes(fromHash()) ? fromHash() : 'strategy', false);
    addEventListener('hashchange', () => { if (LINES.includes(fromHash())) { setLine(fromHash(), false); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } });

    // How we work with you: five-step timeline
    const steps = $$('.step'), fill = $('#stepsFill'), ball = $('#stepsBall');
    // The ball hops from stage to stage on a loop while the timeline is on screen.
    let current = 0, playTimer = null, stepsVisible = false, landT = null;
    function setStep(i, hop = true) {
      const from = current;
      current = (i + steps.length) % steps.length;
      steps.forEach((s, k) => { s.setAttribute('aria-pressed', k === current); s.classList.toggle('done', k < current); });
      const pct = (current / (steps.length - 1)) * 100 + '%';
      fill.style.width = pct; ball.style.left = pct;
      if (hop && from !== current && !reduce) {
        ball.classList.remove('hop'); void ball.offsetWidth; ball.classList.add('hop');
        clearTimeout(landT);
        landT = setTimeout(() => { const s = steps[current]; s.classList.remove('landed'); void s.offsetWidth; s.classList.add('landed'); }, 600);
      }
    }
    function loop() {
      clearInterval(playTimer); playTimer = null;
      if (reduce || !stepsVisible || !SETTINGS.stepsMs) return;
      playTimer = setInterval(() => setStep(current + 1), SETTINGS.stepsMs);
    }
    steps.forEach((s, k) => s.addEventListener('click', () => { setStep(k); loop(); }));
    setStep(0, false);
    new IntersectionObserver(([e]) => { stepsVisible = e.isIntersecting; loop(); }, { threshold: 0.15 }).observe($('#steps'));
  }

  /* ---------- Sliders with filter chips (Insights, Case studies) ----------
     A [data-slider] section holds .slider-track > .slide cards, optional
     [data-prev]/[data-next] arrows, and [data-filter] chips. Each slide's
     data-tags lists the filters it belongs to. [data-q] panels (the board
     questions) show for the selected filter. */
  $$('[data-slider]').forEach(root => {
    const track = $('.slider-track', root), slides = $$('.slide', track), chips = $$('[data-filter]', root);
    const panels = $$('[data-q]', root), empty = $('.slider-empty', root);
    // Grid mode (data-max on the track): first match is the large featured card, cap the rest
    const max = +track.dataset.max || 0;
    const layout = () => {
      if (!max) return;
      slides.filter(s => !s.hidden).forEach((s, k) => { s.classList.toggle('is-lead', k === 0); s.classList.toggle('over', k >= max); });
    };
    layout();
    const step = () => { const s = slides.find(x => !x.hidden); return (s ? s.getBoundingClientRect().width : 320) + 18; };
    const go = dir => track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    const prev = $('[data-prev]', root), next = $('[data-next]', root);
    if (prev) prev.addEventListener('click', () => go(-1));
    if (next) next.addEventListener('click', () => go(1));
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });

    chips.forEach(chip => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
      let shown = 0;
      slides.forEach(s => {
        const on = f === 'all' || (s.dataset.tags || '').split(' ').includes(f);
        s.hidden = !on;
        if (on) { shown++; s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
      });
      panels.forEach(p => (p.hidden = p.dataset.q !== f));
      if (empty) empty.hidden = shown > 0;
      layout();
      track.scrollTo({ left: 0 });
    }));

    // Mouse drag to scroll (touch scrolls natively)
    let x0 = 0, left0 = 0, down = false, moved = false;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; left0 = track.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 4 && !moved) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = left0 - dx;
    });
    addEventListener('pointerup', () => { if (down && moved) track.classList.remove('dragging'); down = false; });
  });

  /* ---------- Insights: The D++ Brief signup ---------- */
  const brief = $('#briefForm');
  if (brief) {
    const input = $('#b-email'), err = $('#b-email-err'), field = input.closest('.field'), thanks = $('#briefThanks');
    brief.addEventListener('submit', async e => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      field.classList.toggle('bad', !ok);
      err.textContent = ok ? '' : (input.value.trim() ? 'Please enter a valid work email.' : 'Please complete this field.');
      input.setAttribute('aria-invalid', !ok);
      if (!ok) { input.focus(); return; }
      try {
        if (brief.dataset.endpoint) {
          const res = await fetch(brief.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.value.trim() }) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        }
        brief.hidden = true; thanks.hidden = false; thanks.focus({ preventScroll: true });
      } catch (x) {
        field.classList.add('bad');
        err.textContent = 'Something went wrong on our side. Please try again, or email info@dplpl.com.';
      }
    });
    input.addEventListener('input', () => { if (field.classList.contains('bad')) { field.classList.remove('bad'); err.textContent = ''; } });
  }

  /* ---------- Team page: tap or Enter reveals a leader's full bio ---------- */
  $$('.leader-card').forEach(card => card.addEventListener('click', () => {
    const open = !card.classList.contains('open');
    $$('.leader-card.open').forEach(c => { c.classList.remove('open'); c.setAttribute('aria-expanded', false); });
    card.classList.toggle('open', open);
    card.setAttribute('aria-expanded', open);
  }));

  /* ---------- Contact page: form, thank-you message, office clocks ---------- */
  const form = $('#contactForm');
  if (form) {
    const MSG = {
      required: 'Please complete this field.',
      email: 'Please enter a valid work email.',
      consent: 'Please agree so we can reply to you.',
      failed: 'Something went wrong on our side. Please try again, or email info@dplpl.com.'
    };
    const controls = $$('input, textarea', form);
    const meter = $('#formMeter'), formErr = $('#formErr'), submit = $('#formSubmit'), thanks = $('#formThanks');
    const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

    function check(el, show) {
      const field = el.closest('.field'), err = $('.err', field);
      let msg = '';
      if (el.type === 'checkbox') { if (!el.checked) msg = MSG.consent; }
      else if (!el.value.trim()) msg = MSG.required;
      else if (el.type === 'email' && !emailOk(el.value)) msg = MSG.email;
      const ok = !msg;
      field.classList.toggle('ok', ok && el.type !== 'checkbox');
      if (show) {
        field.classList.toggle('bad', !ok);
        err.textContent = msg;
        el.setAttribute('aria-invalid', !ok);
        if (msg) el.setAttribute('aria-describedby', err.id); else el.removeAttribute('aria-describedby');
      } else if (ok) {
        field.classList.remove('bad'); el.removeAttribute('aria-invalid');
      }
      return ok;
    }
    function updateMeter() {
      const done = controls.filter(el => el.type === 'checkbox' ? el.checked : el.value.trim() && (el.type !== 'email' || emailOk(el.value))).length;
      meter.style.width = (done / controls.length * 100) + '%';
    }
    controls.forEach(el => {
      el.addEventListener('input', () => { check(el, el.closest('.field').classList.contains('bad')); updateMeter(); });
      el.addEventListener('change', () => { check(el, el.type === 'checkbox' || el.closest('.field').classList.contains('bad')); updateMeter(); });
      el.addEventListener('blur', () => { if (el.type !== 'checkbox' && el.value.trim()) check(el, true); });
    });

    function confetti() {
      if (reduce) return;
      const box = $('#confetti'), colors = ['#FFE27A', '#F59AD3', '#8EC5FF', '#B98CFF', '#FF975A', '#6B3FD0'];
      box.innerHTML = '';
      for (let k = 0; k < 28; k++) {
        const i = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 220;
        i.style.cssText = `--c:${colors[k % colors.length]};--s:${8 + Math.random() * 12}px;--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 60}px;--rot:${Math.random() * 540}deg;--dl:${Math.random() * .15}s;--r:${k % 3 ? '50%' : '4px'}`;
        box.appendChild(i);
      }
    }
    function showThanks() {
      form.hidden = true;
      thanks.hidden = false;
      thanks.classList.add('enter');
      thanks.focus({ preventScroll: true });
      thanks.closest('.form-card').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      confetti();
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      formErr.classList.remove('show');
      const results = controls.map(el => check(el, true));
      const firstBad = controls[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }
      const endpoint = form.dataset.endpoint;
      submit.classList.add('sending');
      try {
        if (endpoint) {
          const data = Object.fromEntries(new FormData(form));
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        } else {
          await new Promise(r => setTimeout(r, 700)); // staging: no server yet, nothing is sent
        }
        showThanks();
      } catch (err) {
        formErr.textContent = MSG.failed;
        formErr.classList.add('show');
      } finally {
        submit.classList.remove('sending');
      }
    });
    updateMeter();
  }

  // Office cards: live local time and whether the office is in working hours
  const offices = $$('.office[data-tz]');
  if (offices.length) {
    const tick = () => offices.forEach(o => {
      try {
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('en-US', { timeZone: o.dataset.tz, hour: 'numeric', minute: '2-digit' });
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: o.dataset.tz, hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(now);
        const hour = +parts.find(p => p.type === 'hour').value, day = parts.find(p => p.type === 'weekday').value;
        const open = hour >= 9 && hour < 18 && !['Sat', 'Sun'].includes(day);
        $('.clock', o).textContent = fmt.format(now);
        const pill = $('.open-pill', o);
        pill.textContent = open ? 'In office hours' : 'Out of hours';
        pill.classList.toggle('is-open', open);
      } catch (err) { /* leave the placeholder if the time zone is unknown */ }
    });
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- FAQs page: service-line tabs, search, open all ---------- */
  if ($('#faqPage')) {
    const LINES = ['strategy', 'data-ai', 'systems', 'people'];
    const tabsBox = $('#faqTabs'), tabs = $$('[role=tab]', tabsBox), groups = $$('.faq-group'), groupsBox = $('.faq-groups');
    const side = $('#faqSide'), sideName = $('#faqSideName'), sideText = $('#faqSideText'), sideSvc = $('#faqSideSvc');
    const search = $('#faqSearch'), clear = $('#faqClear'), results = $('#faqResults'), empty = $('#faqEmpty'), expand = $('#faqExpand');
    let line = null, query = '';
    const replay = el => { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); };
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Each answer gets a link to its service line on the Services page
    groups.forEach(g => $$('.faq-a', g).forEach(a => {
      const link = document.createElement('a');
      link.className = 'inline-link faq-rel';
      link.href = 'service-' + g.dataset.line + '.html';
      link.innerHTML = 'Explore ' + esc(g.dataset.title) + ' <span class="arr" aria-hidden="true">→</span>';
      a.appendChild(link);
    }));
    const countAll = () => tabs.forEach(t => { $('.count', t).textContent = $$('.faq', groups.find(g => g.dataset.line === t.dataset.line)).length; });

    function setTab(next, updateHash = true) {
      if (!LINES.includes(next)) return;
      if (query) clearSearch(false);
      line = next;
      tabs.forEach(t => { const on = t.dataset.line === line; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      groups.forEach(g => { g.hidden = g.dataset.line !== line; if (!g.hidden) replay(g); });
      const g = groups.find(x => x.dataset.line === line);
      side.dataset.line = line;
      sideName.textContent = g.dataset.title;
      sideText.textContent = g.dataset.tagline;
      sideSvc.href = 'service-' + line + '.html';
      replay(side);
      syncExpandLabel();
      if (updateHash && history.replaceState) { try { history.replaceState(null, '', '#' + line); } catch (e) { /* preview frames may refuse */ } }
    }
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => setTab(t.dataset.line));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = tabs[(k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        n.focus(); setTab(n.dataset.line);
      });
    });

    // Open all / close all for whatever is showing
    const visibleFaqs = () => $$('.faq', groupsBox).filter(f => !f.hidden && !f.closest('.faq-group').hidden);
    function syncExpandLabel() {
      const v = visibleFaqs();
      expand.textContent = v.length && v.every(f => f.open) ? 'Close all answers' : 'Open all answers';
    }
    expand.addEventListener('click', () => { const v = visibleFaqs(), open = !v.every(f => f.open); v.forEach(f => (f.open = open)); syncExpandLabel(); });
    groupsBox.addEventListener('toggle', syncExpandLabel, true);

    // Search across all four lines, with matches highlighted
    function highlight(el, re) {
      if (el.dataset.orig === undefined) el.dataset.orig = el.textContent;
      el.innerHTML = re ? esc(el.dataset.orig).replace(re, '<mark>$&</mark>') : esc(el.dataset.orig);
    }
    function clearSearch(restoreTab = true) {
      query = ''; search.value = ''; clear.hidden = true;
      tabsBox.classList.remove('searching'); groupsBox.classList.remove('searching');
      results.textContent = ''; empty.hidden = true;
      $$('.faq', groupsBox).forEach(f => { f.hidden = false; highlight($('summary', f), null); highlight($('.faq-a p', f), null); });
      countAll();
      if (restoreTab) { const l = line; line = null; setTab(l || 'strategy', false); }
    }
    function runSearch() {
      query = search.value.trim();
      clear.hidden = !query;
      if (!query) { clearSearch(); return; }
      const re = new RegExp(esc(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const words = query.toLowerCase();
      tabsBox.classList.add('searching'); groupsBox.classList.add('searching');
      let total = 0;
      groups.forEach(g => {
        let n = 0;
        $$('.faq', g).forEach(f => {
          const q = $('summary', f), a = $('.faq-a p', f);
          const hit = ((q.dataset.orig ?? q.textContent) + ' ' + (a.dataset.orig ?? a.textContent)).toLowerCase().includes(words);
          f.hidden = !hit;
          highlight(q, hit ? re : null); highlight(a, hit ? re : null);
          if (hit) { f.open = true; n++; }
        });
        g.hidden = n === 0;
        $('.count', tabs.find(t => t.dataset.line === g.dataset.line)).textContent = n;
        total += n;
      });
      results.textContent = total ? `${total} ${total === 1 ? 'question matches' : 'questions match'} “${query}”` : '';
      empty.hidden = total > 0;
      syncExpandLabel();
    }
    let searchT;
    search.addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(runSearch, 120); });
    search.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
    clear.addEventListener('click', () => { clearSearch(); search.focus(); });

    countAll();
    const fromHash = () => location.hash.slice(1);
    setTab(LINES.includes(fromHash()) ? fromHash() : 'strategy', false);
    addEventListener('hashchange', () => { if (LINES.includes(fromHash())) setTab(fromHash(), false); });
  }

  /* ---------- Service line pages (service-*.html) ---------- */
  if (document.body.classList.contains('line-page')) {
    // Reduced motion also stops the SVG path animations in the hero
    if (reduce) $$('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());

    // Problem "gap" visual follows the scroll position
    const gaps = $$('.gap-card');
    const updGaps = () => gaps.forEach(g => {
      const r = g.getBoundingClientRect(), vh = innerHeight || 800;
      const p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (vh * 0.6)));
      let a = p, b = p;
      if (g.dataset.mode === 'race') { a = Math.min(1, p * 2.6); b = p * p; }
      if (g.dataset.mode === 'timeline') { a = p * 0.5; }
      g.style.setProperty('--a', a.toFixed(3));
      g.style.setProperty('--b', b.toFixed(3));
      g.classList.toggle('closed', p > 0.97);
    });
    addEventListener('scroll', updGaps, { passive: true });
    addEventListener('resize', updGaps);
    updGaps();

    // Point of view: spotlight moves across the principles; hover takes over
    const povCards = $$('.pov-card');
    if (povCards.length) {
      let k = 0, t = null, seen = false, hovering = false;
      const show = i => { k = (i + povCards.length) % povCards.length; povCards.forEach((c, j) => c.classList.toggle('active', j === k)); };
      const run = () => { clearInterval(t); if (!reduce && seen && !hovering) t = setInterval(() => show(k + 1), SETTINGS.povMs); };
      povCards.forEach((c, j) => {
        c.addEventListener('mouseenter', () => { hovering = true; show(j); run(); });
        c.addEventListener('mouseleave', () => { hovering = false; run(); });
        c.addEventListener('focusin', () => show(j));
      });
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); }, { threshold: 0.2 }).observe(povCards[0].parentElement);
      show(0);
    }

    // Week blocks under each "first engagement"
    $$('.wk[data-weeks]').forEach(w => {
      const n = Math.min(12, +w.dataset.weeks || 1) + (w.classList.contains('loop') ? 1 : 0);
      w.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--n:${i}"></i>`).join('');
    });

    // Pull quote: words rise in one by one
    $$('.pull').forEach(q => {
      q.innerHTML = q.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--n:${i}">${w}</span>`).join(' ');
      q.classList.add('split');
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { q.classList.add('in'); o.disconnect(); } }, { threshold: 0.3 }).observe(q);
      setTimeout(() => q.classList.add('in'), 4000);
    });

    // Data & AI: route a case to automatic, approval or expert
    const router = $('#router');
    if (router) {
      const ball = $('.case-ball', router), lanes = $$('.lane', router), btns = $$('.route-btns button');
      const route = name => {
        btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.route === name));
        const lane = lanes.find(l => l.dataset.route === name);
        lanes.forEach(l => l.classList.toggle('on', l === lane));
        const rr = router.getBoundingClientRect(), lr = lane.getBoundingClientRect();
        ball.style.left = (lr.right - rr.left - 30) + 'px';
        ball.style.top = (lr.top - rr.top + lr.height / 2) + 'px';
      };
      btns.forEach(b => b.addEventListener('click', () => { clearInterval(rt); route(b.dataset.route); }));
      let i = 0;
      const order = btns.map(b => b.dataset.route);
      const rt = reduce ? null : setInterval(() => { i = (i + 1) % order.length; route(order[i]); }, 3200);
      addEventListener('resize', () => route(btns.find(b => b.getAttribute('aria-pressed') === 'true').dataset.route));
      setTimeout(() => route(order[0]), 300);
    }
  }

  /* ---------- Problem demo: "Apply to my data" ---------- */
  const demo = $('#demo');
  if (demo) {
    const btn = $('#demoApply'), status = $('#demoStatus');
    const cells = $$('.c-after[data-after]', demo);
    let running = false;
    function setBefore() {
      cells.forEach(c => { c.className = 'c-after is-before'; c.textContent = c.dataset.before; });
      status.textContent = '4 changes';
    }
    function run() {
      if (running) return;
      running = true;
      btn.disabled = true; btn.textContent = 'Applying…';
      status.textContent = 'Applying D++…';
      setBefore();
      const step = reduce ? 0 : SETTINGS.demoStepMs;
      cells.forEach((c, i) => {
        setTimeout(() => { c.className = 'c-after is-loading'; }, i * step * 0.5);
        setTimeout(() => { c.className = 'c-after is-done'; c.textContent = c.dataset.after; }, 500 + i * step);
      });
      setTimeout(() => {
        running = false;
        btn.disabled = false; btn.textContent = 'Show again';
        status.textContent = '4 changes applied';
      }, 600 + cells.length * step);
    }
    btn.addEventListener('click', run);
    // Plays once when the demo first scrolls into view. Until then it shows the finished state.
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { obs.disconnect(); setTimeout(run, 500); }
    }, { threshold: 0.35 }).observe(demo);
  }

  /* ---------- Solution cards: gentle 3D tilt ---------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    $$('.sol-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => (card.style.transform = ''));
    });
  }

  /* ---------- Reviews: tabs + carousel + drag + autoplay ---------- */
  const track = $('#revTrack');
  if (track) {
    const cards = $$('.review', track), tabs = $$('#revTabs [role=tab]'), bar = $('#revBar');
    let index = 0, timer = null, visible = false, hovering = false;

    const leftOf = i => cards[i].offsetLeft - cards[0].offsetLeft;
    function goTo(i) {
      index = (i + cards.length) % cards.length;
      track.scrollTo({ left: leftOf(index), behavior: reduce ? 'auto' : 'smooth' });
      mark();
    }
    function mark() {
      cards.forEach((c, k) => c.classList.toggle('active', k === index));
      const group = cards[index].dataset.group;
      tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === group));
      bar.style.width = ((index + 1) / cards.length * 100) + '%';
    }
    // Keep the active card in sync when people swipe or drag
    let scrollT;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        let best = 0, dist = Infinity;
        cards.forEach((c, k) => { const d = Math.abs(leftOf(k) - track.scrollLeft); if (d < dist) { dist = d; best = k; } });
        // At the far right the last cards can't reach the left edge, so keep the card that was chosen.
        const max = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= max - 4 && leftOf(index) >= max - 4) best = index;
        index = best; mark();
      }, 90);
    }, { passive: true });

    tabs.forEach(t => t.addEventListener('click', () => { goTo(cards.findIndex(c => c.dataset.group === t.dataset.tab)); restart(); }));
    $('#revPrev').addEventListener('click', () => { goTo(index - 1); restart(); });
    $('#revNext').addEventListener('click', () => { goTo(index + 1); restart(); });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); restart(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); restart(); }
    });

    // Mouse drag (touch already scrolls natively)
    let startX = 0, startLeft = 0, dragging = false, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      dragging = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        track.classList.remove('dragging');
        let best = 0, dist = Infinity;
        cards.forEach((c, k) => { const d = Math.abs(leftOf(k) - track.scrollLeft); if (d < dist) { dist = d; best = k; } });
        goTo(best); restart();
      }
    });

    function restart() {
      clearInterval(timer); timer = null;
      if (!SETTINGS.reviewsAutoplayMs || reduce || !visible || hovering) return;
      timer = setInterval(() => goTo(index + 1), SETTINGS.reviewsAutoplayMs);
    }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; restart(); }, { threshold: 0.4 }).observe(track);
    track.addEventListener('mouseenter', () => { hovering = true; restart(); });
    track.addEventListener('mouseleave', () => { hovering = false; restart(); });
    mark();
  }

  /* ---------- Copy buttons (contact) ---------- */
  $$('.copy-btn').forEach(b => b.addEventListener('click', () => {
    const text = b.dataset.copy;
    const fallback = () => {
      const val = b.parentElement.querySelector('.val');
      const range = document.createRange(); range.selectNodeContents(val);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      say('Selected. Press Ctrl+C to copy.');
    };
    try {
      navigator.clipboard.writeText(text).then(() => { say('Copied ' + text); b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1600); }, fallback);
    } catch (err) { fallback(); }
  }));
})();
