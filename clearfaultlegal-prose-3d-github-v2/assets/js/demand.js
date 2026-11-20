(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('demandPreview')) return;

  function emptyState() {
    return {
      date: new Date().toISOString().slice(0, 10),
      claimantName: '',
      claimantContact: '',
      representation: 'Self-Represented (Pro Se)',
      recipientName: '',
      recipientOrg: '',
      claimNumber: '',
      incidentDate: '',
      incidentLocation: '',
      subjectLine: '',
      factsSummary: '',
      liabilityBasis: '',
      nonEconomicNotes: '',
      nonEconomicAmount: '',
      responseDays: '30',
      damages: [],
      attachments: []
    };
  }

  let state = emptyState();

  function uid() {
    return 'd_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtMoney(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function totals() {
    const special = state.damages.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const general = Number(state.nonEconomicAmount) || 0;
    return { special, general, grand: special + general };
  }

  function deadlineDate() {
    const base = state.date ? new Date(state.date + 'T00:00:00') : new Date();
    const days = Math.max(1, parseInt(state.responseDays, 10) || 30);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }

  function buildLetterText() {
    const t = totals();
    const lines = [];
    lines.push('FOR SETTLEMENT PURPOSES ONLY — PROTECTED COMMUNICATION');
    lines.push('');
    lines.push(`Date: ${state.date || '[Enter Date]'}`);
    lines.push('');
    lines.push(`From: ${state.claimantName || '[Claimant Name]'} (${state.representation})`);
    if (state.claimantContact) lines.push(state.claimantContact);
    lines.push('');
    lines.push(`To: ${state.recipientName || '[Recipient / Adjuster / Opposing Party]'}`);
    if (state.recipientOrg) lines.push(state.recipientOrg);
    lines.push('');
    lines.push(`RE: ${state.subjectLine || 'Settlement Demand Package'}`);
    if (state.claimNumber) lines.push(`Claim / Case Reference: ${state.claimNumber}`);
    if (state.incidentDate || state.incidentLocation) {
      lines.push(`Incident Date / Location: ${[state.incidentDate, state.incidentLocation].filter(Boolean).join(' — ')}`);
    }
    lines.push('');
    lines.push('1. FACTUAL OVERVIEW');
    lines.push(state.factsSummary || '[Enter chronological summary of the incident or dispute.]');
    lines.push('');
    lines.push('2. BASIS OF RESPONSIBILITY / LIABILITY');
    lines.push(state.liabilityBasis || '[Describe documented facts, duties, notices, or contract/conduct provisions supporting responsibility.]');
    lines.push('');
    lines.push('3. ITEMIZED DOCUMENTED DAMAGES (SPECIAL DAMAGES)');
    if (state.damages.length) {
      state.damages.forEach((d, idx) => {
        lines.push(`  ${idx + 1}. [${d.category}] ${d.description}${d.docRef ? ' (Ref: ' + d.docRef + ')' : ''}: ${fmtMoney(d.amount)}`);
      });
    } else {
      lines.push('  [No itemized damages entered yet.]');
    }
    lines.push(`  Subtotal Documented Economic / Special Damages: ${fmtMoney(t.special)}`);
    if (state.nonEconomicNotes || t.general > 0) {
      lines.push('');
      lines.push('4. ADDITIONAL IMPACT & NON-ECONOMIC CONSIDERATIONS');
      if (state.nonEconomicNotes) lines.push(state.nonEconomicNotes);
      if (t.general > 0) lines.push(`  Requested Additional / Non-Economic Allocation: ${fmtMoney(t.general)}`);
    }
    lines.push('');
    lines.push(`TOTAL SETTLEMENT DEMAND: ${fmtMoney(t.grand)}`);
    lines.push(`Please respond in writing on or before ${deadlineDate()} (${state.responseDays || 30} days from the date of this letter).`);
    lines.push('');
    lines.push('ENCLOSED SUPPORTING EXHIBITS & DOCUMENTS');
    if (state.attachments.length) {
      state.attachments.forEach((a, idx) => {
        lines.push(`  Exhibit ${idx + 1}: ${a.label}${a.notes ? ' — ' + a.notes : ''}`);
      });
    } else {
      lines.push('  [No enclosure checklist items added yet.]');
    }
    lines.push('');
    lines.push('Sincerely,');
    lines.push(state.claimantName || '[Signature / Printed Name]');
    return lines.join('\n');
  }

  function render() {
    const t = totals();
    $('kpiSpecial').textContent = fmtMoney(t.special);
    $('kpiGeneral').textContent = fmtMoney(t.general);
    $('kpiTotal').textContent = fmtMoney(t.grand);
    $('kpiEnclosures').textContent = String(state.attachments.length);

    $('damageList').innerHTML = state.damages.length
      ? state.damages
          .map(
            (d) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(d.description)} — ${fmtMoney(d.amount)}</strong>
              <small>${esc(d.category)}${d.docRef ? ' · Source: ' + esc(d.docRef) : ''}</small>
            </div>
            <button type="button" class="btn mini danger" data-act="del-dmg" data-id="${esc(d.id)}" aria-label="Delete line item">×</button>
          </div>`
          )
          .join('')
      : '<div class="empty">No economic damage items added yet.</div>';

    $('attachList').innerHTML = state.attachments.length
      ? state.attachments
          .map(
            (a, idx) => `
          <div class="item">
            <div class="item-body">
              <strong>Exhibit ${idx + 1}: ${esc(a.label)}</strong>
              <small>${esc(a.notes || 'Attached supporting record')}</small>
            </div>
            <button type="button" class="btn mini danger" data-act="del-att" data-id="${esc(a.id)}" aria-label="Remove attachment">×</button>
          </div>`
          )
          .join('')
      : '<div class="empty">No supporting exhibits listed yet.</div>';

    $('demandPreview').textContent = buildLetterText();
  }

  const FIELD_IDS = [
    'date', 'claimantName', 'claimantContact', 'representation', 'recipientName', 'recipientOrg',
    'claimNumber', 'incidentDate', 'incidentLocation', 'subjectLine', 'factsSummary',
    'liabilityBasis', 'nonEconomicNotes', 'nonEconomicAmount', 'responseDays'
  ];

  function syncInputs() {
    FIELD_IDS.forEach((k) => {
      if ($(k)) $(k).value = state[k] ?? '';
    });
  }

  FIELD_IDS.forEach((k) => {
    if (!$(k)) return;
    $(k).addEventListener('input', () => {
      state[k] = $(k).value;
      render();
    });
  });

  $('addDamageBtn').addEventListener('click', () => {
    const desc = $('dmgDesc').value.trim();
    const amt = parseFloat($('dmgAmount').value);
    if (!desc || !Number.isFinite(amt) || amt < 0) {
      alert('Enter a description and a valid non-negative dollar amount.');
      return;
    }
    state.damages.push({
      id: uid(),
      category: $('dmgCategory').value,
      description: desc,
      amount: amt,
      docRef: $('dmgRef').value.trim()
    });
    $('dmgDesc').value = '';
    $('dmgAmount').value = '';
    $('dmgRef').value = '';
    render();
  });

  $('addAttachBtn').addEventListener('click', () => {
    const label = $('attLabel').value.trim();
    if (!label) {
      alert('Enter an attachment or exhibit title.');
      return;
    }
    state.attachments.push({ id: uid(), label, notes: $('attNotes').value.trim() });
    $('attLabel').value = '';
    $('attNotes').value = '';
    render();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'del-dmg') state.damages = state.damages.filter((x) => x.id !== id);
    if (act === 'del-att') state.attachments = state.attachments.filter((x) => x.id !== id);
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
    return (state.subjectLine || state.claimNumber || 'demand-package').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'demand-package';
  }

  function gated(label, format, fn) {
    const t = totals();
    const summary = {
      metrics: [
        { label: 'Package', value: state.subjectLine || 'Demand Package' },
        { label: 'Export Format', value: format },
        { label: 'Itemized Total', value: fmtMoney(t.grand) },
        { label: 'Enclosures', value: `${state.attachments.length} listed exhibits` }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  $('printDemandBtn').addEventListener('click', () => gated('Print / Save PDF Demand Package', 'Printable Demand Letter', () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print the demand package.'); return; }
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.subjectLine || 'Demand Package')}</title>
<style>body{font-family:Georgia,"Times New Roman",serif;max-width:780px;margin:36px auto;color:#111;line-height:1.6;font-size:13.5px}pre{white-space:pre-wrap;font:inherit}.foot{margin-top:24px;padding-top:10px;border-top:1px solid #ccc;font-family:Arial,sans-serif;font-size:10.5px;color:#555}</style></head>
<body><pre>${esc(buildLetterText())}</pre><div class="foot">Assembled with Clear Fault Legal Demand Package Assembler. Document formatting tool only — not legal advice.</div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }));

  $('exportDemandTxt').addEventListener('click', () => gated('Download Demand Letter (TXT)', 'Plain Text (.txt)', () => {
    download(slug() + '.txt', new Blob([buildLetterText()], { type: 'text/plain;charset=utf-8' }));
  }));

  $('exportDemandCsv').addEventListener('click', () => gated('Export Damages Schedule (CSV)', 'CSV Ledger', () => {
    const rows = [['Category', 'Description', 'Supporting Source', 'AmountUSD']];
    state.damages.forEach((d) => rows.push([d.category, d.description, d.docRef, Number(d.amount).toFixed(2)]));
    const t = totals();
    rows.push(['Subtotal', 'Economic / Special Damages', '', t.special.toFixed(2)]);
    if (t.general > 0) rows.push(['Additional', 'Non-Economic Allocation', '', t.general.toFixed(2)]);
    rows.push(['TOTAL', 'Total Settlement Demand', '', t.grand.toFixed(2)]);
    const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    download(slug() + '-damages.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }));

  $('exportDemandJson').addEventListener('click', () => gated('Save Demand Package Project (JSON)', 'Project JSON', () => {
    download(slug() + '.json', new Blob([JSON.stringify({ ...state, tool: 'demand-package', version: 1 }, null, 2)], { type: 'application/json' }));
  }));

  $('openDemandBtn').addEventListener('click', () => $('openDemandFile').click());
  $('openDemandFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = { ...emptyState(), ...d, damages: Array.isArray(d.damages) ? d.damages : [], attachments: Array.isArray(d.attachments) ? d.attachments : [] };
        syncInputs();
        render();
      } catch (err) {
        alert('Could not open that demand package JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newDemandBtn').addEventListener('click', () => {
    if (!confirm('Reset the demand package form? Export JSON first if you want to save your draft.')) return;
    state = emptyState();
    syncInputs();
    render();
  });

  syncInputs();
  render();
})();
