/* How To Use - the guidance from the workbook, kept with the app. */
(function (global) {
  'use strict';
  var U = Util, V = UI;
  global.Views = global.Views || {};

  function dl(pairs) {
    var list = U.el('dl', { class: 'help-grid' });
    pairs.forEach(function (p) {
      list.appendChild(U.el('dt', { text: p[0] }));
      list.appendChild(U.el('dd', { text: p[1] }));
    });
    return list;
  }

  global.Views.help = {
    title: 'How To Use',
    render: function (host) {
      host.appendChild(V.pageHead('How to use',
        Store.settings().appName + ' · currency ' + Store.settings().currency + ' · version ' + (Store.settings().version || '1.0')));

      var quick = V.card('Quick start');
      quick.body.appendChild(dl([
        ['1. Accounts', 'List every bank account, cash wallet, credit card and mobile wallet with its opening balance.'],
        ['2. Categories', 'Review the expense and income categories. Add your own, and sub categories under them.'],
        ['3. Templates', 'Create shortcuts for repeated entries — rent, bills, salary, ATM withdrawal.'],
        ['4. Budget', 'Set a monthly budget per expense category.'],
        ['5. Transactions', 'Record every entry. The Check column flags anything incomplete.'],
        ['6. Dashboard', 'Pick a year and month in the top bar to drive every KPI, table and chart.']
      ]));
      host.appendChild(quick);

      var recording = V.card('Recording transactions');
      recording.body.appendChild(dl([
        ['Expense / Income', 'Date → Type → Category → Sub category (filtered by category) → Account → Amount.'],
        ['Using a template', 'Pick a template and the type, category, sub category, account, amount, payment method and description fill in automatically. Type over any of them — only that one row changes.'],
        ['Transfers', 'Type = Transfer. Account (from) is where money leaves, To account is where it arrives. Transfers move money between your own accounts and are never counted as income or expense.'],
        ['Credit cards', 'Purchases on the card are an expense from the "Credit Card" account, so its balance goes negative — that is what you owe. Paying the bill is a transfer from the bank to the card.'],
        ['Cash withdrawal', 'A transfer from the bank to the cash account — it is not an expense.'],
        ['Lending money', 'A transfer to the account you track the loan in; when it comes back, transfer it the other way.']
      ]));
      host.appendChild(recording);

      var reports = V.card('The reports');
      reports.body.appendChild(dl([
        ['Dashboard', 'KPIs for the selected month and year to date, the top expense categories, the yearly trend and current account balances.'],
        ['Budget', 'Budget against actual spend per category for the selected month, with a status for each: on track, near limit (90% or more), or over budget.'],
        ['Monthly report', 'Every category against every month of a year, with totals, a monthly average and each category\'s share — plus the income, expense, savings and cumulative savings summary.'],
        ['Category report', 'One category over any date range, broken down by sub category, with the matching transactions and how the spend splits across payment methods and accounts.'],
        ['Account report', 'One account month by month: money in, money out, net flow and the closing balance after each month.']
      ]));
      host.appendChild(reports);

      var balances = V.card('How balances are worked out');
      balances.body.appendChild(V.note(
        'Current balance = opening balance + income − expenses + transfers in − transfers out. Net worth is the total of every account balance.'
      ));
      balances.body.appendChild(U.el('div', { style: 'margin-top:12px' }, [dl([
        ['Income', 'Adds to the account named in Account.'],
        ['Expense', 'Subtracts from the account named in Account.'],
        ['Transfer', 'Subtracts from Account (from) and adds to To account. Neither side counts as income or expense.'],
        ['Monthly average', 'A year\'s total divided by the months elapsed — 12 for a past year, the current month number for this year.']
      ])]));
      host.appendChild(balances);

      var data = V.card('Where your data is kept');
      data.body.appendChild(dl([
        ['JSON files', 'Everything lives in plain JSON: transactions, accounts, templates, budget, categories, lists and settings.'],
        ['In this browser', 'Every change is saved immediately in this browser, so it survives a reload and being closed.'],
        ['Real files on disk', 'On Chrome or Edge you can connect the project\'s data folder once from Data & Backup, and every change is written straight into the .json files.'],
        ['Backups', 'Download one combined JSON, or each file separately, and import them back at any time.']
      ]));
      data.body.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        V.button('Open Data & Backup', function () { App.go('data'); }, { small: true })
      ]));
      host.appendChild(data);

      var tips = V.card('Tips');
      tips.body.appendChild(dl([
        ['Check column', 'Every transaction is checked for a date, type, amount, account, category — and for transfers, a different To account.'],
        ['Templates with amount 0', 'Use 0 as the default amount for anything that changes each month; you type the real amount when recording.'],
        ['Renaming', 'Renaming an account, category or sub category updates every transaction and template that uses it.'],
        ['Keyboard', 'In any dialog, Enter saves and Escape cancels.'],
        ['Printing', 'Dashboard and the monthly report print cleanly — the navigation is hidden automatically.']
      ]));
      host.appendChild(tips);
    }
  };
}(window));
