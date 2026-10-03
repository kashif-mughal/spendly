/* ============================================================================
   Charts - dependency-free SVG charts (bar, grouped bar, line, donut, meter).
   Palette: the data-viz reference categorical order, validated with the skill's
   six checks against this app's own surfaces (#ffffff light / #19212a dark).
     - income vs expense  -> slot 1 blue + slot 8 red  (CVD dE 21.6 / 19.2)
     - budget vs actual   -> slot 1 blue + slot 2 orange
     - single series      -> slot 1 blue
   Every chart on a page is accompanied by the same figures in a table, which
   is also the relief for the light-mode sub-3:1 slots in the donut.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Util;
  var NS = 'http://www.w3.org/2000/svg';

  var PALETTE = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    dark:  ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
  };
  /* Status colours are fixed in both modes and always ship with a text label. */
  var STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

  function mode() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function slot(i) { var p = PALETTE[mode()]; return p[i % p.length]; }

  var ROLES = {
    income:   function () { return slot(0); },
    expense:  function () { return slot(7); },
    budget:   function () { return slot(0); },
    actual:   function () { return slot(1); },
    single:   function () { return slot(0); },
    positive: function () { return slot(0); },
    negative: function () { return slot(7); }
  };

  function color(role, index) {
    if (typeof role === 'number') return slot(role);
    if (ROLES[role]) return ROLES[role]();
    return slot(index || 0);
  }

  /* ---------------- svg helpers ---------------- */

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  function text(x, y, str, cls, anchor) {
    var t = svgEl('text', { x: x, y: y, class: cls || 'tick-label', 'text-anchor': anchor || 'middle' });
    t.textContent = str;
    return t;
  }

  /** Rounded only on the far end, so the bar stays anchored to its baseline. */
  function barPath(x, y, w, h, r, dir) {
    r = Math.max(0, Math.min(r, dir === 'h' ? w : h, (dir === 'h' ? h : w) / 2));
    if (r <= 0.5) return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
    if (dir === 'h') {
      return 'M' + x + ' ' + y +
        'h' + (w - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
        'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r +
        'h' + (-(w - r)) + 'Z';
    }
    return 'M' + x + ' ' + (y + h) +
      'v' + (-(h - r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) +
      'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
      'v' + (h - r) + 'Z';
  }

  /** A downward bar: flat at the baseline on top, rounded at the bottom. */
  function invertedBarPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, h, w / 2));
    if (r <= 0.5) return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
    return 'M' + x + ' ' + y +
      'h' + w +
      'v' + (h - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r +
      'h' + (-(w - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + (-r) +
      'Z';
  }

  /** "Nice" axis maximum so gridlines land on readable numbers. */
  function niceMax(value) {
    if (!isFinite(value) || value <= 0) return 1;
    var exp = Math.floor(Math.log(value) / Math.LN10);
    var base = Math.pow(10, exp);
    var frac = value / base;
    var step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
    return step * base;
  }

  function ticks(min, max, count) {
    var out = [];
    for (var i = 0; i <= count; i++) out.push(min + (max - min) * (i / count));
    return out;
  }

  /* ---------------- tooltip ---------------- */

  function attachTooltip(wrap) {
    var tip = wrap.querySelector('.chart-tip');
    if (!tip) {
      tip = U.el('div', { class: 'chart-tip', hidden: true });
      wrap.appendChild(tip);
    }
    return {
      show: function (evt, html) {
        tip.innerHTML = html;
        tip.hidden = false;
        var box = wrap.getBoundingClientRect();
        var x = evt.clientX - box.left;
        var y = evt.clientY - box.top;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.max(4, Math.min(box.width - w - 4, x - w / 2)) + 'px';
        tip.style.top = Math.max(4, y - h - 12) + 'px';
      },
      hide: function () { tip.hidden = true; }
    };
  }

  function hoverable(node, tip, html) {
    node.addEventListener('mousemove', function (e) { tip.show(e, html); });
    node.addEventListener('mouseleave', tip.hide);
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', function (e) {
      var r = node.getBoundingClientRect();
      tip.show({ clientX: r.left + r.width / 2, clientY: r.top }, html);
    });
    node.addEventListener('blur', tip.hide);
  }

  function mount(container) {
    var host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) return null;
    host.innerHTML = '';
    host.classList.add('chart-wrap');
    return host;
  }

  function emptyState(host, message) {
    host.appendChild(U.el('div', { class: 'empty', text: message || 'No data for this period.' }));
  }

  function legend(host, items) {
    var box = U.el('div', { class: 'chart-legend' });
    items.forEach(function (it) {
      var row = U.el('span', null, [
        U.el('span', { class: 'swatch', style: 'background:' + it.color }),
        it.label
      ]);
      box.appendChild(row);
    });
    host.appendChild(box);
  }

  /* ---------------- vertical / grouped bars ---------------- */

  /**
   * opts: { categories:[], series:[{name, role, values:[]}], height, format, valueLabels }
   * One shared y axis - never two scales.
   */
  function bars(container, opts) {
    var host = mount(container);
    if (!host) return;
    var cats = opts.categories || [];
    var series = (opts.series || []).map(function (s, i) {
      return { name: s.name, values: s.values || [], color: s.color || color(s.role, i) };
    });
    var any = series.some(function (s) { return s.values.some(function (v) { return U.num(v) !== 0; }); });
    if (!cats.length || !any) return emptyState(host, opts.emptyText);

    var fmt = opts.format || U.moneyShort;
    var padT = 14, padB = 30, padL = 54, padR = 10;
    var W = Math.max(320, host.clientWidth || 640);

    // Long category names collide once the band gets narrow - tilt them instead,
    // and give the plot the extra bottom room the tilted text needs.
    var band = (W - padL - padR) / cats.length;
    var longest = cats.reduce(function (a, c) { return Math.max(a, String(c).length); }, 0);
    var tilt = longest * 6.4 > band;
    if (tilt) padB = Math.min(104, 26 + longest * 4.6);

    var H = (opts.height || 260) + (tilt ? padB - 30 : 0);

    var maxVal = 0, minVal = 0;
    series.forEach(function (s) {
      s.values.forEach(function (v) { maxVal = Math.max(maxVal, U.num(v)); minVal = Math.min(minVal, U.num(v)); });
    });
    var top = niceMax(maxVal);
    var bottom = minVal < 0 ? -niceMax(-minVal) : 0;
    if (top === 0 && bottom === 0) top = 1;

    var plotW = W - padL - padR, plotH = H - padT - padB;
    var yOf = function (v) { return padT + plotH * (1 - (U.num(v) - bottom) / (top - bottom)); };

    var svg = svgEl('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img' });
    svg.setAttribute('aria-label', opts.title || 'Bar chart');
    var tip = attachTooltip(host);

    ticks(bottom, top, 4).forEach(function (v) {
      var y = yOf(v);
      svg.appendChild(svgEl('line', { class: 'grid-line', x1: padL, x2: W - padR, y1: y, y2: y }));
      svg.appendChild(text(padL - 7, y + 3.5, fmt(v), 'tick-label', 'end'));
    });
    svg.appendChild(svgEl('line', { class: 'axis-line', x1: padL, x2: W - padR, y1: yOf(0), y2: yOf(0) }));

    var GAP = 2;                                     // 2px surface gap between adjacent bars
    var groupW = Math.min(band * 0.68, 64);
    var barW = Math.max(3, (groupW - GAP * (series.length - 1)) / series.length);

    cats.forEach(function (cat, ci) {
      var cx = padL + band * ci + band / 2;
      var startX = cx - groupW / 2;
      series.forEach(function (s, si) {
        var v = U.num(s.values[ci]);
        var x = startX + si * (barW + GAP);
        var y0 = yOf(0), y1 = yOf(v);
        var y = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
        // Rounded end always at the far end: top for positives, bottom for negatives.
        var node = svgEl('path', { class: 'bar', fill: s.color, role: 'graphics-symbol' });
        node.setAttribute('d', v < 0
          ? invertedBarPath(x, y, barW, h, 4)
          : barPath(x, y, barW, h, 4, 'v'));
        hoverable(node, tip, '<strong>' + U.esc(cat) + '</strong><br>' +
          U.esc(s.name) + ': ' + U.money(v));
        svg.appendChild(node);
      });

      var label = text(cx, tilt ? yOf(bottom) + 14 : H - 10, cat, 'tick-label', tilt ? 'end' : 'middle');
      if (tilt) label.setAttribute('transform', 'rotate(-38 ' + cx + ' ' + (yOf(bottom) + 14) + ')');
      svg.appendChild(label);
    });

    // Selective direct labels: only when a single series and few bars.
    if (opts.valueLabels !== false && series.length === 1 && cats.length <= 14) {
      cats.forEach(function (cat, ci) {
        var v = U.num(series[0].values[ci]);
        if (!v) return;
        var cx = padL + band * ci + band / 2;
        svg.appendChild(text(cx, v < 0 ? yOf(v) + 13 : yOf(v) - 5, fmt(v), 'value-label'));
      });
    }

    host.appendChild(svg);
    if (series.length > 1) legend(host, series.map(function (s) { return { label: s.name, color: s.color }; }));
  }

  /* ---------------- horizontal bars (ranked categories) ---------------- */

  /** opts: { rows:[{label, value, color?}], height?, format?, role? } */
  function hbars(container, opts) {
    var host = mount(container);
    if (!host) return;
    var rows = (opts.rows || []);
    if (!opts.keepZeros) rows = rows.filter(function (r) { return U.num(r.value) !== 0; });
    if (!rows.length || !rows.some(function (r) { return U.num(r.value) !== 0; })) {
      return emptyState(host, opts.emptyText);
    }

    var fmt = opts.format || U.moneyShort;
    var rowH = opts.rowHeight || 26;
    var padT = 6, padB = 6, padL = opts.labelWidth || 136, padR = 62;
    var W = Math.max(320, host.clientWidth || 640);
    var H = padT + padB + rows.length * rowH;

    var maxVal = 0, minVal = 0;
    rows.forEach(function (r) { maxVal = Math.max(maxVal, U.num(r.value)); minVal = Math.min(minVal, U.num(r.value)); });
    var top = niceMax(maxVal);
    var bottom = minVal < 0 ? -niceMax(-minVal) : 0;
    if (top === bottom) top = bottom + 1;

    var plotW = W - padL - padR;
    var xOf = function (v) { return padL + plotW * ((U.num(v) - bottom) / (top - bottom)); };

    var svg = svgEl('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img' });
    svg.setAttribute('aria-label', opts.title || 'Ranked bar chart');
    var tip = attachTooltip(host);
    var zero = xOf(0);
    svg.appendChild(svgEl('line', { class: 'axis-line', x1: zero, x2: zero, y1: padT, y2: H - padB }));

    rows.forEach(function (r, i) {
      var v = U.num(r.value);
      var y = padT + i * rowH + 4;
      var h = rowH - 9;
      var x = v < 0 ? xOf(v) : zero;
      var w = Math.max(2, Math.abs(xOf(v) - zero));
      var fill = r.color || (opts.role ? color(opts.role) : (v < 0 ? color('negative') : color('single')));
      var node = svgEl('path', { class: 'bar', d: barPath(x, y, w, h, 4, 'h'), fill: fill });
      hoverable(node, tip, '<strong>' + U.esc(r.label) + '</strong><br>' + U.money(v) +
        (r.note ? '<br>' + U.esc(r.note) : ''));
      svg.appendChild(node);

      svg.appendChild(text(padL - 8, y + h / 2 + 3.5, r.label, 'tick-label', 'end'));
      svg.appendChild(text(Math.min(W - 4, x + w + 6), y + h / 2 + 3.5, fmt(v), 'value-label', 'start'));
    });

    host.appendChild(svg);
  }

  /* ---------------- line ---------------- */

  /** opts: { categories:[], series:[{name, role, values:[]}], height, format } */
  function line(container, opts) {
    var host = mount(container);
    if (!host) return;
    var cats = opts.categories || [];
    var series = (opts.series || []).map(function (s, i) {
      return { name: s.name, values: s.values || [], color: s.color || color(s.role, i) };
    });
    var any = series.some(function (s) { return s.values.some(function (v) { return U.num(v) !== 0; }); });
    if (!cats.length || !any) return emptyState(host, opts.emptyText);

    var fmt = opts.format || U.moneyShort;
    var H = opts.height || 240;
    var padT = 14, padB = 30, padL = 58, padR = 14;
    var W = Math.max(320, host.clientWidth || 640);

    var maxVal = -Infinity, minVal = Infinity;
    series.forEach(function (s) {
      s.values.forEach(function (v) { maxVal = Math.max(maxVal, U.num(v)); minVal = Math.min(minVal, U.num(v)); });
    });
    if (minVal > 0) minVal = 0;
    var top = niceMax(maxVal <= 0 ? 1 : maxVal);
    var bottom = minVal < 0 ? -niceMax(-minVal) : 0;
    if (top === bottom) top = bottom + 1;

    var plotW = W - padL - padR, plotH = H - padT - padB;
    var xOf = function (i) { return padL + (cats.length === 1 ? plotW / 2 : plotW * (i / (cats.length - 1))); };
    var yOf = function (v) { return padT + plotH * (1 - (U.num(v) - bottom) / (top - bottom)); };

    var svg = svgEl('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img' });
    svg.setAttribute('aria-label', opts.title || 'Line chart');
    var tip = attachTooltip(host);

    ticks(bottom, top, 4).forEach(function (v) {
      var y = yOf(v);
      svg.appendChild(svgEl('line', { class: 'grid-line', x1: padL, x2: W - padR, y1: y, y2: y }));
      svg.appendChild(text(padL - 7, y + 3.5, fmt(v), 'tick-label', 'end'));
    });
    svg.appendChild(svgEl('line', { class: 'axis-line', x1: padL, x2: W - padR, y1: yOf(0), y2: yOf(0) }));

    cats.forEach(function (c, i) { svg.appendChild(text(xOf(i), H - 10, c, 'tick-label')); });

    series.forEach(function (s) {
      var d = s.values.map(function (v, i) { return (i ? 'L' : 'M') + xOf(i) + ' ' + yOf(v); }).join(' ');
      svg.appendChild(svgEl('path', { class: 'series-line', d: d, stroke: s.color }));
      s.values.forEach(function (v, i) {
        var dot = svgEl('circle', { cx: xOf(i), cy: yOf(v), r: 4.5, fill: s.color, stroke: 'var(--bg-elevated)', 'stroke-width': 2 });
        hoverable(dot, tip, '<strong>' + U.esc(cats[i]) + '</strong><br>' + U.esc(s.name) + ': ' + U.money(v));
        svg.appendChild(dot);
      });
    });

    host.appendChild(svg);
    if (series.length > 1) legend(host, series.map(function (s) { return { label: s.name, color: s.color }; }));
  }

  /* ---------------- donut ---------------- */

  /** opts: { rows:[{label, value}], size, maxSlices, centreLabel, centreValue } */
  function donut(container, opts) {
    var host = mount(container);
    if (!host) return;
    var rows = (opts.rows || []).filter(function (r) { return U.num(r.value) > 0; });
    if (!rows.length) return emptyState(host, opts.emptyText);

    rows = rows.slice().sort(function (a, b) { return b.value - a.value; });
    var cap = opts.maxSlices || 7;
    if (rows.length > cap) {
      var rest = rows.slice(cap);
      var other = rest.reduce(function (a, r) { return a + U.num(r.value); }, 0);
      rows = rows.slice(0, cap).concat([{ label: 'Other (' + rest.length + ')', value: other }]);
    }

    var total = rows.reduce(function (a, r) { return a + U.num(r.value); }, 0);
    var size = opts.size || 210;
    var cx = size / 2, cy = size / 2;
    var rOuter = size / 2 - 4, rInner = rOuter * 0.6;

    var svg = svgEl('svg', { class: 'chart donut', viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img' });
    svg.setAttribute('aria-label', opts.title || 'Share by category');
    var tip = attachTooltip(host);

    var angle = -Math.PI / 2;
    var GAP = 2 / rOuter;                    // 2px surface gap between slices
    rows.forEach(function (r, i) {
      var share = U.num(r.value) / total;
      var sweep = share * Math.PI * 2;
      var a0 = angle + (rows.length > 1 ? GAP / 2 : 0);
      var a1 = angle + sweep - (rows.length > 1 ? GAP / 2 : 0);
      angle += sweep;
      if (a1 <= a0) return;

      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var d = [
        'M', cx + rOuter * Math.cos(a0), cy + rOuter * Math.sin(a0),
        'A', rOuter, rOuter, 0, large, 1, cx + rOuter * Math.cos(a1), cy + rOuter * Math.sin(a1),
        'L', cx + rInner * Math.cos(a1), cy + rInner * Math.sin(a1),
        'A', rInner, rInner, 0, large, 0, cx + rInner * Math.cos(a0), cy + rInner * Math.sin(a0),
        'Z'
      ].join(' ');
      var node = svgEl('path', { d: d, fill: slot(i), class: 'bar' });
      hoverable(node, tip, '<strong>' + U.esc(r.label) + '</strong><br>' + U.money(r.value) + ' · ' + U.percent(share));
      svg.appendChild(node);
    });

    if (opts.centreValue) {
      svg.appendChild(text(cx, cy - 2, opts.centreValue, 'donut-centre-value'));
      svg.appendChild(text(cx, cy + 15, opts.centreLabel || '', 'tick-label'));
    }

    var wrap = U.el('div', { class: 'donut-wrap' });
    wrap.appendChild(svg);
    var list = U.el('div', { class: 'donut-legend' });
    rows.forEach(function (r, i) {
      list.appendChild(U.el('div', { class: 'donut-legend-row' }, [
        U.el('span', { class: 'swatch', style: 'background:' + slot(i) }),
        U.el('span', { class: 'dl-label', text: r.label }),
        U.el('span', { class: 'dl-value', text: U.money(r.value) }),
        U.el('span', { class: 'dl-share', text: U.percent(U.num(r.value) / total, 0) })
      ]));
    });
    wrap.appendChild(list);
    host.appendChild(wrap);
  }

  /* ---------------- budget meter ---------------- */

  /** A single-figure progress meter; status colour always paired with a label. */
  function meter(used) {
    var pct = Math.max(0, Math.min(1, U.num(used)));
    var cls = used > 1 ? 'over' : used >= 0.9 ? 'warn' : '';
    var bar = U.el('div', { class: 'meter ' + cls });
    bar.appendChild(U.el('span', { style: 'width:' + (pct * 100).toFixed(1) + '%' }));
    return bar;
  }

  global.Charts = {
    bars: bars, hbars: hbars, line: line, donut: donut, meter: meter,
    color: color, slot: slot, STATUS: STATUS, palette: function () { return PALETTE[mode()]; }
  };
}(window));
