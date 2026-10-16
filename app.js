(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1 · Spiral explorer
     Random-intercept cross-lagged panel model (RI-CLPM) coefficients
     from Figure 8, Panel A of the manuscript (annual series 2017–2025,
     pooled-standardized, year means removed). Within-person paths only.
     ------------------------------------------------------------------ */
  var PAIRS = {
    se: {
      resource: "Self-esteem",
      resourceShort: "self-esteem",
      strain: "Distress (MHI-5)",
      strainShort: "distress",
      arResource: 0.20,
      arStrain: 0.22,
      loss: -0.14,   // strain(t-1) -> resource(t)
      gain: -0.08,   // resource(t-1) -> strain(t)
      n: "7,513",
      asym: "confirmed",
      asymText: "Loss-primacy asymmetry confirmed by likelihood-ratio test, p < .001.",
      note: "Rosenberg self-esteem and MHI-5 mental-health distress, annual 2017\u20132025, <em>n</em> = 7,513 persons. Loss-primacy asymmetry confirmed by likelihood-ratio test (<em>p</em> &lt; .001)."
    },
    opt: {
      resource: "Optimism",
      resourceShort: "optimism",
      strain: "Negative affect",
      strainShort: "negative affect",
      arResource: 0.13,
      arStrain: 0.14,
      loss: -0.06,
      gain: -0.05,
      n: "7,470",
      asym: "not supported",
      asymText: "Asymmetry not supported by likelihood-ratio test, p = .335.",
      note: "LOT-R optimism and PANAS negative affect, annual 2017\u20132025, <em>n</em> = 7,470 persons. Reciprocal paths present; asymmetry not supported (likelihood-ratio <em>p</em> = .335)."
    }
  };
  var YEARS = 6;

  function impulse(p, shock) {
    // Returns {loss: [...], gain: [...]} absolute displacements, years 0..YEARS.
    var lossRes = [0], lossStr = [shock];
    var gainRes = [shock], gainStr = [0];
    for (var t = 1; t <= YEARS; t++) {
      lossRes.push(p.arResource * lossRes[t - 1] + p.loss * lossStr[t - 1]);
      lossStr.push(p.gain * lossRes[t - 1] + p.arStrain * lossStr[t - 1]);
      gainRes.push(p.arResource * gainRes[t - 1] + p.loss * gainStr[t - 1]);
      gainStr.push(p.gain * gainRes[t - 1] + p.arStrain * gainStr[t - 1]);
    }
    return {
      loss: lossRes.map(Math.abs),  // resource displaced after a rise in strain
      gain: gainStr.map(Math.abs)   // strain displaced after a gain in resource
    };
  }

  var svg = document.getElementById("spiral-chart");
  var NS = "http://www.w3.org/2000/svg";
  var W = 560, H = 330, L = 56, R = 16, T = 18, B = 44;

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d); }

  function drawChart(p, shock, series) {
    // Clear everything except <title>/<desc>
    Array.prototype.slice.call(svg.childNodes).forEach(function (n) {
      if (n.nodeName !== "title" && n.nodeName !== "desc") svg.removeChild(n);
    });
    var maxY = Math.max.apply(null, series.loss.concat(series.gain)) * 1.25;
    maxY = Math.max(maxY, 0.05);
    var x = function (t) { return L + (W - L - R) * (t / YEARS); };
    var y = function (v) { return T + (H - T - B) * (1 - v / maxY); };

    // Gridlines + y labels (5 ticks)
    var ticks = 5;
    for (var i = 0; i <= ticks; i++) {
      var v = maxY * i / ticks;
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), "class": i === 0 ? "axis" : "grid" }));
      svg.appendChild(el("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end" }, fmt(v)));
    }
    // x ticks
    for (var t = 0; t <= YEARS; t++) {
      svg.appendChild(el("line", { x1: x(t), x2: x(t), y1: y(0), y2: y(0) + 5, "class": "axis" }));
      svg.appendChild(el("text", { x: x(t), y: y(0) + 18, "text-anchor": "middle" }, String(t)));
    }
    svg.appendChild(el("line", { x1: L, x2: L, y1: T, y2: y(0), "class": "axis" }));
    svg.appendChild(el("text", { x: (L + W - R) / 2, y: H - 8, "text-anchor": "middle", "class": "lbl" }, "Years since the one-time change"));
    var yl = el("text", { x: 14, y: (T + y(0)) / 2, "text-anchor": "middle", "class": "lbl", transform: "rotate(-90 14 " + ((T + y(0)) / 2) + ")" }, "Displacement (SD units)");
    svg.appendChild(yl);

    // Shaded asymmetry area between curves (years 0..YEARS)
    var upper = series.loss.map(function (v, t) { return x(t) + "," + y(v); });
    var lower = series.gain.map(function (v, t) { return x(t) + "," + y(v); }).reverse();
    svg.appendChild(el("polygon", { points: upper.concat(lower).join(" "), "class": "asym" }));

    // Curves
    svg.appendChild(el("polyline", { points: upper.join(" "), "class": "loss" }));
    svg.appendChild(el("polyline", { points: series.gain.map(function (v, t) { return x(t) + "," + y(v); }).join(" "), "class": "gain" }));
    series.loss.forEach(function (v, t) { svg.appendChild(el("circle", { cx: x(t), cy: y(v), r: 3.5, "class": "loss-dot" })); });
    series.gain.forEach(function (v, t) { svg.appendChild(el("circle", { cx: x(t), cy: y(v), r: 3.5, "class": "gain-dot" })); });

    // Legend
    var lx = L + 14, ly = T + 10;
    svg.appendChild(el("line", { x1: lx, x2: lx + 26, y1: ly, y2: ly, "class": "loss" }));
    svg.appendChild(el("text", { x: lx + 32, y: ly + 4 }, p.resource + " after a rise in " + p.strainShort + " (loss path)"));
    svg.appendChild(el("line", { x1: lx, x2: lx + 26, y1: ly + 18, y2: ly + 18, "class": "gain" }));
    svg.appendChild(el("text", { x: lx + 32, y: ly + 22 }, p.strain + " after a gain in " + p.resourceShort + " (gain path)"));
  }

  var pairKey = "se";
  var shockEl = document.getElementById("shock");
  var shockOut = document.getElementById("shock-out");

  function sum(arr) { return arr.slice(1).reduce(function (a, b) { return a + b; }, 0); }

  function renderSpiral() {
    var p = PAIRS[pairKey];
    var shock = parseFloat(shockEl.value);
    shockOut.textContent = fmt(shock) + " SD";
    var s = impulse(p, shock);
    drawChart(p, shock, s);

    var lossPeak = s.loss[1], gainPeak = s.gain[1];
    var lossCum = sum(s.loss), gainCum = sum(s.gain);
    var r1 = lossPeak / gainPeak;

    document.getElementById("out-loss-peak").textContent = "\u2212" + fmt(lossPeak) + " SD";
    document.getElementById("out-loss-label").textContent = p.resource + " one year after a " + fmt(shock) + "-SD rise in " + p.strainShort;
    document.getElementById("out-loss-cum").textContent = "Cumulative displacement over six years: " + fmt(lossCum) + " SD-years";
    document.getElementById("out-gain-peak").textContent = "\u2212" + fmt(gainPeak) + " SD";
    document.getElementById("out-gain-label").textContent = p.strain + " one year after a " + fmt(shock) + "-SD gain in " + p.resourceShort;
    document.getElementById("out-gain-cum").textContent = "Cumulative displacement over six years: " + fmt(gainCum) + " SD-years";

    var kicker = document.getElementById("kicker");
    var km = document.getElementById("kicker-main");
    var ks = document.getElementById("kicker-sub");
    if (p.asym === "confirmed") {
      kicker.className = "kicker-bar";
      km.textContent = "The loss path is " + fmt(r1) + "\u00d7 the gain path \u2014 at one year and in every year after.";
      ks.textContent = p.asymText + " A one-time rise in distress displaces self-esteem more than an equal gain in self-esteem displaces distress (" + fmt(lossCum) + " vs. " + fmt(gainCum) + " SD-years over six years).";
    } else {
      kicker.className = "kicker-bar muted";
      km.textContent = "Both paths are present; the gap between them is not reliable.";
      ks.textContent = p.asymText + " The curves differ by about " + fmt(r1) + "\u00d7 (" + fmt(lossCum) + " vs. " + fmt(gainCum) + " SD-years over six years), but the paper does not treat this pair as evidence of loss primacy.";
    }
    document.getElementById("chart-cap").innerHTML =
      "Model-implied aftermath of a one-time " + fmt(shock) + "-<em>SD</em> within-person change, " +
      "computed from the published RI-CLPM paths (autoregressions " + fmt(p.arResource) + " and " + fmt(p.arStrain) +
      "; cross-lags " + fmt(p.loss) + " and " + fmt(p.gain) + "). Shaded region: the difference between loss and gain paths. " +
      "Compare Figure 8, Panel B, on <a href=\"evidence.html#e4\">the evidence page</a>.";
    document.getElementById("pair-note").innerHTML = p.note;

    var tb = document.getElementById("coef-table");
    tb.innerHTML = "";
    [
      [p.resource + " (t\u22121) \u2192 " + p.resource + " (t)", fmt(p.arResource)],
      [p.strain + " (t\u22121) \u2192 " + p.strain + " (t)", fmt(p.arStrain)],
      [p.strain + " (t\u22121) \u2192 " + p.resource + " (t)", fmt(p.loss), "loss"],
      [p.resource + " (t\u22121) \u2192 " + p.strain + " (t)", fmt(p.gain), "gain"]
    ].forEach(function (row) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"); td1.textContent = row[0]; td1.style.padding = "3px 14px 3px 0"; td1.style.color = "#5a6572";
      var td2 = document.createElement("td"); td2.textContent = row[1]; td2.style.fontWeight = "700"; td2.style.fontVariantNumeric = "tabular-nums";
      if (row[2] === "loss") td2.style.color = "#c0392b";
      if (row[2] === "gain") td2.style.color = "#2e6f9e";
      tr.appendChild(td1); tr.appendChild(td2); tb.appendChild(tr);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".seg button"), function (b) {
    b.addEventListener("click", function () {
      pairKey = b.getAttribute("data-pair");
      Array.prototype.forEach.call(document.querySelectorAll(".seg button"), function (o) {
        o.setAttribute("aria-pressed", o === b ? "true" : "false");
      });
      renderSpiral();
    });
  });
  shockEl.addEventListener("input", renderSpiral);
  renderSpiral();

  /* ------------------------------------------------------------------
     2 · Which way out of distress? (Table 4 of the manuscript)
     Primary = pooled-leaver interval odds ratios per SD, Distressed ->
     Resilient versus Distressed -> Reserved, modal assignment.
     ------------------------------------------------------------------ */
  var RESOURCES = [
    { key: "opt", name: "Optimism (LOT-R)", short: "optimism", or: 1.78, p: "< .001", n: 674, verdict: "Supported",
      sens: "Soft-weighted OR 1.75; pseudo-class median 1.70 [1.48, 1.96]; Firth 1.78; sequence-based latent OR 2.40 [1.88, 3.13].",
      note: "Annual multi-item scale measured at the origin year of the exit." },
    { key: "se", name: "Self-esteem (Rosenberg)", short: "self-esteem", or: 1.62, p: "< .001", n: 797, verdict: "Supported",
      sens: "Soft-weighted OR 1.77; pseudo-class median 1.68 [1.47, 1.93]; Firth 1.61; sequence-based latent OR 3.72 [2.62, 5.55].",
      note: "Annual multi-item scale measured at the origin year of the exit." },
    { key: "wm", name: "Work meaning (2023 module)", short: "work meaning", or: 1.77, p: "< .001", n: 323, verdict: "Supported",
      sens: "Soft-weighted OR 1.63; pseudo-class median 1.64 [1.33, 2.02]; Firth 1.76; sequence-based latent OR 1.68 [1.14, 2.63].",
      note: "Measured once, in 2023, while leavers are pooled across intervals; the estimate is order-sensitive and is not synchronized prospective prediction." },
    { key: "rel", name: "Workplace relatedness (support item)", short: "workplace support", or: 1.34, p: ".012", n: 332, verdict: "Frame-sensitive",
      sens: "Soft-weighted OR 1.14 (p = .227) and pseudo-class interval [0.99, 1.36] cross 1; sequence-based latent OR 1.64 [1.26, 2.15] is reliable on a trait-scaled person mean.",
      note: "Single annual item (\u201csufficient support in difficult situations\u201d), not a multi-item need-satisfaction scale." },
    { key: "pc", name: "PsyCap (CPC-12, 2019)", short: "PsyCap", or: 1.41, p: ".29", n: 44, verdict: "Not supported",
      sens: "Firth OR 1.36 (p = .33); soft-weighted 2.51 and pseudo-class 2.05 [1.20, 5.19] pass numerically but the sequence-based estimate is null (1.61 [0.59, 4.14], p = .32).",
      note: "Health-framed, domain-general CPC-12 fielded in an SES-stratified subsample; only 44 usable Distressed leavers." }
  ];

  var resSel = document.getElementById("res");
  RESOURCES.forEach(function (r) {
    var o = document.createElement("option");
    o.value = r.key; o.textContent = r.name + " \u2014 OR " + fmt(r.or) + " per SD";
    resSel.appendChild(o);
  });
  var zEl = document.getElementById("z");
  var zOut = document.getElementById("z-out");

  function renderOdds() {
    var r = RESOURCES.filter(function (x) { return x.key === resSel.value; })[0];
    var z = parseFloat(zEl.value);
    zOut.textContent = (z > 0 ? "+" : z < 0 ? "\u2212" : "") + fmt(Math.abs(z), 1) + " SD";
    var mult = Math.pow(r.or, z);
    var dir = z > 0 ? "above" : "below";
    var flag = r.verdict === "Supported" ? "" :
      " <span class=\"flag warn\">" + r.verdict + "</span>";
    var s;
    if (z === 0) {
      s = "An employee at the average of other Distressed leavers in <em>" + r.short + "</em> has the reference odds of recovering to Resilient rather than withdrawing to Reserved." + flag;
    } else if (r.verdict === "Not supported") {
      s = "An employee " + fmt(Math.abs(z), 1) + " SD " + dir + " the average Distressed leaver in <em>" + r.short +
        "</em> was estimated at <strong>" + fmt(mult) + "\u00d7</strong> the odds of recovery over disengagement, but with 44 leavers the estimate is not distinguishable from no association (p = " + r.p + ")." + flag;
    } else {
      s = "An employee " + fmt(Math.abs(z), 1) + " SD " + dir + " the average Distressed leaver in <em>" + r.short +
        "</em> had <strong>" + fmt(mult) + "\u00d7</strong> the odds of recovering to Resilient rather than withdrawing to Reserved." + flag;
    }
    document.getElementById("odds-sentence").innerHTML = s;
    document.getElementById("odds-mult").textContent = fmt(mult) + "\u00d7";
    document.getElementById("odds-sub").textContent = "OR = " + fmt(r.or) + " per SD, p " + (r.p.charAt(0) === "<" ? r.p : "= " + r.p) + ", n = " + r.n + " unique Distressed leavers. " + r.sens;
    document.getElementById("res-note").textContent = r.note;
  }
  resSel.addEventListener("change", renderOdds);
  zEl.addEventListener("input", renderOdds);
  renderOdds();
})();
