/* Transactions - the ledger: filter, sort, page, add/edit/duplicate/delete. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  var state = {
    from: '', to: '', type: '', category: '', account: '', paymentMethod: '',
    search: '', sortKey: 'date', sortDir: 'desc', page: 1, pageSize: 50,
    scope: 'month'   // month | year | all | custom
  };

  function applyScope(period) {
    if (state.scope === 'month') {
      state.from = U.monthStart(period.year, period.month);
      state.to = U.monthEnd(period.year, period.month);
    } else if (state.scope === 'year') {
      state.from = period.year + '-01-01';
      state.to = period.year + '-12-31';
    } else if (state.scope === 'all') {
      state.from = ''; state.to = '';
    }
  }

  function matches(t) {
    if (state.from && t.date < state.from) return false;
    if (state.to && t.date > state.to) return false;
    if (state.type && !U.sameName(t.type, state.type)) return false;
    if (state.category && !U.sameName(t.category, state.category)) return false;
    if (state.account && !U.sameName(t.account, state.account) && !U.sameName(t.toAccount, state.account)) return false;
    if (state.paymentMethod && !U.sameName(t.paymentMethod, state.paymentMethod)) return false;
    if (state.search) {
      var q = state.search.toLowerCase();
      var hay = [t.description, t.notes, t.category, t.subCategory, t.account, t.toAccount, t.template, t.paymentMethod]
        .join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function sorted(rows) {
    var key = state.sortKey;
    var getter = key === 'amount' ? function (t) { return U.num(t.amount); }
      : key === 'date' ? function (t) { return t.date + '|' + (t.id || ''); }
      : function (t) { return t[key] || ''; };
    return U.sortBy(rows, getter, state.sortDir);
  }

  /* ---------------- editor ---------------- */

  function blankTx(period) {
    var p = App.getPeriod();
    var todayIso = U.today();
    var inPeriod = U.yearOf(todayIso) === p.year && U.monthOf(todayIso) === p.month;
    return {
      id: '', date: inPeriod ? todayIso : U.monthStart(p.year, p.month),
      template: '', type: 'Expense', category: '', subCategory: '',
      account: Store.accounts().length ? Store.accounts()[0].name : '',
      toAccount: '', amount: '', paymentMethod: '', description: '', notes: ''
    };
  }

  function editor(tx, onSaved) {
    var draft = Object.assign({}, tx);
    var form = U.el('div');

    function catsFor(type) { return Calc.categoryNames(type); }
    function subsFor(type, cat) { return Calc.subCategories(type, cat); }

    function build() {
      form.innerHTML = '';
      var isTransfer = U.sameName(draft.type, 'Transfer');
      var accounts = Calc.accountNames();
      var lists = Store.lists();

      var grid = U.el('div', { class: 'form-grid' });

      grid.appendChild(V.field('Date', V.input('date', draft.date, function (v) { draft.date = v; })));

      var tplNames = Store.templates().map(function (t) { return t.name; });
      grid.appendChild(V.field('Template (optional)', V.select(tplNames, draft.template, function (v) {
        draft.template = v;
        var tpl = Store.templates().filter(function (t) { return t.name === v; })[0];
        if (tpl) {
          draft.type = tpl.type || draft.type;
          draft.category = tpl.category || '';
          draft.subCategory = tpl.subCategory || '';
          draft.account = tpl.account || draft.account;
          draft.toAccount = tpl.toAccount || '';
          if (U.num(tpl.amount) > 0) draft.amount = tpl.amount;
          draft.paymentMethod = tpl.paymentMethod || draft.paymentMethod;
          draft.description = tpl.description || draft.description;
        }
        build();
      }, '— none —')));

      grid.appendChild(V.field('Type', V.select(lists.types, draft.type, function (v) {
        draft.type = v;
        if (U.sameName(v, 'Transfer')) {
          draft.category = draft.category || (lists.transferCategories[0] || 'Account Transfer');
        } else if (!catsFor(v).some(function (c) { return U.sameName(c, draft.category); })) {
          draft.category = ''; draft.subCategory = '';
        }
        build();
      })));

      grid.appendChild(V.field('Category', V.select(catsFor(draft.type), draft.category, function (v) {
        draft.category = v;
        if (!subsFor(draft.type, v).some(function (s) { return U.sameName(s, draft.subCategory); })) draft.subCategory = '';
        build();
      }, '— pick —')));

      grid.appendChild(V.field('Sub category', V.select(subsFor(draft.type, draft.category), draft.subCategory, function (v) {
        draft.subCategory = v;
      }, '— pick —')));

      grid.appendChild(V.field(isTransfer ? 'Account (from)' : 'Account',
        V.select(accounts, draft.account, function (v) { draft.account = v; }, '— pick —')));

      if (isTransfer) {
        grid.appendChild(V.field('To account', V.select(accounts, draft.toAccount, function (v) {
          draft.toAccount = v;
        }, '— pick —')));
      }

      grid.appendChild(V.field('Amount', V.input('number', draft.amount, function (v) { draft.amount = v; },
        { step: '0.01', min: '0', inputmode: 'decimal' })));

      grid.appendChild(V.field('Payment method', V.select(lists.paymentMethods, draft.paymentMethod, function (v) {
        draft.paymentMethod = v;
      }, '— pick —')));

      var descField = V.field('Description / payee', V.input('text', draft.description, function (v) { draft.description = v; }));
      descField.classList.add('span-2');
      grid.appendChild(descField);

      var notesField = V.field('Notes / tags', V.input('text', draft.notes, function (v) { draft.notes = v; }));
      notesField.classList.add('span-2');
      grid.appendChild(notesField);

      form.appendChild(grid);

      if (isTransfer) {
        form.appendChild(U.el('div', { style: 'margin-top:12px' }, [
          V.note('A transfer moves money between your own accounts. It is never counted as income or expense.')
        ]));
      }
    }
    build();

    return U.modal({
      title: tx.id ? 'Edit transaction' : 'Add transaction',
      body: form,
      okText: tx.id ? 'Save changes' : 'Add transaction',
      collect: function () {
        draft.amount = U.round2(draft.amount);
        var problem = Calc.validate(draft);
        if (problem) { U.toast(problem, 'bad'); return undefined; }
        return draft;
      }
    }).then(function (result) {
      if (!result) return;
      var list = Store.transactions();
      if (result.id) {
        var idx = list.findIndex(function (t) { return t.id === result.id; });
        if (idx >= 0) list[idx] = result;
      } else {
        result.id = U.uid('txn');
        list.push(result);
      }
      Store.commit('transactions');
      U.toast(tx.id ? 'Transaction updated.' : 'Transaction added.', 'good');
      if (onSaved) onSaved(result);
    });
  }

  function removeTx(tx) {
    return U.confirmBox('Delete transaction',
      'Delete "' + (tx.description || U.money(tx.amount)) + '" dated ' + U.prettyDate(tx.date) + '? This cannot be undone.',
      'Delete'
    ).then(function (yes) {
      if (!yes) return;
      Store.set('transactions', Store.transactions().filter(function (t) { return t.id !== tx.id; }));
      U.toast('Transaction deleted.');
    });
  }

  /* ---------------- view ---------------- */

  global.Views.transactions = {
    title: 'Transactions',
    render: function (host, params, period) {
      if (params.add) { setTimeout(function () { editor(blankTx(period)); }, 0); location.hash = '#/transactions'; }
      if (params.edit) {
        var found = Store.transactions().filter(function (t) { return t.id === params.edit; })[0];
        if (found) { setTimeout(function () { editor(found); }, 0); }
        location.hash = '#/transactions';
      }

      applyScope(period);
      var all = Store.transactions();
      var filtered = all.filter(matches);
      var rows = sorted(filtered);

      var totals = filtered.reduce(function (acc, t) {
        var a = U.num(t.amount);
        if (U.sameName(t.type, 'Income')) acc.income += a;
        else if (U.sameName(t.type, 'Expense')) acc.expense += a;
        else acc.transfer += a;
        return acc;
      }, { income: 0, expense: 0, transfer: 0 });

      var pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
      if (state.page > pages) state.page = pages;
      var pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

      host.appendChild(V.pageHead('Transactions',
        all.length + ' recorded · ' + filtered.length + ' shown',
        [
          V.button('Add transaction', function () { editor(blankTx(period), function () { state.page = 1; }); },
            { variant: 'primary', icon: 'plus' }),
          V.button('Export CSV', exportCsv, { icon: 'download' })
        ]
      ));

      /* ---- filters ---- */
      var fcard = V.card('Filters', {
        actions: [V.button('Reset', function () {
          state.type = state.category = state.account = state.paymentMethod = state.search = '';
          state.scope = 'month'; state.page = 1;
          App.refresh();
        }, { small: true })]
      });
      var filters = U.el('div', { class: 'filters' });

      filters.appendChild(V.field('Period', V.select([
        { value: 'month', label: U.MONTH_NAMES[period.month - 1] + ' ' + period.year },
        { value: 'year', label: 'Whole of ' + period.year },
        { value: 'all', label: 'All time' },
        { value: 'custom', label: 'Custom range' }
      ], state.scope, function (v) { state.scope = v; state.page = 1; App.refresh(); })));

      if (state.scope === 'custom') {
        filters.appendChild(V.field('From', V.input('date', state.from, function (v) { state.from = v; state.page = 1; App.refresh(); })));
        filters.appendChild(V.field('To', V.input('date', state.to, function (v) { state.to = v; state.page = 1; App.refresh(); })));
      }

      filters.appendChild(V.field('Type', V.select(Store.lists().types, state.type,
        function (v) { state.type = v; state.category = ''; state.page = 1; App.refresh(); }, 'All types')));

      var catOptions = state.type ? Calc.categoryNames(state.type)
        : Calc.allExpenseCategories().concat(Calc.allIncomeCategories());
      filters.appendChild(V.field('Category', V.select(catOptions, state.category,
        function (v) { state.category = v; state.page = 1; App.refresh(); }, 'All categories')));

      filters.appendChild(V.field('Account', V.select(Calc.accountNames(), state.account,
        function (v) { state.account = v; state.page = 1; App.refresh(); }, 'All accounts')));

      filters.appendChild(V.field('Payment method', V.select(Store.lists().paymentMethods, state.paymentMethod,
        function (v) { state.paymentMethod = v; state.page = 1; App.refresh(); }, 'All methods')));

      var searchInput = V.input('search', state.search, null, { placeholder: 'Description, notes…' });
      searchInput.addEventListener('input', function () {
        state.search = searchInput.value;
        state.page = 1;
        clearTimeout(searchInput._t);
        searchInput._t = setTimeout(function () {
          App.refresh();
          setTimeout(function () {
            var again = U.$('.filters input[type="search"]');
            if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
          }, 40);
        }, 260);
      });
      filters.appendChild(V.field('Search', searchInput));

      fcard.body.appendChild(filters);
      var broken = filtered.filter(function (t) { return Calc.validate(t); });
      if (broken.length) {
        fcard.body.appendChild(U.el('div', { style: 'margin-top:12px' }, [
          V.note(broken.length + ' row' + (broken.length === 1 ? '' : 's') +
            ' in this view are incomplete \u2014 each one is flagged in the Description column.', 'warn')
        ]));
      }
      fcard.body.appendChild(U.el('div', { class: 'inline-list', style: 'margin-top:12px' }, [
        U.el('span', null, ['Income: ', U.el('strong', { class: 'pos', text: U.money(totals.income) })]),
        U.el('span', null, ['Expenses: ', U.el('strong', { class: 'neg', text: U.money(totals.expense) })]),
        U.el('span', null, ['Net: ', U.el('strong', { class: totals.income - totals.expense < 0 ? 'neg' : 'pos', text: U.money(totals.income - totals.expense) })]),
        U.el('span', null, ['Transfers: ', U.el('strong', { text: U.money(totals.transfer) })])
      ]));
      host.appendChild(fcard);

      /* ---- table ---- */
      function onSort(key) {
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = key === 'amount' || key === 'date' ? 'desc' : 'asc'; }
        App.refresh();
      }

      var columns = [
        { key: 'date', label: 'Date', width: '110px', render: function (t) { return U.prettyDate(t.date); } },
        { key: 'type', label: 'Type', width: '92px', render: function (t) { return V.typePill(t.type); } },
        { key: 'category', label: 'Category' },
        { key: 'subCategory', label: 'Sub category' },
        { key: 'account', label: 'Account', render: function (t) {
            return U.sameName(t.type, 'Transfer') && t.toAccount ? t.account + ' → ' + t.toAccount : t.account;
          } },
        { key: 'amount', label: 'Amount', num: true, width: '120px', render: function (t) {
            return V.amountCell(t.amount, t.type);
          } },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'description', label: 'Description', cls: 'wrap', render: function (t) {
            var msg = Calc.validate(t);
            if (!msg) return t.description || '';
            return U.el('span', { class: 'desc-with-issue' }, [
              t.description || U.el('em', { class: 'hint', text: '(no description)' }),
              V.pill(msg, 'bad')
            ]);
          } },
        { key: null, label: '', stickyRight: true, width: '104px', render: function (t) {
            return U.el('div', { class: 'row-actions' }, [
              V.iconButton('edit', 'Edit', function () { editor(t); }),
              V.iconButton('copy', 'Duplicate', function () {
                var copy = Object.assign({}, t, { id: '', date: U.today() });
                editor(copy);
              }),
              V.iconButton('trash', 'Delete', function () { removeTx(t); }, 'danger')
            ]);
          } }
      ];

      var tcard = V.card('Ledger', { flush: true, hint: rows.length + ' row' + (rows.length === 1 ? '' : 's') });
      tcard.body.appendChild(V.table(columns, pageRows, {
        sortKey: state.sortKey, sortDir: state.sortDir, onSort: onSort,
        scroll: true,
        emptyTitle: 'No transactions match',
        empty: 'Widen the period or clear a filter.',
        rowClass: function (t) { return Calc.validate(t) ? 'has-issue' : null; }
      }));

      if (rows.length > state.pageSize) {
        var pager = U.el('div', { class: 'pager' });
        pager.appendChild(V.button('‹ Previous', function () { state.page = Math.max(1, state.page - 1); App.refresh(); },
          { small: true }));
        pager.appendChild(U.el('span', { class: 'count', text: 'Page ' + state.page + ' of ' + pages }));
        pager.appendChild(V.button('Next ›', function () { state.page = Math.min(pages, state.page + 1); App.refresh(); },
          { small: true }));
        pager.appendChild(U.el('span', { class: 'spacer' }));
        pager.appendChild(V.field('Rows per page', V.select([25, 50, 100, 250], state.pageSize, function (v) {
          state.pageSize = parseInt(v, 10); state.page = 1; App.refresh();
        })));
        tcard.appendChild(pager);
      }
      host.appendChild(tcard);

      function exportCsv() {
        var header = ['Date', 'Template', 'Type', 'Category', 'Sub Category', 'Account (From)',
          'To Account', 'Amount', 'Payment Method', 'Description', 'Notes', 'Check'];
        var body = rows.map(function (t) {
          return [t.date, t.template, t.type, t.category, t.subCategory, t.account, t.toAccount,
            U.num(t.amount), t.paymentMethod, t.description, t.notes, Calc.validate(t) || 'OK'];
        });
        U.downloadCsv('transactions-' + U.today() + '.csv', [header].concat(body));
        U.toast('Exported ' + body.length + ' rows.', 'good');
      }
    }
  };
}(window));
