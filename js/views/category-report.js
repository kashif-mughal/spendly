/* Category report - sub-category breakdown for one category over a date range. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  var state = { category: '', from: '', to: '', type: 'Expense', initialised: false };

  global.Views.categoryReport = {
    title: 'Category Report',
    render: function (host, params, period) {
      var defaults = Calc.period(period.year, period.month);
      if (!state.initialised || params.category) {
        state.from = state.from || defaults.from;
        state.to = state.to || defaults.to;
        state.initialised = true;
      }
      if (params.category) state.category = params.category;
      if (params.type) state.type = params.type;

      var categories = state.type === 'Income' ? Calc.allIncomeCategories() : Calc.allExpenseCategories();
      if (!state.category || categories.indexOf(state.category) === -1) state.category = categories[0] || '';

      var r = Calc.categoryReport(state.category, state.from, state.to, state.type);

      host.appendChild(V.pageHead('Category report',
        'Pick a category and a date range to see the sub-category breakdown.',
        [V.button('Export CSV', exportCsv, { icon: 'download' })]
      ));

      /* ---- controls ---- */
      var controls = V.card('Selection');
      var filters = U.el('div', { class: 'filters' });
      filters.appendChild(V.field('Type', V.select(['Expense', 'Income'], state.type, function (v) {
        state.type = v; state.category = ''; App.refresh();
      })));
      filters.appendChild(V.field('Category', V.select(categories, state.category, function (v) {
        state.category = v; App.refresh();
      })));
      filters.appendChild(V.field('From', V.input('date', state.from, function (v) { state.from = v; App.refresh(); })));
      filters.appendChild(V.field('To', V.input('date', state.to, function (v) { state.to = v; App.refresh(); })));
      filters.appendChild(V.field('Quick range', V.select([
        { value: '', label: '— pick —' },
        { value: 'month', label: U.MONTH_NAMES[period.month - 1] + ' ' + period.year },
        { value: 'ytd', label: 'Year to date ' + period.year },
        { value: 'year', label: 'Whole of ' + period.year },
        { value: 'all', label: 'All time' }
      ], '', function (v) {
        if (v === 'month') { state.from = defaults.from; state.to = defaults.to; }
        else if (v === 'ytd') { state.from = period.year + '-01-01'; state.to = defaults.to; }
        else if (v === 'year') { state.from = period.year + '-01-01'; state.to = period.year + '-12-31'; }
        else if (v === 'all') { state.from = ''; state.to = ''; }
        else return;
        App.refresh();
      })));
      controls.body.appendChild(filters);
      host.appendChild(controls);

      /* ---- KPIs ---- */
      var kpis = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Total in range', U.money(r.total), { kind: state.type === 'Income' ? 'income' : 'expense' }));
      kpis.appendChild(V.kpi('Transactions', String(r.count)));
      kpis.appendChild(V.kpi('Average per transaction', U.money(r.avg)));
      kpis.appendChild(V.kpi('Sub categories used', String(r.rows.filter(function (x) { return x.amount > 0; }).length)));
      host.appendChild(kpis);

      /* ---- breakdown ---- */
      var card = V.card(state.category + ' — sub-category breakdown', {
        flush: true,
        hint: (state.from ? U.prettyDate(state.from) : 'start') + ' → ' + (state.to ? U.prettyDate(state.to) : 'today')
      });
      card.body.appendChild(V.table([
        { key: 'name', label: 'Sub category' },
        { key: 'amount', label: 'Amount', num: true, render: function (x) { return U.money(x.amount); } },
        { key: 'share', label: '% share', num: true, render: function (x) { return U.percent(x.share); } },
        { key: 'count', label: '# transactions', num: true },
        { key: 'avg', label: 'Avg / transaction', num: true, render: function (x) { return U.money(x.avg); } }
      ], r.rows.filter(function (x) { return x.amount > 0 || x.count > 0; }), {
        emptyTitle: 'Nothing recorded',
        empty: 'No ' + state.type.toLowerCase() + ' in "' + state.category + '" for this range.',
        footer: ['TOTAL', U.money(r.total), '100%', r.count, U.money(r.avg)]
      }));
      host.appendChild(card);

      var chartCard = V.card('Sub-category spend');
      chartCard.body.appendChild(V.chartHost('chartSubcat'));
      host.appendChild(chartCard);

      /* ---- cross-cuts across all expenses in range ---- */
      if (state.type === 'Expense') {
        var grid = U.el('div', { class: 'grid cols-2' });

        var payCard = V.card('All expenses in range by payment method', { flush: true });
        payCard.body.appendChild(V.table([
          { key: 'name', label: 'Payment method' },
          { key: 'amount', label: 'Amount', num: true, render: function (x) { return U.money(x.amount); } }
        ], r.byPayment, { emptyTitle: 'No expenses in range', empty: '' }));
        payCard.body.appendChild(U.el('div', { style: 'padding:14px' }, [V.chartHost('chartByPayment')]));
        grid.appendChild(payCard);

        var accCard = V.card('All expenses in range by account', { flush: true });
        accCard.body.appendChild(V.table([
          { key: 'name', label: 'Account' },
          { key: 'amount', label: 'Amount', num: true, render: function (x) { return U.money(x.amount); } }
        ], r.byAccount, { emptyTitle: 'No expenses in range', empty: '' }));
        accCard.body.appendChild(U.el('div', { style: 'padding:14px' }, [V.chartHost('chartByAccount')]));
        grid.appendChild(accCard);

        host.appendChild(grid);
      }

      /* ---- matching transactions ---- */
      var txs = Calc.filterTx({ type: state.type, category: state.category, from: state.from, to: state.to });
      var txCard = V.card('Matching transactions', { flush: true, hint: txs.length + ' row' + (txs.length === 1 ? '' : 's') });
      txCard.body.appendChild(V.table([
        { key: 'date', label: 'Date', render: function (t) { return U.prettyDate(t.date); } },
        { key: 'subCategory', label: 'Sub category' },
        { key: 'account', label: 'Account' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'description', label: 'Description', cls: 'wrap' },
        { key: 'amount', label: 'Amount', num: true, render: function (t) { return V.amountCell(t.amount, t.type); } }
      ], U.sortBy(txs, 'date', 'desc'), { scroll: true, emptyTitle: 'No transactions', empty: '' }));
      host.appendChild(txCard);

      /* ---- draw ---- */
      Charts.hbars('#chartSubcat', {
        rows: r.rows.filter(function (x) { return x.amount > 0; })
          .map(function (x) { return { label: x.name, value: x.amount, note: x.count + ' transactions' }; }),
        role: state.type === 'Income' ? 'income' : 'expense',
        title: 'Sub-category spend'
      });
      if (state.type === 'Expense') {
        Charts.hbars('#chartByPayment', {
          rows: r.byPayment.map(function (x) { return { label: x.name, value: x.amount }; }),
          labelWidth: 110, title: 'Expenses by payment method'
        });
        Charts.hbars('#chartByAccount', {
          rows: r.byAccount.map(function (x) { return { label: x.name, value: x.amount }; }),
          labelWidth: 110, title: 'Expenses by account'
        });
      }

      function exportCsv() {
        var out = [['Category Report', state.category, state.from || 'start', state.to || 'today'], []];
        out.push(['Sub Category', 'Amount', '% Share', '# Transactions', 'Avg / Transaction']);
        r.rows.forEach(function (x) {
          out.push([x.name, x.amount, (x.share * 100).toFixed(1) + '%', x.count, x.avg]);
        });
        out.push(['TOTAL', r.total, '100%', r.count, r.avg]);
        if (state.type === 'Expense') {
          out.push([], ['By payment method', 'Amount']);
          r.byPayment.forEach(function (x) { out.push([x.name, x.amount]); });
          out.push([], ['By account', 'Amount']);
          r.byAccount.forEach(function (x) { out.push([x.name, x.amount]); });
        }
        U.downloadCsv('category-report-' + U.slug(state.category) + '.csv', out);
      }
    }
  };
}(window));
