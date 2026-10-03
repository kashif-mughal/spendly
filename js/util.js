/* Shared helpers: formatting, dates, DOM building, downloads. */
(function (global) {
  'use strict';

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- numbers ---------- */

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined || v === '') return 0;
    var n = parseFloat(String(v).replace(/[,\s]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function round2(v) { return Math.round(num(v) * 100) / 100; }

  var groupFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var group2Fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** Currency with thousands separators; decimals only when they carry meaning. */
  function money(v, opts) {
    opts = opts || {};
    var n = round2(v);
    var abs = Math.abs(n);
    var body = (abs % 1 === 0) ? groupFmt.format(abs) : group2Fmt.format(abs);
    var sym = opts.noSymbol ? '' : (Store.settings().currencySymbol || 'Rs') + ' ';
    var sign = n < 0 ? '-' : (opts.signed && n > 0 ? '+' : '');
    return sign + sym + body;
  }

  /** Compact form for chart axes: 1.2k / 3.4M. */
  function moneyShort(v) {
    var n = num(v), abs = Math.abs(n), sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'k';
    return sign + groupFmt.format(abs);
  }

  function percent(v, digits) {
    var n = num(v) * 100;
    if (!isFinite(n)) n = 0;
    return n.toFixed(digits === undefined ? 1 : digits) + '%';
  }

  function safeDiv(a, b) { return num(b) === 0 ? 0 : num(a) / num(b); }

  /* ---------- dates (all stored as YYYY-MM-DD strings) ---------- */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isoDate(v) {
    if (!v) return '';
    if (typeof v === 'string') {
      var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[0];
      var d = new Date(v);
      if (!isNaN(d)) return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      return '';
    }
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
    return '';
  }

  function yearOf(iso)  { return parseInt(String(iso).slice(0, 4), 10) || 0; }
  function monthOf(iso) { return parseInt(String(iso).slice(5, 7), 10) || 0; }  // 1-12
  function dayOf(iso)   { return parseInt(String(iso).slice(8, 10), 10) || 0; }

  function monthStart(year, month) { return year + '-' + pad2(month) + '-01'; }

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

  function monthEnd(year, month) { return year + '-' + pad2(month) + '-' + pad2(daysInMonth(year, month)); }

  /** "01 Oct 2026" */
  function prettyDate(iso) {
    if (!iso) return '';
    var y = yearOf(iso), m = monthOf(iso), d = dayOf(iso);
    if (!y || !m) return iso;
    return pad2(d) + ' ' + MONTH_SHORT[m - 1] + ' ' + y;
  }

  /** "Oct 2026" */
  function prettyMonth(year, month) { return MONTH_SHORT[month - 1] + ' ' + year; }

  function inRange(iso, from, to) {
    if (!iso) return false;
    if (from && iso < from) return false;
    if (to && iso > to) return false;
    return true;
  }

  function addMonths(year, month, delta) {
    var idx = (year * 12 + (month - 1)) + delta;
    return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
  }

  /* ---------- strings ---------- */

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Case/space-insensitive comparison used when matching names across sheets. */
  function sameName(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function sortBy(arr, key, dir) {
    var sign = dir === 'desc' ? -1 : 1;
    return arr.slice().sort(function (a, b) {
      var x = typeof key === 'function' ? key(a) : a[key];
      var y = typeof key === 'function' ? key(b) : b[key];
      if (typeof x === 'number' || typeof y === 'number') return (num(x) - num(y)) * sign;
      return String(x || '').localeCompare(String(y || ''), undefined, { numeric: true, sensitivity: 'base' }) * sign;
    });
  }

  /* ---------- DOM ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function frag(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label === undefined ? value : label) + '</option>';
  }

  function optionsHtml(values, selected, placeholder) {
    var out = placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '';
    (values || []).forEach(function (v) {
      var val = typeof v === 'object' ? v.value : v;
      var lab = typeof v === 'object' ? v.label : v;
      out += option(val, lab, String(val) === String(selected));
    });
    return out;
  }

  /* ---------- feedback ---------- */

  var toastStack;
  function toast(message, kind) {
    toastStack = toastStack || document.getElementById('toastStack');
    if (!toastStack) return;
    var node = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: message });
    toastStack.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .2s';
      node.style.opacity = '0';
      setTimeout(function () { node.remove(); }, 220);
    }, kind === 'bad' ? 5200 : 2600);
  }

  /** Promise-based confirm/prompt modal; resolves null on cancel. */
  function modal(opts) {
    return new Promise(function (resolve) {
      var root = document.getElementById('modalRoot');
      var box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
      var body = el('div', { class: 'modal-body' });
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);

      var cancelBtn = el('button', { class: 'btn', type: 'button', text: opts.cancelText || 'Cancel' });
      var okBtn = el('button', { class: 'btn ' + (opts.danger ? 'danger' : 'primary'), type: 'button', text: opts.okText || 'Confirm' });

      box.appendChild(el('header', null, [el('h2', { text: opts.title || '' })]));
      box.appendChild(body);
      box.appendChild(el('footer', null, opts.hideCancel ? [okBtn] : [cancelBtn, okBtn]));

      function close(result) {
        document.removeEventListener('keydown', onKey);
        root.hidden = true;
        root.innerHTML = '';
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(null);
        else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); okBtn.click(); }
      }
      cancelBtn.addEventListener('click', function () { close(null); });
      okBtn.addEventListener('click', function () {
        var value = opts.collect ? opts.collect(body) : true;
        if (value === undefined) return;   // collector rejected the input
        close(value);
      });
      root.addEventListener('click', function (e) { if (e.target === root) close(null); });
      document.addEventListener('keydown', onKey);

      root.innerHTML = '';
      root.appendChild(box);
      root.hidden = false;
      var first = box.querySelector('input, select, textarea');
      (first || okBtn).focus();
      if (first && first.select) first.select();
    });
  }

  function confirmBox(title, message, okText, danger) {
    return modal({
      title: title,
      body: '<p>' + esc(message) + '</p>',
      okText: okText || 'Confirm',
      danger: danger !== false
    }).then(function (r) { return !!r; });
  }

  function promptBox(title, label, value) {
    return modal({
      title: title,
      body: '<label class="field"><span>' + esc(label) + '</span><input type="text" id="promptInput" value="' + esc(value || '') + '"></label>',
      okText: 'Save',
      collect: function (body) {
        var v = body.querySelector('#promptInput').value.trim();
        if (!v) { toast('Please enter a value.', 'bad'); return undefined; }
        return v;
      }
    });
  }

  /* ---------- export ---------- */

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  /** Download a table of rows as CSV. `rows[0]` is the header. */
  function downloadCsv(filename, rows) {
    download(filename, '﻿' + toCsv(rows), 'text/csv');
  }

  global.Util = {
    MONTH_NAMES: MONTH_NAMES, MONTH_SHORT: MONTH_SHORT,
    num: num, round2: round2, money: money, moneyShort: moneyShort, percent: percent, safeDiv: safeDiv,
    pad2: pad2, today: today, isoDate: isoDate, yearOf: yearOf, monthOf: monthOf, dayOf: dayOf,
    monthStart: monthStart, monthEnd: monthEnd, daysInMonth: daysInMonth,
    prettyDate: prettyDate, prettyMonth: prettyMonth, inRange: inRange, addMonths: addMonths,
    esc: esc, slug: slug, uid: uid, sameName: sameName, sortBy: sortBy,
    el: el, frag: frag, $: $, $$: $$, option: option, optionsHtml: optionsHtml,
    toast: toast, modal: modal, confirmBox: confirmBox, promptBox: promptBox,
    download: download, downloadCsv: downloadCsv, toCsv: toCsv
  };
}(window));
