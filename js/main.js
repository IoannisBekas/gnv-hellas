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

  // ---- word-by-word scroll reveal text ----
  var rtBlocks = [];
  function buildReveal(el, text) {
    el.textContent = "";
    var words = [];
    text.split(/\s+/).forEach(function (tok) {
      var m = tok.match(/^\{fig(\d)\}$/);
      var node;
      if (m) {
        node = document.createElement("img");
        node.className = "inline-fig";
        node.alt = "";
        node.src = "assets/fig/fig" + m[1] + ".webp";
        node.onerror = function () { node.remove(); };
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

  apply(detectLang());
  onScroll();
})();
