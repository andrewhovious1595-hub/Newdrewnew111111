(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('claimList')) return;

  function emptyState() {
    return {
      matterTitle: '',
      jurisdiction: '',
      disputeType: 'Personal Injury / Negligence',
      stage: 'Pre-Demand / Evidence Gathering',
      repMode: 'Self-Represented (Pro Se)',
      coreObjective: '',
      claims: [],
      witnesses: [],
      tasks: []
    };
  }

  let state = emptyState();

  function uid() {
    return 'pl_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function proofBadge(st) {
    if (st === 'Supported by Exhibit') return 'good';
    if (st === 'Partial / Needs Corroboration') return 'warn';
    return 'danger';
  }

  function render() {
    const totalClaims = state.claims.length;
    const supported = state.claims.filter((c) => c.status === 'Supported by Exhibit').length;
    const gaps = state.claims.filter((c) => c.status === 'Evidence Missing').length;
    const openTasks = state.tasks.filter((t) => !t.done).length;

    $('plReadiness').textContent = totalClaims ? `${Math.round((supported / totalClaims) * 100)}%` : '—';
    $('plGaps').textContent = String(gaps);
    $('plWitnesses').textContent = String(state.witnesses.length);
    $('plOpenTasks').textContent = String(openTasks);

    $('claimList').innerHTML = state.claims.length
      ? state.claims
          .map(
            (c) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(c.element)}</strong>
              <small>${esc(c.evidenceNote || 'No supporting exhibit noted yet')}</small>
              <div style="margin-top:6px"><span class="badge ${proofBadge(c.status)}">${esc(c.status)}</span></div>
            </div>
            <button type="button" class="btn mini danger" data-act="del-claim" data-id="${esc(c.id)}" aria-label="Remove claim element">×</button>
          </div>`
          )
          .join('')
      : '<div class="empty">No claim elements mapped yet. Break your dispute into concrete facts you need to prove.</div>';

    $('witnessList').innerHTML = state.witnesses.length
      ? state.witnesses
          .map(
            (w) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(w.name)} (${esc(w.role)})</strong>
              <small>${esc(w.knowledge || '')}${w.contact ? ' · Contact: ' + esc(w.contact) : ''}</small>
            </div>
            <button type="button" class="btn mini danger" data-act="del-wit" data-id="${esc(w.id)}" aria-label="Remove witness">×</button>
          </div>`
          )
          .join('')
      : '<div class="empty">No witnesses recorded yet.</div>';

    $('taskList').innerHTML = state.tasks.length
      ? state.tasks
          .map(
            (t) => `
          <div class="item">
            <div class="item-body">
              <strong style="${t.done ? 'text-decoration:line-through;opacity:0.65' : ''}">${esc(t.title)}</strong>
              <small>${esc(t.dueDate ? 'Target: ' + t.dueDate : 'No due date')} · ${t.done ? 'Completed' : 'Open action item'}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini" data-act="tog-task" data-id="${esc(t.id)}">${t.done ? 'Reopen' : 'Done'}</button>
              <button type="button" class="btn mini danger" data-act="del-task" data-id="${esc(t.id)}" aria-label="Delete task">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No action items or deadlines added yet.</div>';
  }

  const META_IDS = ['matterTitle', 'jurisdiction', 'disputeType', 'stage', 'repMode', 'coreObjective'];
  META_IDS.forEach((k) => {
    $(k).addEventListener('input', () => { state[k] = $(k).value; });
  });

  $('addClaimBtn').addEventListener('click', () => {
    const element = $('claimElement').value.trim();
    if (!element) { alert('Enter a factual issue or claim element to map.'); return; }
    state.claims.push({
      id: uid(),
      element,
      evidenceNote: $('claimEvidence').value.trim(),
      status: $('claimStatus').value
    });
    $('claimElement').value = '';
    $('claimEvidence').value = '';
    render();
  });

  $('addWitnessBtn').addEventListener('click', () => {
    const name = $('witName').value.trim();
    if (!name) { alert('Enter a witness name.'); return; }
    state.witnesses.push({
      id: uid(),
      name,
      role: $('witRole').value,
      contact: $('witContact').value.trim(),
      knowledge: $('witKnowledge').value.trim()
    });
    ['witName', 'witContact', 'witKnowledge'].forEach((k) => ($(k).value = ''));
    render();
  });

  $('addTaskBtn').addEventListener('click', () => {
    const title = $('taskTitle').value.trim();
    if (!title) { alert('Enter an action item or milestone.'); return; }
    state.tasks.push({ id: uid(), title, dueDate: $('taskDue').value, done: false });
    $('taskTitle').value = '';
    $('taskDue').value = '';
    render();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'del-claim') state.claims = state.claims.filter((x) => x.id !== id);
    if (act === 'del-wit') state.witnesses = state.witnesses.filter((x) => x.id !== id);
    if (act === 'del-task') state.tasks = state.tasks.filter((x) => x.id !== id);
    if (act === 'tog-task') {
      const t = state.tasks.find((x) => x.id === id);
      if (t) t.done = !t.done;
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
    return (state.matterTitle || 'case-readiness-brief').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'case-readiness-brief';
  }

  function gated(label, format, fn) {
    const summary = {
      metrics: [
        { label: 'Matter', value: state.matterTitle || 'Case Brief' },
        { label: 'Export Format', value: format },
        { label: 'Mapped Elements', value: `${state.claims.length} issues · ${state.witnesses.length} witnesses` },
        { label: 'Action Items', value: `${state.tasks.length} tracked steps` }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  $('printPlanBtn').addEventListener('click', () => gated('Print Case Strategy & Attorney Intake Brief', 'Printable Case Brief', () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    const cRows = state.claims.map((c) => `<tr><td>${esc(c.element)}</td><td>${esc(c.evidenceNote)}</td><td>${esc(c.status)}</td></tr>`).join('');
    const wRows = state.witnesses.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.role)}</td><td>${esc(x.knowledge)}</td><td>${esc(x.contact)}</td></tr>`).join('');
    const tRows = state.tasks.map((t) => `<tr><td>${t.done ? 'Completed' : 'Open'}</td><td>${esc(t.dueDate)}</td><td>${esc(t.title)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.matterTitle || 'Case Preparation Brief')}</title>
<style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0 0 6px}h2{font-size:15px;margin:20px 0 8px}p{font-size:13px;color:#333}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left}th{background:#f1f3f5}.note{margin-top:18px;padding:10px;border-left:3px solid #997322;background:#fbf7ea;font-size:11px}</style></head>
<body><h1>${esc(state.matterTitle || 'Case Readiness & Preparation Brief')}</h1>
<p><strong>Dispute Type:</strong> ${esc(state.disputeType)} · <strong>Jurisdiction:</strong> ${esc(state.jurisdiction || 'Not specified')} · <strong>Stage:</strong> ${esc(state.stage)} · <strong>Posture:</strong> ${esc(state.repMode)}</p>
${state.coreObjective ? `<p><strong>Objective / Relief Sought:</strong> ${esc(state.coreObjective)}</p>` : ''}
<h2>1. Proof Matrix (Claim Elements &amp; Evidence Gaps)</h2>${cRows ? `<table><thead><tr><th>Factual / Claim Element</th><th>Supporting Evidence / Exhibit</th><th>Proof Status</th></tr></thead><tbody>${cRows}</tbody></table>` : '<p>No elements mapped.</p>'}
<h2>2. Witness Roster</h2>${wRows ? `<table><thead><tr><th>Name</th><th>Role</th><th>Expected Knowledge / Foundation</th><th>Contact</th></tr></thead><tbody>${wRows}</tbody></table>` : '<p>No witnesses listed.</p>'}
<h2>3. Action Items &amp; Deadlines</h2>${tRows ? `<table><thead><tr><th>Status</th><th>Target Date</th><th>Action Item</th></tr></thead><tbody>${tRows}</tbody></table>` : '<p>No tasks listed.</p>'}
<div class="note">Prepared for personal organization or attorney review. This planning worksheet does not constitute legal advice and does not substitute for consulting a licensed attorney regarding statutes of limitations, court rules, or legal strategy.</div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }));

  $('exportPlanCsv').addEventListener('click', () => gated('Export Case Plan Matrix (CSV)', 'CSV Summary', () => {
    const rows = [['Section', 'Item', 'Details', 'StatusOrDate']];
    state.claims.forEach((c) => rows.push(['Claim Element', c.element, c.evidenceNote, c.status]));
    state.witnesses.forEach((w) => rows.push(['Witness', `${w.name} (${w.role})`, w.knowledge, w.contact]));
    state.tasks.forEach((t) => rows.push(['Action Item', t.title, t.dueDate, t.done ? 'Completed' : 'Open']));
    const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    download(slug() + '-plan.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }));

  $('exportPlanJson').addEventListener('click', () => gated('Save Case Plan Project (JSON)', 'Project JSON', () => {
    download(slug() + '-plan.json', new Blob([JSON.stringify({ ...state, tool: 'case-strategy-planner', version: 1 }, null, 2)], { type: 'application/json' }));
  }));

  $('openPlanBtn').addEventListener('click', () => $('openPlanFile').click());
  $('openPlanFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = {
          ...emptyState(),
          ...d,
          claims: Array.isArray(d.claims) ? d.claims : [],
          witnesses: Array.isArray(d.witnesses) ? d.witnesses : [],
          tasks: Array.isArray(d.tasks) ? d.tasks : []
        };
        META_IDS.forEach((k) => ($(k).value = state[k] || ''));
        render();
      } catch (err) {
        alert('Could not open that case plan JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newPlanBtn').addEventListener('click', () => {
    if (!confirm('Clear this case readiness plan?')) return;
    state = emptyState();
    META_IDS.forEach((k) => ($(k).value = state[k] || ''));
    render();
  });

  render();
})();
