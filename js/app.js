/* App shell: boot, theme, global period, hash router. */
(function (global) {
  'use strict';

  var U = Util;

  var ROUTES = {
    'dashboard':       function () { return Views.dashboard; },
    'transactions':    function () { return Views.transactions; },
    'accounts':        function () { return Views.accounts; },
    'templates':       function () { return Views.templates; },
    'budget':          function () { return Views.budget; },
    'monthly-report':  function () { return Views.monthlyReport; },
    'category-report': function () { return Views.categoryReport; },
    'account-report':  function () { return Views.accountReport; },
    'categories':      function () { return Views.categories; },
    'lists':           function () { return Views.lists; },
    'data':            function () { return Views.data; },
    'help':            function () { return Views.help; }
  };

  var current = { route: null, params: null };
  var period = { year: 0, month: 0 };

  /* ---------------- theme ---------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Store.pref('theme', theme);
  }

  function initTheme() {
    var saved = Store.pref('theme');
    if (!saved) {
      saved = (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(saved);
    U.$('#themeToggle').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      render();   // charts re-read the palette for the active theme
    });
  }

  /* ---------------- global period ---------------- */

  function initPeriod() {
    var saved = Store.pref('period');
    var latest = Calc.latestPeriod();
    period.year = (saved && saved.year) || latest.year;
    period.month = (saved && saved.month) || latest.month;

    var yearSel = U.$('#globalYear'), monthSel = U.$('#globalMonth');

    function fillYears() {
      var years = Calc.activeYears();
      if (years.indexOf(period.year) === -1) years.push(period.year);
      years.sort(function (a, b) { return b - a; });
      yearSel.innerHTML = U.optionsHtml(years, period.year);
    }
    fillYears();
    monthSel.innerHTML = U.MONTH_NAMES.map(function (m, i) {
      return U.option(i + 1, m, i + 1 === period.month);
    }).join('');

    yearSel.addEventListener('change', function () { setPeriod(parseInt(yearSel.value, 10), period.month); });
    monthSel.addEventListener('change', function () { setPeriod(period.year, parseInt(monthSel.value, 10)); });

    Store.onChange(fillYears);
  }

  function setPeriod(year, month) {
    period.year = year;
    period.month = month;
    Store.pref('period', { year: year, month: month });
    U.$('#globalYear').value = String(year);
    U.$('#globalMonth').value = String(month);
    render();
  }

  function getPeriod() { return { year: period.year, month: period.month }; }

  /* ---------------- navigation ---------------- */

  function parseHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('?');
    var route = parts[0] || 'dashboard';
    var params = {};
    (parts[1] || '').split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('=') || '');
    });
    return { route: ROUTES[route] ? route : 'dashboard', params: params };
  }

  function go(route, params) {
    var q = params ? Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&') : '';
    location.hash = '#/' + route + (q ? '?' + q : '');
  }

  function markActive(route) {
    U.$$('.sidebar a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.route === route);
    });
  }

  function closeNav() {
    U.$('#sidebar').classList.remove('open');
    U.$('#navScrim').hidden = true;
    U.$('#navToggle').setAttribute('aria-expanded', 'false');
  }

  function initNav() {
    var toggle = U.$('#navToggle'), scrim = U.$('#navScrim'), sidebar = U.$('#sidebar');
    toggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      scrim.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    scrim.addEventListener('click', closeNav);
    sidebar.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    global.addEventListener('hashchange', function () { route(); });
  }

  /* ---------------- rendering ---------------- */

  function route() {
    var parsed = parseHash();
    current = parsed;
    markActive(parsed.route);
    render();
    U.$('#view').scrollTop = 0;
    global.scrollTo(0, 0);
  }

  var rerenderTimer = null;
  function render() {
    var view = ROUTES[current.route] && ROUTES[current.route]();
    var host = U.$('#view');
    if (!view) { host.innerHTML = '<div class="empty">Page not found.</div>'; return; }
    host.innerHTML = '';
    try {
      view.render(host, current.params || {}, getPeriod());
    } catch (err) {
      console.error(err);
      host.innerHTML = '<div class="card"><div class="card-body"><div class="note bad">Something went wrong rendering this page: ' +
        U.esc(err.message) + '</div></div></div>';
    }
    document.title = (view.title || 'House Expense Manager') + ' · House Expense Manager';
  }

  /** Views call this after they change data, so every open figure refreshes. */
  function refresh() {
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(render, 30);
  }

  /* ---------------- boot ---------------- */

  function boot() {
    Store.load().then(function (info) {
      initTheme();
      initPeriod();
      initNav();
      Store.onChange(refresh);

      global.addEventListener('resize', function () {
        clearTimeout(rerenderTimer);
        rerenderTimer = setTimeout(render, 160);
      });

      route();
      U.$('#boot').classList.add('hidden');
      if (info && info.source && info.source.indexOf('bundled') === 0) {
        U.toast('Loaded your data from ' + info.source + '.');
      }
    }).catch(function (err) {
      console.error(err);
      U.$('#boot').innerHTML = '<div class="boot-card"><p style="color:var(--expense)">Could not load data: ' +
        U.esc(err.message) + '</p></div>';
    });
  }

  global.App = { go: go, refresh: refresh, render: render, getPeriod: getPeriod, setPeriod: setPeriod };
  global.Views = global.Views || {};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}(window));
