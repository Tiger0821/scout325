// 325 奎山童軍團 — 留言板 (guestbook)
// Messages are sent to a Google Form and read back from its Google Sheet.
(() => {
  /* =====================================================================
     設定 SETTINGS — fill these in to connect the guestbook to Google.
     While formId / sheetId are empty the page runs in DEMO mode
     (messages are only kept in the visitor's own browser).
     ===================================================================== */
  const CONFIG = {
    // The long code in the form's public link:
    // https://docs.google.com/forms/d/e/<<formId>>/viewform
    formId: '1FAIpQLSc50mrIIDU5-DC2xcY08ptPD3KFgyRuNY-NrOK78fcOL-t8tQ',
    // The long code in the answer sheet's link:
    // https://docs.google.com/spreadsheets/d/<<sheetId>>/edit
    sheetId: '1l5uYejUcqvIwMIQLBRF2SVPa8ikGitsIaLuM8Ywc3CE',
    // The hidden "entry" number of each form question (e.g. 'entry.123456789')
    entries: { name: 'entry.1814888662', patrol: 'entry.1921274815', role: 'entry.1781060296', color: 'entry.711754562', message: 'entry.922644983' },
    // Sheet columns must be in this order:
    // A 時間戳記 | B 名字 | C 小隊 | D 身分 | E 領巾顏色 | F 留言 | G 隱藏 (type anything in G to hide a message)
    poll: 15000,   // check for new messages every 15 seconds
    page: 10,      // messages shown before "load more"
  };
  /* ===================================================================== */

  const $ = (s, r = document) => r.querySelector(s);
  const form = $('#gb-form');
  if (!form) return;
  const wall = $('#gb-wall'), more = $('#gb-more'), statusEl = $('#gb-status');
  const liveEl = $('#gb-live'), totalEl = $('#gb-total'), syncEl = $('#gb-sync'), tick = $('#gb-tick');
  const demoNote = $('#gb-demo-note'), sendBtn = $('#gb-send'), countEl = $('#gb-count');
  const LIVE = !!(CONFIG.formId && CONFIG.sheetId);
  const MAXLEN = { name: 20, patrol: 20, message: 300 };

  const en = () => document.documentElement.lang === 'en';
  const T = {
    live: ['LIVE', 'LIVE'], demo: ['DEMO 示範模式', 'DEMO MODE'], offline: ['離線', 'OFFLINE'],
    total: n => en() ? `${n} message${n === 1 ? '' : 's'}` : `共 ${n} 則留言`,
    sync: t => en() ? `SYNCED ${t}` : `已同步 ${t}`,
    syncing: ['同步中…', 'SYNCING…'],
    syncFail: ['讀取失敗，稍後自動重試', 'Could not load. Retrying soon'],
    empty: ['還沒有留言，快來當第一個！', 'No messages yet. Be the first!'],
    needName: ['請填寫名字或暱稱。', 'Please enter a name or nickname.'],
    needMsg: ['請寫下留言內容。', 'Please write a message.'],
    sending: ['傳送中…', 'Sending…'],
    sent: ['已送出！你的留言已經貼上留言牆。', 'Sent! Your message is on the wall.'],
    sentDemo: ['示範模式：留言只存在你的瀏覽器裡。', 'Demo mode: saved in your browser only.'],
    fail: ['傳送失敗，請檢查網路後再試一次。', 'Sending failed. Check your connection and try again.'],
    wait: s => en() ? `Please wait ${s}s before sending again.` : `請等 ${s} 秒再送出下一則。`,
    pending: ['傳送中', 'SENDING'],
    roles: { scout: ['童軍夥伴', 'SCOUT'], leader: ['服務員', 'LEADER'], parent: ['家長', 'PARENT'], alumni: ['校友', 'ALUMNI'], guest: ['訪客', 'GUEST'] },
  };
  const L = k => T[k][en() ? 1 : 0];

  /* ---------- pixel scout (same sprite as app.js) ---------- */
  const MAP = [
    '....GGGG....', '...GGGGGG...', '.GGGGGGGGGG.', '...SSSSSS...',
    'S..SBSSBS..S', 'S..SSSSSS..S', 'HH..SBBS..HH', '.HHHRRRRHHH.',
    '..HHHRRHHH..', '...HHHRHH...', '...HHHHHH...', '...NNNNNN...',
    '..NNN..NNN..', '.SS......SS.', '.WW......WW.', 'DDD......DDD',
  ];
  const SCARF = { lime: '#d8e14a', red: '#e8412c', teal: '#3aa6a0', cream: '#f4efcf' };
  function scout(color) {
    const pal = { G: '#1f5a36', S: '#e9b98a', B: '#05060a', R: SCARF[color] || SCARF.lime, H: '#b99a5b', N: '#2b3044', W: '#f4efcf', D: '#5a3a26' };
    let r = '';
    MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`; }));
    return `<svg viewBox="0 0 12 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }
  document.querySelectorAll('.gb-scarves [data-scarf]').forEach(s => { s.innerHTML = scout(s.dataset.scarf); });

  /* ---------- state ---------- */
  let msgs = [];          // from the sheet (or demo), newest first
  let pending = [];       // just sent, not yet seen in the sheet
  let shown = CONFIG.page;
  let known = null;       // ids already drawn (null until first load)
  let fresh = new Set();  // ids to animate on the next draw
  let lastSync = null, syncState = 'syncing';

  const SEEDS = [
    { t: new Date(2026, 10, 15, 9, 0), name: '系統 SYSTEM', patrol: '', role: 'leader', color: 'cream', text: '這是範例留言。連接 Google 表單後，這裡會顯示真正的留言。\nSample message. Real messages appear here once the guestbook is connected.' },
    { t: new Date(2026, 10, 14, 18, 30), name: '小虎', patrol: '老鷹小隊', role: 'scout', color: 'red', text: '（範例）上次露營的營火晚會超好玩！' },
    { t: new Date(2026, 10, 13, 20, 5), name: 'Scout Mom', patrol: '', role: 'parent', color: 'teal', text: '(Sample) Thank you leaders for all your hard work!' },
  ];

  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  const key = m => m.name + '\u0001' + m.text;

  /* ---------- drawing (always textContent — never trust message text as HTML) ---------- */
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  function card(m, no) {
    const li = mk('li', 'gb-msg' + (m.pending ? ' pending' : '') + (fresh.has(m.id) ? ' new' : ''));
    li.dataset.c = SCARF[m.color] ? m.color : 'lime';
    const ava = mk('div', 'gb-ava'); ava.innerHTML = scout(li.dataset.c);
    const body = mk('div');
    const head = mk('div', 'gb-head');
    head.append(mk('span', 'gb-name', m.name || '—'));
    const role = T.roles[m.role] || T.roles.guest;
    head.append(mk('span', 'gb-role', role[en() ? 1 : 0]));
    const meta = mk('p', 'gb-meta');
    if (m.patrol) { meta.append(mk('b', '', m.patrol)); meta.append(' · '); }
    meta.append(fmt(m.t));
    body.append(head, meta, mk('p', 'gb-text', m.text));
    li.append(ava, body, mk('span', 'gb-no', m.pending ? L('pending') : '#' + String(no).padStart(3, '0')));
    return li;
  }
  function draw() {
    const all = pending.concat(msgs);
    wall.textContent = '';
    if (!all.length) wall.append(mk('li', 'gb-empty', syncState === 'syncing' ? L('syncing') : L('empty')));
    all.slice(0, shown).forEach((m, i) => wall.append(card(m, msgs.length - (i - pending.length))));
    more.hidden = all.length <= shown;
    fresh = new Set();
    totalEl.textContent = T.total(all.length);
    liveEl.className = 'gb-live' + (!LIVE ? ' demo' : syncState === 'fail' ? ' off' : '');
    liveEl.textContent = !LIVE ? L('demo') : syncState === 'fail' ? L('offline') : L('live');
    syncEl.textContent = !LIVE ? '' : syncState === 'fail' ? L('syncFail') : lastSync ? T.sync(lastSync.toTimeString().slice(0, 8)) : L('syncing');
    demoNote.hidden = LIVE;
  }
  function accept(list) {
    list.sort((a, b) => (b.t ? b.t.getTime() : 0) - (a.t ? a.t.getTime() : 0));
    if (known) list.forEach(m => { if (!known.has(m.id)) fresh.add(m.id); });
    known = new Set(list.map(m => m.id));
    const have = new Set(list.map(key));
    pending = pending.filter(p => !have.has(key(p)));
    msgs = list;
    draw();
  }

  /* ---------- reading ---------- */
  function demoLoad() {
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem('gb-demo') || '[]').map(m => ({ ...m, t: new Date(m.t) })); } catch (e) {}
    syncState = 'ok';
    accept(SEEDS.concat(mine).map((m, i) => ({ ...m, id: 'd' + (m.t ? m.t.getTime() : i) + m.name })));
  }
  const gDate = v => { const m = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/.exec(v || ''); return m ? new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null; };
  let seq = 0, timer = 0;
  function sheetLoad() {
    clearTimeout(timer);
    const cb = '__gb' + (++seq), s = document.createElement('script');
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      delete window[cb]; s.remove(); clearTimeout(guard);
      if (!ok) { syncState = 'fail'; draw(); }
      tick.classList.remove('run'); void tick.offsetWidth; tick.classList.add('run');
      timer = setTimeout(() => { if (!document.hidden) sheetLoad(); }, CONFIG.poll);
    };
    const guard = setTimeout(() => finish(false), 9000);
    window[cb] = res => {
      if (!res || res.status !== 'ok' || !res.table) return finish(false);
      const cell = (r, i) => (r.c && r.c[i] && r.c[i].v != null) ? r.c[i].v : '';
      const list = [];
      res.table.rows.forEach(r => {
        const text = clean(cell(r, 5), MAXLEN.message);
        if (!text || String(cell(r, 6)).trim()) return;      // empty, or hidden by the owner (column G)
        const t = gDate(cell(r, 0));
        const m = { t, name: clean(cell(r, 1), MAXLEN.name), patrol: clean(cell(r, 2), MAXLEN.patrol), role: clean(cell(r, 3), 12), color: clean(cell(r, 4), 12), text };
        m.id = (t ? t.getTime() : '') + key(m);
        list.push(m);
      });
      syncState = 'ok'; lastSync = new Date();
      accept(list); finish(true);
    };
    s.onerror = () => finish(false);
    s.src = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?headers=1&tqx=out:json;responseHandler:${cb}&_=${Date.now()}`;
    document.head.append(s);
  }
  const load = LIVE ? sheetLoad : demoLoad;
  document.addEventListener('visibilitychange', () => { if (LIVE && !document.hidden) sheetLoad(); });

  /* ---------- sending ---------- */
  const say = (text, err) => { statusEl.textContent = text; statusEl.classList.toggle('err', !!err); };
  const msgBox = form.elements.message;
  const count = () => { const n = msgBox.value.length; countEl.textContent = `${String(n).padStart(3, '0')} / ${MAXLEN.message}`; countEl.classList.toggle('hot', n > MAXLEN.message - 20); };
  msgBox.addEventListener('input', count); count();
  form.addEventListener('input', e => { if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });

  let coolUntil = 0;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = form.elements;
    const m = {
      t: new Date(), name: clean(f.name.value, MAXLEN.name), patrol: clean(f.patrol.value, MAXLEN.patrol),
      role: f.role.value, color: f.color.value, text: clean(f.message.value, MAXLEN.message),
    };
    if (!m.name) { f.name.setAttribute('aria-invalid', 'true'); f.name.focus(); return say(L('needName'), true); }
    if (!m.text) { f.message.setAttribute('aria-invalid', 'true'); f.message.focus(); return say(L('needMsg'), true); }
    const left = Math.ceil((coolUntil - Date.now()) / 1000);
    if (left > 0) return say(T.wait(left), true);
    if (f.website.value) return say(L('sent'));      // hidden trap field: only robots fill it in

    sendBtn.disabled = true; say(L('sending'));
    try {
      if (LIVE) {
        const E = CONFIG.entries, body = new URLSearchParams();
        body.set(E.name, m.name); body.set(E.patrol, m.patrol); body.set(E.role, m.role); body.set(E.color, m.color); body.set(E.message, m.text);
        await fetch(`https://docs.google.com/forms/d/e/${CONFIG.formId}/formResponse`, { method: 'POST', mode: 'no-cors', body });
        m.pending = true; m.id = 'p' + Date.now(); fresh.add(m.id);
        pending.unshift(m); draw();
        setTimeout(sheetLoad, 2500);
        say(L('sent'));
      } else {
        let mine = [];
        try { mine = JSON.parse(localStorage.getItem('gb-demo') || '[]'); } catch (err) {}
        mine.push(m);
        try { localStorage.setItem('gb-demo', JSON.stringify(mine.slice(-20))); } catch (err) {}
        demoLoad();
        say(L('sentDemo'));
      }
      f.message.value = ''; count();
      coolUntil = Date.now() + 20000;
    } catch (err) {
      say(L('fail'), true);
    }
    sendBtn.disabled = false;
  });

  more.addEventListener('click', () => { shown += CONFIG.page; draw(); });

  /* ---------- language: placeholders + redraw when app.js switches language ---------- */
  function phs() {
    form.querySelectorAll('[data-ph-en]').forEach(i => {
      if (i.dataset.phZh === undefined) i.dataset.phZh = i.placeholder;
      i.placeholder = en() ? i.dataset.phEn : i.dataset.phZh;
    });
  }
  new MutationObserver(() => { phs(); statusEl.textContent = ''; draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  tick.style.setProperty('--poll', CONFIG.poll + 'ms');
  phs(); draw(); load();
})();
