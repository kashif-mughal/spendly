# House Expense Manager

A single-page expense manager built from `House_Expense_Manager.xlsx`. Plain HTML,
CSS and JavaScript — no frameworks, no build step, no server. All data lives in
`data/*.json`.

## Open it

Double-click **`index.html`**. That's it.

Everything works this way: all pages, all reports, all charts, adding and editing
transactions, and saving. Your changes are stored in the browser and survive
closing the tab or restarting the machine.

### Optional: serve it over http

Only needed if you want the app to write the real `data/*.json` files on disk
(see *Saving*, below).

```sh
cd house-expense-manager
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Where the data lives

| File | What's in it |
|---|---|
| `data/transactions.json` | Every transaction |
| `data/accounts.json` | Accounts and their opening balances |
| `data/templates.json` | Saved shortcuts for repeated entries |
| `data/budget.json` | Monthly budget per expense category |
| `data/categories.json` | Expense, income and transfer categories with sub categories |
| `data/lists.json` | Drop-down sources: types, payment methods, account types, months |
| `data/settings.json` | Currency and app settings |
| `data/seed.js` | Auto-generated mirror of the above — see *Editing JSON by hand* |

## Saving

1. **Browser storage** — always on. Every change is saved immediately.
2. **Real JSON files** — on Chrome or Edge, served over http, go to
   **Data & Backup → Connect data folder** and pick this project's `data` folder.
   From then on every change is written straight into the `.json` files.
   (Browsers block this for pages opened as `file://`.)
3. **Export / import** — on any browser, any time. *Data & Backup* downloads one
   combined JSON or each file separately, and imports them back.

## Editing JSON by hand

The app reads `data/*.json` when served over http, but a page opened as a file
can't fetch local files — so `data/seed.js` carries the same content in a form
that always loads. After editing the JSON directly, regenerate it:

```sh
python3 tools/build-seed.py
```

Then use **Data & Backup → Reset to bundled data** to reload it (this discards
changes held in the browser, so export a backup first if you need one).

## Pages

**Daily use** — Dashboard · Transactions · Accounts · Templates · Budget
**Reports** — Monthly Report · Category Report · Account Report
**Setup** — Categories · Lists · Data & Backup · How To Use

The year and month in the top bar drive the dashboard, the budget and the report
defaults.

## How the numbers work

```
Current balance = opening balance + income − expenses + transfers in − transfers out
Net worth       = total of every account balance
Monthly average = year total ÷ months elapsed   (12 for a past year,
                                                 the current month number for this year)
```

A **transfer** moves money between your own accounts: it leaves `Account (from)`
and arrives in `To account`, and counts as neither income nor expense.

Every transaction is checked for a date, type, amount, account and category — and
for transfers, a `To account` that differs from the source. Anything incomplete is
flagged in the ledger and listed on the Dashboard.

## Files

```
index.html              the whole app shell
css/styles.css          light + dark theme
js/util.js              formatting, dates, DOM helpers, modals, CSV
js/store.js             loading, saving, folder sync, import/export
js/calc.js              every derived figure (balances, KPIs, budgets, reports)
js/charts.js            SVG bar / line / donut / meter charts
js/ui.js                shared page blocks (cards, tables, KPIs, forms)
js/app.js               boot, theme, global period, hash router
js/views/*.js           one file per page
tools/build-seed.py     regenerates data/seed.js from data/*.json
```

## Notes on the imported data

- Imported from `House_Expense_Manager_GoogleSheets.xlsx`, which is newer than
  `House_Expense_Manager.xlsx` and a strict superset of it (16 transactions
  rather than 12, plus the `Snacks Items` template). Nothing was dropped.
- The workbook had two templates both named *Amount Transfer*; the second is now
  **Amount Transfer (Loan)** so each name is unique.
- The template *Mobile Package* points at an account called **Mobile Wallet**
  that isn't in the Accounts list — that came straight from the workbook.
  **Data & Backup → Health check** flags it; add the account or edit the template.
