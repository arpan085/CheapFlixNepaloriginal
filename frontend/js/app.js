/* ============================================================
   Cheapflix Nepal — shared app runtime (CF)
   API client, auth helpers, toasts, nav, reveal, formatting.
   Every page loads: config.js -> js/app.js
   ============================================================ */
(function () {
  'use strict';

  function apiBase() {
    if (window.CONFIG && window.CONFIG.API_BASE_URL) return window.CONFIG.API_BASE_URL;
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5000/api';
    return 'https://cheapflixnepal-backend.onrender.com/api';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind) {
    var box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      document.body.appendChild(box);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind === 'err' ? 'err' : 'ok');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s ease';
      setTimeout(function () { el.remove(); }, 320);
    }, 3600);
  }

  function getRefresh() {
    try { return localStorage.getItem('cf_refresh') || sessionStorage.getItem('cf_refresh'); }
    catch (e) { return null; }
  }
  function setSession(token, refresh) {
    try {
      var store = sessionStorage.getItem('token') && !localStorage.getItem('token') ? sessionStorage : localStorage;
      store.setItem('token', token);
      localStorage.setItem('token', token);
      if (refresh) store.setItem('cf_refresh', refresh);
    } catch (e) {}
  }
  async function tryRefresh() {
    var rt = getRefresh();
    if (!rt) return false;
    try {
      var res = await fetch(apiBase() + '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt })
      });
      var out = null;
      try { out = await res.json(); } catch (e) { out = null; }
      if (!res.ok || !out || !out.token) return false;
      setSession(out.token, out.refreshToken);
      return true;
    } catch (e) { return false; }
  }

  async function api(endpoint, method, data, auth, _retried) {
    var headers = { 'Content-Type': 'application/json' };
    if (auth !== false) {
      var t = localStorage.getItem('token') || (function () { try { return sessionStorage.getItem('token'); } catch (e) { return null; } })();
      if (t) headers['Authorization'] = 'Bearer ' + t;
    }
    var res = await fetch(apiBase() + endpoint, {
      method: method || 'GET',
      headers: headers,
      body: data ? JSON.stringify(data) : undefined
    });
    var out = null;
    try { out = await res.json(); } catch (e) { out = null; }
    if (res.status === 401 && auth !== false && !_retried && endpoint !== '/auth/refresh') {
      if (await tryRefresh()) return api(endpoint, method, data, auth, true);
    }
    if (!res.ok) {
      throw new Error((out && out.error) || ('Request failed (' + res.status + ')'));
    }
    return out;
  }

  function currentUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch (e) { return null; }
  }

  function requireAuth(roles) {
    var token = localStorage.getItem('token');
    var user = currentUser();
    // pages/xxx.html -> 'xxx.html' so one helper works from any depth
    var here = window.location.pathname.split('/').pop() || 'index.html';
    var inPages = window.location.pathname.indexOf('/pages/') !== -1;
    var login = inPages ? 'login.html' : 'pages/login.html';
    if (!token || !user) {
      // Remember where to come back after login (e.g. half-filled booking flow).
      var back = here + (window.location.search || '');
      window.location.href = login + '?next=' + encodeURIComponent(back);
      return null;
    }
    if (roles && roles.length && roles.indexOf(user.role) === -1) {
      window.location.href = dashboardFor(user.role, inPages);
      return null;
    }
    return user;
  }

  function dashboardFor(role, inPages) {
    var page = role === 'admin' ? 'admin-dashboard.html'
      : role === 'provider' ? 'provider-dashboard.html' : 'dashboard.html';
    if (inPages) return page;
    return 'pages/' + page;
  }

  function logout() {
    var rt = getRefresh();
    if (rt) {
      try {
        fetch(apiBase() + '/auth/logout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        }).catch(function () {});
      } catch (e) {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cf_refresh');
    try { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); sessionStorage.removeItem('cf_refresh'); } catch (e) {}
    var inPages = window.location.pathname.indexOf('/pages/') !== -1;
    window.location.href = inPages ? 'login.html' : 'pages/login.html';
  }

  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    return 'Rs ' + v.toLocaleString('en-NP', { maximumFractionDigits: 0 });
  }

  var AVATAR_COLORS = ['#1d4a38', '#b45309', '#0e7490', '#6d28d9', '#be123c', '#4d7c0f'];
  function avatarColor(name) {
    var h = 0;
    String(name || '?').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; });
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  function initials(first, last) {
    return ((first || '?')[0] + ((last || '')[0] || '')).toUpperCase();
  }

  /* Avatar: real uploaded photo when present, "preset:#hex" default choice
     picked at signup, initials fallback. The value lives on User.avatar so
     it persists across sessions until changed/removed in profile settings.
     `u` may be a user object, a name string, or {firstName,lastName,avatar}. */
  function avatarBg(u) {
    var av = u && u.avatar;
    if (typeof av === 'string' && /^preset:(#[0-9a-fA-F]{3,8})/.test(av)) return av.slice(7);
    var name = typeof u === 'string' ? u : ((u && (u.firstName || '') + ' ' + (u && u.lastName || '')).trim() || '?');
    return avatarColor(name);
  }
  function avatarImg(u, cls) {
    var name = typeof u === 'string' ? u : ((u && (u.firstName || '') + ' ' + (u && u.lastName || '')).trim() || '?');
    var url = u && u.avatar;
    if (typeof url === 'string' && /^preset:#[0-9a-fA-F]{3,8}$/.test(url)) {
      return avatarFallback(name, cls, url.slice(7));
    }
    if (url) {
      var src = /^https?:\/\//.test(url) ? url : apiBase().replace(/\/api$/, '') + url;
      return '<img class="' + (cls || 'cell-avatar') + ' av-img" src="' + esc(src) + '" alt="Avatar for ' + esc(name) + '" loading="lazy" decoding="async" onerror="this.outerHTML=CF.avatarFallback(' + esc(JSON.stringify(name)) + ',\'' + (cls || 'cell-avatar') + '\')" />';
    }
    return avatarFallback(name, cls);
  }
  function avatarFallback(name, cls, bg) {
    var parts = String(name || '?').split(' ');
    return '<span class="' + (cls || 'cell-avatar') + '" style="background:' + (bg || avatarColor(name)) + '">' + esc(initials(parts[0], parts[1])) + '</span>';
  }
  /* Review photo tokens: [photo:url] embedded in comment text. */
  function splitPhotos(comment) {
    var photos = [];
    var text = String(comment || '').replace(/\[photo:([^\]]+)\]/g, function (_, url) { photos.push(url); return ''; }).trim();
    return { text: text, photos: photos.slice(0, 3) };
  }

  /* Multipart POST (avatar / KYC / review photos). */
  async function apiFile(endpoint, formData) {
    var headers = {};
    var t = localStorage.getItem('token');
    if (t) headers['Authorization'] = 'Bearer ' + t;
    var res = await fetch(apiBase() + endpoint, { method: 'POST', headers: headers, body: formData });
    var out = null;
    try { out = await res.json(); } catch (e) { out = null; }
    if (!res.ok) throw new Error((out && out.error) || ('Upload failed (' + res.status + ')'));
    return out;
  }

  /* Free inline icons (Feather/Lucide-style paths, MIT) — no emoji, no external fonts */
  var ICONS = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
    pin: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.5 9.4l6.6-.9 2.9-6z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4M20 7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="17.5" cy="14" r="1.2"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 21a2 2 0 0 0 4 0"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    cal: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/><path d="M9 12l2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    heart: '<path d="M19.5 12.6L12 20l-7.5-7.4A5 5 0 1 1 12 6.2a5 5 0 1 1 7.5 6.4z"/>',
    calDays: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 15h3M8 18h5"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* Saved-provider favorites: localStorage cache (offline-first) synced
     to the server when logged in. Server wins on merge (syncFavs). */
  function getFavs() {
    try { var a = JSON.parse(localStorage.getItem('cf_favs') || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function setFavs(a) {
    try { localStorage.setItem('cf_favs', JSON.stringify(a)); } catch (e) {}
  }
  function isFav(id) { return getFavs().indexOf(String(id)) !== -1; }
  function toggleFav(id) {
    var favs = getFavs(), sid = String(id);
    var i = favs.indexOf(sid);
    if (i === -1) favs.push(sid); else favs.splice(i, 1);
    setFavs(favs);
    // best-effort server sync (local cache is truth if offline)
    try {
      if (localStorage.getItem('token')) {
        api(i === -1 ? '/users/favorites/' + encodeURIComponent(sid) : '/users/favorites/' + encodeURIComponent(sid),
          i === -1 ? 'POST' : 'DELETE', i === -1 ? {} : null).catch(function () {});
      }
    } catch (e) {}
    return i === -1;
  }
  /* Merge server favorites into the local cache. Call after login and
     on dashboard load. Union of both sets is pushed back if they differ. */
  async function syncFavs() {
    try {
      if (!localStorage.getItem('token')) return getFavs();
      var res = await api('/users/favorites', 'GET');
      if (res && res.migrated === false) return getFavs();
      var server = (res && res.data) || [];
      var union = {};
      getFavs().concat(server.map(String)).forEach(function (x) { union[String(x)] = 1; });
      var merged = Object.keys(union);
      setFavs(merged);
      try { await api('/users/favorites', 'PUT', { providerIds: merged }); } catch (e) {}
      return merged;
    } catch (e) { return getFavs(); }
  }

  /* Notification prefs + browser/sound alerts (provider settings persist locally) */
  function notifPrefs() {
    try { return Object.assign({ sound: true, browser: false, chat: true, booking: true }, JSON.parse(localStorage.getItem('cf_notif') || '{}')); }
    catch (e) { return { sound: true, browser: false, chat: true, booking: true }; }
  }
  function saveNotifPrefs(p) {
    try { localStorage.setItem('cf_notif', JSON.stringify(p)); } catch (e) {}
  }
  var lastPing = 0;
  function ping() {
    var p = notifPrefs();
    if (!p.sound) return;
    var now = Date.now();
    if (now - lastPing < 1500) return;
    lastPing = now;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start(); o.stop(ctx.currentTime + 0.36);
    } catch (e) {}
  }
  function browserNotify(title, body) {
    var p = notifPrefs();
    if (!p.browser) return;
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') new Notification(title, { body: body });
    } catch (e) {}
  }
  function notify(title, body, kind) {
    toast(title + (body ? ' — ' + body : ''), kind);
    ping();
    browserNotify(title, body);
  }

  function pillFor(status) {
    var s = String(status || '').toLowerCase();
    if (['confirmed', 'completed', 'resolved', 'paid', 'verified', 'active'].indexOf(s) !== -1)
      return '<span class="pill pill-green">' + esc(status) + '</span>';
    if (['pending', 'open', 'in_progress', 'unpaid', 'medium'].indexOf(s) !== -1)
      return '<span class="pill pill-amber">' + esc(status) + '</span>';
    if (['cancelled', 'closed', 'suspended', 'rejected', 'high'].indexOf(s) !== -1)
      return '<span class="pill pill-red">' + esc(status) + '</span>';
    return '<span class="pill pill-grey">' + esc(status || '-') + '</span>';
  }

  /* Nepali / English toggle. Static elements opt in with
     data-i18n="key" (text) or data-i18n-ph="key" (placeholder).
     Dynamic rows stay in English in v1. Preference in cf_lang. */
  var I18N = {
    ne: {
      'nav.services': 'सेवाहरू', 'nav.how': 'कसरी काम गर्छ', 'nav.providers': 'प्रदायकहरू',
      'nav.stories': 'कथाहरू', 'nav.help': 'सहयोग', 'nav.book': 'बुक गर्नुहोस्',
      'nav.messages': 'सन्देशहरू', 'nav.login': 'लगइन', 'nav.start': 'सुरु गर्नुहोस्',
      'nav.home': 'गृहपृष्ठ', 'nav.bookings': 'मेरा बुकिङहरू', 'nav.support': 'सहयोग',
      'nav.logout': 'लगआउट',       'nav.jobs': 'कामहरू', 'nav.profile': 'मेरो प्रोफाइल', 'nav.content': 'सामग्री र भुक्तानी',
      'nav.overview': 'अवलोकन', 'nav.customers': 'ग्राहकहरू', 'nav.viewsite': 'साइट हेर्नुहोस्',
      'nav.skip': 'पछि', 'nav.dashboard': 'मेरो ड्यासबोर्ड',
      'menu.title': 'मेनु', 'menu.work': 'काम', 'menu.manage': 'व्यवस्थापन',
      'hero.eyebrow': 'काठमाडौं उपत्यका · पोखरा · चितवन',
      'hero.search': 'तपाईंलाई के सहयोग चाहियो?',
      'hero.cta.search': 'खोज्नुहोस्', 'hero.trust': 'उपत्यकाभर ६,२००+ बुकिङबाट',
      'sec.services.k': 'हामी के मा सहयोग गर्न सक्छौं?', 'sec.services.t': 'दैनिक काम, सबै कभर',
      'sec.how.k': 'कसरी काम गर्छ', 'sec.how.t': 'चिया सेलाउनुअघि नै बुक',
      'sec.pro.k': 'यो महिना उत्कृष्ट', 'sec.pro.t': 'छिमेकीले विश्वास गरेका मान्छेहरू',
      'sec.stories.k': 'चर्चामा', 'sec.stories.t': 'झम्सिखेलदेखि लेकसाइडसम्म',
      'sec.faq.k': 'जान्नुपर्ने', 'sec.faq.t': 'प्रश्नहरू, उत्तरसहित',
      'app.k': 'मोबाइल एप — चाँडै आउँदैछ', 'app.t': 'खल्तीमा चिपफ्लिक्स नेपाल',
      'cta.pro.t': 'चिपफ्लिक्ससँग व्यवसाय बढाउनुहोस्', 'cta.help.t': 'सहयोग लिनुहोस्',
      'auth.login.h': 'लगइन', 'auth.reg.h': 'खाता बनाउनुहोस्', 'auth.reg.pro': 'पेशाेवरको रूपमा जोडिनुहोस्',
      'auth.forgot.h': 'पासवर्ड रिसेट', 'auth.newpw.h': 'नयाँ पासवर्ड',
      'dash.bookings.h': 'मेरा बुकिङहरू', 'dash.jobs.h': 'कामहरू', 'dash.admin.h': 'नियन्त्रण कक्ष',
      'dash.new': '+ नयाँ बुकिङ', 'dash.all': 'सबै बुकिङहरू',
      'flow.book.h': 'तीन चरणमा सकियो।', 'flow.k': 'सेवा बुक गर्नुहोस्',
      'chat.h': 'प्रोसँग कुरा गर्नुहोस्', 'chat.k': 'सन्देशहरू',
      'sup.h': 'हामी कसरी सहयोग गर्न सक्छौं?', 'sup.k': 'सहयोग',
      'btn.book': 'बुक गर्नुहोस्', 'btn.chat': 'कुरा गर्नुहोस्', 'btn.send': 'पठाउनुहोस्',
      'btn.close': 'बन्द गर्नुहोस्', 'btn.back': 'फर्कनुहोस्', 'btn.save': 'सेभ गर्नुहोस्',
      'btn.search': 'खोज्नुहोस्', 'btn.call': 'फोन गर्नुहोस्', 'btn.review': 'समीक्षा दिनुहोस्',
      'btn.cancel': 'रद्द गर्नुहोस्', 'btn.details': 'विवरण', 'btn.refresh': 'रिफ्रेस',
      'f.all': 'सबै', 'f.pending': 'पेन्डिङ', 'f.confirmed': 'कन्फर्म', 'f.completed': 'सम्पन्न', 'f.cancelled': 'रद्द'
    }
  };
  function curLang() {
    try { return localStorage.getItem('cf_lang') === 'ne' ? 'ne' : 'en'; } catch (e) { return 'en'; }
  }
  function applyLang() {
    var lang = curLang(), d = I18N[lang] || {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      var v = d[el.dataset.i18n];
      el.textContent = v !== undefined ? v : el.dataset.en;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder || '';
      var v = d[el.dataset.i18nPh];
      el.placeholder = v !== undefined ? v : el.dataset.enPh;
    });
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.textContent = lang === 'ne' ? 'EN' : 'NE';
      b.setAttribute('aria-label', lang === 'ne' ? 'Switch to English' : 'नेपालीमा बदल्नुहोस्');
    });
    try { document.documentElement.lang = lang === 'ne' ? 'ne' : 'en'; } catch (e) {}
  }
  function toggleLang() {
    try { localStorage.setItem('cf_lang', curLang() === 'ne' ? 'en' : 'ne'); } catch (e) {}
    applyLang();
  }
  function injectLangToggle() {
    // Language toggle removed — English only. Clean up any stale buttons.
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) { b.remove(); });
    try { localStorage.setItem('cf_lang', 'en'); } catch (e) {}
    try { document.documentElement.lang = 'en'; } catch (e) {}
  }
  /* Canonical site header. Desktop links, active states, auth actions and
     the mobile menu are all rendered from one table so every page stays
     consistent. The static markup in each page remains as the no-JS fallback.
     Slots with data-keep are left untouched (e.g. onboarding flows). */
  var NAV_LINKS = [
    { id: 'services', label: 'Services', frag: '#services' },
    { id: 'how', label: 'How it works', frag: '#how' },
    { id: 'providers', label: 'Providers', frag: '#providers' },
    { id: 'book', label: 'Book', page: 'booking-flow.html' },
    { id: 'messages', label: 'Messages', page: 'chat.html', auth: true },
    { id: 'help', label: 'Help', page: 'support.html' },
  ];
  function navPrefix() {
    return window.location.pathname.indexOf('/pages/') !== -1 ? '../' : '';
  }
  function navHref(link, prefix) {
    if (link.frag) return prefix ? prefix + 'index.html' + link.frag : link.frag;
    return prefix ? link.page : 'pages/' + link.page;
  }
  function navPage() {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    return (p.split('?')[0].split('#')[0] || 'index.html');
  }
  // Fixed active link for app pages. index.html uses scroll-spy; content
  // pages (about/terms/privacy/...) highlight nothing rather than lie.
  function navActiveId(page) {
    if (page === 'booking-flow.html') return 'book';
    if (page === 'chat.html') return 'messages';
    if (page === 'support.html') return 'help';
    return null;
  }
  function navLinkHTML(link, prefix, activeId, loggedIn) {
    if (link.auth && !loggedIn) return '';
    var active = activeId === link.id;
    return '<a href="' + esc(navHref(link, prefix)) + '" data-navid="' + link.id + '"' +
      (active ? ' class="active" aria-current="page"' : '') + '>' + esc(link.label) + '</a>';
  }
  function renderDesktopNav(loggedIn, prefix, activeId) {
    var box = document.querySelector('.site-nav .nav-links');
    if (!box || box.hasAttribute('data-keep')) return;
    var html = '';
    NAV_LINKS.forEach(function (l) { html += navLinkHTML(l, prefix, activeId, loggedIn); });
    box.innerHTML = html;
  }
  function renderNavAuth(loggedIn, user, prefix) {
    document.querySelectorAll('[data-nav-cta]').forEach(function (slot) {
      if (slot.hasAttribute('data-keep')) return;
      if (loggedIn && user) {
        var inPages = prefix !== '';
        var dash = dashboardFor(user.role, inPages);
        slot.innerHTML = '<span class="nav-user">' + avatarImg(user, 'nav-avatar') + '<span><span class="nav-hello">Namaste, </span><strong>' + esc(user.firstName) +
          '</strong></span></span><a class="btn btn-pine btn-sm" href="' + esc(dash) + '">My dashboard</a>' +
          '<button class="btn btn-line btn-sm" data-logout type="button">Log out</button>';
      } else {
        var loginHref = prefix ? 'login.html' : 'pages/login.html';
        var regHref = prefix ? 'register.html' : 'pages/register.html';
        slot.innerHTML = '<a class="btn btn-line btn-sm" href="' + loginHref + '">Log in</a>' +
          '<a class="btn btn-pine btn-sm" href="' + regHref + '">Get started</a>';
      }
    });
  }
  function renderMobileMenu(loggedIn, user, prefix, activeId) {
    var menu = document.getElementById('mobileMenu');
    if (!menu) return null;
    var html = '<div class="menu-sec">Menu</div>';
    NAV_LINKS.forEach(function (l) {
      html += navLinkHTML(l, prefix, activeId, true);
    });
    html += '<div class="menu-divider"></div><div class="menu-sec">Account</div>';
    if (loggedIn && user) {
      var inPages = prefix !== '';
      var dash = dashboardFor(user.role, inPages);
      html += '<div class="menu-user">' + avatarImg(user, 'nav-avatar') + '<span>' + esc(user.firstName || 'Account') + '</span></div>';
      html += '<a href="' + esc(dash) + '">My dashboard</a>';
      html += '<button class="menu-link" data-logout type="button">Log out</button>';
    } else {
      var loginHref = prefix ? 'login.html' : 'pages/login.html';
      var regHref = prefix ? 'register.html' : 'pages/register.html';
      html += '<a href="' + loginHref + '">Log in</a>';
      html += '<a href="' + regHref + '">Get started</a>';
    }
    menu.innerHTML = html;
    return menu;
  }
  function setMenuOpen(menu, burger, open) {
    if (!menu) return;
    if (open) {
      menu.removeAttribute('hidden');
      document.body.classList.add('nav-open');
    } else {
      menu.setAttribute('hidden', '');
      document.body.classList.remove('nav-open');
    }
    if (burger) burger.setAttribute('aria-expanded', String(open));
  }
  function menuIsOpen(menu) { return !!menu && !menu.hasAttribute('hidden'); }
  function initNav() {
    var nav = document.querySelector('.site-nav');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    var prefix = navPrefix();
    var page = navPage();
    var activeId = navActiveId(page);
    var user = currentUser();
    var loggedIn = !!(localStorage.getItem('token') && user);

    renderDesktopNav(loggedIn, prefix, activeId);
    renderNavAuth(loggedIn, user, prefix);
    var menu = renderMobileMenu(loggedIn, user, prefix, activeId);
    var burger = document.getElementById('navBurger');
    if (burger && menu) {
      if (!menu.id) menu.id = 'mobileMenu';
      burger.setAttribute('aria-controls', menu.id);
      burger.setAttribute('aria-expanded', 'false');
      burger.addEventListener('click', function () {
        setMenuOpen(menu, burger, !menuIsOpen(menu));
      });
      // Close on link click.
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenuOpen(menu, burger, false);
      });
      // Close on outside click.
      document.addEventListener('click', function (e) {
        if (!menuIsOpen(menu)) return;
        if (menu.contains(e.target) || burger.contains(e.target)) return;
        if (nav && nav.contains(e.target)) return;
        setMenuOpen(menu, burger, false);
      });
      // Close on Escape and hand focus back to the hamburger.
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menuIsOpen(menu)) {
          setMenuOpen(menu, burger, false);
          burger.focus();
        }
      });
    }
    // Scroll-spy on the home page: highlight the section in view.
    if ((page === 'index.html' || page === '') && 'IntersectionObserver' in window) {
      var spyIds = ['services', 'how', 'providers'];
      var spyMap = {};
      spyIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) spyMap[id] = el;
      });
      var spyKeys = Object.keys(spyMap);
      if (spyKeys.length) {
        var markSpy = function (id) {
          document.querySelectorAll('[data-navid]').forEach(function (a) {
            var on = a.dataset.navid === id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        };
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) markSpy(en.target.id);
          });
        }, { rootMargin: '-40% 0px -55% 0px' });
        spyKeys.forEach(function (id) { io.observe(spyMap[id]); });
      }
    }
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-logout]')) logout();
    });
  }

  function initDashboardDrawer() {
    var side = document.getElementById('dashSide');
    var scrim = document.getElementById('dashScrim');
    if (!side || !scrim) return;
    function close() {
      side.classList.remove('open');
      scrim.classList.remove('show');
      document.body.classList.remove('dash-nav-open');
    }
    side.addEventListener('click', function (e) {
      if (window.innerWidth <= 1020 && e.target.closest('.dash-link')) close();
    });
    scrim.addEventListener('click', close);
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1020) close();
    });
    document.querySelectorAll('[id="menuBtn"]').forEach(function (button) {
      button.addEventListener('click', function () {
        side.classList.add('open');
        scrim.classList.add('show');
        document.body.classList.add('dash-nav-open');
      });
    });
  }

  function initReveal() {
    var els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  function initFaq() {
    document.querySelectorAll('.faq > button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.parentElement.classList.toggle('open');
      });
    });
  }

  /* Live events over SSE (GET /api/stream?token=). Falls back to the
     pages' existing polling when unavailable. Usage:
       CF.onLive('chat', function(d){ ... }); CF.startLive(); */
  var liveHandlers = {}, liveStarted = false;
  function onLive(event, fn) {
    (liveHandlers[event] = liveHandlers[event] || []).push(fn);
  }
  /* A profile/bio/phone change by anyone. Keeps the local user cache true,
     re-renders the nav, and fires `cf:profile-updated` so open pages
     (provider cards, detail, admin tables) can refresh instantly. */
  function handleProfileUpdated(d) {
    try {
      var me = currentUser();
      if (me && d && (String(d.userId) === String(me.id))) {
        if (d.user) {
          Object.keys(d.user).forEach(function (k) {
            if (d.user[k] !== undefined) me[k] = d.user[k];
          });
          try { localStorage.setItem('user', JSON.stringify(me)); } catch (e) {}
          try { renderNavAuth(true, me, navPrefix()); } catch (e) {}
        }
      }
      try { window.dispatchEvent(new CustomEvent('cf:profile-updated', { detail: d || {} })); } catch (e) {}
    } catch (e) {}
  }
  function startLive() {
    try {
      if (liveStarted) return;
      var t = null;
      try { t = localStorage.getItem('token') || sessionStorage.getItem('token'); } catch (e) {}
      if (!t || !('EventSource' in window)) return;
      liveStarted = true;
      var es = new EventSource(apiBase() + '/stream?token=' + encodeURIComponent(t));
      ['chat', 'booking', 'payment', 'reminder', 'profile_updated'].forEach(function (ev) {
        es.addEventListener(ev, function (msg) {
          var d = {};
          try { d = JSON.parse(msg.data || '{}'); } catch (e) {}
          if (ev === 'profile_updated') {
            handleProfileUpdated(d);
            (liveHandlers[ev] || []).forEach(function (fn) { try { fn(d); } catch (e) {} });
            return;
          }
          ping();
          (liveHandlers[ev] || []).forEach(function (fn) { try { fn(d); } catch (e) {} });
          // default toasts so every page benefits with zero wiring
          if (ev === 'chat') toast('New message — ' + (d.from || 'your provider'));
          else if (ev === 'booking') toast('Booking update: ' + (d.status || d.type || 'changed'));
          else if (ev === 'payment') toast(d.verified ? 'Payment verified ✓' : 'Payment update');
        });
      });
      es.onerror = function () { try { es.close(); } catch (e) {} liveStarted = false; };
    } catch (e) {}
  }

  window.CF = {
    api: api, apiBase: apiBase, esc: esc, toast: toast, notify: notify,
    currentUser: currentUser, requireAuth: requireAuth,
    dashboardFor: dashboardFor, logout: logout,
    money: money, avatarColor: avatarColor, avatarBg: avatarBg, initials: initials, pillFor: pillFor,
    icon: icon, notifPrefs: notifPrefs, saveNotifPrefs: saveNotifPrefs, ping: ping,
    getFavs: getFavs, isFav: isFav, toggleFav: toggleFav, syncFavs: syncFavs,
    onLive: onLive, startLive: startLive,
    avatarImg: avatarImg, avatarFallback: avatarFallback, splitPhotos: splitPhotos, apiFile: apiFile,
    toggleLang: toggleLang, applyLang: applyLang, curLang: curLang
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Opening the file by double-click breaks all API calls (browser blocks
    // them). Tell the user instead of showing a mysteriously empty site.
    try {
      if (window.location.protocol === 'file:') {
        setTimeout(function () {
          toast('Open this site at http://localhost:5500 — double-clicking the file disables login, booking and profiles.', 'err');
        }, 600);
      }
    } catch (e) {}
    initNav();
    initDashboardDrawer();
    initReveal();
    initFaq();
    injectLangToggle();
    startLive();
    // PWA service worker (static only; skipped on file:// or old browsers)
    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
        var swPath = window.location.pathname.indexOf('/pages/') !== -1 ? '../sw.js' : 'sw.js';
        navigator.serviceWorker.register(swPath).catch(function () {});
      }
    } catch (e) {}
  });
})();
