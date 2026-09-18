(function () {
  "use strict";

  var CFG = window.CHALLENGE_CONFIG || {};
  var SCENES = 4; // Shire, Lake, Dragons, Mordor
  var LENGTH_MULT = 1.7; // how many container-widths of scroll each scene spans

  var CHAR_ALIASES = {
    mago: "mago", wizard: "mago",
    hobbit: "hobbit",
    guerrero: "guerrero", warrior: "guerrero",
    arquero: "arquero", archer: "arquero",
    enano: "enano", dwarf: "enano",
    explorador: "explorador", ranger: "explorador",
  };

  // width/height ratio of each sprite file, so characters keep their real proportions.
  var CHAR_ASPECT = {
    guerrero: 108 / 119,
    hobbit: 51 / 44,
    enano: 45 / 47,
    arquero: 66 / 88,
    explorador: 62 / 54,
    mago: 96 / 97,
  };

  // Torch glow: how deep into the journey (0..3, same scale as scenePos) a
  // character must be before their own torch starts catching light, and
  // fully lit. It's driven by each character's fixed progress, not scroll.
  var TORCH_START = 1.65;
  var TORCH_FULL = 2.7;

  var DEMO_DATA = [
    { vendedor: "Vendedor 1", personaje: "hobbit", avance: 0.36, rol: "" },
    { vendedor: "Vendedor 2", personaje: "guerrero", avance: 0.71, rol: "Llave" },
    { vendedor: "Vendedor 3", personaje: "mago", avance: 0.14, rol: "Anillo" },
  ];

  // Journey path, authored as fractions of (width, height) so it rescales to any viewport.
  // Format: ["M", x, y] then repeated ["C", x1,y1, x2,y2, x,y]
  var PATH_FRACTIONS = [
    ["M", 0.010, 0.900],
    ["C", 0.075, 0.880, 0.125, 0.860, 0.188, 0.880],
    ["C", 0.238, 0.895, 0.263, 0.860, 0.325, 0.840],
    ["C", 0.388, 0.820, 0.438, 0.860, 0.500, 0.880],
    ["C", 0.563, 0.900, 0.625, 0.870, 0.688, 0.840],
    ["C", 0.750, 0.810, 0.800, 0.830, 0.850, 0.800],
    ["C", 0.900, 0.770, 0.950, 0.760, 0.990, 0.720],
  ];

  function normalizeHeader(h) {
    return h.trim().toLowerCase().normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function parseCsv(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
        else { field += c; }
      } else if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = ""; rows.push(row); row = [];
      } else { field += c; }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ""; }); });
  }

  function pct(raw) {
    if (raw == null) return 0;
    var s = String(raw).trim();
    if (s === "") return 0;
    var hasPercent = s.indexOf("%") !== -1;
    var n = parseFloat(s.replace(/%/g, "").replace(/,/g, "."));
    if (isNaN(n)) return 0;
    if (hasPercent) return Math.max(0, Math.min(1, n / 100));
    return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
  }

  function rowsToRecords(rows) {
    if (!rows.length) return [];
    var header = rows[0].map(normalizeHeader);
    var idx = {
      vendedor: header.indexOf("vendedor"),
      personaje: header.indexOf("personaje"),
      avance: header.indexOf("avancecombinado"),
      rol: header.indexOf("rol"),
    };
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var vendedor = idx.vendedor >= 0 ? (row[idx.vendedor] || "").trim() : "";
      if (!vendedor) continue;
      out.push({
        vendedor: vendedor,
        personaje: idx.personaje >= 0 ? (row[idx.personaje] || "").trim() : "",
        avance: idx.avance >= 0 ? pct(row[idx.avance]) : 0,
        rol: idx.rol >= 0 ? (row[idx.rol] || "").trim() : "",
      });
    }
    return out;
  }

  function charSpriteId(personaje) {
    var key = (personaje || "").trim().toLowerCase();
    return CHAR_ALIASES[key] || "hobbit";
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ---------------- Scroll-driven scene engine ----------------

  var els = {};
  var pathD = "";

  function buildPathD(w, h) {
    var d = "";
    PATH_FRACTIONS.forEach(function (seg) {
      if (seg[0] === "M") {
        d += "M" + (seg[1] * w).toFixed(1) + "," + (seg[2] * h).toFixed(1) + " ";
      } else {
        d += "C" + (seg[1] * w).toFixed(1) + "," + (seg[2] * h).toFixed(1) + " " +
          (seg[3] * w).toFixed(1) + "," + (seg[4] * h).toFixed(1) + " " +
          (seg[5] * w).toFixed(1) + "," + (seg[6] * h).toFixed(1) + " ";
      }
    });
    return d.trim();
  }

  function layout(records) {
    var containerW = els.mapScroll.clientWidth;
    var containerH = els.mapScroll.clientHeight;
    var trackW = Math.round(containerW * SCENES * LENGTH_MULT);

    els.scrollTrack.style.width = trackW + "px";
    els.bgStage.style.width = containerW + "px";
    els.bgStage.style.height = containerH + "px";
    els.journeySvg.setAttribute("width", trackW);
    els.journeySvg.setAttribute("height", containerH);
    els.journeySvg.style.width = trackW + "px";
    els.journeySvg.style.height = containerH + "px";

    pathD = buildPathD(trackW, containerH);
    els.path.setAttribute("d", pathD);
    els.pathShadow.setAttribute("d", pathD);

    renderTokens(records, trackW, containerH);
    updateScene();
  }

  function updateScene() {
    var maxScroll = els.mapScroll.scrollWidth - els.mapScroll.clientWidth;
    var progress = maxScroll > 0 ? els.mapScroll.scrollLeft / maxScroll : 0;
    progress = Math.max(0, Math.min(1, progress));
    var scenePos = progress * (SCENES - 1);
    var idx = Math.min(SCENES - 2, Math.floor(scenePos));
    var frac = scenePos - idx;

    els.bgLayers.forEach(function (el) {
      var i = parseInt(el.getAttribute("data-scene"), 10);
      var op = 0;
      if (i === idx) op = 1 - frac;
      else if (i === idx + 1) op = frac;
      el.style.opacity = op;
    });

    var activeIdx = frac < 0.5 ? idx : idx + 1;
    els.legendScenes.forEach(function (el) {
      el.classList.toggle("is-active", parseInt(el.getAttribute("data-scene"), 10) === activeIdx);
    });
  }

  function renderTokens(records, trackW, containerH) {
    els.tokensLayer.innerHTML = "";
    if (!records.length) return;
    var path = els.path;
    var total = path.getTotalLength();
    if (!total) return;

    var buckets = {};
    records.forEach(function (rec) {
      var key = Math.round(rec.avance * 60);
      (buckets[key] = buckets[key] || []).push(rec);
    });

    var charH = Math.max(28, Math.min(56, containerH * 0.09));

    Object.keys(buckets).forEach(function (key) {
      var group = buckets[key];
      group.forEach(function (rec, i) {
        var lengthAt = Math.max(2, Math.min(total - 2, rec.avance * total));
        var pt = path.getPointAtLength(lengthAt);
        var spread = (i - (group.length - 1) / 2) * (charH * 0.9);

        var g = svgEl("g", { class: "token", transform: "translate(" + (pt.x + spread) + "," + pt.y + ")" });

        var shadow = svgEl("ellipse", { cx: 0, cy: charH * 0.06, rx: charH * 0.34, ry: charH * 0.09, fill: "rgba(0,0,0,0.4)" });
        g.appendChild(shadow);

        var spriteId = charSpriteId(rec.personaje);
        var charW = charH * (CHAR_ASPECT[spriteId] || 0.9);

        // Torch glow: how far into the dark half of the journey this character
        // already is, based on their own progress (not the viewer's scroll).
        var ownScenePos = rec.avance * (SCENES - 1);
        var torch = Math.max(0, Math.min(1, (ownScenePos - TORCH_START) / (TORCH_FULL - TORCH_START)));
        if (torch > 0.03) {
          var glowR = charH * (0.55 + 0.55 * torch);
          var glow = svgEl("circle", {
            cx: charW * 0.28, cy: -charH * 0.62, r: glowR,
            fill: "url(#torchGlow)", opacity: torch,
          });
          g.appendChild(glow);
        }

        var img = svgEl("image", {
          x: -charW / 2, y: -charH, width: charW, height: charH,
          preserveAspectRatio: "xMidYMax meet",
        });
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", "img/characters/" + spriteId + ".png");
        g.appendChild(img);

        if (torch > 0.03) {
          var flame = svgEl("circle", {
            cx: charW * 0.32, cy: -charH * 0.64, r: charH * 0.09 * (0.6 + 0.4 * torch),
            fill: "#ffdca0", opacity: Math.min(1, torch * 1.3),
          });
          g.appendChild(flame);
        }

        var badgeSize = charH * 0.46;
        if (rec.rol && /llave/i.test(rec.rol)) {
          var keyImg = svgEl("image", {
            x: charW * 0.32, y: -charH - badgeSize * 0.55, width: badgeSize, height: badgeSize,
          });
          keyImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", "img/key.png");
          g.appendChild(keyImg);
        }
        if (rec.rol && /anillo/i.test(rec.rol)) {
          var ringImg = svgEl("image", {
            x: -charW * 0.32 - badgeSize, y: -charH - badgeSize * 0.55, width: badgeSize, height: badgeSize,
          });
          ringImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", "img/ring.png");
          g.appendChild(ringImg);
        }

        var label = svgEl("text", { class: "token-name", x: 0, y: -charH - badgeSize * 0.75, "text-anchor": "middle" });
        label.textContent = rec.vendedor;
        g.appendChild(label);

        els.tokensLayer.appendChild(g);
      });
    });
  }

  function renderBoard(records) {
    var board = els.board;
    board.innerHTML = "";
    var sorted = records.slice().sort(function (a, b) { return b.avance - a.avance; });
    sorted.forEach(function (rec, i) {
      var row = document.createElement("div");
      row.className = "board-row";
      var roleImg = "";
      if (/llave/i.test(rec.rol)) roleImg = '<img class="board-role" src="img/key.png" alt="Llave">';
      else if (/anillo/i.test(rec.rol)) roleImg = '<img class="board-role" src="img/ring.png" alt="Anillo">';
      else roleImg = '<span class="board-role"></span>';
      row.innerHTML =
        '<span class="board-rank">' + (i + 1) + '</span>' +
        '<span class="board-name">' + escapeHtml(rec.vendedor) + '</span>' +
        roleImg +
        '<span class="board-pct">' + Math.round(rec.avance * 100) + '%</span>';
      board.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function computeStatus() {
    if (!CFG.startDate || !CFG.endDate) return "";
    var now = new Date();
    var start = new Date(CFG.startDate + "T00:00:00");
    var end = new Date(CFG.endDate + "T23:59:59");
    if (now < start) return "Comienza el " + start.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    if (now > end) return "Reto finalizado";
    var daysLeft = Math.ceil((end - now) / 86400000);
    return "Día a día · quedan " + daysLeft + " días";
  }

  var currentRecords = DEMO_DATA;

  function load() {
    document.getElementById("status-pill").textContent = computeStatus();
    if (!CFG.csvUrl) {
      currentRecords = DEMO_DATA;
      layout(currentRecords);
      renderBoard(currentRecords);
      document.getElementById("empty-state").style.display = "block";
      return;
    }
    fetch(CFG.csvUrl, { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(function (text) {
        var records = rowsToRecords(parseCsv(text));
        if (!records.length) throw new Error("Sin filas");
        currentRecords = records;
        layout(currentRecords);
        renderBoard(currentRecords);
        document.getElementById("empty-state").style.display = "none";
      })
      .catch(function (err) {
        console.error("No se pudo cargar el Sheet:", err);
        currentRecords = DEMO_DATA;
        layout(currentRecords);
        renderBoard(currentRecords);
        document.getElementById("empty-state").style.display = "block";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    els.mapScroll = document.getElementById("mapScroll");
    els.scrollTrack = document.getElementById("scrollTrack");
    els.bgStage = document.getElementById("bgStage");
    els.bgLayers = Array.prototype.slice.call(els.bgStage.querySelectorAll(".bg-layer"));
    els.journeySvg = document.getElementById("journeySvg");
    els.path = document.getElementById("journey-path");
    els.pathShadow = document.getElementById("journey-path-shadow");
    els.tokensLayer = document.getElementById("tokens-layer");
    els.board = document.getElementById("board-list");
    els.legendScenes = Array.prototype.slice.call(document.querySelectorAll(".legend-scene"));

    document.getElementById("map-title").textContent = CFG.title || "El Reto";
    document.getElementById("map-subtitle").textContent = CFG.subtitle || "";

    els.mapScroll.addEventListener("scroll", updateScene, { passive: true });
    window.addEventListener("resize", function () { layout(currentRecords); });

    load();
    setInterval(load, CFG.refreshMs || 300000);
  });
})();
