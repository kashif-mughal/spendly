/* ============================================================================
   Store - loads the JSON data, keeps it in memory, and persists it.
   No backend. Persistence order of preference:
     1. A data folder you connect once (File System Access API, Chrome/Edge) -
        writes the real data/*.json files on disk.
     2. localStorage - always on, survives reloads, per browser.
   The bundled data/*.json (mirrored into data/seed.js so the app also works
   from file://) is the starting point and the "reset" source.
   ========================================================================== */
(function (global) {
  'use strict';

  var COLLECTIONS = ['settings', 'lists', 'categories', 'accounts', 'templates', 'budget', 'transactions'];
  var LS_KEY = 'house-expense-manager/v1';
  var LS_PREFS = 'house-expense-manager/prefs';
  var IDB_NAME = 'house-expense-manager';
  var IDB_STORE = 'handles';
  var IDB_TIMEOUT = 1200;

  /* The File System Access API reaches the machine the browser runs on, never
     the server's disk - so on a deployed origin this syncs to a folder on the
     viewer's own computer. That is allowed on purpose: it is how a deployed
     copy keeps the local data/*.json in step. It needs a real origin, though;
     from file:// the picker throws and IndexedDB stalls. */

  /* Null when the folder feature can run here, otherwise why it cannot. */
  function folderBlockedReason() {
    if (location.protocol === 'file:') {
      return 'Opening the page as a file blocks folder access. Serve it over http (see README) or use Export instead.';
    }
    if (!global.isSecureContext) {
      return 'Folder access needs a secure page. Use https, or http://localhost, or Export instead.';
    }
    if (!global.indexedDB || !global.showDirectoryPicker) {
      return 'This browser cannot write files directly - Chrome and Edge can. Use Export instead.';
    }
    return null;
  }

  function folderCapable() {
    return folderBlockedReason() === null;
  }

  var DEFAULTS = {
    settings: { currency: 'PKR', currencySymbol: 'Rs', appName: 'House Expense Manager', version: '1.0' },
    lists: {
      types: ['Expense', 'Income', 'Transfer'],
      transferCategories: ['Account Transfer'], transferSubCategories: [],
      paymentMethods: [], accountTypes: [], months: Util ? Util.MONTH_NAMES : []
    },
    categories: { expense: [], income: [], transfer: [] },
    accounts: [], templates: [], budget: {}, transactions: []
  };

  var state = null;          // the live data
  var prefs = {};            // UI preferences (theme, selected period, page size)
  var dirHandle = null;      // connected data folder, when granted
  var listeners = [];
  var saveTimer = null;
  var pendingDirty = {};

  /* ---------------- tiny IndexedDB wrapper (for the folder handle) ------- */

  /* Resolves null rather than rejecting, and never hangs: opened from file://
     Chrome returns a request that fires no event at all, so every call races a
     timeout. Nothing here is load-bearing - it only remembers a folder handle. */
  function idb(mode, fn) {
    if (!folderCapable()) return Promise.resolve(null);
    var work = new Promise(function (resolve) {
      var open;
      try { open = indexedDB.open(IDB_NAME, 1); } catch (e) { return resolve(null); }
      open.onupgradeneeded = function () {
        if (!open.result.objectStoreNames.contains(IDB_STORE)) open.result.createObjectStore(IDB_STORE);
      };
      open.onerror = function () { resolve(null); };
      open.onblocked = function () { resolve(null); };
      open.onsuccess = function () {
        var db = open.result;
        try {
          var tx = db.transaction(IDB_STORE, mode);
          var req = fn(tx.objectStore(IDB_STORE));
          tx.oncomplete = function () { db.close(); resolve(req ? req.result : null); };
          tx.onerror = function () { db.close(); resolve(null); };
          tx.onabort = function () { db.close(); resolve(null); };
        } catch (e) { db.close(); resolve(null); }
      };
    });
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, IDB_TIMEOUT); });
    return Promise.race([work, timeout]);
  }

  var idbGet = function (key) { return idb('readonly', function (s) { return s.get(key); }); };
  var idbSet = function (key, val) { return idb('readwrite', function (s) { return s.put(val, key); }); };
  var idbDel = function (key) { return idb('readwrite', function (s) { return s.delete(key); }); };

  /* ---------------- preferences ----------------------------------------- */

  function loadPrefs() {
    try { prefs = JSON.parse(localStorage.getItem(LS_PREFS)) || {}; } catch (e) { prefs = {}; }
    return prefs;
  }
  function pref(key, value) {
    if (arguments.length === 1) return prefs[key];
    prefs[key] = value;
    try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch (e) { /* quota / private mode */ }
    return value;
  }

  /* ---------------- loading --------------------------------------------- */

  function normalise(raw) {
    var out = {};
    COLLECTIONS.forEach(function (name) {
      var v = raw && raw[name];
      var def = DEFAULTS[name];
      if (Array.isArray(def)) out[name] = Array.isArray(v) ? v : def.slice();
      else out[name] = (v && typeof v === 'object') ? Object.assign({}, def, v) : JSON.parse(JSON.stringify(def));
    });

    // Guarantee every record has a stable id.
    out.accounts.forEach(function (a, i) { if (!a.id) a.id = 'acc_' + (i + 1); });
    out.templates.forEach(function (t, i) { if (!t.id) t.id = 'tpl_' + (i + 1); });
    out.transactions.forEach(function (t, i) {
      if (!t.id) t.id = 'txn_' + Util.pad2(i + 1);
      t.date = Util.isoDate(t.date);
      t.amount = Util.round2(t.amount);
    });
    ['expense', 'income', 'transfer'].forEach(function (k) {
      if (!Array.isArray(out.categories[k])) out.categories[k] = [];
      out.categories[k].forEach(function (c) { if (!Array.isArray(c.subs)) c.subs = []; });
    });
    if (!out.lists.months || !out.lists.months.length) out.lists.months = Util.MONTH_NAMES.slice();
    return out;
  }

  function fromSeed() {
    return global.HEM_SEED ? JSON.parse(JSON.stringify(global.HEM_SEED)) : {};
  }

  /** Read the bundled data/*.json over http(s); falls back to the seed script. */
  function fromBundledFiles() {
    if (location.protocol === 'file:' || !global.fetch) return Promise.resolve(fromSeed());
    return Promise.all(COLLECTIONS.map(function (name) {
      return fetch('data/' + name + '.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    })).then(function (parts) {
      var seed = fromSeed();
      var raw = {};
      COLLECTIONS.forEach(function (name, i) {
        raw[name] = parts[i] !== null && parts[i] !== undefined ? parts[i] : seed[name];
      });
      return raw;
    }).catch(function () { return fromSeed(); });
  }

  function fromLocalStorage() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function fromFolder(handle) {
    return Promise.all(COLLECTIONS.map(function (name) {
      return handle.getFileHandle(name + '.json')
        .then(function (fh) { return fh.getFile(); })
        .then(function (file) { return file.text(); })
        .then(function (text) { return JSON.parse(text); })
        .catch(function () { return null; });
    })).then(function (parts) {
      var raw = {}, any = false;
      COLLECTIONS.forEach(function (name, i) {
        if (parts[i] !== null) { raw[name] = parts[i]; any = true; }
      });
      return any ? raw : null;
    });
  }

  /** Boot: folder (if still permitted) -> localStorage -> bundled JSON. */
  function load() {
    loadPrefs();
    return restoreFolderHandle()
      .then(function (handle) {
        if (!handle) return null;
        dirHandle = handle;
        return fromFolder(handle);
      })
      .catch(function () { return null; })
      .then(function (fromDisk) {
        if (fromDisk) { state = normalise(fromDisk); return { source: 'folder' }; }
        var local = fromLocalStorage();
        if (local) { state = normalise(local); return { source: 'localStorage' }; }
        return fromBundledFiles().then(function (raw) {
          state = normalise(raw);
          saveLocal();
          return { source: location.protocol === 'file:' ? 'bundled (seed.js)' : 'bundled data/*.json' };
        });
      });
  }

  function restoreFolderHandle() {
    if (!folderCapable()) return Promise.resolve(null);
    return idbGet('dataDir').then(function (handle) {
      if (!handle) return null;
      return handle.queryPermission({ mode: 'readwrite' }).then(function (perm) {
        return perm === 'granted' ? handle : null;
      });
    }).catch(function () { return null; });
  }

  /* ---------------- saving ---------------------------------------------- */

  function saveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      Util.toast('Browser storage is full - export a backup from Data & Backup.', 'bad');
      return false;
    }
  }

  function writeFile(handle, name, value) {
    return handle.getFileHandle(name + '.json', { create: true })
      .then(function (fh) { return fh.createWritable(); })
      .then(function (w) {
        return w.write(JSON.stringify(value, null, 2) + '\n').then(function () { return w.close(); });
      });
  }

  function saveFolder(names) {
    if (!dirHandle) return Promise.resolve(false);
    return Promise.all(names.map(function (n) { return writeFile(dirHandle, n, state[n]); }))
      .then(function () { return true; })
      .catch(function (err) {
        Util.toast('Could not write to the data folder: ' + err.message, 'bad');
        dirHandle = null;
        return false;
      });
  }

  function setStatus(cls, text) {
    var node = document.getElementById('saveState');
    if (!node) return;
    node.className = 'save-state ' + (cls || '');
    node.textContent = text || '';
  }

  /** Mark collections changed; writes are debounced and then broadcast. */
  function commit(names, opts) {
    (Array.isArray(names) ? names : [names]).forEach(function (n) { pendingDirty[n] = true; });
    opts = opts || {};
    if (opts.silent !== true) emit();
    setStatus('saving', 'Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 180);
  }

  function flush() {
    clearTimeout(saveTimer);
    var names = Object.keys(pendingDirty);
    if (!names.length) return Promise.resolve();
    pendingDirty = {};
    var ok = saveLocal();
    return saveFolder(names).then(function (wroteFolder) {
      setStatus(ok ? 'saved' : 'error', wroteFolder ? 'Saved to folder' : (ok ? 'Saved' : 'Not saved'));
      setTimeout(function () {
        var node = document.getElementById('saveState');
        if (node && node.textContent.indexOf('Saved') === 0) setStatus('', '');
      }, 2200);
    });
  }

  /* ---------------- folder connection ----------------------------------- */

  function supportsFolder() { return folderCapable(); }

  function connectFolder() {
    var why = folderBlockedReason();
    if (why) return Promise.reject(new Error(why));
    return global.showDirectoryPicker({ mode: 'readwrite', id: 'hem-data' })
      .then(function (handle) {
        dirHandle = handle;
        return idbSet('dataDir', handle).then(function () {
          return Promise.all(COLLECTIONS.map(function (n) { return writeFile(handle, n, state[n]); }));
        });
      })
      .then(function () { return dirHandle.name; });
  }

  function disconnectFolder() {
    dirHandle = null;
    return idbDel('dataDir');
  }

  function folderName() { return dirHandle ? dirHandle.name : null; }

  /* ---------------- reset / import -------------------------------------- */

  function resetToBundled() {
    return fromBundledFiles().then(function (raw) {
      state = normalise(raw);
      return commit(COLLECTIONS);
    });
  }

  function importAll(raw) {
    var merged = {};
    COLLECTIONS.forEach(function (n) {
      merged[n] = Object.prototype.hasOwnProperty.call(raw, n) ? raw[n] : state[n];
    });
    state = normalise(merged);
    return commit(COLLECTIONS);
  }

  function exportAll() {
    var out = {};
    COLLECTIONS.forEach(function (n) { out[n] = state[n]; });
    out._exportedAt = new Date().toISOString();
    out._app = 'House Expense Manager';
    return out;
  }

  /* ---------------- subscriptions --------------------------------------- */

  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }

  /* ---------------- accessors ------------------------------------------- */

  function get(name) { return state[name]; }
  function set(name, value) { state[name] = value; commit(name); }

  global.Store = {
    COLLECTIONS: COLLECTIONS,
    load: load, commit: commit, flush: flush, emit: emit, onChange: onChange,
    get: get, set: set,
    transactions: function () { return state.transactions; },
    accounts:     function () { return state.accounts; },
    templates:    function () { return state.templates; },
    budget:       function () { return state.budget; },
    categories:   function () { return state.categories; },
    lists:        function () { return state.lists; },
    settings:     function () { return state.settings; },
    pref: pref,
    supportsFolder: supportsFolder, folderBlockedReason: folderBlockedReason,
    connectFolder: connectFolder,
    disconnectFolder: disconnectFolder, folderName: folderName,
    resetToBundled: resetToBundled, importAll: importAll, exportAll: exportAll
  };
}(window));
