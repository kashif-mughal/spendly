/* Accounts - balances built from opening balance plus every movement. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  function editor(account) {
    var draft = Object.assign({ id: '', name: '', type: 'Bank', openingBalance: 0, notes: '' }, account || {});
    var form = U.el('div', { class: 'form-grid' });
    form.appendChild(V.field('Account name', V.input('text', draft.name, function (v) { draft.name = v; },
      { placeholder: 'e.g. HBL' })));
    form.appendChild(V.field('Account type', V.select(Store.lists().accountTypes, draft.type, function (v) { draft.type = v; })));
    form.appendChild(V.field('Opening balance', V.input('number', draft.openingBalance, function (v) { draft.openingBalance = v; },
      { step: '0.01' })));
    var notes = V.field('Notes', V.input('text', draft.notes, function (v) { draft.notes = v; }));
    notes.classList.add('span-2');
    form.appendChild(notes);

    var wrap = U.el('div', null, [
      form,
      U.el('div', { style: 'margin-top:12px' }, [
        V.note('Credit card? Enter what you owe as a negative opening balance. Card purchases are expenses from the card; paying the bill is a transfer from the bank to the card.')
      ])
    ]);

    return U.modal({
      title: account && account.id ? 'Edit account' : 'Add account',
      body: wrap,
      okText: 'Save',
      collect: function () {
        draft.name = String(draft.name || '').trim();
        if (!draft.name) { U.toast('Give the account a name.', 'bad'); return undefined; }
        var clash = Store.accounts().some(function (a) {
          return a.id !== draft.id && U.sameName(a.name, draft.name);
        });
        if (clash) { U.toast('An account with that name already exists.', 'bad'); return undefined; }
        draft.openingBalance = U.round2(draft.openingBalance);
        return draft;
      }
    }).then(function (result) {
      if (!result) return;
      var list = Store.accounts();
      if (result.id) {
        var idx = list.findIndex(function (a) { return a.id === result.id; });
        var oldName = idx >= 0 ? list[idx].name : null;
        if (idx >= 0) list[idx] = result;
        if (oldName && oldName !== result.name) renameEverywhere(oldName, result.name);
      } else {
        result.id = U.uid('acc');
        list.push(result);
      }
      Store.commit(['accounts', 'transactions', 'templates']);
      U.toast('Account saved.', 'good');
    });
  }

  /** Keep transactions and templates pointing at a renamed account. */
  function renameEverywhere(oldName, newName) {
    Store.transactions().forEach(function (t) {
      if (U.sameName(t.account, oldName)) t.account = newName;
      if (U.sameName(t.toAccount, oldName)) t.toAccount = newName;
    });
    Store.templates().forEach(function (t) {
      if (U.sameName(t.account, oldName)) t.account = newName;
      if (U.sameName(t.toAccount, oldName)) t.toAccount = newName;
    });
  }

  function removeAccount(row) {
    var used = Store.transactions().filter(function (t) {
      return U.sameName(t.account, row.name) || U.sameName(t.toAccount, row.name);
    }).length;
    var message = used
      ? 'Delete "' + row.name + '"? ' + used + ' transaction' + (used === 1 ? '' : 's') +
        ' still reference it and will keep the name as free text.'
      : 'Delete "' + row.name + '"?';
    return U.confirmBox('Delete account', message, 'Delete').then(function (yes) {
      if (!yes) return;
      Store.set('accounts', Store.accounts().filter(function (a) { return a.id !== row.id; }));
      U.toast('Account deleted.');
    });
  }

  global.Views.accounts = {
    title: 'Accounts',
    render: function (host) {
      var rows = Calc.accountRows();
      var totals = rows.reduce(function (acc, r) {
        ['opening', 'income', 'expense', 'transfersIn', 'transfersOut', 'balance'].forEach(function (k) {
          acc[k] = U.round2((acc[k] || 0) + r[k]);
        });
        return acc;
      }, {});

      host.appendChild(V.pageHead('Accounts',
        'Every bank account, cash wallet, credit card and mobile wallet. Balance = opening + income − expenses + transfers in − transfers out.',
        [
          V.button('Add account', function () { editor(); }, { variant: 'primary', icon: 'plus' }),
          V.button('Export CSV', function () {
            U.downloadCsv('accounts-' + U.today() + '.csv', [
              ['Account', 'Type', 'Opening Balance', 'Income', 'Expenses', 'Transfers In', 'Transfers Out', 'Current Balance', 'Notes']
            ].concat(rows.map(function (r) {
              return [r.name, r.type, r.opening, r.income, r.expense, r.transfersIn, r.transfersOut, r.balance, r.notes];
            })));
          }, { icon: 'download' })
        ]
      ));

      var kpis = U.el('div', { class: 'grid cols-3', style: 'margin-bottom:16px' });
      kpis.appendChild(V.kpi('Net worth', U.money(totals.balance || 0), {
        signClass: (totals.balance || 0) < 0 ? 'neg' : 'pos', meta: rows.length + ' accounts'
      }));
      kpis.appendChild(V.kpi('Total opening balance', U.money(totals.opening || 0)));
      kpis.appendChild(V.kpi('Change since opening', U.money((totals.balance || 0) - (totals.opening || 0)), {
        signClass: (totals.balance || 0) - (totals.opening || 0) < 0 ? 'neg' : 'pos'
      }));
      host.appendChild(kpis);

      var card = V.card('All accounts', { flush: true });
      card.body.appendChild(V.table([
        { key: 'name', label: 'Account' },
        { key: 'type', label: 'Type', render: function (r) { return V.pill(r.type); } },
        { key: 'opening', label: 'Opening', num: true, render: function (r) { return U.money(r.opening); } },
        { key: 'income', label: 'Income (+)', num: true, render: function (r) { return U.money(r.income); } },
        { key: 'expense', label: 'Expenses (−)', num: true, render: function (r) { return U.money(r.expense); } },
        { key: 'transfersIn', label: 'Transfers in (+)', num: true, render: function (r) { return U.money(r.transfersIn); } },
        { key: 'transfersOut', label: 'Transfers out (−)', num: true, render: function (r) { return U.money(r.transfersOut); } },
        { key: 'balance', label: 'Current balance', num: true, render: function (r) { return V.signed(r.balance); } },
        { key: 'notes', label: 'Notes', cls: 'wrap' },
        { key: null, label: '', stickyRight: true, width: '110px', render: function (r) {
            return U.el('div', { class: 'row-actions' }, [
              V.iconButton('chart', 'Account report', function () { App.go('account-report', { account: r.name }); }),
              V.iconButton('edit', 'Edit', function () {
                editor(Store.accounts().filter(function (a) { return a.id === r.id; })[0]);
              }),
              V.iconButton('trash', 'Delete', function () { removeAccount(r); }, 'danger')
            ]);
          } }
      ], rows, {
        emptyTitle: 'No accounts yet',
        empty: 'Add your first account to start tracking balances.',
        footer: [
          'TOTAL / NET WORTH', '',
          U.money(totals.opening || 0), U.money(totals.income || 0), U.money(totals.expense || 0),
          U.money(totals.transfersIn || 0), U.money(totals.transfersOut || 0),
          V.signed(totals.balance || 0), '', ''
        ]
      }));
      host.appendChild(card);

      var chartCard = V.card('Balances');
      chartCard.body.appendChild(V.chartHost('chartAccountBalances'));
      host.appendChild(chartCard);

      Charts.hbars('#chartAccountBalances', {
        rows: rows.map(function (r) { return { label: r.name, value: r.balance, note: r.type }; }),
        title: 'Current balance by account'
      });
    }
  };
}(window));
