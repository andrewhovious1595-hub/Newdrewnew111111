(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('pleadingPreview')) return;

  const TEMPLATES = {
    complaint: {
      heading: 'COMPLAINT FOR CIVIL DAMAGES / RELIEF (PRO SE)',
      bodyHint: 'State each factual allegation in short, plain numbered sentences (who, what, when, where, and resulting harm).',
      reliefHint: 'State exact dollar damages, court costs, interest, or equitable/injunctive relief requested.'
    },
    answer: {
      heading: "DEFENDANT'S ANSWER AND AFFIRMATIVE DEFENSES (PRO SE)",
      bodyHint: 'Respond to each numbered paragraph of the Complaint (Admit, Deny, or Lack Sufficient Information) and list your affirmative defenses.',
      reliefHint: 'Request dismissal of the Complaint with prejudice, judgment for Defendant, and allowable court costs.'
    },
    motion: {
      heading: 'NOTICE OF MOTION AND MOTION (PRO SE)',
      bodyHint: 'State the exact court order you are asking the judge to enter, the factual basis, and any attached declarations or exhibits.',
      reliefHint: 'Specify the exact relief or court order requested.'
    },
    declaration: {
      heading: 'DECLARATION IN SUPPORT OF FILING (UNDER PENALTY OF PERJURY)',
      bodyHint: 'State only facts you personally observed, experienced, or verified from attached authentic records.',
      reliefHint: 'List attached exhibits (e.g., Exhibit 1, Exhibit 2) referenced in your sworn statements.'
    },
    service: {
      heading: 'PROOF / CERTIFICATE OF SERVICE',
      bodyHint: 'List exact titles of every document served, method of service (personal delivery, first-class mail, or approved e-service), server name/age 18+, and service address.',
      reliefHint: 'Confirm the person serving the papers is at least 18 years old and not a party to the lawsuit where required by court rules.'
    },
    probate: {
      heading: 'PROBATE PETITION PREPARATION & ESTATE ASSET SUMMARY',
      bodyHint: 'Detail decedent full legal name, date/county of death, whether a Will exists, names/relationships of heirs & beneficiaries, and estimated real/personal property values.',
      reliefHint: 'Specify requested authority (Letters Testamentary or Letters of Administration) and bond/waiver notes for DE-111 / local probate filing.'
    },
    bankruptcy: {
      heading: 'BANKRUPTCY FILING PREPARATION WORKSHEET (CH. 7 / CH. 13)',
      bodyHint: 'Summarize monthly household income, core monthly expenses, real/personal assets (Schedule A/B), secured debts (Schedule D), and unsecured creditors (Schedule E/F).',
      reliefHint: 'List credit counseling certificate date, target chapter (7 or 13), and fee-waiver/installment status (B 103B) for B 101 filing prep.'
    }
  };

  const params = new URLSearchParams(window.location.search);
  const initTpl = TEMPLATES[params.get('template')] ? params.get('template') : 'complaint';
  const initFormRef = params.get('form') || '';

  function emptyState() {
    return {
      template: initTpl,
      companionForm: initFormRef,
      courtName: 'SUPERIOR COURT OF THE STATE OF CALIFORNIA',
      countyDistrict: 'COUNTY OF FRESNO',
      caseNumber: '[Assigned by Clerk Upon Filing]',
      filerName: '',
      filerAddress: '',
      filerPhoneEmail: '',
      partyRole: 'Plaintiff / Petitioner, In Pro Per (Pro Se)',
      plaintiffs: '',
      defendants: '',
      docTitle: '',
      jurisdictionBasis: '',
      paragraphs: [],
      reliefRequested: '',
      signingDate: new Date().toISOString().slice(0, 10),
      signingCityState: ''
    };
  }

  let state = emptyState();

  function uid() {
    return 'p_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function buildPleadingText() {
    const tpl = TEMPLATES[state.template] || TEMPLATES.complaint;
    const title = (state.docTitle || tpl.heading).toUpperCase();
    const lines = [];

    lines.push(state.filerName || '[YOUR FULL LEGAL NAME]');
    if (state.filerAddress) lines.push(state.filerAddress);
    if (state.filerPhoneEmail) lines.push(state.filerPhoneEmail);
    lines.push(state.partyRole || 'Self-Represented (Pro Se)');
    lines.push('');
    lines.push('======================================================================');
    lines.push(`              ${(state.courtName || '[COURT NAME]').toUpperCase()}`);
    if (state.countyDistrict) lines.push(`              ${state.countyDistrict.toUpperCase()}`);
    lines.push('======================================================================');
    lines.push('');
    lines.push(`${state.plaintiffs || '[PLAINTIFF / PETITIONER NAME(S)]'},`);
    lines.push('        Plaintiff(s) / Petitioner(s),');
    lines.push(`                                         Case No.: ${state.caseNumber || '[TBD]'}`);
    lines.push('    v.');
    lines.push(`                                         ${title}`);
    if (state.companionForm) {
      lines.push(`                                         [Companion to Official Form ${state.companionForm}]`);
    }
    lines.push(`${state.defendants || '[DEFENDANT / RESPONDENT NAME(S)]'},`);
    lines.push('        Defendant(s) / Respondent(s).');
    lines.push('----------------------------------------------------------------------');
    lines.push('');

    if (state.jurisdictionBasis) {
      lines.push('I. JURISDICTION, VENUE & POSTURE');
      lines.push(state.jurisdictionBasis);
      lines.push('');
    }

    lines.push('II. NUMBERED FACTUAL ALLEGATIONS / STATEMENTS');
    if (state.paragraphs.length) {
      state.paragraphs.forEach((p, idx) => {
        lines.push(`  ${idx + 1}. ${p.text}${p.exhibit ? ' [See ' + p.exhibit + ']' : ''}`);
      });
    } else {
      lines.push('  1. [Add numbered factual paragraphs using the form on the left.]');
    }
    lines.push('');

    if (state.reliefRequested) {
      lines.push('III. PRAYER FOR RELIEF / REQUESTED ACTION');
      lines.push(state.reliefRequested);
      lines.push('');
    }

    lines.push('IV. CERTIFICATION & VERIFICATION');
    if (state.template === 'declaration' || state.template === 'service') {
      lines.push('I declare under penalty of perjury under the laws of the applicable jurisdiction that the foregoing is true and correct.');
    } else {
      lines.push('I certify that this filing is submitted in good faith by a self-represented party and agree to keep my current mailing/service address on file with the Clerk of Court.');
    }
    lines.push('');
    lines.push(`Executed on: ${state.signingDate || '[Date]'}${state.signingCityState ? ' at ' + state.signingCityState : ''}`);
    lines.push('');
    lines.push('Signature: ________________________________________');
    lines.push(`Printed Name: ${state.filerName || '[Your Name]'} (Pro Se / In Pro Per)`);
    return lines.join('\n');
  }

  function render() {
    const tpl = TEMPLATES[state.template] || TEMPLATES.complaint;
    $('tplHint').textContent = tpl.bodyHint;
    $('reliefHint').textContent = tpl.reliefHint;

    $('paraList').innerHTML = state.paragraphs.length
      ? state.paragraphs
          .map(
            (p, idx) => `
          <div class="item">
            <div class="item-body">
              <strong>Paragraph ${idx + 1}${p.exhibit ? ' · ' + esc(p.exhibit) : ''}</strong>
              <small>${esc(p.text)}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini" data-act="up-p" data-id="${esc(p.id)}" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
              <button type="button" class="btn mini" data-act="dn-p" data-id="${esc(p.id)}" ${idx === state.paragraphs.length - 1 ? 'disabled' : ''}>&darr;</button>
              <button type="button" class="btn mini danger" data-act="del-p" data-id="${esc(p.id)}">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No numbered paragraphs added yet.</div>';

    $('pleadingPreview').textContent = buildPleadingText();
  }

  const FIELD_IDS = [
    'template', 'companionForm', 'courtName', 'countyDistrict', 'caseNumber',
    'filerName', 'filerAddress', 'filerPhoneEmail', 'partyRole',
    'plaintiffs', 'defendants', 'docTitle', 'jurisdictionBasis',
    'reliefRequested', 'signingDate', 'signingCityState'
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

  $('addParaBtn').addEventListener('click', () => {
    const text = $('paraText').value.trim();
    if (!text) { alert('Enter paragraph text first.'); return; }
    state.paragraphs.push({ id: uid(), text, exhibit: $('paraExhibit').value.trim() });
    $('paraText').value = '';
    $('paraExhibit').value = '';
    render();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    const idx = state.paragraphs.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (act === 'del-p') state.paragraphs.splice(idx, 1);
    if (act === 'up-p' && idx > 0) [state.paragraphs[idx - 1], state.paragraphs[idx]] = [state.paragraphs[idx], state.paragraphs[idx - 1]];
    if (act === 'dn-p' && idx < state.paragraphs.length - 1) [state.paragraphs[idx + 1], state.paragraphs[idx]] = [state.paragraphs[idx], state.paragraphs[idx + 1]];
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
    return (state.docTitle || state.template || 'pro-se-filing').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'pro-se-filing';
  }

  function gated(label, format, fn) {
    const summary = {
      metrics: [
        { label: 'Filing Type', value: (TEMPLATES[state.template] || TEMPLATES.complaint).heading.slice(0, 28) },
        { label: 'Export Format', value: format },
        { label: 'Paragraphs', value: `${state.paragraphs.length} numbered items` },
        { label: 'Companion Form', value: state.companionForm || 'Custom Pleading' }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  $('printPleadBtn').addEventListener('click', () => gated('Print / Save PDF Court Filing', 'Printable Court Pleading', () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.docTitle || 'Pro Se Filing')}</title>
<style>body{font-family:"Times New Roman",Times,serif;max-width:740px;margin:48px auto;color:#000;font-size:12pt;line-height:1.7}pre{white-space:pre-wrap;font:inherit}.note{margin-top:26px;padding-top:10px;border-top:1px solid #bbb;font-family:Arial,sans-serif;font-size:9.5pt;color:#444}</style></head>
<body><pre>${esc(buildPleadingText())}</pre><div class="note">Drafted using Clear Fault Legal Pro Se Pleading Drafter. Verify local margin, line-numbering, and court formatting rules before filing. Not legal advice.</div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }));

  $('exportPleadDoc').addEventListener('click', () => gated('Download Word-Compatible Filing (.doc)', 'Word Document (.doc)', () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${esc(buildPleadingText())}</pre></body></html>`;
    download(slug() + '.doc', new Blob([html], { type: 'application/msword;charset=utf-8' }));
  }));

  $('exportPleadTxt').addEventListener('click', () => gated('Download Plain Text Filing (.txt)', 'Plain Text (.txt)', () => {
    download(slug() + '.txt', new Blob([buildPleadingText()], { type: 'text/plain;charset=utf-8' }));
  }));

  $('exportPleadJson').addEventListener('click', () => gated('Save Pleading Project (JSON)', 'Project JSON', () => {
    download(slug() + '.json', new Blob([JSON.stringify({ ...state, tool: 'pleading-drafter', version: 1 }, null, 2)], { type: 'application/json' }));
  }));

  $('openPleadBtn').addEventListener('click', () => $('openPleadFile').click());
  $('openPleadFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = { ...emptyState(), ...d, paragraphs: Array.isArray(d.paragraphs) ? d.paragraphs : [] };
        syncInputs();
        render();
      } catch (err) {
        alert('Could not open that pleading JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newPleadBtn').addEventListener('click', () => {
    if (!confirm('Reset this pleading draft?')) return;
    state = emptyState();
    syncInputs();
    render();
  });

  syncInputs();
  render();
})();
