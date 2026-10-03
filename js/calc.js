/* ============================================================================
   Calc - every derived figure in the app, mirroring the workbook's formulas.
     Accounts   : opening + income - expense + transfers in - transfers out
     Dashboard  : month / YTD KPIs, top categories, net worth, budget used
     Budget     : budget vs actual per expense category for the selected month
     Reports    : monthly matrix, category drill-down, per-account cash flow
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Util;

  var EXPENSE = 'Expense', INCOME = 'Income', TRANSFER = 'Transfer';

  function isType(t, type) { return U.sameName(t.type, type); }

  /* ---------------- filtering ------------------------------------------- */

  function inPeriod(t, from, to) { return U.inRange(t.date, from, to); }

  function filterTx(opts) {
    opts = opts || {};
    return Store.transactions().filter(function (t) {
      if (opts.from || opts.to) { if (!inPeriod(t, opts.from, opts.to)) return false; }
      if (opts.type && !isType(t, opts.type)) return false;
      if (opts.category && !U.sameName(t.category, opts.category)) return false;
      if (opts.subCategory && !U.sameName(t.subCategory, opts.subCategory)) return false;
      if (opts.account && !U.sameName(t.account, opts.account)) return false;
      if (opts.paymentMethod && !U.sameName(t.paymentMethod, opts.paymentMethod)) return false;
      return true;
    });
  }

  /** SUMIFS(T_Amt, ...) */
  function sum(opts) {
    return U.round2(filterTx(opts).reduce(function (acc, t) { return acc + U.num(t.amount); }, 0));
  }

  function count(opts) { return filterTx(opts).length; }

  /** Money arriving in an account via Transfer (matches on To Account). */
  function transfersIn(accountName, from, to) {
    return U.round2(Store.transactions().reduce(function (acc, t) {
      if (!isType(t, TRANSFER)) return acc;
      if (!U.sameName(t.toAccount, accountName)) return acc;
      if (!inPeriod(t, from, to)) return acc;
      return acc + U.num(t.amount);
    }, 0));
  }

  function transfersOut(accountName, from, to) {
    return sum({ type: TRANSFER, account: accountName, from: from, to: to });
  }

  /* ---------------- accounts -------------------------------------------- */

  /** One row per account with the same columns as the Accounts sheet. */
  function accountRows() {
    return Store.accounts().map(function (a) {
      var income = sum({ type: INCOME, account: a.name });
      var expense = sum({ type: EXPENSE, account: a.name });
      var tIn = transfersIn(a.name);
      var tOut = transfersOut(a.name);
      return {
        id: a.id, name: a.name, type: a.type, notes: a.notes || '',
        opening: U.round2(a.openingBalance),
        income: income, expense: expense, transfersIn: tIn, transfersOut: tOut,
        balance: U.round2(U.num(a.openingBalance) + income - expense + tIn - tOut)
      };
    });
  }

  function netWorth() {
    return U.round2(accountRows().reduce(function (acc, r) { return acc + r.balance; }, 0));
  }

  function accountNames() { return Store.accounts().map(function (a) { return a.name; }); }

  /* ---------------- categories ------------------------------------------ */

  function categoryList(type) {
    var cats = Store.categories();
    if (U.sameName(type, INCOME)) return cats.income;
    if (U.sameName(type, TRANSFER)) return cats.transfer;
    return cats.expense;
  }

  function categoryNames(type) { return categoryList(type).map(function (c) { return c.name; }); }

  function subCategories(type, categoryName) {
    var found = categoryList(type).filter(function (c) { return U.sameName(c.name, categoryName); })[0];
    return found ? found.subs.slice() : [];
  }

  /** Every category seen anywhere - the sheet plus anything used by a transaction. */
  function allExpenseCategories() {
    var names = categoryNames(EXPENSE);
    var seen = {};
    names.forEach(function (n) { seen[n.toLowerCase()] = true; });
    Store.transactions().forEach(function (t) {
      if (isType(t, EXPENSE) && t.category && !seen[t.category.toLowerCase()]) {
        seen[t.category.toLowerCase()] = true;
        names.push(t.category);
      }
    });
    return names;
  }

  function allIncomeCategories() {
    var names = categoryNames(INCOME);
    var seen = {};
    names.forEach(function (n) { seen[n.toLowerCase()] = true; });
    Store.transactions().forEach(function (t) {
      if (isType(t, INCOME) && t.category && !seen[t.category.toLowerCase()]) {
        seen[t.category.toLowerCase()] = true;
        names.push(t.category);
      }
    });
    return names;
  }

  /* ---------------- dashboard ------------------------------------------- */

  function period(year, month) {
    return { from: U.monthStart(year, month), to: U.monthEnd(year, month) };
  }

  function dashboard(year, month) {
    var p = period(year, month);
    var ytdFrom = year + '-01-01';

    var income = sum({ type: INCOME, from: p.from, to: p.to });
    var expense = sum({ type: EXPENSE, from: p.from, to: p.to });
    var transfers = sum({ type: TRANSFER, from: p.from, to: p.to });
    var incomeYtd = sum({ type: INCOME, from: ytdFrom, to: p.to });
    var expenseYtd = sum({ type: EXPENSE, from: ytdFrom, to: p.to });
    var b = budgetRows(year, month);

    return {
      from: p.from, to: p.to,
      income: income,
      expense: expense,
      net: U.round2(income - expense),
      savingsRate: U.safeDiv(income - expense, income),
      transfers: transfers,
      incomeYtd: incomeYtd,
      expenseYtd: expenseYtd,
      netYtd: U.round2(incomeYtd - expenseYtd),
      netWorth: netWorth(),
      budgetTotal: b.totalBudget,
      budgetActual: b.totalActual,
      budgetUsed: U.safeDiv(b.totalActual, b.totalBudget),
      txCount: count({ from: p.from, to: p.to })
    };
  }

  /** Top expense categories for a period, biggest first. */
  function topExpenseCategories(year, month, limit) {
    var p = period(year, month);
    var total = sum({ type: EXPENSE, from: p.from, to: p.to });
    var rows = allExpenseCategories().map(function (name) {
      var amount = sum({ type: EXPENSE, category: name, from: p.from, to: p.to });
      return { name: name, amount: amount, share: U.safeDiv(amount, total) };
    }).filter(function (r) { return r.amount > 0; });
    rows.sort(function (a, b) { return b.amount - a.amount; });
    return limit ? rows.slice(0, limit) : rows;
  }

  /* ---------------- budget ---------------------------------------------- */

  function budgetStatus(budget, actual) {
    if (U.num(budget) === 0) return actual > 0 ? 'No Budget Set' : '-';
    if (actual > budget) return 'Over Budget';
    if (actual >= 0.9 * budget) return 'Near Limit';
    return 'On Track';
  }

  function budgetRows(year, month) {
    var p = period(year, month);
    var budgets = Store.budget();
    var names = allExpenseCategories().slice();
    Object.keys(budgets).forEach(function (k) {
      if (!names.some(function (n) { return U.sameName(n, k); })) names.push(k);
    });

    var rows = names.map(function (name) {
      var budget = U.round2(budgets[name]);
      var actual = sum({ type: EXPENSE, category: name, from: p.from, to: p.to });
      return {
        category: name,
        budget: budget,
        actual: actual,
        remaining: U.round2(budget - actual),
        used: U.safeDiv(actual, budget),
        status: budgetStatus(budget, actual)
      };
    });

    var totalBudget = U.round2(rows.reduce(function (a, r) { return a + r.budget; }, 0));
    var totalActual = U.round2(rows.reduce(function (a, r) { return a + r.actual; }, 0));
    return {
      rows: rows,
      totalBudget: totalBudget,
      totalActual: totalActual,
      totalRemaining: U.round2(totalBudget - totalActual),
      totalUsed: U.safeDiv(totalActual, totalBudget),
      from: p.from, to: p.to
    };
  }

  /* ---------------- monthly report -------------------------------------- */

  /** Months counted for the "monthly average" column, as in the workbook. */
  function monthsElapsed(year) {
    var now = new Date();
    if (year < now.getFullYear()) return 12;
    if (year === now.getFullYear()) return now.getMonth() + 1;
    return 0;
  }

  function monthlyMatrix(year, type, names) {
    var divisor = Math.max(1, monthsElapsed(year));
    var rows = names.map(function (name) {
      var months = [];
      for (var m = 1; m <= 12; m++) {
        months.push(sum({ type: type, category: name, from: U.monthStart(year, m), to: U.monthEnd(year, m) }));
      }
      var total = U.round2(months.reduce(function (a, b) { return a + b; }, 0));
      return { name: name, months: months, total: total, avg: U.round2(total / divisor) };
    });

    var grandTotal = U.round2(rows.reduce(function (a, r) { return a + r.total; }, 0));
    rows.forEach(function (r) { r.share = U.safeDiv(r.total, grandTotal); });

    var monthTotals = [];
    for (var m = 0; m < 12; m++) {
      monthTotals.push(U.round2(rows.reduce(function (a, r) { return a + r.months[m]; }, 0)));
    }
    return {
      rows: rows,
      monthTotals: monthTotals,
      grandTotal: grandTotal,
      avgTotal: U.round2(grandTotal / divisor),
      monthsElapsed: monthsElapsed(year)
    };
  }

  function monthlyReport(year) {
    var expenses = monthlyMatrix(year, EXPENSE, allExpenseCategories());
    var income = monthlyMatrix(year, INCOME, allIncomeCategories());

    var summary = { income: [], expenses: [], net: [], rate: [], cumulative: [], transfers: [] };
    var running = 0;
    for (var m = 0; m < 12; m++) {
      var inc = income.monthTotals[m];
      var exp = expenses.monthTotals[m];
      var net = U.round2(inc - exp);
      running = U.round2(running + net);
      summary.income.push(inc);
      summary.expenses.push(exp);
      summary.net.push(net);
      summary.rate.push(U.safeDiv(net, inc));
      summary.cumulative.push(running);
      summary.transfers.push(sum({ type: TRANSFER, from: U.monthStart(year, m + 1), to: U.monthEnd(year, m + 1) }));
    }
    return { year: year, expenses: expenses, income: income, summary: summary };
  }

  /* ---------------- category report ------------------------------------- */

  function categoryReport(categoryName, from, to, type) {
    type = type || EXPENSE;
    var subs = subCategories(type, categoryName).slice();

    // Pick up sub categories used by transactions but missing from the sheet.
    filterTx({ type: type, category: categoryName, from: from, to: to }).forEach(function (t) {
      var name = t.subCategory || '(none)';
      if (!subs.some(function (s) { return U.sameName(s, name); })) subs.push(name);
    });

    var total = sum({ type: type, category: categoryName, from: from, to: to });

    var rows = subs.map(function (name) {
      var matching = filterTx({ type: type, category: categoryName, from: from, to: to }).filter(function (t) {
        return U.sameName(t.subCategory || '(none)', name);
      });
      var amount = U.round2(matching.reduce(function (a, t) { return a + U.num(t.amount); }, 0));
      return {
        name: name, amount: amount,
        share: U.safeDiv(amount, total),
        count: matching.length,
        avg: matching.length ? U.round2(amount / matching.length) : 0
      };
    });
    rows.sort(function (a, b) { return b.amount - a.amount; });

    var byPayment = Store.lists().paymentMethods.map(function (pm) {
      return { name: pm, amount: sum({ type: EXPENSE, paymentMethod: pm, from: from, to: to }) };
    }).filter(function (r) { return r.amount > 0; });

    var byAccount = Store.accounts().map(function (a) {
      return { name: a.name, amount: sum({ type: EXPENSE, account: a.name, from: from, to: to }) };
    }).filter(function (r) { return r.amount > 0; });

    byPayment.sort(function (a, b) { return b.amount - a.amount; });
    byAccount.sort(function (a, b) { return b.amount - a.amount; });

    return {
      category: categoryName, from: from, to: to, type: type,
      rows: rows,
      total: total,
      count: rows.reduce(function (a, r) { return a + r.count; }, 0),
      avg: function () { var c = rows.reduce(function (a, r) { return a + r.count; }, 0); return c ? U.round2(total / c) : 0; }(),
      byPayment: byPayment,
      byAccount: byAccount
    };
  }

  /* ---------------- account report -------------------------------------- */

  function accountReport(accountName, year) {
    var account = Store.accounts().filter(function (a) { return U.sameName(a.name, accountName); })[0];
    var opening = account ? U.round2(account.openingBalance) : 0;

    var months = [];
    for (var m = 1; m <= 12; m++) {
      var from = U.monthStart(year, m), to = U.monthEnd(year, m);
      var income = sum({ type: INCOME, account: accountName, from: from, to: to });
      var expense = sum({ type: EXPENSE, account: accountName, from: from, to: to });
      var tIn = transfersIn(accountName, from, to);
      var tOut = transfersOut(accountName, from, to);

      // Closing balance = opening plus every movement up to the end of this month.
      var closing = U.round2(opening
        + sum({ type: INCOME, account: accountName, to: to })
        - sum({ type: EXPENSE, account: accountName, to: to })
        + transfersIn(accountName, null, to)
        - transfersOut(accountName, null, to));

      months.push({
        month: m, label: U.MONTH_SHORT[m - 1],
        income: income, expense: expense, transfersIn: tIn, transfersOut: tOut,
        net: U.round2(income - expense + tIn - tOut),
        closing: closing
      });
    }

    var totals = ['income', 'expense', 'transfersIn', 'transfersOut', 'net'].reduce(function (acc, key) {
      acc[key] = U.round2(months.reduce(function (a, r) { return a + r[key]; }, 0));
      return acc;
    }, {});

    var current = accountRows().filter(function (r) { return U.sameName(r.name, accountName); })[0];
    return {
      account: accountName, year: year,
      opening: opening,
      current: current ? current.balance : opening,
      months: months,
      totals: totals
    };
  }

  /* ---------------- validation ------------------------------------------ */

  /** The workbook's "Check" column, as a message (null = row is fine). */
  function validate(t) {
    if (!t.date) return 'Missing date';
    if (!t.type) return 'Missing type';
    if (U.num(t.amount) <= 0) return 'Missing amount';
    if (!t.account) return 'Missing account';
    if (!t.category) return 'Missing category';
    if (isType(t, TRANSFER) && (!t.toAccount || U.sameName(t.toAccount, t.account))) return 'Check To Account';
    return null;
  }

  function problems() {
    return Store.transactions().map(function (t) {
      return { tx: t, message: validate(t) };
    }).filter(function (r) { return r.message; });
  }

  /** Names referenced by transactions that no longer exist in the setup sheets. */
  function orphanRefs() {
    var accounts = {}, out = { accounts: [], categories: [], subCategories: [], paymentMethods: [] };
    Store.accounts().forEach(function (a) { accounts[a.name.toLowerCase()] = true; });
    var methods = {};
    Store.lists().paymentMethods.forEach(function (p) { methods[p.toLowerCase()] = true; });

    var seen = {};
    Store.transactions().forEach(function (t) {
      [t.account, t.toAccount].forEach(function (name) {
        if (name && !accounts[name.toLowerCase()] && !seen['a' + name]) { seen['a' + name] = 1; out.accounts.push(name); }
      });
      if (t.paymentMethod && !methods[t.paymentMethod.toLowerCase()] && !seen['p' + t.paymentMethod]) {
        seen['p' + t.paymentMethod] = 1; out.paymentMethods.push(t.paymentMethod);
      }
      if (t.category) {
        var known = categoryNames(t.type).some(function (c) { return U.sameName(c, t.category); });
        if (!known && !seen['c' + t.category]) { seen['c' + t.category] = 1; out.categories.push(t.category); }
      }
    });

    // Templates can reference accounts too.
    Store.templates().forEach(function (tpl) {
      [tpl.account, tpl.toAccount].forEach(function (name) {
        if (name && !accounts[name.toLowerCase()] && !seen['a' + name]) { seen['a' + name] = 1; out.accounts.push(name); }
      });
    });
    return out;
  }

  /* ---------------- misc ------------------------------------------------ */

  /** Years that have data, newest first, always including the current year. */
  function activeYears() {
    var years = {};
    Store.transactions().forEach(function (t) { if (t.date) years[U.yearOf(t.date)] = true; });
    years[new Date().getFullYear()] = true;
    var settings = Store.settings();
    if (settings.defaultYear) years[settings.defaultYear] = true;
    return Object.keys(years).map(Number).filter(Boolean).sort(function (a, b) { return b - a; });
  }

  /** The most recent month that has transactions - a sensible landing period. */
  function latestPeriod() {
    var latest = '';
    Store.transactions().forEach(function (t) { if (t.date > latest) latest = t.date; });
    if (!latest) {
      var now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    return { year: U.yearOf(latest), month: U.monthOf(latest) };
  }

  global.Calc = {
    EXPENSE: EXPENSE, INCOME: INCOME, TRANSFER: TRANSFER,
    filterTx: filterTx, sum: sum, count: count,
    transfersIn: transfersIn, transfersOut: transfersOut,
    accountRows: accountRows, netWorth: netWorth, accountNames: accountNames,
    categoryList: categoryList, categoryNames: categoryNames, subCategories: subCategories,
    allExpenseCategories: allExpenseCategories, allIncomeCategories: allIncomeCategories,
    period: period, dashboard: dashboard, topExpenseCategories: topExpenseCategories,
    budgetRows: budgetRows, budgetStatus: budgetStatus,
    monthlyReport: monthlyReport, monthlyMatrix: monthlyMatrix, monthsElapsed: monthsElapsed,
    categoryReport: categoryReport, accountReport: accountReport,
    validate: validate, problems: problems, orphanRefs: orphanRefs,
    activeYears: activeYears, latestPeriod: latestPeriod
  };
}(window));
