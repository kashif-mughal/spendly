/* Shared page-building blocks used by every view. */
(function (global) {
  'use strict';
  var U = Util;

  function pageHead(title, subtitle, actions) {
    var head = U.el('div', { class: 'page-head' });
    head.appendChild(U.el('div', { class: 'page-title' }, [
      U.el('h1', { text: title }),
      subtitle ? U.el('p', { class: 'sub', text: subtitle }) : null
    ]));
    if (actions && actions.length) {
      head.appendChild(U.el('div', { class: 'page-actions' }, actions.filter(Boolean)));
    }
    return head;
  }

  function card(title, opts) {
    opts = opts || {};
    var node = U.el('section', { class: 'card' });
    if (title || opts.actions || opts.hint) {
      var head = U.el('div', { class: 'card-head' }, [U.el('h2', { text: title || '' })]);
      if (opts.hint) head.appendChild(U.el('span', { class: 'hint', text: opts.hint }));
      (opts.actions || []).forEach(function (a) { if (a) head.appendChild(a); });
      node.appendChild(head);
    }
    var body = U.el('div', { class: 'card-body' + (opts.flush ? ' flush' : '') });
    node.appendChild(body);
    node.body = body;
    return node;
  }

  function kpi(label, value, opts) {
    opts = opts || {};
    var node = U.el('div', { class: 'kpi ' + (opts.kind || '') }, [
      U.el('div', { class: 'label', text: label }),
      U.el('div', { class: 'value' + (opts.signClass ? ' ' + opts.signClass : ''), text: value })
    ]);
    if (opts.meta) node.appendChild(U.el('div', { class: 'meta', text: opts.meta }));
    if (opts.meter !== undefined) node.appendChild(Charts.meter(opts.meter));
    return node;
  }

  function button(label, onClick, opts) {
    opts = opts || {};
    return U.el('button', {
      class: 'btn ' + (opts.variant || '') + (opts.small ? ' small' : ''),
      type: 'button', onClick: onClick, title: opts.title || label
    }, [opts.icon ? icon(opts.icon) : null, label]);
  }

  var ICONS = {
    plus:    'M12 5v14M5 12h14',
    edit:    'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z',
    trash:   'M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13',
    copy:    'M9 9h10v10H9zM5 15V5h10',
    download:'M12 4v11M7 11l5 5 5-5M5 20h14',
    upload:  'M12 20V9M7 13l5-5 5 5M5 4h14',
    folder:  'M3 7h6l2 2h10v10H3z',
    refresh: 'M20 11a8 8 0 1 0-2 6M20 5v6h-6',
    filter:  'M3 5h18l-7 8v6l-4-2v-4z',
    print:   'M7 9V4h10v5M7 18H5v-6h14v6h-2M8 14h8v6H8z',
    check:   'M4 12l5 5L20 6',
    close:   'M6 6l12 12M18 6L6 18',
    chart:   'M4 20V10M10 20V4M16 20v-7M22 20H2'
  };

  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONS[name] || ICONS.check);
    svg.appendChild(p);
    return svg;
  }

  function iconButton(name, label, onClick, variant) {
    var b = U.el('button', {
      class: 'icon-btn ' + (variant || ''), type: 'button',
      title: label, 'aria-label': label, onClick: onClick
    }, [icon(name)]);
    return b;
  }

  /**
   * Build a table.
   *   columns: [{ key, label, num?, cls?, width?, render?(row), sortValue?(row) }]
   *   opts: { sortKey, sortDir, onSort, footer:[cells], empty, rowClass(row) }
   */
  function table(columns, rows, opts) {
    opts = opts || {};
    var wrap = U.el('div', { class: 'table-wrap' + (opts.scroll ? ' table-scroll' : '') });
    var t = U.el('table');

    var thead = U.el('thead');
    var hr = U.el('tr');
    columns.forEach(function (c) {
      var th = U.el('th', {
        class: (c.num ? 'num ' : '') + (c.cls || '') + (opts.onSort && c.key ? ' sortable' : '') + (c.sticky ? ' sticky-col' : '') + (c.stickyRight ? ' sticky-right' : ''),
        style: c.width ? 'width:' + c.width : null,
        scope: 'col'
      }, [c.label]);
      if (opts.onSort && c.key) {
        if (opts.sortKey === c.key) {
          th.appendChild(U.el('span', { class: 'arrow', text: opts.sortDir === 'desc' ? '▼' : '▲' }));
        }
        th.addEventListener('click', function () { opts.onSort(c.key); });
      }
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);

    var tbody = U.el('tbody');
    if (!rows.length) {
      tbody.appendChild(U.el('tr', null, [
        U.el('td', { colspan: columns.length }, [U.el('div', { class: 'empty' }, [
          U.el('strong', { text: opts.emptyTitle || 'Nothing here yet' }),
          opts.empty || 'No rows match the current filters.'
        ])])
      ]));
    } else {
      rows.forEach(function (row, i) {
        var tr = U.el('tr', { class: opts.rowClass ? opts.rowClass(row) : null });
        columns.forEach(function (c) {
          var td = U.el('td', { class: (c.num ? 'num ' : '') + (c.cls || '') + (c.sticky ? ' sticky-col' : '') + (c.stickyRight ? ' sticky-right' : '') });
          var content = c.render ? c.render(row, i) : row[c.key];
          if (content === null || content === undefined) content = '';
          if (typeof content === 'string' || typeof content === 'number') td.textContent = String(content);
          else td.appendChild(content);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    t.appendChild(tbody);

    if (opts.footer && opts.footer.length) {
      var tfoot = U.el('tfoot');
      var fr = U.el('tr');
      opts.footer.forEach(function (cell, i) {
        var col = columns[i] || {};
        var td = U.el('td', { class: (col.num ? 'num ' : '') + (col.sticky ? 'sticky-col ' : '') + (col.stickyRight ? 'sticky-right ' : '') + (cell && cell.cls ? cell.cls : '') });
        var v = cell && cell.value !== undefined ? cell.value : cell;
        if (v === null || v === undefined) v = '';
        if (typeof v === 'string' || typeof v === 'number') td.textContent = String(v);
        else td.appendChild(v);
        fr.appendChild(td);
      });
      tfoot.appendChild(fr);
      t.appendChild(tfoot);
    }

    wrap.appendChild(t);
    return wrap;
  }

  function money(v, opts) { return U.money(v, opts); }

  function amountCell(value, type) {
    var cls = type ? String(type).toLowerCase() : (U.num(value) < 0 ? 'expense' : '');
    return U.el('span', { class: 'amount ' + cls, text: U.money(value) });
  }

  function signed(value) {
    var n = U.num(value);
    return U.el('span', { class: n < 0 ? 'neg' : n > 0 ? 'pos' : '', text: U.money(n) });
  }

  function pill(label, kind) { return U.el('span', { class: 'pill ' + (kind || ''), text: label }); }

  function typePill(type) {
    return pill(type || '-', String(type || '').toLowerCase());
  }

  function statusPill(status) {
    var kind = status === 'Over Budget' ? 'bad'
      : status === 'Near Limit' ? 'warn'
      : status === 'On Track' ? 'ok'
      : status === 'No Budget Set' ? 'warn' : '';
    return pill(status, kind);
  }

  function field(label, control) {
    return U.el('label', { class: 'field' }, [U.el('span', { text: label }), control]);
  }

  function select(values, selected, onChange, placeholder) {
    var s = U.el('select');
    s.innerHTML = U.optionsHtml(values, selected, placeholder);
    if (onChange) s.addEventListener('change', function () { onChange(s.value, s); });
    return s;
  }

  function input(type, value, onChange, attrs) {
    var node = U.el('input', Object.assign({ type: type, value: value === undefined || value === null ? '' : value }, attrs || {}));
    if (onChange) node.addEventListener('change', function () { onChange(node.value, node); });
    return node;
  }

  function note(text, kind) { return U.el('div', { class: 'note ' + (kind || ''), text: text }); }

  function chartHost(id, height) {
    return U.el('div', { id: id, class: 'chart-host', style: height ? 'min-height:' + height + 'px' : null });
  }

  global.UI = {
    pageHead: pageHead, card: card, kpi: kpi, button: button, icon: icon, iconButton: iconButton,
    table: table, money: money, amountCell: amountCell, signed: signed,
    pill: pill, typePill: typePill, statusPill: statusPill,
    field: field, select: select, input: input, note: note, chartHost: chartHost
  };
}(window));
