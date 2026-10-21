/* Phone top bar that slides away while reading down and comes back on any scroll up
   (canonical copy: C:\Users\ghs\webgrs-guard\navhide.js; sync.py copies it).
   <script src="navhide.js" data-nav=".top" data-max="860" data-mode="margin" defer></script>
   data-nav   selector of the bar
   data-max   only at or below this width (px, default 760)
   data-mode  margin: the bar sits above an inner scroller in a flex column (pulled up with a negative margin)
              slide: a sticky bar over a scrolling page (moved up with translateY)
   data-ignore selector of scrollers that never move it (full-screen drawers, menus)
   window.NavHide.show() brings it back, e.g. after a view switch. <html> gets .nav-hidden while it is away. */
(function () {
  if (window.NavHide) return;
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var mq = window.matchMedia('(max-width:' + (+ds.max || 760) + 'px)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var bar = null, hidden = false, lockUntil = 0, run = 0, last = new WeakMap();

  function set(h) {
    if (!bar || h === hidden) return;
    hidden = h;
    lockUntil = Date.now() + 320;  // layout settles before the next scroll counts
    run = 0;
    document.documentElement.classList.toggle('nav-hidden', h);
    if (ds.mode === 'margin') bar.style.marginTop = h ? -bar.offsetHeight + 'px' : '';
    else bar.style.transform = h ? 'translateY(-100%)' : '';
  }

  function style() {
    if (!bar) return;
    bar.style.transition = mq.matches && !calm.matches ? (ds.mode === 'margin' ? 'margin-top .22s ease' : 'transform .22s ease') : '';
    if (!mq.matches) set(false);
  }

  function onScroll(e) {
    if (!bar || !mq.matches) return;
    var el = e.target === document ? document.scrollingElement : e.target;
    if (!el || el.nodeType !== 1 || bar.contains(el) || (ds.ignore && el.closest(ds.ignore))) return;
    var y = el.scrollTop, prev = last.get(el);
    last.set(el, y);
    if (prev == null || y === prev) return;  // first event, or a sideways scroll
    if (Date.now() < lockUntil) return;
    var h = bar.offsetHeight;
    if (ds.mode === 'margin' ? y <= h : bar.getBoundingClientRect().top + (hidden ? h : 0) > 0.5) { set(false); return; }  // near the top, or a sticky bar not stuck yet
    if (!hidden && el.scrollHeight - el.clientHeight < h * 3) return;  // too short to be worth hiding
    var d = y - prev;
    run = (run > 0) === (d > 0) ? run + d : d;  // distance moved in one direction
    if (run > 12) set(true);
    else if (run < -12) set(false);
  }

  function init() {
    bar = document.querySelector(ds.nav || 'header');
    if (!bar) return;
    style();
    if (mq.addEventListener) { mq.addEventListener('change', style); calm.addEventListener('change', style); }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    bar.addEventListener('focusin', function () { set(false); });
  }

  window.NavHide = { show: function () { set(false); }, hide: function () { set(true); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
