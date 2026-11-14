(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var KINDS = CFG.KINDS || {};
  var K = { history: 'portal_history', historyOn: 'portal_history_on', theme: 'portal_theme' };

  /* ---------- utils ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function h(tag, attrs) {
    var el = document.createElement(tag), a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v; // static strings only
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      list.forEach(function (kid) {
        if (kid === null || kid === undefined || kid === false) return;
        if (Array.isArray(kid)) return add(kid);
        el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
      });
    })(Array.prototype.slice.call(arguments, 2));
    return el;
  }

  var ICONS = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    id: `<rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M10.5 5h3M11 18.5h2"/>`,
    vid: '<path d="M5 17H4a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5v4a1 1 0 0 1-1 1h-1M9 17h6M3 12h18M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>',
    family: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c.4-3.4 2.6-5.5 5.5-5.5s5.1 2.1 5.5 5.5M14.5 14.8c.8-.4 1.6-.6 2.5-.6 2.4 0 4 1.7 4.4 4.8"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    empty: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
    aadhar : '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.8-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13h3"/>' 
  };
  function svg(n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }
  function icon(n) { var t = document.createElement('template'); t.innerHTML = svg(n); return t.content.firstChild; }
  function pretty(key) {
    return String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function currentFile() { return location.pathname.split('/').pop() || 'index.html'; }

  /* ---------- theme ---------- */
  function getMode() { try { return localStorage.getItem(K.theme) || 'light'; } catch (e) { return 'light'; } }
  function applyTheme(m) {
    var dark = m === 'dark' || (m === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
  }
  function setMode(m) { try { localStorage.setItem(K.theme, m); } catch (e) {} applyTheme(m); }
  applyTheme(getMode());

  /* ---------- API layer ---------- */
  function ApiError(message, status) { var e = new Error(message); e.status = status || 0; return e; }

  async function request(path, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var base = String(CFG.API_BASE || '').replace(/\/$/, '');
    var url;
    try { url = new URL(base + path, location.href); } catch (e) { throw ApiError('API address is not valid. Check API_BASE in assets/js/config.js.'); }
    if (opts.query) Object.keys(opts.query).forEach(function (k) { url.searchParams.set(k, opts.query[k]); });
    var headers = { 'Accept': 'application/json' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    if (CFG.API_KEY) headers['X-API-Key'] = CFG.API_KEY;

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 90000);
    var res, text;
    try {
      res = await fetch(url.toString(), { method: method, headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal, credentials: 'omit' });
      text = await res.text();
    } catch (e) {
      if (e && e.name === 'AbortError') throw ApiError('The server took too long to respond. Please try again.');
      throw ApiError('Cannot reach the server. Check your connection, the API address and CORS settings.');
    } finally { clearTimeout(timer); }

    var data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 2000) }; } }
    if (!res.ok) {
      var msg = data && typeof data === 'object' ? (data.message || data.error || '') : '';
      if (typeof msg !== 'string') msg = '';
      if (res.status === 401 || res.status === 403) throw ApiError(msg || 'The server refused this request (access denied).', res.status);
      if (res.status === 404) throw ApiError(msg || 'No record found.', 404);
      if (res.status === 429) throw ApiError(msg || 'Too many requests. Please wait a moment.', 429);
      if (res.status >= 500) throw ApiError(msg || 'Server error. Please try again later.', res.status);
      throw ApiError(msg || 'Request failed (' + res.status + ').', res.status);
    }
    return data;
  }

  /* ---------- demo data ---------- */
  function seedOf(q) { var s = 7; for (var i = 0; i < q.length; i++) s = (s * 31 + q.charCodeAt(i)) >>> 0; return s; }
  function pick(a, s, o) { return a[(s + (o || 0)) % a.length]; }
  function dateFrom(s, y, o) { return new Date(y + (s % 6), (s + (o || 0)) % 12, 1 + ((s >>> 3) + (o || 0)) % 27).toISOString().slice(0, 10); }
  function mock(kind, q) {
    var s = seedOf(q);
    var names = ['Aarav Sharma', 'Diya Verma', 'Kabir Singh', 'Meera Patel', 'Rohan Das', 'Anaya Gupta', 'Vihaan Rao'];
    var depts = ['Operations', 'Finance', 'Engineering', 'Human Resources', 'Support', 'Logistics'];
    var roles = ['Associate', 'Senior Associate', 'Team Lead', 'Manager', 'Analyst'];
    var name = pick(names, s);
    if (kind === 'id') return { id_number: q, full_name: name, department: pick(depts, s, 1), designation: pick(roles, s, 2), joined_on: dateFrom(s, 2017, 0), work_email: name.toLowerCase().replace(/\s+/g, '.') + '@example.com', status: 'Active', linked_vid: 'VID-' + (100000 + (s % 899999)) };
    if (kind === 'vid') return { vid: q, linked_id_number: 'EMP-' + (1000 + (s % 8999)), holder_name: name, verification_status: s % 7 === 0 ? 'Pending' : 'Verified', verified_on: dateFrom(s, 2022, 3), valid_until: dateFrom(s, 2027, 5), method: pick(['Document check', 'Video KYC', 'In-person'], s, 1) };
    var rel = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother'], members = [], n = 2 + (s % 3);
    for (var i = 0; i < n; i++) members.push({ name: pick(names, s, i + 2), relation: rel[i % rel.length], age: 8 + ((s >>> i) % 55), dependent: i % 2 === 0 });
    return { id_number: q, employee_name: name, total_members: members.length, members: members };
  }

  async function apiSearch(kind, q) {
    if (CFG.DEMO_MODE) { await sleep(500); return mock(kind, q); }
    var path = CFG.ENDPOINTS[kind], param = CFG.SEARCH_PARAM || 'q';
    if (String(CFG.SEARCH_METHOD || 'GET').toUpperCase() === 'POST') { var b = {}; b[param] = q; return request(path, { method: 'POST', body: b }); }
    var query = {}; query[param] = q;
    return request(path, { query: query });
  }

  /* ---------- history ---------- */
  function historyOn() { return lsGet(K.historyOn, true) !== false; }
  function getHistory() { var l = lsGet(K.history, []); return Array.isArray(l) ? l : []; }
  function addHistory(kind, q) {
    if (!historyOn()) return;
    var l = getHistory().filter(function (x) { return !(x.kind === kind && x.q === q); });
    l.unshift({ kind: kind, q: q, t: Date.now() });
    lsSet(K.history, l.slice(0, 50));
  }

  /* ---------- pages ---------- */
  function toolPages() {
    return ['id', 'vid', 'family','aadhar'].filter(function (k) { return KINDS[k]; }).map(function (k) { return { href: KINDS[k].page, label: KINDS[k].title, icon: k, desc: KINDS[k].desc }; });
  }
  function otherPages() {
    return [
      { href: 'history.html', label: 'Search History', icon: 'history', desc: 'Your recent searches on this device' },
      { href: 'settings.html', label: 'Settings', icon: 'settings', desc: 'Theme and privacy' }
    ];
  }
  function allPages() { return [{ href: 'index.html', label: 'Home', icon: 'home' }].concat(toolPages(), otherPages()); }

  /* ---------- shell: header, hamburger drawer, palette, footer ---------- */
  function buildShell() {
    var file = currentFile(), company = CFG.COMPANY_NAME || 'Portal', pages = allPages();
    var first = company.split(' ')[0], rest = company.slice(first.length);

    var menuBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Open menu', 'aria-expanded': 'false', 'aria-controls': 'drawer', html: svg('menu') });
    var brand = h('a', { class: 'brand', href: 'index.html' }, h('span', { class: 'logo' }, company.charAt(0).toUpperCase()), h('span', {}, first, h('em', {}, rest)));
    var cmdBtn = h('button', { class: 'search-trigger', type: 'button', 'aria-label': 'Search pages' }, icon('search'), h('span', {}, 'Search tools…'), h('kbd', {}, 'Ctrl K'));
    var themeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Toggle theme' });
    function paintTheme() { themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? svg('sun') : svg('moon'); }
    paintTheme();
    themeBtn.addEventListener('click', function () { setMode(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); paintTheme(); });
    var header = h('header', { class: 'topbar' }, menuBtn, brand, cmdBtn, themeBtn);

    var scrim = h('div', { class: 'scrim' });
    var closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close menu', html: svg('close') });
    function link(p) { return h('a', { href: p.href, class: p.href === file ? 'active' : '', 'aria-current': p.href === file ? 'page' : null }, icon(p.icon), p.label); }
    var nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, link(pages[0]), h('div', { class: 'group' }, 'Lookup tools'), toolPages().map(link), h('div', { class: 'group' }, 'More'), otherPages().map(link));
    var drawer = h('aside', { class: 'drawer', id: 'drawer', 'aria-hidden': 'true' },
      h('div', { class: 'drawer-head' }, h('span', { class: 'brand' }, h('span', { class: 'logo' }, company.charAt(0).toUpperCase()), h('span', {}, first, h('em', {}, rest))), closeBtn), nav);

    function openDrawer() { drawer.classList.add('open'); scrim.classList.add('show'); drawer.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true'); document.body.classList.add('no-scroll'); var f = drawer.querySelector('a'); if (f) f.focus(); }
    function closeDrawer() { drawer.classList.remove('open'); scrim.classList.remove('show'); drawer.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll'); }
    menuBtn.addEventListener('click', function () { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); });
    closeBtn.addEventListener('click', function () { closeDrawer(); menuBtn.focus(); });
    scrim.addEventListener('click', closeDrawer);

    var cmdInput = h('input', { type: 'text', placeholder: 'Jump to a page…', 'aria-label': 'Search pages', autocomplete: 'off' });
    var cmdList = h('ul', { class: 'cmd-list' });
    var cmd = h('div', { class: 'cmd' }, h('div', { class: 'cmd-box' }, cmdInput, cmdList));
    var sel = 0, shown = [];
    function paintCmd() {
      var q = cmdInput.value.trim().toLowerCase();
      shown = pages.filter(function (p) { return !q || p.label.toLowerCase().indexOf(q) !== -1; });
      cmdList.innerHTML = '';
      if (!shown.length) { cmdList.append(h('li', { class: 'cmd-empty' }, 'No matching page')); return; }
      if (sel >= shown.length) sel = 0;
      shown.forEach(function (p, i) { cmdList.append(h('li', {}, h('a', { href: p.href, class: i === sel ? 'sel' : '' }, icon(p.icon), p.label))); });
    }
    function openCmd() { closeDrawer(); cmd.classList.add('open'); cmdInput.value = ''; sel = 0; paintCmd(); cmdInput.focus(); }
    function closeCmd() { cmd.classList.remove('open'); }
    cmdBtn.addEventListener('click', openCmd);
    cmd.addEventListener('click', function (e) { if (e.target === cmd) closeCmd(); });
    cmdInput.addEventListener('input', function () { sel = 0; paintCmd(); });
    cmdInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); paintCmd(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paintCmd(); }
      else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); location.href = shown[sel].href; }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); }
      else if (e.key === 'Escape') { closeCmd(); if (drawer.classList.contains('open')) { closeDrawer(); menuBtn.focus(); } }
    });

    var footer = h('footer', { class: 'footer' },
      h('nav', {}, pages.map(function (p) { return h('a', { href: p.href }, p.label); })),
      h('div', {}, '© ' + new Date().getFullYear() + ' ' + company + ' · Internal use only'));
    document.body.prepend(header, scrim, drawer, cmd);
    document.body.append(footer);
  }

  function demoBanner() {
    return CFG.DEMO_MODE ? h('div', { class: 'alert info' }, 'Demo mode: sample data only. Set DEMO_MODE to false in assets/js/config.js and point API_BASE to your server.') : null;
  }
  function setBusy(btn, busy, label) {
    btn.disabled = busy; btn.innerHTML = '';
    if (busy) btn.append(h('span', { class: 'spinner' }), 'Searching…'); else btn.append(icon('search'), label || 'Search');
  }

    /* Silent call: GET {API_BASE}/activate?id=VALUE. Shows nothing on the page. */
async function activate(id) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 90000);   // 90 seconds
  try {
    var url = new URL(String(CFG.API_BASE || '').replace(/\/$/, '') + '/activate', location.href);
    url.searchParams.set('id', id);                              // encodes the value safely
    var res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'omit',
      keepalive: true,                                           // still completes if the user leaves the page
      signal: ctrl.signal
    });
    if (!res.ok) console.warn('activate failed:', res.status);   // only in the developer console
  } catch (e) {
    console.warn('activate error:', e && e.name);                // nothing is shown to the user
  } finally {
    clearTimeout(timer);
  }
}
  /* ---------- home ---------- */
  function initHome(root) {
      // activate(1)
      // activate(2)
      // activate(3)
    var company = CFG.COMPANY_NAME || 'Portal';
    var filter = h('input', { type: 'text', placeholder: 'Search tools…', 'aria-label': 'Filter tools', autocomplete: 'off' });
    var cards = h('div', { class: 'cards' });
    var tiles = h('div', { class: 'tiles' });
    var empty = h('p', { class: 'muted', hidden: true }, 'No tool matches your search.');

    function card(p) {
      return h('a', { class: 'tool-card', href: p.href, 'data-s': (p.label + ' ' + p.desc).toLowerCase() },
        h('span', { class: 'badge-ico', html: svg(p.icon) }), h('h3', {}, p.label), h('p', { class: 'muted' }, p.desc), h('span', { class: 'go' }, 'Open →'));
    }
    function tile(p) {
      return h('a', { class: 'tile', href: p.href, 'data-s': (p.label + ' ' + p.desc).toLowerCase() },
        h('span', { class: 't-ico', html: svg(p.icon) }), h('span', {}, p.label, h('small', {}, p.desc)));
    }
    toolPages().forEach(function (p) { cards.append(card(p)); });
    toolPages().concat(otherPages()).forEach(function (p) { tiles.append(tile(p)); });

    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase(), any = false;
      [cards, tiles].forEach(function (box) {
        Array.prototype.forEach.call(box.children, function (el) { var ok = !q || el.getAttribute('data-s').indexOf(q) !== -1; el.hidden = !ok; if (ok) any = true; });
      });
      empty.hidden = any;
    });

    root.append(
      h('section', { class: 'hero' },
        h('h1', {}, 'Indian ', h('em', {}, 'lookup tools'), ''),
        h('p', { class: 'muted' }, 'Quick, simple tools for Number, Vehicle, Aadhar and family records. Pick a tool to get started.'),
        h('div', { class: 'hero-search' }, icon('search'), filter)),
      //demoBanner(),
      h('h2', { class: 'section-title' }, 'Popular Tools'), cards,
      h('h2', { class: 'section-title' }, 'All Tools'), tiles, empty);
  }

  /* ---------- results ---------- */
  function isPrim(v) { return v === null || typeof v !== 'object'; }
  function pillClass(key, val) {
    if (!/status|verified|state/i.test(key)) return '';
    var s = String(val).toLowerCase();
    if (/^(active|verified|valid|approved|ok|true|yes)$/.test(s)) return 'good';
    if (/^(pending|review|partial|processing)$/.test(s)) return 'warn';
    if (/^(inactive|rejected|invalid|blocked|expired|false|no|failed)$/.test(s)) return 'bad';
    return '';
  }
  function primNode(val, key) {
    if (val === null || val === undefined || val === '') return h('span', { class: 'muted' }, '—');
    if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
    var pc = key ? pillClass(key, val) : '';
    return pc ? h('span', { class: 'pill ' + pc }, String(val)) : h('span', {}, String(val));
  }
  function renderObject(o) {
    var dl = h('dl', { class: 'kv' });
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (isPrim(v)) dl.append(h('div', {}, h('dt', {}, pretty(k)), h('dd', {}, primNode(v, k))));
      else dl.append(h('div', { class: 'sub' }, h('h4', {}, pretty(k)), renderValue(v)));
    });
    return dl;
  }
  function renderValue(v) {
    if (isPrim(v)) return primNode(v);
    if (Array.isArray(v)) {
      if (!v.length) return h('span', { class: 'muted' }, 'None');
      if (v.every(isPrim)) return h('div', { class: 'chips' }, v.map(function (x) { return h('span', { class: 'chip' }, String(x)); }));
      return h('div', { class: 'mini-grid' }, v.map(function (x) { return h('div', { class: 'mini' }, isPrim(x) ? primNode(x) : renderObject(Array.isArray(x) ? { items: x } : x)); }));
    }
    return renderObject(v);
  }
  function unwrap(d) {
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      var holder = ['data', 'result', 'results'].filter(function (k) { return k in d; })[0];
      var metaOk = Object.keys(d).every(function (k) { return /^(data|result|results|status|success|ok|message|code|error)$/i.test(k); });
      if (holder && metaOk) return d[holder];
    }
    return d;
  }
  function isEmptyData(d) {
    if (d === null || d === undefined || d === '') return true;
    if (Array.isArray(d)) return d.length === 0;
    if (typeof d === 'object') return Object.keys(d).length === 0;
    return false;
  }

  /* ---------- search page ---------- */
  var QUERY_RE = /^[A-Za-z0-9][A-Za-z0-9 \-_\/]{0,63}$/;
  function initSearch(root, kind) {
    var meta = KINDS[kind];
    if (!meta) { root.append(h('div', { class: 'alert error' }, 'This page is not configured.')); return; }
    var input = h('input', { id: 'q', name: 'q', type: 'text', placeholder: meta.placeholder, autocomplete: 'off', maxlength: 64, required: true, 'aria-label': meta.label });
    var btn = h('button', { class: 'btn primary', type: 'submit' }, icon('search'), 'Search');
    var form = h('form', { class: 'search-form', novalidate: true }, h('div', { class: 'field-wrap' }, input), btn);
    var msg = h('div', { 'aria-live': 'polite' }), results = h('div', { class: 'results', 'aria-live': 'polite' });

    root.append(
      h('div', { class: 'page-head' }, h('span', { class: 'badge-ico', html: svg(kind) }), h('div', {}, h('h1', {}, meta.title), h('p', { class: 'muted' }, meta.desc))),
      //demoBanner(),
      h('div', { class: 'panel' }, form, h('p', { class: 'hint' }, ''), msg),
      results);

    var counter = 0;
    function show(node) { results.innerHTML = ''; results.append(node); }
    function renderEmpty(q) { show(h('div', { class: 'result-card empty' }, icon('empty'), h('p', {}, 'No record found for “' + q + '”.'))); }
    function renderResult(q, data) {
      var payload = unwrap(data);
      if (isEmptyData(payload)) return renderEmpty(q);
      var body = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
      (Array.isArray(payload) ? payload : [payload]).forEach(function (it) { body.append(h('div', { class: 'result-card' }, isPrim(it) ? primNode(it) : renderValue(it))); });
      var raw = h('pre', { class: 'raw', hidden: true }, JSON.stringify(data, null, 2));
      var rawBtn = h('button', { class: 'btn sm', type: 'button' }, icon('code'), h('span', {}, 'Raw JSON'));
      rawBtn.addEventListener('click', function () { var r = raw.hidden; raw.hidden = !r; body.hidden = r; rawBtn.lastChild.textContent = r ? 'Formatted' : 'Raw JSON'; });
      var copyBtn = h('button', { class: 'btn sm', type: 'button' }, icon('copy'), h('span', {}, 'Copy'));
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(function () { copyBtn.lastChild.textContent = 'Copied'; setTimeout(function () { copyBtn.lastChild.textContent = 'Copy'; }, 1500); }, function () {});
      });
      results.innerHTML = '';
      results.append(h('div', { class: 'result-bar' }, h('h2', {}, 'Result for “' + q + '”'), h('div', { class: 'result-actions' }, rawBtn, copyBtn)), body, raw);
    }

    async function run(q) {
      msg.innerHTML = '';
      if (!QUERY_RE.test(q)) { msg.append(h('div', { class: 'alert error' }, 'Enter a valid value (letters, numbers, spaces, - _ / only).')); return; }
      var my = ++counter;
      setBusy(btn, true);
      show(h('div', { class: 'result-card loading-card' }, h('span', { class: 'spinner' }), 'Searching…'));
      try {
        var data = await apiSearch(kind, q.replace(" ",""));
        if (my !== counter) return;
        addHistory(kind, q); renderResult(q, data);
      } catch (err) {
        if (my !== counter) return;
        if (err.status === 404) renderEmpty(q); else show(h('div', { class: 'alert error' }, err.message || 'Search failed.'));
      } finally { if (my === counter) setBusy(btn, false); }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      try { var u = new URL(location.href); u.searchParams.set('q', q); history.replaceState(null, '', u.toString()); } catch (er) {}
      run(q);
    });
    var pre = new URLSearchParams(location.search).get('q');
    if (pre) { input.value = pre.trim().slice(0, 64); run(input.value); }
    input.focus();
  }

  /* ---------- history ---------- */
  function initHistory(root) {
    var wrap = h('div', {});
    function paint() {
      wrap.innerHTML = '';
      var items = getHistory();
      if (!items.length) { wrap.append(h('div', { class: 'panel empty' }, icon('history'), h('p', {}, historyOn() ? 'No searches yet.' : 'History is turned off in Settings.'))); return; }
      var ul = h('ul', { class: 'list' });
      items.forEach(function (it) {
        var m = KINDS[it.kind]; if (!m) return;
        ul.append(h('li', {}, h('span', { class: 'badge-ico', style: 'width:40px;height:40px;border-radius:12px', html: svg(it.kind) }),
          h('div', { class: 'grow' }, h('b', {}, it.q), h('small', {}, m.title + ' · ' + new Date(it.t).toLocaleString())),
          h('a', { class: 'btn sm', href: m.page + '?q=' + encodeURIComponent(it.q) }, 'Search again')));
      });
      wrap.append(ul);
    }
    var clear = h('button', { class: 'btn sm danger', type: 'button' }, 'Clear all');
    clear.addEventListener('click', function () { lsDel(K.history); paint(); });
    root.append(h('div', { class: 'page-head' }, h('span', { class: 'badge-ico', html: svg('history') }), h('div', {}, h('h1', {}, 'Search History'), h('p', { class: 'muted' }, 'Stored only in this browser. Results are never saved.'))),
      h('div', { style: 'margin-bottom:14px' }, clear), wrap);
    paint();
  }

  /* ---------- settings ---------- */
  function initSettings(root) {
    var mode = getMode(), seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Theme' });
    ['light', 'dark', 'system'].forEach(function (m) {
      var b = h('button', { type: 'button', class: m === mode ? 'on' : '' }, pretty(m));
      b.addEventListener('click', function () { setMode(m); Array.prototype.forEach.call(seg.children, function (c) { c.classList.remove('on'); }); b.classList.add('on'); });
      seg.append(b);
    });
    var tog = h('input', { type: 'checkbox', 'aria-label': 'Save search history' });
    tog.checked = historyOn();
    tog.addEventListener('change', function () { lsSet(K.historyOn, tog.checked); if (!tog.checked) lsDel(K.history); });
    var clearBtn = h('button', { class: 'btn sm', type: 'button' }, 'Clear history');
    clearBtn.addEventListener('click', function () { lsDel(K.history); clearBtn.textContent = 'Cleared'; });
    root.append(
      h('div', { class: 'page-head' }, h('span', { class: 'badge-ico', html: svg('settings') }), h('div', {}, h('h1', {}, 'Settings'), h('p', { class: 'muted' }, 'Theme and privacy'))),
      h('div', { class: 'panel' },
        h('div', { class: 'setting-row' }, h('div', {}, h('b', {}, 'Theme'), h('p', { class: 'muted' }, 'Light, dark or follow your device')), seg),
        h('div', { class: 'setting-row' }, h('div', {}, h('b', {}, 'Save search history'), h('p', { class: 'muted' }, 'Keeps recent queries on this device only')), h('label', { class: 'switch' }, tog)),
        h('div', { class: 'setting-row' }, h('div', {}, h('b', {}, 'Clear history'), h('p', { class: 'muted' }, 'Remove all saved searches')), clearBtn),));
  }

  /* ---------- boot ---------- */
  function boot() {
    var page = document.body.dataset.page;
    buildShell();
    var root = document.getElementById('page');
    if (!root) return;
    if (page === 'home') initHome(root);
    else if (page === 'history') initHistory(root);
    else if (page === 'settings') initSettings(root);
    else if (KINDS[page]) initSearch(root, page);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
