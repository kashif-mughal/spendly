/* Dashboard - KPIs, top expense categories, income vs expenses, balances. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  global.Views.dashboard = {
    title: 'Dashboard',
    render: function (host, params, period) {
      var d = Calc.dashboard(period.year, period.month);
      var label = U.MONTH_NAMES[period.month - 1] + ' ' + period.year;

      host.appendChild(V.pageHead(
        'Dashboard',
        label + ' · ' + d.txCount + ' transaction' + (d.txCount === 1 ? '' : 's') + ' · all amounts in ' + Store.settings().currency,
        [
          V.button('Add transaction', function () { App.go('transactions', { add: '1' }); }, { variant: 'primary', icon: 'plus' }),
          V.button('Print', function () { global.print(); }, { icon: 'print' })
        ]
      ));

      /* ---- KPI row ---- */
      var kpis = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Income (month)', U.money(d.income), { kind: 'income' }));
      kpis.appendChild(V.kpi('Expenses (month)', U.money(d.expense), { kind: 'expense' }));
      kpis.appendChild(V.kpi('Net savings (month)', U.money(d.net), {
        signClass: d.net < 0 ? 'neg' : 'pos',
        meta: 'Savings rate ' + U.percent(d.savingsRate)
      }));
      kpis.appendChild(V.kpi('Budget used (month)', U.percent(d.budgetUsed, 0), {
        meta: U.money(d.budgetActual) + ' of ' + U.money(d.budgetTotal),
        meter: d.budgetUsed
      }));
      host.appendChild(kpis);

      var kpis2 = U.el('div', { class: 'grid cols-4', style: 'margin-bottom:16px' });
      kpis2.appendChild(V.kpi('Income (YTD)', U.money(d.incomeYtd), { meta: 'Jan–' + U.MONTH_SHORT[period.month - 1] + ' ' + period.year }));
      kpis2.appendChild(V.kpi('Expenses (YTD)', U.money(d.expenseYtd), { meta: 'Jan–' + U.MONTH_SHORT[period.month - 1] + ' ' + period.year }));
      kpis2.appendChild(V.kpi('Net savings (YTD)', U.money(d.netYtd), { signClass: d.netYtd < 0 ? 'neg' : 'pos' }));
      kpis2.appendChild(V.kpi('Net worth (all accounts)', U.money(d.netWorth), {
        signClass: d.netWorth < 0 ? 'neg' : 'pos',
        meta: Store.accounts().length + ' accounts'
      }));
      host.appendChild(kpis2);

      /* ---- Top categories: chart + the same figures as a table ---- */
      var top = Calc.topExpenseCategories(period.year, period.month, 10);
      var grid = U.el('div', { class: 'grid cols-2' });

      var topCard = V.card('Top expense categories — ' + label, {
        hint: top.length ? U.money(d.expense) + ' total' : ''
      });
      topCard.body.appendChild(V.chartHost('chartTop'));
      topCard.body.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        V.table([
          { key: 'rank', label: '#', width: '36px' },
          { key: 'name', label: 'Category' },
          { key: 'amount', label: 'Amount', num: true, render: function (r) { return U.money(r.amount); } },
          { key: 'share', label: '% of exp.', num: true, render: function (r) { return U.percent(r.share); } }
        ], top.map(function (r, i) { return Object.assign({ rank: i + 1 }, r); }), {
          emptyTitle: 'No expenses in ' + label,
          empty: 'Add a transaction to see the breakdown.'
        })
      ]));
      grid.appendChild(topCard);

      var shareCard = V.card('Where the money went — ' + label);
      shareCard.body.appendChild(V.chartHost('chartDonut'));
      grid.appendChild(shareCard);
      host.appendChild(grid);

      /* ---- Year trend ---- */
      var report = Calc.monthlyReport(period.year);
      var trendCard = V.card('Income vs expenses — ' + period.year, {
        actions: [V.button('Monthly report', function () { App.go('monthly-report'); }, { small: true })]
      });
      trendCard.body.appendChild(V.chartHost('chartTrend'));
      host.appendChild(trendCard);

      var savingsCard = V.card('Net savings by month — ' + period.year);
      savingsCard.body.appendChild(V.chartHost('chartSavings'));
      host.appendChild(savingsCard);

      /* ---- Accounts ---- */
      var accounts = Calc.accountRows();
      var accCard = V.card('Account balances (current)', {
        actions: [V.button('Manage accounts', function () { App.go('accounts'); }, { small: true })]
      });
      accCard.body.appendChild(V.chartHost('chartAccounts'));
      host.appendChild(accCard);

      /* ---- Problems ---- */
      var problems = Calc.problems();
      if (problems.length) {
        var pc = V.card('Rows that need attention', { hint: problems.length + ' of ' + Store.transactions().length });
        pc.body.appendChild(V.table([
          { key: 'date', label: 'Date', render: function (r) { return U.prettyDate(r.tx.date); } },
          { key: 'desc', label: 'Description', cls: 'wrap', render: function (r) { return r.tx.description || '(no description)'; } },
          { key: 'amount', label: 'Amount', num: true, render: function (r) { return U.money(r.tx.amount); } },
          { key: 'msg', label: 'Issue', render: function (r) { return V.pill(r.message, 'bad'); } },
          { key: 'go', label: '', render: function (r) {
              return V.button('Fix', function () { App.go('transactions', { edit: r.tx.id }); }, { small: true });
            } }
        ], problems, {}));
        host.appendChild(pc);
      }

      /* ---- Draw ---- */
      Charts.hbars('#chartTop', {
        rows: top.map(function (r) {
          return { label: r.name, value: r.amount, note: U.percent(r.share) + ' of expenses' };
        }),
        role: 'expense',
        title: 'Top expense categories'
      });

      Charts.donut('#chartDonut', {
        rows: top.map(function (r) { return { label: r.name, value: r.amount }; }),
        centreValue: U.moneyShort(d.expense),
        centreLabel: 'spent',
        title: 'Share of expenses by category'
      });

      Charts.bars('#chartTrend', {
        categories: U.MONTH_SHORT,
        series: [
          { name: 'Income', role: 'income', values: report.summary.income },
          { name: 'Expenses', role: 'expense', values: report.summary.expenses }
        ],
        height: 270,
        title: 'Income vs expenses by month'
      });

      Charts.line('#chartSavings', {
        categories: U.MONTH_SHORT,
        series: [{ name: 'Net savings', role: 'single', values: report.summary.net }],
        height: 230,
        title: 'Net savings by month'
      });

      Charts.hbars('#chartAccounts', {
        rows: accounts.map(function (a) {
          return { label: a.name, value: a.balance, note: a.type };
        }),
        keepZeros: true,
        title: 'Account balances'
      });
    }
  };
}(window));
