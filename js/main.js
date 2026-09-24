(function () {
  // Αλλάξτε εδώ το email επικοινωνίας.
  var CONFIG = { email: "info@example.com" };

  var SUPPORTED = ["en", "el", "de"];
  var STORAGE_KEY = "gnv-lang";
  var current = "en";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o && o[k]; }, obj);
  }

  function detectLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.indexOf(fromUrl) > -1) return fromUrl;
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.indexOf(saved) > -1) return saved;
    } catch (e) {}
    var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) > -1 ? nav : "en";
  }

  // ---- inline animated characters (white-background videos multiplied onto the page) ----
  var figIO = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) { var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { rootMargin: "120px" }) : null;

  function makeFig(n) {
    var v = document.createElement("video");
    v.className = "inline-fig";
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.preload = "auto";
    v.poster = "assets/fig/fig" + n + ".webp";
    v.src = "assets/fig/fig" + n + ".mp4";
    v.addEventListener("error", function () {
      var img = new Image();
      img.className = "inline-fig";
      img.alt = "";
      img.src = "assets/fig/fig" + n + ".webp";
      if (v.parentNode) v.replaceWith(img);
    }, { once: true });
    if (!reduce) {
      v.autoplay = true;
      if (figIO) figIO.observe(v);
    }
    return v;
  }

  // ---- word-by-word scroll reveal text ----
  var rtBlocks = [];
  function buildReveal(el, text) {
    el.textContent = "";
    var words = [];
    text.split(/\s+/).forEach(function (tok) {
      var m = tok.match(/^\{fig(\d)\}$/);
      var node;
      if (m) {
        node = makeFig(m[1]);
      } else {
        node = document.createElement("span");
        node.className = "w";
        node.textContent = tok;
        words.push(node);
      }
      el.appendChild(node);
      el.appendChild(document.createTextNode(" "));
    });
    return words;
  }

  function setupReveal() {
    rtBlocks = [];
    document.querySelectorAll("[data-rt]").forEach(function (p) {
      var text = get(window.I18N[current], p.getAttribute("data-rt"));
      if (text == null) return;
      var words = buildReveal(p, text);
      if (p.getAttribute("data-outline")) p.parentNode.setAttribute("data-outlined", "");
      rtBlocks.push({ el: p, words: words });
    });
    updateReveal();
  }

  function updateReveal() {
    var vh = window.innerHeight;
    rtBlocks.forEach(function (b) {
      var r = b.el.getBoundingClientRect();
      var p = reduce ? 1 : (vh * 0.82 - r.top) / (r.height + vh * 0.34);
      p = Math.max(0, Math.min(1, p));
      var n = b.words.length;
      for (var i = 0; i < n; i++) {
        b.words[i].classList.toggle("on", (i + 1) / n <= p + 0.001);
      }
    });
  }

  // ---- i18n ----
  function apply(lang) {
    var dict = window.I18N[lang];
    if (!dict) return;
    current = lang;
    document.documentElement.lang = lang;
    document.title = dict._title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", dict._desc);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = get(dict, el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = get(dict, el.getAttribute("data-i18n-html"));
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var v = get(dict, el.getAttribute("data-i18n-alt"));
      if (v != null) el.setAttribute("alt", v);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var v = get(dict, el.getAttribute("data-i18n-placeholder"));
      if (v != null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    var note = document.getElementById("formNote");
    note.textContent = ""; note.className = "fine";
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    setupReveal();
    tickClock();
  }

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { apply(b.getAttribute("data-lang")); });
  });

  // ---- live Athens clock ----
  var clock = document.getElementById("clock");
  function tickClock() {
    try {
      clock.textContent = new Intl.DateTimeFormat(window.I18N[current]._locale, {
        timeZone: "Europe/Athens", dateStyle: "long", timeStyle: "short"
      }).format(new Date());
    } catch (e) { clock.textContent = ""; }
  }
  setInterval(tickClock, 30000);

  // ---- parallax floats + progress rail ----
  var floats = Array.prototype.slice.call(document.querySelectorAll(".float"));
  var thumb = document.getElementById("railThumb");
  var journey = document.getElementById("journey");
  var jTrack = document.getElementById("jTrack");
  var jBar = document.getElementById("jBar");
  var jCount = document.getElementById("jCount");
  var pinnedMQ = window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = window.innerHeight;
      if (!reduce) {
        floats.forEach(function (el) {
          var host = el.parentElement.getBoundingClientRect();
          var off = vh / 2 - (host.top + host.height / 2);
          var speed = parseFloat(el.getAttribute("data-speed")) || 0;
          var rot = parseFloat(el.getAttribute("data-rot")) || 0;
          el.style.setProperty("--py", (-off * speed).toFixed(1) + "px");
          el.style.setProperty("--rot", (off * rot).toFixed(2) + "deg");
        });
      }
      if (pinnedMQ.matches && jTrack) {
        var jr = journey.getBoundingClientRect();
        var total = journey.offsetHeight - vh;
        var jp = Math.max(0, Math.min(1, -jr.top / total));
        var maxX = jTrack.scrollWidth - window.innerWidth;
        jTrack.style.transform = "translate3d(" + (-jp * Math.max(0, maxX)).toFixed(1) + "px,0,0)";
        jBar.style.width = (jp * 100).toFixed(1) + "%";
        var idx = Math.max(1, Math.min(10, Math.round(jp * 9) + 1));
        jCount.textContent = (idx < 10 ? "0" : "") + idx + " / 10";
      }
      var max = document.documentElement.scrollHeight - vh;
      var pr = max > 0 ? window.scrollY / max : 0;
      thumb.style.top = (pr * 70) + "%";
      updateReveal();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // ---- inquiry form → mailto ----
  document.getElementById("helloLink").href = "mailto:" + CONFIG.email;
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("inquiryForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var d = window.I18N[current].cap;
    var note = document.getElementById("formNote");
    var email = document.getElementById("inqEmail").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      note.textContent = d.invalid; note.className = "fine error"; return;
    }
    note.textContent = d.opening; note.className = "fine ok";
    location.href = "mailto:" + CONFIG.email +
      "?subject=" + encodeURIComponent("B2B Partnership Guide — G.N.V. HELLAS") +
      "&body=" + encodeURIComponent("Please send the B2B Partnership Guide to: " + email);
  });

  // ---- loader: looping character + handwritten words, then the grid "settles" into the page ----
  var root = document.documentElement;
  function runLoader() {
    var loader = document.getElementById("loader");
    return new Promise(function (resolve) {
      if (!loader) return resolve();
      if (reduce) { loader.remove(); return resolve(); }

      var stage = document.getElementById("loaderStage");
      var grid = loader.querySelector(".loader__grid");
      var vid = document.getElementById("loaderVideo");
      var WORDS = ["4631", "Ierapetra", "OKAA", "Rentis", "2020", "18233", "Athens", "G.N.V.", "I.K.E.", "Crete", "Attica", "33", "Est. 2020"];
      var LEFT = [[-9.3, -16.6], [-11.7, -2.2], [-8, 15.7], [-15.5, -9], [-13, 8.5], [-5.5, -20]];
      var RIGHT = [[6.4, -13.7], [15.2, 1.2], [9, 14.5], [14.5, -8.5], [5.5, 18], [16.5, -15.5]];
      var ROT = [12.4, -5, 8.2, -6.5, 5, -8.2, 3.5];
      var OPA = [1, 0.85, 0.58, 0.48, 0.23];
      var MIN_MS = 2600, MAX_MS = 4000, TICK_MS = 170, LEAVE_MS = 800;

      var cellVw = window.innerWidth <= 900 ? 0.16 : 0.082;
      var a = 0.665, r = 0.7;
      function drawGrid() {
        var cell = cellVw * window.innerWidth;
        var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        grid.style.backgroundSize = (a * cell) + "px " + (r * cell) + "px";
        grid.style.backgroundPosition = (cx - a * cx) + "px " + (cy - r * cy) + "px";
      }
      drawGrid();
      window.addEventListener("resize", drawGrid);
      root.style.overflow = "hidden";

      var n = 0, li = 0, ri = 0, live = [], timer = 0, started = false;
      function spawn() {
        var left = n % 2 === 0;
        var set = left ? LEFT : RIGHT;
        var pos = set[(left ? li++ : ri++) % set.length];
        var el = document.createElement("span");
        el.className = "loader__move";
        el.textContent = WORDS[n % WORDS.length];
        el.style.setProperty("--mx", pos[0] + "rem");
        el.style.setProperty("--my", pos[1] + "rem");
        el.style.setProperty("--mr", ROT[n % ROT.length] + "deg");
        stage.appendChild(el);
        n++;
        live.unshift(el);
        live.forEach(function (w, i) { if (i < OPA.length) w.style.setProperty("--mo", OPA[i]); });
        if (live.length > OPA.length) {
          var old = live.pop();
          old.classList.add("is-out");
          setTimeout(function () { old.remove(); }, 350);
        }
        requestAnimationFrame(function () { el.classList.add("is-in"); });
      }
      function start() {
        if (started) return;
        started = true;
        spawn();
        timer = setInterval(spawn, TICK_MS);
      }
      try { document.fonts.load('3.5rem "Caveat"').then(start); } catch (e) {}
      setTimeout(start, 400);

      var videoReady = new Promise(function (ok) {
        function fail() { loader.classList.add("no-video"); ok(); }
        vid.addEventListener("error", fail, { once: true });
        if (vid.readyState >= 3) ok(); else vid.addEventListener("canplay", function () { ok(); }, { once: true });
        var p = vid.play && vid.play();
        if (p && p.catch) p.catch(function () {});
      });
      var minTime = new Promise(function (ok) { setTimeout(ok, MIN_MS); });
      var maxTime = new Promise(function (ok) { setTimeout(ok, MAX_MS); });

      function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        root.style.overflow = "";
        loader.classList.add("is-done");
        resolve();
        setTimeout(function () { window.removeEventListener("resize", drawGrid); loader.remove(); }, 450);
      }
      function leave() {
        clearInterval(timer);
        loader.classList.add("is-leaving");
        var t0 = performance.now();
        setTimeout(finish, LEAVE_MS + 250);
        (function frame(now) {
          var d = Math.min(1, (now - t0) / LEAVE_MS), g = ease(d);
          a = 0.665 + (1 - 0.665) * g;
          r = 0.7 + (1 - 0.7) * g;
          drawGrid();
          if (d < 1) return requestAnimationFrame(frame);
          finish();
        })(t0);
      }
      Promise.race([Promise.all([minTime, videoReady]), maxTime]).then(leave);
    });
  }

  apply(detectLang());
  onScroll();
  setTimeout(function () { root.classList.add("ready"); }, 9000);
  runLoader().then(function () { root.classList.add("ready"); });
})();
