/* Budget - monthly budget per expense category vs what was actually spent. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  global.Views.budget = {
    title: 'Budget',
    render: function (host, params, period) {
      var label = U.MONTH_NAMES[period.month - 1] + ' ' + period.year;
      var data = Calc.budgetRows(period.year, period.month);
      var rows = U.sortBy(data.rows, function (r) { return r.budget || r.actual; }, 'desc');

      host.appendChild(V.pageHead('Monthly budget',
        label + ' · actuals follow the month picked in the top bar',
        [
          V.button('Copy budget to all categories', fillMissing, { icon: 'refresh' }),
          V.button('Export CSV', function () {
            U.downloadCsv('budget-' + period.year + '-' + U.pad2(period.month) + '.csv', [
              ['Category', 'Monthly Budget', 'Actual Spent', 'Remaining', '% Used', 'Status']
            ].concat(rows.map(function (r) {
              return [r.category, r.budget, r.actual, r.remaining, (r.used * 100).toFixed(1) + '%', r.status];
            })));
          }, { icon: 'download' })
        ]
      ));

      var over = rows.filter(function (r) { return r.status === 'Over Budget'; });
      var near = rows.filter(function (r) { return r.status === 'Near Limit'; });

      var kpis = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Budgeted', U.money(data.totalBudget), { meta: rows.filter(function (r) { return r.budget > 0; }).length + ' categories' }));
      kpis.appendChild(V.kpi('Spent', U.money(data.totalActual), { kind: 'expense' }));
      kpis.appendChild(V.kpi('Remaining', U.money(data.totalRemaining), {
        signClass: data.totalRemaining < 0 ? 'neg' : 'pos'
      }));
      kpis.appendChild(V.kpi('Budget used', U.percent(data.totalUsed, 0), { meter: data.totalUsed }));
      host.appendChild(kpis);

      if (over.length || near.length) {
        var msgs = [];
        if (over.length) msgs.push(over.length + ' over budget: ' + over.map(function (r) { return r.category; }).join(', '));
        if (near.length) msgs.push(near.length + ' near the limit: ' + near.map(function (r) { return r.category; }).join(', '));
        host.appendChild(U.el('div', { style: 'margin-bottom:16px' }, [
          V.note(msgs.join(' · '), over.length ? 'bad' : 'warn')
        ]));
      }

      var card = V.card('Budget vs actual — ' + label, { flush: true });
      card.body.appendChild(V.table([
        { key: 'category', label: 'Category' },
        { key: 'budget', label: 'Monthly budget', num: true, width: '150px', render: function (r) {
            var inp = V.input('number', r.budget || '', function (v) {
              var budgets = Store.budget();
              var amount = U.round2(v);
              if (amount) budgets[r.category] = amount; else delete budgets[r.category];
              Store.commit('budget');
            }, { step: '100', min: '0', 'aria-label': 'Budget for ' + r.category });
            return inp;
          } },
        { key: 'actual', label: 'Actual spent', num: true, render: function (r) { return U.money(r.actual); } },
        { key: 'remaining', label: 'Remaining', num: true, render: function (r) { return V.signed(r.remaining); } },
        { key: 'used', label: '% used', num: true, width: '150px', render: function (r) {
            if (!r.budget) return '—';
            return U.el('div', { class: 'used-cell' }, [
              U.el('span', { text: U.percent(r.used, 0) }),
              Charts.meter(r.used)
            ]);
          } },
        { key: 'status', label: 'Status', render: function (r) { return V.statusPill(r.status); } },
        { key: null, label: '', width: '44px', render: function (r) {
            return U.el('div', { class: 'row-actions' }, [
              V.iconButton('chart', 'Category report', function () {
                App.go('category-report', { category: r.category });
              })
            ]);
          } }
      ], rows, {
        emptyTitle: 'No expense categories',
        empty: 'Add categories first, then set a budget for each.',
        footer: ['TOTAL', U.money(data.totalBudget), U.money(data.totalActual),
          V.signed(data.totalRemaining), U.percent(data.totalUsed, 0), '', '']
      }));
      host.appendChild(card);

      var chartCard = V.card('Budget vs actual');
      chartCard.body.appendChild(V.chartHost('chartBudget'));
      host.appendChild(chartCard);

      var shown = rows.filter(function (r) { return r.budget > 0 || r.actual > 0; });
      Charts.bars('#chartBudget', {
        categories: shown.map(function (r) { return r.category; }),
        series: [
          { name: 'Budget', role: 'budget', values: shown.map(function (r) { return r.budget; }) },
          { name: 'Actual', role: 'actual', values: shown.map(function (r) { return r.actual; }) }
        ],
        height: 300,
        title: 'Budget vs actual by category'
      });

      function fillMissing() {
        var without = rows.filter(function (r) { return !r.budget; });
        if (!without.length) { U.toast('Every category already has a budget.'); return; }
        U.promptBox('Set a budget for ' + without.length + ' categories',
          'Amount to apply to each category that has no budget yet', '0')
          .then(function (value) {
            if (value === null) return;
            var amount = U.round2(value);
            var budgets = Store.budget();
            without.forEach(function (r) { if (amount) budgets[r.category] = amount; });
            Store.commit('budget');
            U.toast('Applied ' + U.money(amount) + ' to ' + without.length + ' categories.', 'good');
          });
      }
    }
  };
}(window));
