(function () {
  "use strict";

  var CFG = window.CHALLENGE_CONFIG || {};

  var CHAR_ALIASES = {
    mago: "char-mago",
    wizard: "char-mago",
    hobbit: "char-hobbit",
    guerrero: "char-guerrero",
    warrior: "char-guerrero",
    arquero: "char-arquero",
    archer: "char-arquero",
    enano: "char-enano",
    dwarf: "char-enano",
    explorador: "char-explorador",
    ranger: "char-explorador",
  };

  var DEMO_DATA = [
    { vendedor: "Vendedor 1", personaje: "hobbit", avance: 0.36, rol: "" },
    { vendedor: "Vendedor 2", personaje: "guerrero", avance: 0.71, rol: "Llave" },
    { vendedor: "Vendedor 3", personaje: "mago", avance: 0.14, rol: "Anillo" },
  ];

  function normalizeHeader(h) {
    return h
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += c;
      }
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

  function charSymbolId(personaje) {
    var key = (personaje || "").trim().toLowerCase();
    return CHAR_ALIASES[key] || "char-hobbit";
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function renderTokens(records) {
    var layer = document.getElementById("tokens-layer");
    var path = document.getElementById("journey-path");
    layer.innerHTML = "";
    if (!records.length || !path) return;

    var total = path.getTotalLength();
    // Group by rounded position so people at similar progress fan out instead of stacking.
    var buckets = {};
    records.forEach(function (rec) {
      var key = Math.round(rec.avance * 40);
      (buckets[key] = buckets[key] || []).push(rec);
    });

    Object.keys(buckets).forEach(function (key) {
      var group = buckets[key];
      group.forEach(function (rec, i) {
        var lengthAt = Math.max(2, Math.min(total - 2, rec.avance * total));
        var pt = path.getPointAtLength(lengthAt);
        var spread = (i - (group.length - 1) / 2) * 34;

        var g = svgEl("g", {
          class: "token",
          transform: "translate(" + (pt.x + spread) + "," + (pt.y) + ")",
        });

        var shadow = svgEl("ellipse", {
          cx: 0, cy: 64, rx: 28, ry: 8, fill: "rgba(0,0,0,0.35)",
        });
        g.appendChild(shadow);

        var use = svgEl("use", {
          href: "#" + charSymbolId(rec.personaje),
          x: -28, y: -65, width: 56, height: 98,
          color: "#241f18",
        });
        use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + charSymbolId(rec.personaje));
        g.appendChild(use);

        if (rec.rol && /llave/i.test(rec.rol)) {
          var keyBack = svgEl("circle", { cx: 35, cy: -83, r: 16, fill: "#f4efe4", opacity: "0.92" });
          g.appendChild(keyBack);
          var key1 = svgEl("use", { href: "#badge-key", x: 21, y: -97, width: 28, height: 28 });
          key1.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#badge-key");
          g.appendChild(key1);
        }
        if (rec.rol && /anillo/i.test(rec.rol)) {
          var ringBack = svgEl("circle", { cx: -35, cy: -80, r: 16, fill: "#f4efe4", opacity: "0.92" });
          g.appendChild(ringBack);
          var ring1 = svgEl("use", { href: "#badge-ring", x: -49, y: -94, width: 28, height: 28 });
          ring1.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#badge-ring");
          g.appendChild(ring1);
        }

        var label = svgEl("text", {
          class: "token-name",
          x: 0, y: -76,
          "text-anchor": "middle",
        });
        label.textContent = rec.vendedor;
        g.appendChild(label);

        layer.appendChild(g);
      });
    });
  }

  function renderBoard(records) {
    var board = document.getElementById("board-list");
    board.innerHTML = "";
    var sorted = records.slice().sort(function (a, b) { return b.avance - a.avance; });
    sorted.forEach(function (rec, i) {
      var row = document.createElement("div");
      row.className = "board-row";
      var roleIcon = /llave/i.test(rec.rol) ? "🔑" : /anillo/i.test(rec.rol) ? "💍" : "";
      row.innerHTML =
        '<span class="board-rank">' + (i + 1) + '</span>' +
        '<span class="board-name">' + escapeHtml(rec.vendedor) + '</span>' +
        '<span class="board-role">' + roleIcon + '</span>' +
        '<span class="board-pct">' + Math.round(rec.avance * 100) + '%</span>';
      board.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setStatus(text) {
    var el = document.getElementById("status-pill");
    if (el) el.textContent = text;
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

  function showEmptyState() {
    var el = document.getElementById("empty-state");
    if (el) el.style.display = "block";
  }

  function load() {
    setStatus(computeStatus());
    if (!CFG.csvUrl) {
      renderTokens(DEMO_DATA);
      renderBoard(DEMO_DATA);
      showEmptyState();
      return;
    }
    fetch(CFG.csvUrl, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var records = rowsToRecords(parseCsv(text));
        if (!records.length) throw new Error("Sin filas");
        renderTokens(records);
        renderBoard(records);
      })
      .catch(function (err) {
        console.error("No se pudo cargar el Sheet:", err);
        renderTokens(DEMO_DATA);
        renderBoard(DEMO_DATA);
        showEmptyState();
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("map-title").textContent = CFG.title || "El Reto";
    document.getElementById("map-subtitle").textContent = CFG.subtitle || "";
    load();
    setInterval(load, CFG.refreshMs || 300000);
  });
})();
