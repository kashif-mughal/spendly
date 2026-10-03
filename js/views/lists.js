/* Lists - the drop-down sources: types, transfer categories, methods, months. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  var GROUPS = [
    { key: 'types', label: 'Transaction types', hint: 'Expense, Income and Transfer drive every calculation — change these only if you know why.', locked: true },
    { key: 'transferCategories', label: 'Transfer categories', hint: 'Shown as the category when the type is Transfer.' },
    { key: 'transferSubCategories', label: 'Transfer sub categories', hint: 'ATM withdrawal, wallet top-up, loan…' },
    { key: 'paymentMethods', label: 'Payment methods', hint: 'Cash, debit card, bank transfer…' },
    { key: 'accountTypes', label: 'Account types', hint: 'Bank, cash, credit card, mobile wallet…' }
  ];

  function usage(key, value) {
    var txs = Store.transactions();
    if (key === 'paymentMethods') return txs.filter(function (t) { return U.sameName(t.paymentMethod, value); }).length;
    if (key === 'types') return txs.filter(function (t) { return U.sameName(t.type, value); }).length;
    if (key === 'accountTypes') return Store.accounts().filter(function (a) { return U.sameName(a.type, value); }).length;
    if (key === 'transferCategories') return txs.filter(function (t) { return U.sameName(t.category, value); }).length;
    if (key === 'transferSubCategories') return txs.filter(function (t) { return U.sameName(t.subCategory, value); }).length;
    return 0;
  }

  global.Views.lists = {
    title: 'Lists',
    render: function (host) {
      var lists = Store.lists();

      host.appendChild(V.pageHead('Lists',
        'The sources behind every drop-down. Add items here and they appear instantly everywhere else.'
      ));

      var grid = U.el('div', { class: 'grid cols-2' });
      GROUPS.forEach(function (group) {
        var values = lists[group.key] || (lists[group.key] = []);
        var card = V.card(group.label, {
          hint: values.length + ' item' + (values.length === 1 ? '' : 's'),
          actions: [V.button('Add', function () { add(group, values); }, { small: true, icon: 'plus' })]
        });
        card.body.appendChild(U.el('p', { class: 'hint', style: 'margin-bottom:10px', text: group.hint }));

        var tags = U.el('div', { class: 'tag-row' });
        values.forEach(function (value, i) {
          var used = usage(group.key, value);
          var tag = U.el('span', { class: 'tag', title: used + ' in use' }, [
            U.el('button', {
              type: 'button', class: 'linkish', text: value,
              style: 'color:inherit;font-weight:500', title: 'Rename',
              onClick: function () { rename(group, values, i); }
            }),
            group.locked ? null : U.el('button', {
              type: 'button', 'aria-label': 'Delete ' + value, text: '×',
              onClick: function () { remove(group, values, i); }
            })
          ]);
          tags.appendChild(tag);
        });
        if (!values.length) tags.appendChild(U.el('span', { class: 'hint', text: 'Empty.' }));
        card.body.appendChild(tags);
        grid.appendChild(card);
      });

      /* Months are fixed - shown for reference only. */
      var monthCard = V.card('Months', { hint: 'Fixed' });
      monthCard.body.appendChild(U.el('div', { class: 'tag-row' },
        (lists.months || U.MONTH_NAMES).map(function (m) { return U.el('span', { class: 'tag', style: 'padding-right:10px' }, [m]); })
      ));
      grid.appendChild(monthCard);

      host.appendChild(grid);

      function add(group, values) {
        U.promptBox('Add to ' + group.label.toLowerCase(), 'Name').then(function (name) {
          if (!name) return;
          if (values.some(function (v) { return U.sameName(v, name); })) { U.toast('Already in the list.', 'bad'); return; }
          values.push(name);
          Store.commit('lists');
          U.toast('Added.', 'good');
        });
      }

      function rename(group, values, i) {
        var old = values[i];
        U.promptBox('Rename', group.label, old).then(function (name) {
          if (!name || name === old) return;
          values[i] = name;
          var txs = Store.transactions();
          if (group.key === 'paymentMethods') {
            txs.forEach(function (t) { if (U.sameName(t.paymentMethod, old)) t.paymentMethod = name; });
            Store.templates().forEach(function (t) { if (U.sameName(t.paymentMethod, old)) t.paymentMethod = name; });
          } else if (group.key === 'accountTypes') {
            Store.accounts().forEach(function (a) { if (U.sameName(a.type, old)) a.type = name; });
          } else if (group.key === 'types') {
            txs.forEach(function (t) { if (U.sameName(t.type, old)) t.type = name; });
            Store.templates().forEach(function (t) { if (U.sameName(t.type, old)) t.type = name; });
          } else if (group.key === 'transferCategories') {
            txs.forEach(function (t) { if (U.sameName(t.category, old)) t.category = name; });
            var tc = Store.categories().transfer;
            tc.forEach(function (c) { if (U.sameName(c.name, old)) c.name = name; });
          } else if (group.key === 'transferSubCategories') {
            txs.forEach(function (t) { if (U.sameName(t.subCategory, old)) t.subCategory = name; });
            Store.categories().transfer.forEach(function (c) {
              c.subs = c.subs.map(function (s) { return U.sameName(s, old) ? name : s; });
            });
          }
          Store.commit(['lists', 'transactions', 'templates', 'accounts', 'categories']);
          U.toast('Renamed.', 'good');
        });
      }

      function remove(group, values, i) {
        var value = values[i];
        var used = usage(group.key, value);
        U.confirmBox('Remove from list',
          used ? 'Remove "' + value + '"? ' + used + ' record' + (used === 1 ? '' : 's') + ' still use it and keep the text.'
               : 'Remove "' + value + '"?',
          'Remove'
        ).then(function (yes) {
          if (!yes) return;
          values.splice(i, 1);
          if (group.key === 'transferCategories') {
            Store.set('categories', Object.assign({}, Store.categories(), {
              transfer: Store.categories().transfer.filter(function (c) { return !U.sameName(c.name, value); })
            }));
          }
          if (group.key === 'transferSubCategories') {
            Store.categories().transfer.forEach(function (c) {
              c.subs = c.subs.filter(function (s) { return !U.sameName(s, value); });
            });
          }
          Store.commit(['lists', 'categories']);
          U.toast('Removed.');
        });
      }
    }
  };
}(window));
