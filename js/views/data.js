/* Data & Backup - where the data lives, export/import, folder sync, reset. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  function stamp() { return U.today(); }

  global.Views.data = {
    title: 'Data & Backup',
    render: function (host) {
      var counts = {
        transactions: Store.transactions().length,
        accounts: Store.accounts().length,
        templates: Store.templates().length,
        budget: Object.keys(Store.budget()).length,
        expenseCategories: Store.categories().expense.length,
        incomeCategories: Store.categories().income.length
      };

      host.appendChild(V.pageHead('Data & backup',
        'Your data is JSON. It is kept in this browser and can be written back to real .json files at any time.'
      ));

      /* ---- where it lives ---- */
      var folder = Store.folderName();
      var whereCard = V.card('Where your data lives');
      var rows = U.el('dl', { class: 'help-grid' });
      function row(k, v) {
        rows.appendChild(U.el('dt', { text: k }));
        rows.appendChild(U.el('dd', null, [v]));
      }
      row('Working copy', U.el('span', { text: 'This browser (localStorage) — saved automatically after every change.' }));
      var blocked = Store.folderBlockedReason();
      row('JSON files', folder
        ? U.el('span', { class: 'pos', text: 'Connected to folder "' + folder + '" — every change is written straight to its .json files.' })
        : U.el('span', { text: blocked
            ? blocked
            : 'Not connected. Connect the project\'s data folder to have changes written to the real .json files.' }));
      row('Bundled copy', U.el('span', { text: 'data/*.json shipped with the app — the starting point and the "reset" source.' }));
      whereCard.body.appendChild(rows);

      var actions = U.el('div', { class: 'page-actions', style: 'margin-top:14px' });
      if (Store.supportsFolder()) {
        if (folder) {
          actions.appendChild(V.button('Disconnect folder', function () {
            Store.disconnectFolder().then(function () {
              U.toast('Disconnected. Changes still save in this browser.');
              App.refresh();
            });
          }, { icon: 'close' }));
        } else {
          actions.appendChild(V.button('Connect data folder', function () {
            Store.connectFolder().then(function (name) {
              U.toast('Connected to "' + name + '". JSON files will be kept up to date.', 'good');
              App.refresh();
            }).catch(function (err) {
              if (err && err.name === 'AbortError') return;
              U.toast(err.message, 'bad');
            });
          }, { variant: 'primary', icon: 'folder' }));
        }
      }
      actions.appendChild(V.button('Download all JSON (one file)', exportBundle, { icon: 'download' }));
      actions.appendChild(V.button('Download each JSON file', exportEach, { icon: 'download' }));
      actions.appendChild(V.button('Import JSON…', importJson, { icon: 'upload' }));
      whereCard.body.appendChild(actions);
      host.appendChild(whereCard);

      /* ---- contents ---- */
      var statsCard = V.card('What you have');
      var grid = U.el('div', { class: 'grid cols-3' });
      grid.appendChild(V.kpi('Transactions', String(counts.transactions)));
      grid.appendChild(V.kpi('Accounts', String(counts.accounts)));
      grid.appendChild(V.kpi('Templates', String(counts.templates)));
      grid.appendChild(V.kpi('Budgets set', String(counts.budget)));
      grid.appendChild(V.kpi('Expense categories', String(counts.expenseCategories)));
      grid.appendChild(V.kpi('Income categories', String(counts.incomeCategories)));
      statsCard.body.appendChild(grid);
      host.appendChild(statsCard);

      /* ---- health check ---- */
      var problems = Calc.problems();
      var orphans = Calc.orphanRefs();
      var healthCard = V.card('Health check');
      var issues = [];
      if (problems.length) issues.push(problems.length + ' transaction row' + (problems.length === 1 ? '' : 's') + ' are incomplete.');
      if (orphans.accounts.length) issues.push('Accounts used but not set up: ' + orphans.accounts.join(', ') + '.');
      if (orphans.categories.length) issues.push('Categories used but not set up: ' + orphans.categories.join(', ') + '.');
      if (orphans.paymentMethods.length) issues.push('Payment methods used but not in Lists: ' + orphans.paymentMethods.join(', ') + '.');

      if (!issues.length) {
        healthCard.body.appendChild(V.note('Everything lines up — no missing accounts, categories or incomplete rows.'));
      } else {
        issues.forEach(function (msg) {
          healthCard.body.appendChild(U.el('div', { style: 'margin-bottom:8px' }, [V.note(msg, 'warn')]));
        });
        if (problems.length) {
          healthCard.body.appendChild(V.button('Review incomplete rows', function () { App.go('transactions'); }, { small: true }));
        }
      }
      host.appendChild(healthCard);

      /* ---- CSV exports ---- */
      var csvCard = V.card('Spreadsheet exports');
      var csvActions = U.el('div', { class: 'page-actions' });
      csvActions.appendChild(V.button('Transactions CSV', function () {
        U.downloadCsv('transactions-' + stamp() + '.csv', [
          ['Date', 'Template', 'Type', 'Category', 'Sub Category', 'Account (From)', 'To Account',
            'Amount', 'Payment Method', 'Description', 'Notes']
        ].concat(Store.transactions().map(function (t) {
          return [t.date, t.template, t.type, t.category, t.subCategory, t.account, t.toAccount,
            U.num(t.amount), t.paymentMethod, t.description, t.notes];
        })));
      }, { icon: 'download' }));
      csvActions.appendChild(V.button('Accounts CSV', function () {
        U.downloadCsv('accounts-' + stamp() + '.csv', [
          ['Account', 'Type', 'Opening Balance', 'Income', 'Expenses', 'Transfers In', 'Transfers Out', 'Current Balance', 'Notes']
        ].concat(Calc.accountRows().map(function (r) {
          return [r.name, r.type, r.opening, r.income, r.expense, r.transfersIn, r.transfersOut, r.balance, r.notes];
        })));
      }, { icon: 'download' }));
      csvActions.appendChild(V.button('Templates CSV', function () {
        U.downloadCsv('templates-' + stamp() + '.csv', [
          ['Template Name', 'Type', 'Category', 'Sub Category', 'Account (From)', 'To Account',
            'Default Amount', 'Payment Method', 'Description']
        ].concat(Store.templates().map(function (t) {
          return [t.name, t.type, t.category, t.subCategory, t.account, t.toAccount, U.num(t.amount), t.paymentMethod, t.description];
        })));
      }, { icon: 'download' }));
      csvCard.body.appendChild(csvActions);
      host.appendChild(csvCard);

      /* ---- danger zone ---- */
      var danger = V.card('Reset');
      danger.body.appendChild(U.el('p', { class: 'hint', style: 'margin-bottom:12px',
        text: 'Reloads everything from the bundled data/*.json files, discarding changes made in this browser. Export a backup first.' }));
      danger.body.appendChild(V.button('Reset to bundled data', function () {
        U.confirmBox('Reset all data',
          'This replaces your current ' + counts.transactions + ' transactions and all setup with the bundled data/*.json files. Export a backup first if you need one.',
          'Reset everything'
        ).then(function (yes) {
          if (!yes) return;
          Store.resetToBundled().then(function () {
            U.toast('Reset to the bundled data.', 'good');
          });
        });
      }, { variant: 'danger', icon: 'refresh' }));
      host.appendChild(danger);

      /* ---- handlers ---- */
      function exportBundle() {
        U.download('house-expense-manager-' + stamp() + '.json', JSON.stringify(Store.exportAll(), null, 2), 'application/json');
        U.toast('Backup downloaded.', 'good');
      }

      function exportEach() {
        var all = Store.exportAll();
        Store.COLLECTIONS.forEach(function (name, i) {
          setTimeout(function () {
            U.download(name + '.json', JSON.stringify(all[name], null, 2), 'application/json');
          }, i * 220);
        });
        U.toast('Downloading ' + Store.COLLECTIONS.length + ' JSON files — replace the ones in your data folder.', 'good');
      }

      function importJson() {
        var input = U.el('input', { type: 'file', accept: '.json,application/json', multiple: true, style: 'display:none' });
        document.body.appendChild(input);
        input.addEventListener('change', function () {
          var files = Array.prototype.slice.call(input.files || []);
          if (!files.length) { input.remove(); return; }
          Promise.all(files.map(function (f) {
            return f.text().then(function (text) {
              return { name: f.name.replace(/\.json$/i, ''), data: JSON.parse(text) };
            });
          })).then(function (parts) {
            var payload = {};
            parts.forEach(function (p) {
              if (Store.COLLECTIONS.indexOf(p.name) >= 0) payload[p.name] = p.data;
              else if (p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
                Store.COLLECTIONS.forEach(function (c) {
                  if (Object.prototype.hasOwnProperty.call(p.data, c)) payload[c] = p.data[c];
                });
              }
            });
            var names = Object.keys(payload);
            if (!names.length) { U.toast('Nothing recognisable in those files.', 'bad'); return; }
            return U.confirmBox('Import data',
              'Replace ' + names.join(', ') + ' with the contents of the selected file' + (files.length === 1 ? '' : 's') + '?',
              'Import', false
            ).then(function (yes) {
              if (!yes) return;
              Store.importAll(payload);
              U.toast('Imported ' + names.join(', ') + '.', 'good');
            });
          }).catch(function (err) {
            U.toast('Could not read that file: ' + err.message, 'bad');
          }).then(function () { input.remove(); });
        });
        input.click();
      }
    }
  };
}(window));
