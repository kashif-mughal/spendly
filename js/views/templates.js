/* Templates - saved shortcuts that pre-fill a transaction. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  function editor(tpl) {
    var draft = Object.assign({
      id: '', name: '', type: 'Expense', category: '', subCategory: '',
      account: '', toAccount: '', amount: 0, paymentMethod: '', description: ''
    }, tpl || {});
    var form = U.el('div');

    function build() {
      form.innerHTML = '';
      var isTransfer = U.sameName(draft.type, 'Transfer');
      var grid = U.el('div', { class: 'form-grid' });

      grid.appendChild(V.field('Template name', V.input('text', draft.name, function (v) { draft.name = v; },
        { placeholder: 'e.g. Electricity Bill' })));
      grid.appendChild(V.field('Type', V.select(Store.lists().types, draft.type, function (v) {
        draft.type = v; draft.category = ''; draft.subCategory = ''; build();
      })));
      grid.appendChild(V.field('Category', V.select(Calc.categoryNames(draft.type), draft.category, function (v) {
        draft.category = v; draft.subCategory = ''; build();
      }, '— pick —')));
      grid.appendChild(V.field('Sub category', V.select(Calc.subCategories(draft.type, draft.category), draft.subCategory,
        function (v) { draft.subCategory = v; }, '— pick —')));
      grid.appendChild(V.field(isTransfer ? 'Account (from)' : 'Account',
        V.select(Calc.accountNames(), draft.account, function (v) { draft.account = v; }, '— pick —')));
      if (isTransfer) {
        grid.appendChild(V.field('To account', V.select(Calc.accountNames(), draft.toAccount,
          function (v) { draft.toAccount = v; }, '— pick —')));
      }
      grid.appendChild(V.field('Default amount', V.input('number', draft.amount, function (v) { draft.amount = v; },
        { step: '0.01', min: '0' })));
      grid.appendChild(V.field('Payment method', V.select(Store.lists().paymentMethods, draft.paymentMethod,
        function (v) { draft.paymentMethod = v; }, '— pick —')));
      var desc = V.field('Description', V.input('text', draft.description, function (v) { draft.description = v; }));
      desc.classList.add('span-2');
      grid.appendChild(desc);

      form.appendChild(grid);
      form.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        V.note('Leave the default amount at 0 for anything that changes every month — you type the amount when you record it.')
      ]));
    }
    build();

    return U.modal({
      title: tpl && tpl.id ? 'Edit template' : 'Add template',
      body: form,
      okText: 'Save',
      collect: function () {
        draft.name = String(draft.name || '').trim();
        if (!draft.name) { U.toast('Give the template a name.', 'bad'); return undefined; }
        var clash = Store.templates().some(function (t) { return t.id !== draft.id && U.sameName(t.name, draft.name); });
        if (clash) { U.toast('A template with that name already exists.', 'bad'); return undefined; }
        if (!draft.category) { U.toast('Pick a category.', 'bad'); return undefined; }
        draft.amount = U.round2(draft.amount);
        return draft;
      }
    }).then(function (result) {
      if (!result) return;
      var list = Store.templates();
      if (result.id) {
        var idx = list.findIndex(function (t) { return t.id === result.id; });
        if (idx >= 0) list[idx] = result;
      } else {
        result.id = U.uid('tpl');
        list.push(result);
      }
      Store.commit('templates');
      U.toast('Template saved.', 'good');
    });
  }

  global.Views.templates = {
    title: 'Templates',
    render: function (host) {
      var rows = Store.templates();
      var usage = {};
      Store.transactions().forEach(function (t) {
        if (t.template) usage[t.template] = (usage[t.template] || 0) + 1;
      });

      host.appendChild(V.pageHead('Templates',
        'Shortcuts for entries you repeat. Picking one on a transaction fills in the type, category, account, amount, method and description.',
        [V.button('Add template', function () { editor(); }, { variant: 'primary', icon: 'plus' })]
      ));

      var card = V.card(rows.length + ' template' + (rows.length === 1 ? '' : 's'), { flush: true });
      card.body.appendChild(V.table([
        { key: 'name', label: 'Template' },
        { key: 'type', label: 'Type', render: function (r) { return V.typePill(r.type); } },
        { key: 'category', label: 'Category' },
        { key: 'subCategory', label: 'Sub category' },
        { key: 'account', label: 'Account', render: function (r) {
            return r.toAccount ? r.account + ' → ' + r.toAccount : r.account;
          } },
        { key: 'amount', label: 'Default amount', num: true, render: function (r) {
            return U.num(r.amount) ? U.money(r.amount) : U.el('span', { class: 'pill', text: 'ask each time' });
          } },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'description', label: 'Description', cls: 'wrap' },
        { key: 'used', label: 'Used', num: true, render: function (r) { return usage[r.name] || 0; } },
        { key: null, label: '', stickyRight: true, width: '110px', render: function (r) {
            return U.el('div', { class: 'row-actions' }, [
              V.iconButton('plus', 'Use this template', function () {
                App.go('transactions', { add: '1', template: r.name });
              }),
              V.iconButton('edit', 'Edit', function () { editor(r); }),
              V.iconButton('trash', 'Delete', function () {
                U.confirmBox('Delete template', 'Delete "' + r.name + '"? Transactions already recorded keep their details.', 'Delete')
                  .then(function (yes) {
                    if (!yes) return;
                    Store.set('templates', Store.templates().filter(function (t) { return t.id !== r.id; }));
                    U.toast('Template deleted.');
                  });
              }, 'danger')
            ]);
          } }
      ], rows, {
        emptyTitle: 'No templates yet',
        empty: 'Create one for rent, bills, salary or an ATM withdrawal.'
      }));
      host.appendChild(card);
    }
  };
}(window));
