// 325 奎山童軍團 — language switch, card popup with jumping scouts, scroll-up easter egg
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

  /* ---------- pixel scout sprite ---------- */
  const MAP = [
    '....GGGG....', '...GGGGGG...', '.GGGGGGGGGG.', '...SSSSSS...',
    'S..SBSSBS..S', 'S..SSSSSS..S', 'HH..SBBS..HH', '.HHHRRRRHHH.',
    '..HHHRRHHH..', '...HHHRHH...', '...HHHHHH...', '...NNNNNN...',
    '..NNN..NNN..', '.SS......SS.', '.WW......WW.', 'DDD......DDD',
  ];
  function scout(scarf) {
    const pal = { G: '#1f5a36', S: '#e9b98a', B: '#05060a', R: scarf, H: '#b99a5b', N: '#2b3044', W: '#f4efcf', D: '#5a3a26' };
    let r = '';
    MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`; }));
    return `<svg viewBox="0 0 12 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }
  const SCOUTS = scout('#e8412c') + scout('#d8e14a');

  /* ---------- language ---------- */
  let lang = 'zh';
  try { lang = localStorage.getItem('lang') || 'zh'; } catch (e) {}
  function setLang(l) {
    lang = l;
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hant';
    $$('[data-en]').forEach(n => {
      if (n.dataset.zh === undefined) n.dataset.zh = n.innerHTML;
      n.innerHTML = l === 'en' ? n.dataset.en : n.dataset.zh;
      if (n.classList.contains('gl')) n.dataset.text = n.textContent;
    });
    const b = $('#lang');
    if (b) { b.textContent = l === 'en' ? '中文' : 'EN'; b.setAttribute('aria-label', l === 'en' ? '切換為中文' : 'Switch to English'); }
    try { localStorage.setItem('lang', l); } catch (e) {}
  }
  const lb = $('#lang');
  if (lb) lb.addEventListener('click', () => setLang(lang === 'en' ? 'zh' : 'en'));

  /* ---------- lock scrolling while an overlay is open ---------- */
  const lock = on => { document.documentElement.style.overflow = on ? 'hidden' : ''; };

  /* ---------- popup: full view of a section, one item at a time ---------- */
  const modal = el('div', 'modal', `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-top"><span id="modal-title"></span><span class="modal-count"></span>
        <button class="modal-x" aria-label="Close">✕ ESC</button></div>
      <div class="modal-body"></div>
      <div class="modal-nav"><button class="modal-prev" aria-label="Previous">◀ PREV</button>
        <div class="modal-dots"></div><button class="modal-next" aria-label="Next">NEXT ▶</button></div>
    </div>`);
  document.body.append(modal);
  let items = [], idx = 0, opener = null;

  function show(i) {
    idx = (i + items.length) % items.length;
    const body = $('.modal-body', modal);
    body.innerHTML = items[idx].innerHTML;
    body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
    $('.modal-count', modal).textContent = `${String(idx + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    $('.modal-dots', modal).innerHTML = items.map((_, n) => `<i class="${n === idx ? 'on' : ''}"></i>`).join('');
  }
  function openModal(item) {
    const sec = item.closest('section');
    items = $$('.card, figure', sec);
    const h = $('h2', sec);
    $('#modal-title', modal).innerHTML = h ? $('.num', h).outerHTML + ' ' + $('.gl', h).textContent : '';
    show(items.indexOf(item));
    modal.classList.add('open'); lock(true);
    $('.modal-x', modal).focus();
  }
  function closeModal() {
    modal.classList.remove('open'); lock(false);
    if (opener) opener.focus();
  }
  function jumpThen(fn) {
    if (reduce) return fn();
    const j = el('div', 'jump', SCOUTS + '<b>準備!</b>');
    document.body.append(j);
    setTimeout(fn, 430);
    setTimeout(() => j.remove(), 1000);
  }
  $$('main section .card, main section figure').forEach(c => {
    c.tabIndex = 0; c.setAttribute('role', 'button'); c.classList.add('clickable');
    const go = () => { opener = c; jumpThen(() => openModal(c)); };
    c.addEventListener('click', go);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  $('.modal-x', modal).addEventListener('click', closeModal);
  $('.modal-prev', modal).addEventListener('click', () => show(idx - 1));
  $('.modal-next', modal).addEventListener('click', () => show(idx + 1));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  /* ---------- easter egg: keep scrolling up at the very top ---------- */
  const egg = el('div', 'egg', `
    <div class="haz"></div>
    <div class="egg-in" role="dialog" aria-modal="true" aria-label="彩蛋 Easter egg">
      <div class="egg-code">ERROR 325 // UNAUTHORIZED SCOUT DETECTED // 權限不足</div>
      <div class="egg-h"><span class="gl" data-text="禁區" data-en="NO ENTRY">禁區</span></div>
      <div class="egg-sub">▲ RESTRICTED AREA ▲ RESTRICTED AREA ▲</div>
      <div class="egg-scouts">${SCOUTS}</div>
      <p class="egg-msg" data-en="You found the EASTER EGG!&lt;br&gt;The author of this site is… ME.">你發現了<b>彩蛋</b>！<br>這個網站的作者就是……我。</p>
      <div class="egg-name">TIGER0821</div>
      <button class="egg-x" data-en="▼ BACK TO THE GROUND">▼ 返回地面</button>
    </div>
    <div class="haz"></div>`);
  const pull = el('div', 'pull');
  document.body.append(egg, pull);
  let acc = 0, idle = 0, eggOpen = false;
  const NEED = 520;
  function tug(d) {
    if (eggOpen || modal.classList.contains('open') || scrollY > 0) return;
    acc += d; clearTimeout(idle);
    const pct = Math.min(100, Math.round(acc / NEED * 100));
    pull.textContent = `▲ RESTRICTED ▲ ${lang === 'en' ? 'KEEP SCROLLING UP' : '繼續往上滑'} ${pct}%`;
    pull.style.setProperty('--p', pct + '%'); pull.classList.add('on');
    if (acc >= NEED) return openEgg();
    idle = setTimeout(() => { acc = 0; pull.classList.remove('on'); }, 900);
  }
  function openEgg() {
    acc = 0; pull.classList.remove('on'); eggOpen = true;
    egg.classList.add('open'); lock(true); $('.egg-x', egg).focus();
  }
  function closeEgg() { eggOpen = false; egg.classList.remove('open'); lock(false); }
  addEventListener('wheel', e => { if (e.deltaY < 0) tug(Math.min(120, -e.deltaY)); else if (eggOpen && e.deltaY > 30) closeEgg(); }, { passive: true });
  let ty = null;
  addEventListener('touchstart', e => { ty = scrollY <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener('touchmove', e => { if (ty === null) return; const y = e.touches[0].clientY; if (y > ty) tug((y - ty) * 1.6); ty = y; }, { passive: true });
  $('.egg-x', egg).addEventListener('click', closeEgg);

  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (eggOpen) closeEgg(); else if (modal.classList.contains('open')) closeModal(); }
    else if (modal.classList.contains('open')) { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); }
    else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && scrollY <= 0) tug(90);
  });

  setLang(lang);
})();
