(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('chronoTrack')) return;

  function emptyState() {
    return {
      caseTitle: '',
      caseId: '',
      entries: []
    };
  }

  let state = emptyState();
  let filterCat = 'all';
  let filterStatus = 'all';

  function uid() {
    return 'ch_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function statusClass(st) {
    if (st === 'Documented fact') return 'good';
    if (st === 'Unresolved / disputed') return 'danger';
    if (st === 'Assumption') return 'warn';
    return 'info';
  }

  function sortedEntries() {
    return [...state.entries].sort((a, b) => {
      const ka = `${a.date || '9999-99-99'}T${a.time || '00:00'}`;
      const kb = `${b.date || '9999-99-99'}T${b.time || '00:00'}`;
      return ka.localeCompare(kb);
    });
  }

  function render() {
    const all = sortedEntries();
    const facts = all.filter((e) => e.status === 'Documented fact').length;
    const disputed = all.filter((e) => e.status === 'Unresolved / disputed').length;
    const linked = all.filter((e) => e.exhibitRef).length;

    $('chTotal').textContent = String(all.length);
    $('chFacts').textContent = String(facts);
    $('chDisputed').textContent = String(disputed);
    $('chLinked').textContent = String(linked);

    const visible = all.filter((e) => {
      const cOk = filterCat === 'all' || e.category === filterCat;
      const sOk = filterStatus === 'all' || e.status === filterStatus;
      return cOk && sOk;
    });

    $('chronoTrack').innerHTML = visible.length
      ? visible
          .map(
            (e) => `
          <article class="timeline-node">
            <div class="timeline-node-head">
              <div>
                <strong>${esc(e.date || 'Undated')}${e.time ? ' · ' + esc(e.time) : ''} — ${esc(e.title)}</strong>
              </div>
              <div class="btn-row">
                <span class="badge info">${esc(e.category)}</span>
                <span class="badge ${statusClass(e.status)}">${esc(e.status)}</span>
                <button type="button" class="btn mini danger" data-act="del-ch" data-id="${esc(e.id)}" aria-label="Delete event">×</button>
              </div>
            </div>
            <p class="small" style="margin:0 0 6px;color:#c9d6e6">${esc(e.details || '')}</p>
            <div class="small">
              ${e.actor ? `<strong>Party / Witness:</strong> ${esc(e.actor)}  ` : ''}
              ${e.exhibitRef ? `<strong>Linked Exhibit:</strong> ${esc(e.exhibitRef)}` : ''}
            </div>
          </article>`
          )
          .join('')
      : '<div class="empty">No chronology events match your current filter. Add dated events on the left to build your timeline.</div>';
  }

  $('addChBtn').addEventListener('click', () => {
    const title = $('chTitle').value.trim();
    if (!title) { alert('Enter an event headline.'); return; }
    state.entries.push({
      id: uid(),
      date: $('chDate').value,
      time: $('chTime').value.trim(),
      title,
      category: $('chCategory').value,
      actor: $('chActor').value.trim(),
      exhibitRef: $('chExhibit').value.trim(),
      status: $('chStatus').value,
      details: $('chDetails').value.trim()
    });
    ['chTime', 'chTitle', 'chActor', 'chExhibit', 'chDetails'].forEach((k) => ($(k).value = ''));
    render();
  });

  ['chCaseTitle', 'chCaseId'].forEach((k) => {
    $(k).addEventListener('input', () => {
      state.caseTitle = $('chCaseTitle').value;
      state.caseId = $('chCaseId').value;
    });
  });

  $('chFilterCat').addEventListener('change', (e) => { filterCat = e.target.value; render(); });
  $('chFilterStatus').addEventListener('change', (e) => { filterStatus = e.target.value; render(); });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="del-ch"]');
    if (!b) return;
    state.entries = state.entries.filter((x) => x.id !== b.dataset.id);
    render();
  });

  function download(name, blob) {
    const a = document.createElement('a');
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 1500);
  }

  function slug() {
    return (state.caseTitle || state.caseId || 'case-chronology').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'case-chronology';
  }

  function gated(label, format, fn) {
    const summary = {
      metrics: [
        { label: 'Chronology', value: state.caseTitle || 'Case Chronology' },
        { label: 'Export Format', value: format },
        { label: 'Total Events', value: `${state.entries.length} entries` },
        { label: 'Disputed Items', value: `${state.entries.filter((e) => e.status === 'Unresolved / disputed').length} flagged` }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  $('printChBtn').addEventListener('click', () => gated('Print Chronological Brief', 'Printable Chronology', () => {
    const rows = sortedEntries().map((e) => `<tr><td>${esc(e.date)}<br>${esc(e.time)}</td><td><strong>${esc(e.title)}</strong><br>${esc(e.details)}</td><td>${esc(e.category)}</td><td>${esc(e.actor)}</td><td>${esc(e.exhibitRef)}</td><td>${esc(e.status)}</td></tr>`).join('');
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.caseTitle || 'Case Chronology')}</title>
<style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0 0 6px}p{font-size:13px;color:#444;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5}</style></head>
<body><h1>${esc(state.caseTitle || 'Case Chronology & Fact Matrix')}</h1><p>${esc(state.caseId ? 'Reference: ' + state.caseId : '')}</p>
<table><thead><tr><th>Date / Time</th><th>Event &amp; Summary</th><th>Category</th><th>Party / Witness</th><th>Linked Exhibit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }));

  $('exportChCsv').addEventListener('click', () => gated('Export Chronology Matrix (CSV)', 'CSV Timeline', () => {
    const rows = [['Date', 'Time', 'Title', 'Category', 'PartyOrWitness', 'LinkedExhibit', 'Classification', 'Details']];
    sortedEntries().forEach((e) => rows.push([e.date, e.time, e.title, e.category, e.actor, e.exhibitRef, e.status, e.details]));
    const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    download(slug() + '-chronology.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }));

  $('exportChJson').addEventListener('click', () => gated('Save Chronology Project (JSON)', 'Project JSON', () => {
    download(slug() + '-chronology.json', new Blob([JSON.stringify({ ...state, tool: 'chronology-builder', version: 1 }, null, 2)], { type: 'application/json' }));
  }));

  $('openChBtn').addEventListener('click', () => $('openChFile').click());
  $('openChFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = { ...emptyState(), ...d, entries: Array.isArray(d.entries) ? d.entries : [] };
        $('chCaseTitle').value = state.caseTitle;
        $('chCaseId').value = state.caseId;
        render();
      } catch (err) {
        alert('Could not open that chronology JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newChBtn').addEventListener('click', () => {
    if (!confirm('Start a blank chronology?')) return;
    state = emptyState();
    $('chCaseTitle').value = '';
    $('chCaseId').value = '';
    render();
  });

  render();
})();
