/* Monthly report - category x month matrix for a whole year, plus the summary. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  function matrixCard(title, matrix, year, kind) {
    var card = V.card(title, { flush: true, hint: 'Monthly average uses ' + Math.max(1, matrix.monthsElapsed) + ' month' + (matrix.monthsElapsed === 1 ? '' : 's') });
    var columns = [{ key: 'name', label: 'Category', sticky: true, width: '180px' }];
    U.MONTH_SHORT.forEach(function (m, i) {
      columns.push({
        key: 'm' + i, label: m, num: true,
        render: function (r) { return r.months[i] ? U.money(r.months[i], { noSymbol: true }) : '—'; }
      });
    });
    columns.push({ key: 'total', label: 'Total', num: true, render: function (r) { return U.money(r.total, { noSymbol: true }); } });
    columns.push({ key: 'avg', label: 'Monthly avg', num: true, render: function (r) { return U.money(r.avg, { noSymbol: true }); } });
    columns.push({ key: 'share', label: '% of total', num: true, render: function (r) { return U.percent(r.share); } });

    var rows = matrix.rows.filter(function (r) { return r.total !== 0; });
    var footer = ['TOTAL ' + kind.toUpperCase()];
    matrix.monthTotals.forEach(function (v) { footer.push(U.money(v, { noSymbol: true })); });
    footer.push(U.money(matrix.grandTotal, { noSymbol: true }));
    footer.push(U.money(matrix.avgTotal, { noSymbol: true }));
    footer.push('100%');

    card.body.appendChild(V.table(columns, rows, {
      scroll: true,
      emptyTitle: 'No ' + kind.toLowerCase() + ' recorded in ' + year,
      empty: 'Nothing to show for this year yet.',
      footer: footer
    }));
    return card;
  }

  global.Views.monthlyReport = {
    title: 'Monthly Report',
    render: function (host, params, period) {
      var year = parseInt(params.year, 10) || period.year;
      var r = Calc.monthlyReport(year);

      host.appendChild(V.pageHead('Monthly report',
        'Category-wise income and expenses for every month of ' + year + '. All amounts in ' + Store.settings().currency + '.',
        [
          V.field('Year', V.select(Calc.activeYears(), year, function (v) {
            App.go('monthly-report', { year: v });
          })),
          V.button('Export CSV', exportCsv, { icon: 'download' }),
          V.button('Print', function () { global.print(); }, { icon: 'print' })
        ]
      ));

      var totalIncome = r.income.grandTotal, totalExpense = r.expenses.grandTotal;
      var net = U.round2(totalIncome - totalExpense);
      var kpis = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Income ' + year, U.money(totalIncome), { kind: 'income' }));
      kpis.appendChild(V.kpi('Expenses ' + year, U.money(totalExpense), { kind: 'expense' }));
      kpis.appendChild(V.kpi('Net savings ' + year, U.money(net), { signClass: net < 0 ? 'neg' : 'pos' }));
      kpis.appendChild(V.kpi('Savings rate', U.percent(U.safeDiv(net, totalIncome)), {
        meta: 'Transfers (internal): ' + U.money(r.summary.transfers.reduce(function (a, b) { return a + b; }, 0))
      }));
      host.appendChild(kpis);

      var trend = V.card('Income vs expenses by month');
      trend.body.appendChild(V.chartHost('chartMonthlyTrend'));
      host.appendChild(trend);

      host.appendChild(matrixCard('Expenses by category — ' + year, r.expenses, year, 'Expenses'));
      host.appendChild(matrixCard('Income by category — ' + year, r.income, year, 'Income'));

      /* ---- summary block ---- */
      var sumCard = V.card('Summary — ' + year, { flush: true });
      var sumColumns = [{ key: 'label', label: '', sticky: true, width: '180px' }];
      U.MONTH_SHORT.forEach(function (m, i) {
        sumColumns.push({ key: 'm' + i, label: m, num: true, render: function (row) { return row.format(row.values[i]); } });
      });
      sumColumns.push({ key: 'total', label: 'Total', num: true, render: function (row) { return row.totalText; } });

      var moneyFmt = function (v) { return U.money(v, { noSymbol: true }); };
      var sumRows = [
        { label: 'Total income', values: r.summary.income, format: moneyFmt, totalText: U.money(totalIncome, { noSymbol: true }) },
        { label: 'Total expenses', values: r.summary.expenses, format: moneyFmt, totalText: U.money(totalExpense, { noSymbol: true }) },
        { label: 'Net savings', values: r.summary.net, format: moneyFmt, totalText: U.money(net, { noSymbol: true }) },
        { label: 'Savings rate', values: r.summary.rate, format: function (v) { return U.percent(v, 0); }, totalText: U.percent(U.safeDiv(net, totalIncome), 0) },
        { label: 'Cumulative savings', values: r.summary.cumulative, format: moneyFmt, totalText: U.money(r.summary.cumulative[11], { noSymbol: true }) },
        { label: 'Transfers (internal)', values: r.summary.transfers, format: moneyFmt,
          totalText: U.money(r.summary.transfers.reduce(function (a, b) { return a + b; }, 0), { noSymbol: true }) }
      ];
      sumCard.body.appendChild(V.table(sumColumns, sumRows, { scroll: false }));
      host.appendChild(sumCard);

      var savings = V.card('Net savings by month');
      savings.body.appendChild(V.chartHost('chartMonthlySavings'));
      host.appendChild(savings);

      var cumulative = V.card('Cumulative savings');
      cumulative.body.appendChild(V.chartHost('chartCumulative'));
      host.appendChild(cumulative);

      Charts.bars('#chartMonthlyTrend', {
        categories: U.MONTH_SHORT,
        series: [
          { name: 'Income', role: 'income', values: r.summary.income },
          { name: 'Expenses', role: 'expense', values: r.summary.expenses }
        ],
        height: 290,
        title: 'Income vs expenses by month'
      });
      Charts.bars('#chartMonthlySavings', {
        categories: U.MONTH_SHORT,
        series: [{ name: 'Net savings', role: 'single', values: r.summary.net }],
        height: 250,
        title: 'Net savings by month'
      });
      Charts.line('#chartCumulative', {
        categories: U.MONTH_SHORT,
        series: [{ name: 'Cumulative savings', role: 'single', values: r.summary.cumulative }],
        height: 240,
        title: 'Cumulative savings'
      });

      function exportCsv() {
        var out = [['Monthly Report ' + year]];
        out.push([]);
        out.push(['Expenses'].concat(U.MONTH_SHORT, ['Total', 'Monthly Avg', '% of Total']));
        r.expenses.rows.forEach(function (row) {
          out.push([row.name].concat(row.months, [row.total, row.avg, (row.share * 100).toFixed(1) + '%']));
        });
        out.push(['TOTAL EXPENSES'].concat(r.expenses.monthTotals, [r.expenses.grandTotal, r.expenses.avgTotal, '100%']));
        out.push([]);
        out.push(['Income'].concat(U.MONTH_SHORT, ['Total', 'Monthly Avg', '% of Total']));
        r.income.rows.forEach(function (row) {
          out.push([row.name].concat(row.months, [row.total, row.avg, (row.share * 100).toFixed(1) + '%']));
        });
        out.push(['TOTAL INCOME'].concat(r.income.monthTotals, [r.income.grandTotal, r.income.avgTotal, '100%']));
        out.push([]);
        out.push(['Summary'].concat(U.MONTH_SHORT));
        out.push(['Total Income'].concat(r.summary.income));
        out.push(['Total Expenses'].concat(r.summary.expenses));
        out.push(['Net Savings'].concat(r.summary.net));
        out.push(['Savings Rate'].concat(r.summary.rate.map(function (v) { return (v * 100).toFixed(1) + '%'; })));
        out.push(['Cumulative Savings'].concat(r.summary.cumulative));
        out.push(['Transfers (internal)'].concat(r.summary.transfers));
        U.downloadCsv('monthly-report-' + year + '.csv', out);
      }
    }
  };
}(window));
