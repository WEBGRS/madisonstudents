/* Feedback widget for every WEBGRS site (canonical copy: C:\Users\ghs\webgrs-guard\feedback.js; sync.py copies it).
   <script src="feedback.js" data-site="rentals" defer></script>
   data-site     key the inbox files it under (required)
   data-mount    selector of a container to put a "Feedback" button in; data-before: insert before this child
   data-class    class for that button, so it looks like its neighbours
   data-compact  hide the button's text below this width (px)
   data-float-below  below this width (px) hide that button and show a round floating one instead (crowded phone headers)
   data-float-bottom distance of the floating button from the bottom (px, default 16)
   data-lang     auto (follows <html lang>) | en | zh | bi
   data-star     GitHub repo ("WEBGRS/datamap" or a URL): shows a fixed two-part pill, "Star on GitHub | Feedback", instead
                 of the mounted button; data-float-bottom sets its height, data-float-bottom-narrow does so under data-narrow-max (default 520) px,
                 data-dock-side="left" moves it. The page can set --wgfb-lift (px, raises it), --wgfb-display (none hides it)
                 and --wgfb-dock-z (stacking) on :root or <body> to stay clear of its own bars and drawers
   Any element with [data-feedback] also opens the form. With neither, a small floating button is shown.
   Nothing is loaded until the form opens; the Turnstile human check runs only then. */
(function () {
  if (window.WebgrsFeedback) return;
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var API = (ds.api || 'https://webgrs-feedback.uw-course-api.workers.dev').replace(/\/$/, '');
  var SITEKEY = ds.sitekey === undefined ? '0x4AAAAAAFNE9RK6Ss5QmXDp' : ds.sitekey;
  var TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var T = {
    trigger: ['Feedback', '反馈'],
    title: ['Send feedback', '意见反馈'],
    msg: ["What's wrong, missing, or could be better?", '哪里有问题、缺了什么，或者哪里可以更好？'],
    contact: ['Email (optional, if you want a reply)', '邮箱或微信（选填，方便回复你）'],
    send: ['Send', '发送'],
    sending: ['Sending…', '发送中…'],
    empty: ['Write something first.', '先写点内容。'],
    thanks: ['Thanks, it has been sent.', '收到了，谢谢！'],
    again: ['Send another', '再写一条'],
    quota: ['Too many messages today. Try again tomorrow.', '今天发得太多了，明天再试。'],
    fail: ["Couldn't send. Check the connection and try again.", '没发出去，检查网络后再试一次。'],
    close: ['Close', '关闭'],
    star: ['Star on GitHub', '在 GitHub 点星'],
    starShort: ['Star', '点星'],
    starTitle: ['Star this project on GitHub (opens in a new tab)', '在 GitHub 上给这个项目点星（新标签页打开）'],
  };
  // Shorter strings where both languages are shown side by side
  var BI = { msg: '哪里有问题或可以更好？ What could be better?', contact: '邮箱或微信（选填） Email (optional)', star: 'Star 点星', starShort: 'Star', trigger: '反馈 Feedback' };
  var STAR = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="M8 1.2l2.1 4.5 4.9.6-3.6 3.4.9 4.9L8 12.2 3.7 14.6l.9-4.9L1 6.3l4.9-.6z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>';
  var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M2.5 3.25h11v7.5H8l-3.25 2.5v-2.5H2.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function lang() {
    var m = ds.lang || 'auto';
    if (m !== 'auto') return m;
    var l = document.documentElement.lang || navigator.language || '';
    return /^zh/i.test(l) ? 'zh' : 'en';
  }
  function t(k) {
    var p = T[k], l = lang();
    return l === 'zh' ? p[1] : l === 'bi' ? BI[k] || p[1] + ' ' + p[0] : p[0];
  }

  // ---------- Turnstile (shares the page's copy when the data guard already loaded it)
  var tsLoading = null;
  function loadTs() {
    if (!SITEKEY) return Promise.reject(new Error('no sitekey'));
    if (window.turnstile) return Promise.resolve();
    if (!tsLoading) {
      tsLoading = new Promise(function (resolve, reject) {
        if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
          var sc = document.createElement('script');
          sc.src = TS_SRC;
          sc.async = true;
          sc.onerror = reject;
          document.head.appendChild(sc);
        }
        var n = 0, iv = setInterval(function () {
          if (window.turnstile) { clearInterval(iv); resolve(); } else if (++n > 80) { clearInterval(iv); reject(new Error('timeout')); }
        }, 100);
      }).catch(function (e) { tsLoading = null; throw e; });
    }
    return tsLoading;
  }
  // Resolves '' when the check cannot run; the message is then accepted with a smaller daily allowance
  function tsToken() {
    return new Promise(function (resolve) {
      var done = false, box = null, wid = null;
      function fin(v) {
        if (done) return;
        done = true;
        resolve(v || '');
        setTimeout(function () {
          try { if (wid != null) window.turnstile.remove(wid); } catch (e) { /* already gone */ }
          if (box) box.remove();
        }, 0);
      }
      setTimeout(function () { fin(''); }, 8000);
      loadTs().then(function () {
        box = document.createElement('div');
        box.style.display = 'none';
        document.body.appendChild(box);
        try {
          wid = window.turnstile.render(box, { sitekey: SITEKEY, callback: fin, 'error-callback': function () { fin(''); }, 'timeout-callback': function () { fin(''); } });
        } catch (e) { fin(''); }
      }, function () { fin(''); });
    });
  }
  var pre = null;  // token fetched when the form opens: {at, p}
  function freshToken() {
    if (pre && Date.now() - pre.at < 240000) { var p = pre.p; pre = null; return p; }
    pre = null;
    return tsToken();
  }

  // ---------- panel (shadow DOM keeps the page's CSS and ours apart)
  var host, root, panel, form, ta, contact, hp, st, sendBtn, fab, opener = null, isOpen = false;
  var CSS = [
    ':host{all:initial}',
    '.panel{position:fixed;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:14px;border-radius:12px;',
    'background:var(--bg);color:var(--ink);border:1px solid var(--line);box-shadow:0 14px 44px rgba(0,0,0,.2),0 2px 6px rgba(0,0,0,.08);',
    'font-size:14px;line-height:1.45;font-weight:400;letter-spacing:normal;text-transform:none;text-align:left;',
    'opacity:0;transform:translateY(6px);transition:opacity .16s ease,transform .16s ease}',
    '.panel.on{opacity:1;transform:none}',
    '.panel.sheet{left:8px!important;right:8px!important;top:max(10px,env(safe-area-inset-top))!important;bottom:auto!important;width:auto;max-width:none}',
    '.light{--bg:#fff;--ink:#15181d;--line:rgba(21,24,29,.16);--field:#fff;--wash:rgba(21,24,29,.07);--ph:rgba(21,24,29,.52);--bad:#b3261e}',
    '.dark{--bg:#1c2026;--ink:#eef1f4;--line:rgba(238,241,244,.2);--field:#14171b;--wash:rgba(255,255,255,.09);--ph:rgba(238,241,244,.55);--bad:#ff8a80}',
    '.hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}',
    '.hd b{font-size:15px;font-weight:650}',
    '.x{width:30px;height:30px;margin:-4px -6px -4px 0;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:20px;line-height:1;cursor:pointer}',
    '.x:hover{background:var(--wash)}',
    'textarea,input{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;padding:8px 10px;font:inherit;color:inherit;background:var(--field);border:1px solid var(--line);border-radius:8px}',
    'textarea{min-height:112px;max-height:50vh;resize:vertical}',
    'textarea:focus,input:focus{outline:1.5px solid var(--ink);outline-offset:-1px;border-color:transparent}',
    '::placeholder{color:var(--ph);opacity:1}',
    '.hp{position:absolute!important;left:-9999px;width:1px;height:1px;opacity:0}',
    '.ft{display:flex;align-items:center;justify-content:flex-end;gap:10px}',
    '.st{flex:1;font-size:13px}.st.err{color:var(--bad)}',
    '.send,.again{font:inherit;font-weight:600;border-radius:999px;padding:7px 18px;cursor:pointer}',
    '.send{background:var(--ink);color:var(--bg);border:1px solid var(--ink)}.send:disabled{opacity:.55;cursor:default}',
    '.again{background:transparent;color:inherit;border:1px solid var(--line)}',
    '.ok{text-align:center;padding:10px 4px 4px}.ok p{margin:0 0 14px;font-size:15px}',
    '.ok svg{display:block;margin:0 auto 8px}',
    'button:focus-visible{outline:2px solid var(--ink);outline-offset:2px}',
    '.fab{position:fixed;right:16px;bottom:16px;z-index:2147482999;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;',
    'font:600 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;background:var(--ink);color:var(--bg);border:0;box-shadow:0 4px 16px rgba(0,0,0,.2)}',
    '.fab.round{width:44px;height:44px;padding:0;justify-content:center}.fab.round svg{width:18px;height:18px}',
    '.dock{position:fixed;right:16px;bottom:16px;z-index:var(--wgfb-dock-z,2147482999);display:var(--wgfb-display,inline-flex);align-items:stretch;border-radius:999px;overflow:hidden;',
    'background:var(--bg);color:var(--ink);border:1.5px solid var(--ink);box-shadow:0 8px 26px rgba(0,0,0,.26),0 1px 3px rgba(0,0,0,.14);',
    'font:600 14px/1 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:normal;text-transform:none}',
    '.dock a,.dock button{display:inline-flex;align-items:center;gap:7px;margin:0;padding:12px 16px;border:0;font:inherit;color:inherit;background:transparent;cursor:pointer;text-decoration:none;white-space:nowrap}',
    '.dock .star{color:var(--ink)}.dock .star svg{color:#f2a900}',
    '.dock .fb{background:var(--ink);color:var(--bg)}',
    '.dock .star:hover{background:var(--wash)}.dock .fb:hover{opacity:.86}',
    '.dock a:focus-visible,.dock button:focus-visible{outline:2px solid #f2a900;outline-offset:-4px}',
    '.dock .short{display:none}',
    '@media (max-width:520px){.dock{right:10px}.dock a,.dock button{padding:11px 13px}.dock .long{display:none}.dock .short{display:inline}}',
    '@media print{.dock,.fab{display:none}}',
    '@media (prefers-reduced-motion:reduce){.panel{transition:none}}',
  ].join('');

  function build() {
    host = document.createElement('div');
    host.id = 'webgrs-feedback';
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="panel" role="dialog" aria-modal="false" aria-labelledby="fb-t" hidden>' +
      '<div class="hd"><b id="fb-t"></b><button type="button" class="x">&times;</button></div>' +
      '<form novalidate>' +
      '<textarea name="msg" rows="5" maxlength="4000"></textarea>' +
      '<input name="contact" type="text" inputmode="email" autocomplete="email" maxlength="200">' +
      '<input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="ft"><span class="st" role="status" aria-live="polite"></span><button type="submit" class="send"></button></div>' +
      '</form><div class="ok" hidden></div></div>';
    panel = root.querySelector('.panel');
    form = root.querySelector('form');
    ta = form.elements.msg;
    contact = form.elements.contact;
    hp = form.elements.website;
    st = root.querySelector('.st');
    sendBtn = root.querySelector('.send');
    root.querySelector('.x').addEventListener('click', close);
    form.addEventListener('submit', function (e) { e.preventDefault(); send(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
    texts();
  }

  function texts() {
    if (!root) return;
    root.getElementById('fb-t').textContent = t('title');
    root.querySelector('.x').setAttribute('aria-label', t('close'));
    ta.placeholder = t('msg');
    ta.setAttribute('aria-label', t('msg'));
    contact.placeholder = t('contact');
    contact.setAttribute('aria-label', t('contact'));
    if (!sendBtn.disabled) sendBtn.textContent = t('send');
  }

  // Light or dark, read from what is actually painted behind the button
  function dark(el) {
    for (el = el || document.body; el && el.nodeType === 1; el = el.parentElement) {
      var m = (getComputedStyle(el).backgroundColor || '').match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.5)) return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255 < 0.5;
    }
    var h = (getComputedStyle(document.documentElement).backgroundColor || '').match(/[\d.]+/g);
    if (h && (h.length < 4 || +h[3] > 0.5)) return (0.299 * h[0] + 0.587 * h[1] + 0.114 * h[2]) / 255 < 0.5;
    return false;
  }

  function place() {
    var narrow = window.innerWidth < 560;
    panel.classList.toggle('sheet', narrow);
    panel.style.top = panel.style.bottom = panel.style.left = panel.style.right = '';
    if (narrow) return;
    var r = opener && opener.isConnected ? opener.getBoundingClientRect() : null;
    if (!r || !r.width) { panel.style.right = '16px'; panel.style.bottom = '16px'; return; }
    var w = panel.offsetWidth, ph = panel.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(12, r.right - w), vw - w - 12);
    panel.style.left = left + 'px';
    if (r.bottom + 8 + ph <= vh - 12 || r.top < vh / 2) panel.style.top = Math.min(r.bottom + 8, Math.max(12, vh - ph - 12)) + 'px';
    else panel.style.top = Math.max(12, r.top - 8 - ph) + 'px';
  }

  function showForm(on) {
    form.hidden = !on;
    root.querySelector('.ok').hidden = on;
  }

  function open(from) {
    if (!host) build();
    opener = from && from.nodeType === 1 ? from : null;
    panel.classList.remove('light', 'dark');
    panel.classList.add(dark(opener) ? 'dark' : 'light');
    panel.style.fontFamily = getComputedStyle(opener || document.body).fontFamily;
    texts();
    if (!isOpen) showForm(true);
    panel.hidden = false;
    place();
    requestAnimationFrame(function () { panel.classList.add('on'); });
    isOpen = true;
    setExpanded(true);
    try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
    if (SITEKEY && !pre) pre = { at: Date.now(), p: tsToken() };
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('on');
    panel.hidden = true;
    setExpanded(false);
    if (!form.hidden) st.textContent = '';
    if (opener && opener.isConnected) try { opener.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
  }

  function setExpanded(v) {
    document.querySelectorAll('[data-feedback],.wgfb-trigger').forEach(function (b) { b.setAttribute('aria-expanded', v ? 'true' : 'false'); });
  }

  function status(k, bad) {
    st.textContent = k ? t(k) : '';
    st.classList.toggle('err', !!bad);
  }

  function send() {
    var msg = ta.value.trim();
    if (msg.length < 2) { status('empty', true); ta.focus(); return; }
    if (sendBtn.disabled) return;
    sendBtn.disabled = true;
    sendBtn.textContent = t('sending');
    status('');
    var ctx = '';
    try { if (typeof window.WebgrsFeedbackContext === 'function') ctx = String(window.WebgrsFeedbackContext() || ''); } catch (e) { /* page hook failed */ }
    var body = {
      site: ds.site || '', msg: msg, contact: contact.value.trim(), hp: hp.value,
      page: location.href, title: document.title + (ctx ? ' | ' + ctx : ''),
      lang: document.documentElement.lang || navigator.language || '', vp: window.innerWidth + 'x' + window.innerHeight,
    };
    var tok = SITEKEY ? freshToken() : Promise.resolve('');
    tok.then(function (ts) {
      body.turnstile = ts;
      return fetch(API + '/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }).then(function (r) {
      if (r.status === 429) throw new Error('quota');
      if (!r.ok) throw new Error('fail');
      ta.value = '';
      var ok = root.querySelector('.ok');
      ok.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var p = document.createElement('p');
      p.textContent = t('thanks');
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'again';
      again.textContent = t('again');
      again.addEventListener('click', function () { showForm(true); status(''); ta.focus(); if (SITEKEY) pre = { at: Date.now(), p: tsToken() }; });
      ok.append(p, again);
      showForm(false);
      again.focus();
    }).catch(function (e) {
      status(e && e.message === 'quota' ? 'quota' : 'fail', true);
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = t('send');
    });
  }

  // ---------- triggers
  function makeButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wgfb-trigger' + (ds.class ? ' ' + ds.class : '');
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = ICON + '<span class="wgfb-l"></span>';
    b.addEventListener('click', function () { if (isOpen && opener === b) close(); else open(b); });
    return b;
  }
  function label(b) {
    var s = b.querySelector('.wgfb-l');
    if (s) s.textContent = t('trigger');
    b.setAttribute('aria-label', t('title'));
    b.title = t('title');
  }

  function init() {
    var css = '.wgfb-trigger{display:inline-flex;align-items:center;justify-content:center;gap:.4em}.wgfb-trigger svg{flex:none}';
    if (+ds.compact) css += '@media (max-width:' + (+ds.compact) + 'px){.wgfb-trigger .wgfb-l{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    var triggers = [];
    var below = +ds.floatBelow;
    var mount = ds.mount && document.querySelector(ds.mount);
    var dock = null;
    if (ds.star) { mount = null; below = 0; }
    if (mount) {
      var b = makeButton();
      if (below) b.classList.add('wgfb-mounted');
      var before = ds.before && mount.querySelector(ds.before);
      mount.insertBefore(b, before || null);
      triggers.push(b);
    }
    if (below) s.textContent += '@media (max-width:' + below + 'px){.wgfb-mounted{display:none!important}}';
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-feedback]');
      if (!el) return;
      e.preventDefault();
      if (isOpen && opener === el) close(); else open(el);
    });
    if (ds.star) {
      // Fixed pill: gold star link on the left, filled Feedback button on the right
      build();
      var url = /^https?:/.test(ds.star) ? ds.star : 'https://github.com/' + ds.star.replace(/^\/+/, '');
      dock = document.createElement('div');
      dock.className = 'dock';
      var lift = function (px) { return 'calc(' + px + 'px + var(--wgfb-lift,0px) + env(safe-area-inset-bottom))'; };
      dock.style.bottom = lift(+ds.floatBottom || 16);
      if (+ds.floatBottomNarrow) {
        var nb = document.createElement('style');
        nb.textContent = '@media (max-width:' + (+ds.narrowMax || 520) + 'px){.dock{bottom:' + lift(+ds.floatBottomNarrow) + '!important}}';
        root.appendChild(nb);
      }
      if (ds.dockSide === 'left') { dock.style.left = '16px'; dock.style.right = 'auto'; }
      dock.innerHTML = '<a class="star" target="_blank" rel="noopener">' + STAR + '<span class="long"></span><span class="short"></span></a>' +
        '<button type="button" class="fb" aria-haspopup="dialog" aria-expanded="false">' + ICON + '<span class="fbl"></span></button>';
      dock.querySelector('.star').href = url;
      var fbBtn = dock.querySelector('.fb');
      fbBtn.addEventListener('click', function () { if (isOpen && opener === fbBtn) close(); else open(fbBtn); });
      root.appendChild(dock);
    } else if ((!mount && !document.querySelector('[data-feedback]')) || (mount && below)) {
      // Floating button inside the shadow root: always, or only on narrow screens when the header has no room
      build();
      fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'fab' + (mount ? ' round' : '');
      fab.innerHTML = ICON + (mount ? '' : '<span class="wgfb-l"></span>');
      fab.style.bottom = 'calc(' + (+ds.floatBottom || 16) + 'px + env(safe-area-inset-bottom))';
      fab.addEventListener('click', function () { if (isOpen) close(); else open(fab); });
      if (mount) {
        var hide = document.createElement('style');
        hide.textContent = '@media (min-width:' + (below + 1) + 'px){.fab{display:none}}';
        root.appendChild(hide);
      }
      root.appendChild(fab);
      triggers.push(fab);
    }
    function relabel() {
      triggers.forEach(label);
      if (dock) {
        var sa = dock.querySelector('.star');
        dock.querySelector('.long').textContent = t('star');
        dock.querySelector('.short').textContent = t('starShort');
        sa.title = t('starTitle');
        sa.setAttribute('aria-label', t('star') + ' - ' + t('starTitle'));
        dock.querySelector('.fbl').textContent = t('trigger');
        dock.querySelector('.fb').title = t('title');
        dock.classList.remove('light', 'dark');
        dock.classList.add(dark() ? 'dark' : 'light');
      }
      texts();
      if (fab) { fab.classList.remove('light', 'dark'); fab.classList.add(dark() ? 'dark' : 'light'); }
    }
    relabel();
    new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-theme', 'class'] });

    document.addEventListener('pointerdown', function (e) {
      if (!isOpen) return;
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(host) >= 0 || (opener && path.indexOf(opener) >= 0)) return;
      close();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (isOpen && e.key === 'Escape') { e.stopPropagation(); close(); }
    }, true);
    window.addEventListener('resize', function () { if (isOpen) place(); });
  }

  window.WebgrsFeedback = { open: open, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
