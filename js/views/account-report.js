/* Account report - month-by-month flow and closing balance for one account. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  var state = { account: '' };

  global.Views.accountReport = {
    title: 'Account Report',
    render: function (host, params, period) {
      if (params.account) state.account = params.account;
      var names = Calc.accountNames();
      if (!state.account || names.indexOf(state.account) === -1) state.account = names[0] || '';
      var year = parseInt(params.year, 10) || period.year;

      if (!state.account) {
        host.appendChild(V.pageHead('Account report', 'Month-by-month money in, money out and closing balance.'));
        var empty = V.card('No accounts');
        empty.body.appendChild(V.note('Add an account first, then come back to this report.', 'warn'));
        host.appendChild(empty);
        return;
      }

      var r = Calc.accountReport(state.account, year);

      host.appendChild(V.pageHead('Account report',
        'Month-by-month money in, money out and closing balance for one account.',
        [
          V.field('Account', V.select(names, state.account, function (v) { state.account = v; App.refresh(); })),
          V.field('Year', V.select(Calc.activeYears(), year, function (v) { App.go('account-report', { account: state.account, year: v }); })),
          V.button('Export CSV', exportCsv, { icon: 'download' })
        ]
      ));

      var kpis = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Opening balance', U.money(r.opening)));
      kpis.appendChild(V.kpi('Current balance', U.money(r.current), { signClass: r.current < 0 ? 'neg' : 'pos' }));
      kpis.appendChild(V.kpi('Money in ' + year, U.money(r.totals.income + r.totals.transfersIn), { kind: 'income' }));
      kpis.appendChild(V.kpi('Money out ' + year, U.money(r.totals.expense + r.totals.transfersOut), { kind: 'expense' }));
      host.appendChild(kpis);

      var card = V.card(state.account + ' — ' + year, { flush: true });
      card.body.appendChild(V.table([
        { key: 'label', label: 'Month' },
        { key: 'income', label: 'Income', num: true, render: function (m) { return m.income ? U.money(m.income) : '—'; } },
        { key: 'expense', label: 'Expenses', num: true, render: function (m) { return m.expense ? U.money(m.expense) : '—'; } },
        { key: 'transfersIn', label: 'Transfers in', num: true, render: function (m) { return m.transfersIn ? U.money(m.transfersIn) : '—'; } },
        { key: 'transfersOut', label: 'Transfers out', num: true, render: function (m) { return m.transfersOut ? U.money(m.transfersOut) : '—'; } },
        { key: 'net', label: 'Net flow', num: true, render: function (m) { return V.signed(m.net); } },
        { key: 'closing', label: 'Closing balance', num: true, render: function (m) { return V.signed(m.closing); } }
      ], r.months, {
        footer: ['TOTAL', U.money(r.totals.income), U.money(r.totals.expense),
          U.money(r.totals.transfersIn), U.money(r.totals.transfersOut), V.signed(r.totals.net), '']
      }));
      host.appendChild(card);

      var chart = V.card('Closing balance by month');
      chart.body.appendChild(V.chartHost('chartClosing'));
      host.appendChild(chart);

      var flow = V.card('Money in vs money out');
      flow.body.appendChild(V.chartHost('chartFlow'));
      host.appendChild(flow);

      Charts.line('#chartClosing', {
        categories: U.MONTH_SHORT,
        series: [{ name: 'Closing balance', role: 'single', values: r.months.map(function (m) { return m.closing; }) }],
        height: 250,
        title: 'Closing balance by month'
      });
      Charts.bars('#chartFlow', {
        categories: U.MONTH_SHORT,
        series: [
          { name: 'Money in', role: 'income', values: r.months.map(function (m) { return m.income + m.transfersIn; }) },
          { name: 'Money out', role: 'expense', values: r.months.map(function (m) { return m.expense + m.transfersOut; }) }
        ],
        height: 260,
        title: 'Money in vs money out'
      });

      function exportCsv() {
        var out = [['Account Report', state.account, year], [],
          ['Month', 'Income', 'Expenses', 'Transfers In', 'Transfers Out', 'Net Flow', 'Closing Balance']];
        r.months.forEach(function (m) {
          out.push([m.label, m.income, m.expense, m.transfersIn, m.transfersOut, m.net, m.closing]);
        });
        out.push(['TOTAL', r.totals.income, r.totals.expense, r.totals.transfersIn, r.totals.transfersOut, r.totals.net, '']);
        U.downloadCsv('account-report-' + U.slug(state.account) + '-' + year + '.csv', out);
      }
    }
  };
}(window));
