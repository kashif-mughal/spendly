/* Categories - manage expense & income categories and their sub categories. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  var state = { kind: 'expense' };

  function usageCount(kind, category, sub) {
    var type = kind === 'income' ? 'Income' : kind === 'transfer' ? 'Transfer' : 'Expense';
    return Store.transactions().filter(function (t) {
      if (!U.sameName(t.type, type)) return false;
      if (!U.sameName(t.category, category)) return false;
      return sub === undefined || U.sameName(t.subCategory, sub);
    }).length;
  }

  function renameInTransactions(kind, oldCat, newCat, oldSub, newSub) {
    var type = kind === 'income' ? 'Income' : kind === 'transfer' ? 'Transfer' : 'Expense';
    Store.transactions().forEach(function (t) {
      if (!U.sameName(t.type, type)) return;
      if (oldSub !== undefined) {
        if (U.sameName(t.category, oldCat) && U.sameName(t.subCategory, oldSub)) t.subCategory = newSub;
      } else if (U.sameName(t.category, oldCat)) {
        t.category = newCat;
      }
    });
    Store.templates().forEach(function (t) {
      if (!U.sameName(t.type, type)) return;
      if (oldSub !== undefined) {
        if (U.sameName(t.category, oldCat) && U.sameName(t.subCategory, oldSub)) t.subCategory = newSub;
      } else if (U.sameName(t.category, oldCat)) {
        t.category = newCat;
      }
    });
  }

  global.Views.categories = {
    title: 'Categories',
    render: function (host) {
      var cats = Store.categories();
      var list = cats[state.kind] || [];

      host.appendChild(V.pageHead('Categories',
        'Each category holds its own sub categories. Renaming one updates every transaction and template that uses it.',
        [
          V.field('Set', V.select([
            { value: 'expense', label: 'Expense categories' },
            { value: 'income', label: 'Income categories' },
            { value: 'transfer', label: 'Transfer categories' }
          ], state.kind, function (v) { state.kind = v; App.refresh(); })),
          V.button('Add category', addCategory, { variant: 'primary', icon: 'plus' })
        ]
      ));

      var totalSubs = list.reduce(function (a, c) { return a + c.subs.length; }, 0);
      host.appendChild(U.el('div', { style: 'margin-bottom:16px' }, [
        V.note(list.length + ' categories and ' + totalSubs + ' sub categories in this set.')
      ]));

      var grid = U.el('div', { class: 'grid cols-2' });
      list.forEach(function (cat, ci) {
        var used = usageCount(state.kind, cat.name);
        var card = V.card(cat.name, {
          hint: used + ' transaction' + (used === 1 ? '' : 's'),
          actions: [
            V.iconButton('edit', 'Rename category', function () { renameCategory(ci); }),
            V.iconButton('trash', 'Delete category', function () { deleteCategory(ci); }, 'danger')
          ]
        });

        var tags = U.el('div', { class: 'tag-row' });
        cat.subs.forEach(function (sub, si) {
          var subUsed = usageCount(state.kind, cat.name, sub);
          var tag = U.el('span', { class: 'tag', title: subUsed + ' transactions' }, [
            U.el('button', {
              type: 'button', class: 'linkish', text: sub,
              style: 'color:inherit;font-weight:500', title: 'Rename',
              onClick: function () { renameSub(ci, si); }
            }),
            U.el('button', { type: 'button', 'aria-label': 'Delete ' + sub, text: '×',
              onClick: function () { deleteSub(ci, si); } })
          ]);
          tags.appendChild(tag);
        });
        if (!cat.subs.length) tags.appendChild(U.el('span', { class: 'hint', text: 'No sub categories yet.' }));
        card.body.appendChild(tags);
        card.body.appendChild(U.el('div', { style: 'margin-top:12px' }, [
          V.button('Add sub category', function () { addSub(ci); }, { small: true, icon: 'plus' })
        ]));
        grid.appendChild(card);
      });

      if (!list.length) {
        var empty = V.card('No categories');
        empty.body.appendChild(V.note('Add your first category to start classifying transactions.', 'warn'));
        grid.appendChild(empty);
      }
      host.appendChild(grid);

      /* ---- actions ---- */
      function addCategory() {
        U.promptBox('Add category', 'Category name').then(function (name) {
          if (!name) return;
          if (list.some(function (c) { return U.sameName(c.name, name); })) {
            U.toast('That category already exists.', 'bad'); return;
          }
          list.push({ name: name, subs: [] });
          Store.commit('categories');
          U.toast('Category added.', 'good');
        });
      }

      function renameCategory(ci) {
        var cat = list[ci];
        U.promptBox('Rename category', 'New name', cat.name).then(function (name) {
          if (!name || name === cat.name) return;
          if (list.some(function (c, i) { return i !== ci && U.sameName(c.name, name); })) {
            U.toast('That category already exists.', 'bad'); return;
          }
          var old = cat.name;
          cat.name = name;
          renameInTransactions(state.kind, old, name);
          var budgets = Store.budget();
          if (Object.prototype.hasOwnProperty.call(budgets, old)) {
            budgets[name] = budgets[old];
            delete budgets[old];
          }
          Store.commit(['categories', 'transactions', 'templates', 'budget']);
          U.toast('Renamed to "' + name + '".', 'good');
        });
      }

      function deleteCategory(ci) {
        var cat = list[ci];
        var used = usageCount(state.kind, cat.name);
        U.confirmBox('Delete category',
          used ? 'Delete "' + cat.name + '"? ' + used + ' transaction' + (used === 1 ? '' : 's') +
                 ' keep the name as free text and will show up as an unknown category.'
               : 'Delete "' + cat.name + '" and its ' + cat.subs.length + ' sub categories?',
          'Delete'
        ).then(function (yes) {
          if (!yes) return;
          list.splice(ci, 1);
          Store.commit('categories');
          U.toast('Category deleted.');
        });
      }

      function addSub(ci) {
        U.promptBox('Add sub category', 'Sub category under "' + list[ci].name + '"').then(function (name) {
          if (!name) return;
          if (list[ci].subs.some(function (s) { return U.sameName(s, name); })) {
            U.toast('That sub category already exists.', 'bad'); return;
          }
          list[ci].subs.push(name);
          Store.commit('categories');
          U.toast('Sub category added.', 'good');
        });
      }

      function renameSub(ci, si) {
        var old = list[ci].subs[si];
        U.promptBox('Rename sub category', 'New name', old).then(function (name) {
          if (!name || name === old) return;
          list[ci].subs[si] = name;
          renameInTransactions(state.kind, list[ci].name, list[ci].name, old, name);
          Store.commit(['categories', 'transactions', 'templates']);
          U.toast('Renamed to "' + name + '".', 'good');
        });
      }

      function deleteSub(ci, si) {
        var sub = list[ci].subs[si];
        var used = usageCount(state.kind, list[ci].name, sub);
        U.confirmBox('Delete sub category',
          used ? 'Delete "' + sub + '"? ' + used + ' transaction' + (used === 1 ? '' : 's') + ' still use it.'
               : 'Delete "' + sub + '"?',
          'Delete'
        ).then(function (yes) {
          if (!yes) return;
          list[ci].subs.splice(si, 1);
          Store.commit('categories');
          U.toast('Sub category deleted.');
        });
      }
    }
  };
}(window));
