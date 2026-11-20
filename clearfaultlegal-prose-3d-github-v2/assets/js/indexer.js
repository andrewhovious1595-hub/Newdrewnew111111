(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('indexerTableBody')) return;

  function emptyState() {
    return {
      caseTitle: '',
      caseNumber: '',
      partyRole: 'plaintiff', // 'plaintiff' -> Exhibit 1, 2... | 'defendant' -> Exhibit A, B...
      batesPrefix: 'CFL',
      batesStart: 1,
      batesPad: 5,
      docs: []
    };
  }

  let state = emptyState();
  let filterCat = 'all';

  function uid() {
    return 'doc_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function exhibitLabel(index) {
    if (state.partyRole === 'defendant') {
      let n = index;
      let label = '';
      do {
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return `Exhibit ${label}`;
    }
    return `Exhibit ${index + 1}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Manual entry';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function computeRows() {
    let cursor = Math.max(1, parseInt(state.batesStart, 10) || 1);
    const pad = Math.max(3, Math.min(8, parseInt(state.batesPad, 10) || 5));
    const prefix = (state.batesPrefix || 'DOC').trim().toUpperCase();

    return state.docs.map((doc, idx) => {
      const pages = Math.max(1, parseInt(doc.pages, 10) || 1);
      const startCode = `${prefix}-${String(cursor).padStart(pad, '0')}`;
      const endCode = `${prefix}-${String(cursor + pages - 1).padStart(pad, '0')}`;
      cursor += pages;
      return {
        ...doc,
        index: idx,
        exhibit: exhibitLabel(idx),
        batesRange: pages > 1 ? `${startCode} – ${endCode}` : startCode
      };
    });
  }

  function render() {
    const computed = computeRows();
    const totalPages = computed.reduce((a, d) => a + (parseInt(d.pages, 10) || 1), 0);
    const factCount = computed.filter((d) => d.classification === 'Documented fact').length;

    $('idxTotalDocs').textContent = String(computed.length);
    $('idxTotalPages').textContent = String(totalPages);
    $('idxFactCount').textContent = String(factCount);
    $('idxConvention').textContent = state.partyRole === 'defendant' ? 'Lettered (A, B...)' : 'Numbered (1, 2...)';

    const shown = computed.filter((d) => filterCat === 'all' || d.category === filterCat);

    $('indexerTableBody').innerHTML = shown.length
      ? shown
          .map(
            (d) => `
          <tr>
            <td><strong>${esc(d.exhibit)}</strong><br><span class="small">${esc(d.batesRange)}</span></td>
            <td><strong>${esc(d.title)}</strong><br><span class="small">${esc(d.fileName || 'Physical / manual record')} · ${esc(formatBytes(d.fileSize))}</span></td>
            <td><span class="badge info">${esc(d.category)}</span><br><span class="small">${d.pages} pg · ${esc(d.docDate || 'Undated')}</span></td>
            <td>${esc(d.classification)}<br><span class="small">${esc(d.foundation || '')}</span></td>
            <td>
              <div class="item-actions">
                <button type="button" class="btn mini" data-act="up-doc" data-id="${esc(d.id)}" ${d.index === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
                <button type="button" class="btn mini" data-act="dn-doc" data-id="${esc(d.id)}" ${d.index === computed.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
                <button type="button" class="btn mini danger" data-act="del-doc" data-id="${esc(d.id)}" aria-label="Remove">×</button>
              </div>
            </td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="5"><div class="empty">No documents indexed yet. Drop local files above or add records manually.</div></td></tr>';
  }

  function ingestFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    files.forEach((f) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      let cat = 'Other';
      if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov'].includes(ext)) cat = 'Photo / Video';
      else if (f.name.toLowerCase().includes('med') || f.name.toLowerCase().includes('bill')) cat = 'Medical / Billing';
      else if (f.name.toLowerCase().includes('police') || f.name.toLowerCase().includes('report')) cat = 'Official Report';

      state.docs.push({
        id: uid(),
        title: f.name.replace(/\.[^.]+$/, ''),
        fileName: f.name,
        fileSize: f.size,
        category: cat,
        docDate: f.lastModified ? new Date(f.lastModified).toISOString().slice(0, 10) : '',
        pages: 1,
        classification: 'Documented fact',
        foundation: ''
      });
    });
    render();
  }

  const dz = $('fileDropzone');
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => ingestFiles(e.dataTransfer.files));

  $('localFilePicker').addEventListener('change', (e) => {
    ingestFiles(e.target.files);
    e.target.value = '';
  });

  $('addManualDocBtn').addEventListener('click', () => {
    const title = $('docTitle').value.trim();
    if (!title) { alert('Enter a document title.'); return; }
    state.docs.push({
      id: uid(),
      title,
      fileName: $('docSource').value.trim() || 'Manual record',
      fileSize: 0,
      category: $('docCategory').value,
      docDate: $('docDate').value,
      pages: Math.max(1, parseInt($('docPages').value, 10) || 1),
      classification: $('docClass').value,
      foundation: $('docFoundation').value.trim()
    });
    ['docTitle', 'docSource', 'docDate', 'docFoundation'].forEach((k) => ($(k).value = ''));
    $('docPages').value = '1';
    render();
  });

  ['caseTitle', 'caseNumber', 'partyRole', 'batesPrefix', 'batesStart', 'batesPad'].forEach((k) => {
    $(k).addEventListener('input', () => {
      state[k] = $(k).value;
      render();
    });
  });

  $('filterDocCat').addEventListener('change', (e) => {
    filterCat = e.target.value;
    render();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    const idx = state.docs.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (act === 'del-doc') state.docs.splice(idx, 1);
    if (act === 'up-doc' && idx > 0) {
      [state.docs[idx - 1], state.docs[idx]] = [state.docs[idx], state.docs[idx - 1]];
    }
    if (act === 'dn-doc' && idx < state.docs.length - 1) {
      [state.docs[idx + 1], state.docs[idx]] = [state.docs[idx], state.docs[idx + 1]];
    }
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
    return (state.caseTitle || state.caseNumber || 'exhibit-index').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'exhibit-index';
  }

  function gated(label, format, fn) {
    const computed = computeRows();
    const summary = {
      metrics: [
        { label: 'Case / Binder', value: state.caseTitle || 'Exhibit Binder' },
        { label: 'Export Format', value: format },
        { label: 'Indexed Exhibits', value: `${computed.length} records` },
        { label: 'Bates Prefix', value: (state.batesPrefix || 'CFL').toUpperCase() }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  $('exportIdxCsv').addEventListener('click', () => gated('Export Master Exhibit Index (CSV)', 'CSV Index', () => {
    const computed = computeRows();
    const rows = [['Exhibit', 'BatesRange', 'Title', 'FileOrSource', 'Category', 'Date', 'Pages', 'Classification', 'FoundationNotes']];
    computed.forEach((d) => rows.push([d.exhibit, d.batesRange, d.title, d.fileName, d.category, d.docDate, d.pages, d.classification, d.foundation]));
    const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    download(slug() + '-bates-index.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }));

  $('printIdxBtn').addEventListener('click', () => gated('Print Trial Binder Exhibit Index', 'Printable Index', () => {
    const computed = computeRows();
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print the exhibit index.'); return; }
    const rowsHtml = computed.map((d) => `<tr><td><strong>${esc(d.exhibit)}</strong></td><td>${esc(d.batesRange)}</td><td>${esc(d.title)}<br><small>${esc(d.fileName)}</small></td><td>${esc(d.category)}</td><td>${esc(d.docDate)}</td><td>${esc(d.classification)}</td><td>${esc(d.foundation)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.caseTitle || 'Master Exhibit Index')}</title>
<style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0 0 4px}p{color:#444;margin:0 0 16px;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5}</style></head>
<body><h1>${esc(state.caseTitle || 'Master Exhibit & Bates Index')}</h1><p>${esc([state.caseNumber ? 'Case No: ' + state.caseNumber : '', state.partyRole === 'defendant' ? 'Defendant Convention (Lettered)' : 'Plaintiff Convention (Numbered)'].filter(Boolean).join(' · '))}</p>
<table><thead><tr><th>Exhibit</th><th>Bates Range</th><th>Document Title &amp; File</th><th>Category</th><th>Date</th><th>Classification</th><th>Foundation / Notes</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }));

  $('exportIdxJson').addEventListener('click', () => gated('Save Exhibit Index Project (JSON)', 'Project JSON', () => {
    download(slug() + '-index.json', new Blob([JSON.stringify({ ...state, tool: 'document-indexer', version: 1 }, null, 2)], { type: 'application/json' }));
  }));

  $('openIdxBtn').addEventListener('click', () => $('openIdxFile').click());
  $('openIdxFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = { ...emptyState(), ...d, docs: Array.isArray(d.docs) ? d.docs : [] };
        ['caseTitle', 'caseNumber', 'partyRole', 'batesPrefix', 'batesStart', 'batesPad'].forEach((k) => ($(k).value = state[k]));
        render();
      } catch (err) {
        alert('Could not open that exhibit index JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newIdxBtn').addEventListener('click', () => {
    if (!confirm('Clear the exhibit index? Export JSON first if needed.')) return;
    state = emptyState();
    ['caseTitle', 'caseNumber', 'partyRole', 'batesPrefix', 'batesStart', 'batesPad'].forEach((k) => ($(k).value = state[k]));
    render();
  });

  render();
})();
