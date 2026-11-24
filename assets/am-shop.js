/* Artzen Media shop — page behaviour for the Arthouse-look pages (pilot on /text, 24 Nov 2026).
   The timeline ruler, lazy autoplay loops, the YouTube facade, the Properties panel replica, the floating buy bar,
   "show all reviews", the Polar checkout modal and ?s= channel tagging. window.amTrackCheckout is defined in the
   page head (Meta Pixel). No dependencies. */
(function () {
  'use strict';

  /* ---- the ruler is the page's timeline: scrolling moves the blue playhead ---- */
  var track = document.querySelector('.ruler__track'), head = document.querySelector('.ruler__head');
  if (track && head) {
    var ticking = false;
    var frame = function () {
      ticking = false;
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      var p = Math.min(1, Math.max(0, scrollY / max));
      head.style.transform = 'translateX(' + (p * track.clientWidth).toFixed(1) + 'px)';
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', frame);
    frame();
  }

  /* ---- lazy autoplay: loops marked data-autoplay only download once they're displayed and near the screen,
     so the hero a device doesn't show never loads ---- */
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay]'));
  function start(v) {
    v.setAttribute('data-inview', '');
    v.preload = 'auto'; v.muted = true; v.playsInline = true;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  if (!('IntersectionObserver' in window)) vids.forEach(start);
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); start(e.target); } });
    }, { rootMargin: '600px 0px' });
    vids.forEach(function (v) { io.observe(v); });
  }
  /* best-effort kick for browsers that block muted autoplay until the first touch */
  function kick() {
    document.querySelectorAll('video[data-inview]').forEach(function (v) {
      if (!v.paused) return;
      v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
  }
  ['touchstart', 'click', 'scroll'].forEach(function (ev) { addEventListener(ev, kick, { once: true, passive: true }); });

  /* ---- sales video: the poster swaps for the YouTube player on click (nothing from YouTube loads before) ---- */
  var vsl = document.getElementById('vslFrame');
  if (vsl) {
    var poster = document.getElementById('vslPoster'), loaded = false;
    if (poster) poster.addEventListener('error', function () { poster.style.display = 'none'; });
    var play = function () {
      var id = vsl.getAttribute('data-yt');
      if (loaded || !id) return;
      loaded = true;
      vsl.classList.add('playing');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = vsl.getAttribute('data-title') || 'Video';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      vsl.appendChild(f);
      if (poster) poster.style.display = 'none';
    };
    vsl.addEventListener('click', play);
    vsl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  }

  /* ---- Properties panel replica: sections open, dropdowns show the real option lists ---- */
  document.querySelectorAll('.egp-head').forEach(function (h) {
    h.addEventListener('click', function () {
      var open = h.closest('.egp-sec').classList.toggle('open');
      h.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  function closeDrops() {
    document.querySelectorAll('.egp-drop.open').forEach(function (o) {
      o.classList.remove('open');
      o.querySelector('.egp-field').setAttribute('aria-expanded', 'false');
    });
  }
  document.querySelectorAll('.egp-drop').forEach(function (d) {
    var btn = d.querySelector('.egp-field'), cur = d.querySelector('.egp-cur'), menu = d.querySelector('.egp-menu');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var was = d.classList.contains('open');
      closeDrops();
      if (!was) {
        d.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
        var sel = menu.querySelector('.is-sel'); if (sel) menu.scrollTop = sel.offsetTop - 60;
      }
    });
    menu.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.querySelectorAll('li').forEach(function (x) { x.classList.remove('is-sel'); });
        li.classList.add('is-sel'); cur.textContent = li.textContent;
        d.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      });
    });
  });
  document.addEventListener('click', closeDrops);

  /* ---- footer wordmark: sized to fill the footer's width exactly, whatever font the device has ---- */
  var mark = document.querySelector('.foot__mark'), markIn = mark && mark.querySelector('span');
  if (markIn) {
    var fit = function () {
      markIn.style.fontSize = '100px';
      var cs = getComputedStyle(mark), room = mark.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      markIn.style.fontSize = (100 * room / markIn.getBoundingClientRect().width).toFixed(2) + 'px';
    };
    fit(); addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  /* ---- reviews: the rest show on click ---- */
  var more = document.getElementById('moreReviews');
  if (more) more.addEventListener('click', function () {
    document.querySelectorAll('.quote[hidden]').forEach(function (q) { q.hidden = false; });
    more.remove();
  });

  /* ---- floating buy bar: on whenever neither the hero nor the closing buy button is on screen ---- */
  var bar = document.getElementById('bar'), heroA = document.getElementById('heroActions'), finA = document.getElementById('finalActions');
  if (bar && heroA && finA && 'IntersectionObserver' in window) {
    var heroIn = true, finIn = false;
    var set = function () {
      var on = !heroIn && !finIn;
      bar.classList.toggle('show', on); bar.setAttribute('aria-hidden', String(!on));
      bar.querySelector('a').tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (es) { heroIn = es[0].isIntersecting; set(); }).observe(heroA);
    new IntersectionObserver(function (es) { finIn = es[0].isIntersecting; set(); }).observe(finA);
  }

  /* ---- channel tagging: ?s=story / ?s=ads / ?s=email swap each buy button to the Polar checkout link tagged for
     that channel, matched per product so an upsell never inherits another product's price. No param = site default. ---- */
  var LINKS = {
    story: {
      'sfx-collection':  'https://buy.polar.sh/polar_cl_EvTRzGNvWlZsVQvIh5w6lfqXsmY5SRFVB24oW4As7Cg',
      'text-animations': 'https://buy.polar.sh/polar_cl_XGugAaoqfHYcabzIUGyyTFEaT1p9Jvj1pUG4j2OJlLj',
      'text-sfx-bundle': 'https://buy.polar.sh/polar_cl_xt2AKiW4WDtjDIYlFOHtss9cIUQceVFqdei8540ijLL'
    },
    ads: {
      'sfx-collection':  'https://buy.polar.sh/polar_cl_eb9Ys1fl191ews67dpVHdz0svKSHdHUU8ehZC0oWog4',
      'text-animations': 'https://buy.polar.sh/polar_cl_5KdbIXLbRzUDVWUiAif1FdWRfg9uppDUoqrVH00y1Dt',
      'text-sfx-bundle': 'https://buy.polar.sh/polar_cl_vKrjLcCn1VCRi0fZOT5uNoKEhQQih3byKWusN2wm8Cb'
    },
    email: {
      'sfx-collection':  'https://buy.polar.sh/polar_cl_fJNOHKFjenbLuGV9uq60yPuThyrWx9vuq6AS93yvIzw',
      'text-animations': 'https://buy.polar.sh/polar_cl_3UIa4rtE4c2LTW9isA2bWBmAPJiE40xSCUmDe1CIL5X',
      'text-sfx-bundle': 'https://buy.polar.sh/polar_cl_1fknhbjKLHXIv2xXgjINwPtHBQ6COt2ozkmqk2Jrdh7'
    }
  };
  try {
    var map = LINKS[new URLSearchParams(location.search).get('s')];
    if (map) document.querySelectorAll('a[href*="buy.polar.sh"][data-product-id]').forEach(function (a) {
      var t = map[a.getAttribute('data-product-id')]; if (t) a.href = t;
    });
  } catch (e) {}

  /* ---- Polar checkout in a modal ---- */
  var modal, box, frameEl, spinner;
  function build() {
    modal = document.createElement('div');
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;';
    box = document.createElement('div');
    box.style.cssText = 'position:relative;width:92%;max-width:480px;height:85vh;background:#141414;border-radius:18px;overflow:hidden;';
    var close = document.createElement('button');
    close.textContent = '✕'; close.setAttribute('aria-label', 'Close checkout');
    close.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(127,127,127,.25);border:none;color:#F2F1ED;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;z-index:10;';
    spinner = document.createElement('div');
    spinner.style.cssText = 'position:absolute;top:50%;left:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border:3px solid rgba(242,241,237,.17);border-top-color:#F2F1ED;border-radius:50%;animation:amspin .7s linear infinite;z-index:5;';
    var st = document.createElement('style'); st.textContent = '@keyframes amspin{to{transform:rotate(360deg)}}'; document.head.appendChild(st);
    frameEl = document.createElement('iframe'); frameEl.allow = 'payment *'; frameEl.title = 'Checkout';
    frameEl.style.cssText = 'width:100%;height:100%;border:none;position:relative;z-index:6;';
    frameEl.onload = function () { if (frameEl.src) spinner.style.display = 'none'; };
    box.appendChild(spinner); box.appendChild(close); box.appendChild(frameEl); modal.appendChild(box); document.body.appendChild(modal);
    close.onclick = hide;
    modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.style.display === 'flex') hide(); });
  }
  function open(url) { if (!modal) build(); spinner.style.display = 'block'; frameEl.src = url; modal.style.display = 'flex'; requestAnimationFrame(function () { modal.style.opacity = '1'; }); }
  function hide() { modal.style.opacity = '0'; setTimeout(function () { modal.style.display = 'none'; frameEl.src = ''; }, 250); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (a && a.href && a.href.indexOf('buy.polar.sh') !== -1) {
      if (window.amTrackCheckout) window.amTrackCheckout(a);
      e.preventDefault(); open(a.href);
    }
  }, true);
})();
