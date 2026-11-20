(() => {
  const $ = (id) => document.getElementById(id);
  const grid = $('formsGrid');
  if (!grid) return;

  const PORTALS = {
    fedProSe: 'https://www.uscourts.gov/forms-rules/forms/civil-pro-se-forms',
    fedCivil: 'https://www.uscourts.gov/forms-rules/forms/civil-forms',
    fedBk: 'https://www.uscourts.gov/forms/bankruptcy-forms',
    fedAll: 'https://www.uscourts.gov/forms-rules/forms',
    caAll: 'https://courts.ca.gov/forms-rules/court-forms',
    caCat: 'https://selfhelp.courts.ca.gov/find-forms/all-by-category'
  };

  // Verified official national federal (uscourts.gov) & California Judicial Council (courts.ca.gov) forms
  const FORMS = [
    // Federal Civil Pro Se Forms
    { code: 'Pro Se 1', title: 'Complaint for a Civil Case', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'General federal civil lawsuit complaint template for self-represented plaintiffs stating parties, jurisdiction, factual claims, and requested relief.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 2', title: 'Complaint and Request for Injunction', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Federal pro se complaint asking the court to issue injunctive relief stopping ongoing harm or compelling action.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 3', title: "Defendant's Answer to the Complaint", cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Official federal pro se response form to admit, deny, or assert defenses after being served with a civil lawsuit.', portal: PORTALS.fedProSe, drafter: 'answer' },
    { code: 'Pro Se 4', title: 'Complaint Alleging Breach of Contract', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Pro se federal civil complaint specifically structured for contract breach disputes and contract damages.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 5', title: 'Complaint Alleging Negligence', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Pro se federal complaint for negligence, injury, or property damage claims.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 6', title: 'Complaint Alleging Defendant Owes a Sum of Money', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Federal pro se complaint for unpaid debts, loans, or liquidated monetary obligations.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 7', title: 'Complaint for Employment Discrimination', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Federal pro se complaint for workplace discrimination claims under federal employment statutes.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 8', title: 'Complaint for Violations of Fair Labor Standards', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Federal pro se complaint for unpaid minimum wage, overtime, or FLSA labor violations.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 9', title: 'Complaint for Specific Performance / Real Property Contract', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Pro se complaint seeking specific performance or damages over a contract to convey real property.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 10', title: 'Complaint for the Conversion of Property', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Pro se complaint alleging wrongful taking or conversion of personal property.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'Pro Se 14', title: 'Complaint for Violation of Civil Rights (Prisoner)', cat: 'civil', jur: 'Federal (U.S. District Court)', desc: 'Federal pro se civil rights complaint form.', portal: PORTALS.fedProSe, drafter: 'complaint' },
    { code: 'AO 240', title: 'Application to Proceed Without Prepaying Fees or Costs (Short Form)', cat: 'waiver', jur: 'Federal (U.S. District Court)', desc: 'Federal In Forma Pauperis (IFP) fee waiver request for litigants unable to prepay filing fees.', portal: PORTALS.fedCivil, drafter: 'declaration' },
    { code: 'AO 88A', title: 'Subpoena to Testify at a Deposition in a Civil Action', cat: 'discovery', jur: 'Federal (U.S. District Court)', desc: 'Compels witness appearance for civil deposition testimony.', portal: PORTALS.fedAll, drafter: 'motion' },
    { code: 'AO 88B', title: 'Subpoena to Produce Documents, Information, or Objects', cat: 'discovery', jur: 'Federal (U.S. District Court)', desc: 'Orders third parties to produce records, electronic files, or allow premises inspection.', portal: PORTALS.fedAll, drafter: 'motion' },

    // Federal Bankruptcy Official Forms (Chapter 7 / 13)
    { code: 'B 101', title: 'Voluntary Petition for Individuals Filing for Bankruptcy', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Core initiating petition to open an individual Chapter 7 or Chapter 13 bankruptcy case.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 101A', title: 'Initial Statement About an Eviction Judgment Against You', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Required attachment if a landlord already holds a residential eviction judgment at filing.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 101B', title: 'Statement About Payment of an Eviction Judgment Against You', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Follow-up certification documenting cure payment on an eviction judgment.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 103B', title: 'Application to Have the Chapter 7 Filing Fee Waived', cat: 'waiver', jur: 'Federal Bankruptcy Court', desc: 'Requests a full waiver of the Chapter 7 bankruptcy court filing fee based on income.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106Sum', title: 'Summary of Your Assets and Liabilities and Certain Statistical Info', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Master summary roll-up of total assets, secured/unsecured liabilities, income, and expenses.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106A/B', title: 'Schedule A/B — Property (Real & Personal)', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Complete inventory of real estate, vehicles, bank accounts, household items, and legal claims.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106C', title: 'Schedule C — The Property You Claim as Exempt', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Lists statutory exemptions protecting home equity, vehicle, wages, and personal property.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106D', title: 'Schedule D — Creditors Who Hold Claims Secured by Property', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Lists mortgages, auto loans, judgment liens, and other secured creditors.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106E/F', title: 'Schedule E/F — Creditors Who Have Unsecured Claims', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Lists priority unsecured debts (taxes/support) and general unsecured debts (credit cards, medical bills).', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106G', title: 'Schedule G — Executory Contracts and Unexpired Leases', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Discloses active residential leases, vehicle leases, and ongoing service contracts.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106I', title: 'Schedule I — Your Income', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Documents monthly gross wages, deductions, self-employment, and household income.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106J', title: 'Schedule J — Your Expenses', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Itemizes monthly housing, utilities, food, transportation, insurance, and family expenses.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 106Dec', title: "Declaration About an Individual Debtor's Schedules", cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Signed declaration under penalty of perjury verifying accuracy of Schedules A/B through J.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 107', title: 'Statement of Financial Affairs for Individuals (SOFA)', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Discloses recent income history, payments to creditors, lawsuits, transfers, and closed accounts.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 108', title: 'Statement of Intention for Individuals Filing Under Chapter 7', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'States whether you intend to surrender, redeem, or reaffirm secured collateral like a car or home.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 121', title: 'Statement About Your Social Security Numbers', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Confidential filing providing debtor SSN to the court (kept off the public docket).', portal: PORTALS.fedBk, drafter: 'bankruptcy' },
    { code: 'B 122A-1', title: 'Chapter 7 Statement of Your Current Monthly Income (Means Test)', cat: 'bankruptcy', jur: 'Federal Bankruptcy Court', desc: 'Calculates 6-month average monthly income against state median to determine Chapter 7 eligibility.', portal: PORTALS.fedBk, drafter: 'bankruptcy' },

    // California Judicial Council — Civil Lawsuits
    { code: 'CM-010', title: 'Civil Case Cover Sheet', cat: 'civil', jur: 'California Superior Court', desc: 'Mandatory first cover page classifying every new California unlimited or limited civil lawsuit.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'SUM-100', title: 'Summons (Civil)', cat: 'civil', jur: 'California Superior Court', desc: 'Official clerk-issued notice served with your complaint giving the defendant 30 days to respond.', portal: PORTALS.caCat, drafter: 'service' },
    { code: 'PLD-C-001', title: 'Complaint — Contract', cat: 'civil', jur: 'California Superior Court', desc: 'Judicial Council complaint form for breach of contract, common counts, and unpaid business/personal agreements.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'PLD-C-001(1)', title: 'Cause of Action — Breach of Contract', cat: 'civil', jur: 'California Superior Court', desc: 'Required cause-of-action attachment detailing contract terms, breach date, and monetary damages.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'PLD-PI-001', title: 'Complaint — Personal Injury, Property Damage, Wrongful Death', cat: 'civil', jur: 'California Superior Court', desc: 'Primary Judicial Council civil complaint for auto collisions, slip-and-falls, and property damage.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'PLD-PI-001(1)', title: 'Cause of Action — Motor Vehicle', cat: 'civil', jur: 'California Superior Court', desc: 'Attachment to PLD-PI-001 alleging negligent operation or ownership of a motor vehicle.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'PLD-PI-001(2)', title: 'Cause of Action — General Negligence', cat: 'civil', jur: 'California Superior Court', desc: 'Attachment to PLD-PI-001 pleading general negligence elements.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'PLD-PI-001(4)', title: 'Cause of Action — Premises Liability', cat: 'civil', jur: 'California Superior Court', desc: 'Attachment to PLD-PI-001 for hazardous property conditions, slip-and-falls, or negligent maintenance.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'MC-030', title: 'Declaration (Under Penalty of Perjury)', cat: 'discovery', jur: 'California Superior Court', desc: 'Standard sworn factual statement supporting motions, oppositions, or evidentiary requests.', portal: PORTALS.caCat, drafter: 'declaration' },
    { code: 'MC-025', title: 'Attachment to Judicial Council Form', cat: 'civil', jur: 'California Superior Court', desc: 'Continuation sheet for additional facts, exhibits, or party names attached to any official form.', portal: PORTALS.caCat, drafter: 'declaration' },

    // California Judicial Council — Probate & Estates
    { code: 'DE-111', title: 'Petition for Probate', cat: 'probate', jur: 'California Probate Court', desc: 'Primary petition to open probate, admit a will, or request appointment as Estate Executor/Administrator.', portal: PORTALS.caCat, drafter: 'probate' },
    { code: 'DE-150', title: 'Letters (Probate — Testamentary / Administration)', cat: 'probate', jur: 'California Probate Court', desc: 'Official court letters granting legal authority to manage, transfer, and settle estate assets.', portal: PORTALS.caCat, drafter: 'probate' },
    { code: 'GC-310', title: 'Petition for Appointment of Probate Conservator', cat: 'probate', jur: 'California Probate Court', desc: 'Initiating petition for adult conservatorship of person and/or estate.', portal: PORTALS.caCat, drafter: 'probate' },

    // California Judicial Council — Small Claims
    { code: 'SC-100', title: "Plaintiff's Claim and Order to Go to Small Claims Court", cat: 'smallclaims', jur: 'California Small Claims', desc: 'Starts a fast-track Small Claims lawsuit without an attorney and sets the hearing date.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'SC-100A', title: 'Other Plaintiffs or Defendants (Small Claims Attachment)', cat: 'smallclaims', jur: 'California Small Claims', desc: 'Lists additional plaintiffs or defendants when more than two parties are involved.', portal: PORTALS.caCat, drafter: 'complaint' },
    { code: 'SC-104', title: 'Proof of Service (Small Claims)', cat: 'smallclaims', jur: 'California Small Claims', desc: 'Mandatory proof filed with the court proving the defendant was properly served before the hearing.', portal: PORTALS.caCat, drafter: 'service' },
    { code: 'SC-120', title: "Defendant's Claim and Order to Go to Small Claims Court", cat: 'smallclaims', jur: 'California Small Claims', desc: 'Allows a sued defendant to file a counterclaim to be heard at the same Small Claims hearing.', portal: PORTALS.caCat, drafter: 'answer' },

    // Discovery, Subpoenas, Fee Waivers, Restraining Orders & Appeals
    { code: 'DISC-001', title: 'Form Interrogatories — General', cat: 'discovery', jur: 'California Superior Court', desc: 'Pre-approved written questions requiring the opposing party to answer under oath.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'DISC-010', title: 'Case Questionnaire — For Limited Civil Cases', cat: 'discovery', jur: 'California Superior Court', desc: 'Early exchange questionnaire for limited civil cases under $35,000.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'DISC-015', title: 'Request for Statement of Witnesses and Evidence', cat: 'discovery', jur: 'California Superior Court', desc: 'Forces the opposing party in limited civil cases to disclose trial witnesses and exhibits beforehand.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'DISC-020', title: 'Requests for Admission', cat: 'discovery', jur: 'California Superior Court', desc: 'Compels the opposing party to admit or deny specific facts and authenticity of exhibits.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'SUBP-001', title: 'Civil Subpoena for Personal Appearance at Trial or Hearing', cat: 'discovery', jur: 'California Superior Court', desc: 'Orders a witness to appear in person at your court hearing or trial.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'FW-001', title: 'Request to Waive Court Fees', cat: 'waiver', jur: 'California Superior Court', desc: 'Requests waiver of initial civil, probate, or small claims filing fees based on household income or benefits.', portal: PORTALS.caCat, drafter: 'declaration' },
    { code: 'FW-003', title: 'Order on Court Fee Waiver (Superior Court)', cat: 'waiver', jur: 'California Superior Court', desc: 'Proposed court order submitted alongside FW-001 for the judge or clerk to sign.', portal: PORTALS.caCat, drafter: 'declaration' },
    { code: 'DV-100', title: 'Request for Domestic Violence Restraining Order', cat: 'civil', jur: 'California Superior Court', desc: 'Petition requesting emergency temporary and long-term protective orders.', portal: PORTALS.caCat, drafter: 'declaration' },
    { code: 'APP-002', title: 'Notice of Appeal/Cross-Appeal (Unlimited Civil Case)', cat: 'civil', jur: 'California Appellate Court', desc: 'Initiates an appeal from an unlimited civil judgment or appealable order.', portal: PORTALS.caCat, drafter: 'motion' },
    { code: 'APP-009', title: 'Proof of Service (Court of Appeal)', cat: 'waiver', jur: 'California Appellate Court', desc: 'Documents proper service of appellate filings on opposing parties and trial court.', portal: PORTALS.caCat, drafter: 'service' }
  ];

  const selectedCodes = new Set();
  let activeCat = 'all';

  // Read URL query ?cat=bankruptcy or ?q=probate so landing pages pre-filter the database automatically
  const params = new URLSearchParams(window.location.search);
  const initCat = (params.get('cat') || 'all').toLowerCase();
  const initQ = params.get('q') || '';
  if (['all', 'civil', 'bankruptcy', 'probate', 'smallclaims', 'discovery', 'waiver'].includes(initCat)) {
    activeCat = initCat;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function syncChips() {
    document.querySelectorAll('[data-form-cat]').forEach((btn) => {
      const isAct = btn.dataset.formCat === activeCat;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-pressed', String(isAct));
    });
  }

  function render() {
    const q = ($('formsSearch')?.value || '').trim().toLowerCase();
    const jurFilter = $('formsJur')?.value || 'all';

    const matches = FORMS.filter((f) => {
      const catOk = activeCat === 'all' || f.cat === activeCat;
      const jurOk =
        jurFilter === 'all' ||
        (jurFilter === 'federal' && f.jur.toLowerCase().includes('federal')) ||
        (jurFilter === 'california' && f.jur.toLowerCase().includes('california'));
      const hay = `${f.code} ${f.title} ${f.desc} ${f.jur} ${f.cat}`.toLowerCase();
      const qOk = !q || hay.includes(q);
      return catOk && jurOk && qOk;
    });

    $('formsCount').textContent = `Showing ${matches.length} of ${FORMS.length} verified official court forms`;

    grid.innerHTML = matches.length
      ? matches
          .map((f) => {
            const checked = selectedCodes.has(f.code);
            return `
          <article class="form-card ${checked ? 'checked' : ''}">
            <div class="form-code-row">
              <span class="form-code">${esc(f.code)}</span>
              <span class="badge info">${esc(f.jur)}</span>
            </div>
            <h3>${esc(f.title)}</h3>
            <p>${esc(f.desc)}</p>
            <div class="form-card-actions">
              <a class="btn mini primary" href="${esc(f.portal)}" target="_blank" rel="noopener noreferrer">Official .gov Portal &nearr;</a>
              <a class="btn mini" href="../tools/pleading-drafter/index.html?template=${esc(f.drafter)}&form=${encodeURIComponent(f.code)}">Draft Companion</a>
              <button type="button" class="btn mini ${checked ? 'active-mode' : ''}" data-toggle-code="${esc(f.code)}">${checked ? 'In Packet ✓' : '+ Add to Packet'}</button>
            </div>
          </article>`;
          })
          .join('')
      : '<div class="empty" style="grid-column:1/-1">No matching forms found. Clear your search or switch jurisdiction filter.</div>';

    const bar = $('packetBar');
    if (bar) {
      bar.classList.toggle('hidden', selectedCodes.size === 0);
      $('packetCount').textContent = `${selectedCodes.size} official ${selectedCodes.size === 1 ? 'form' : 'forms'} queued in your custom Filing Packet Checklist`;
    }
  }

  document.querySelectorAll('[data-form-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.formCat;
      syncChips();
      render();
    });
  });

  if ($('formsSearch')) {
    $('formsSearch').value = initQ;
    $('formsSearch').addEventListener('input', render);
  }
  if ($('formsJur')) $('formsJur').addEventListener('change', render);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-code]');
    if (!btn) return;
    const code = btn.dataset.toggleCode;
    if (selectedCodes.has(code)) selectedCodes.delete(code);
    else selectedCodes.add(code);
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

  function selectedList() {
    return FORMS.filter((f) => selectedCodes.has(f.code));
  }

  function gated(label, format, fn) {
    const list = selectedList();
    const summary = {
      metrics: [
        { label: 'Deliverable', value: 'Custom Pro Se Filing Packet' },
        { label: 'Export Format', value: format },
        { label: 'Selected Forms', value: `${list.length} official forms` },
        { label: 'Jurisdictions', value: Array.from(new Set(list.map((x) => x.jur))).join(', ') || 'Mixed' }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  if ($('exportPacketCsv')) {
    $('exportPacketCsv').addEventListener('click', () => gated('Download Filing Packet Checklist (CSV)', 'CSV Checklist', () => {
      const rows = [['FormCode', 'FormTitle', 'Jurisdiction', 'Category', 'OfficialPortalURL']];
      selectedList().forEach((f) => rows.push([f.code, f.title, f.jur, f.cat, f.portal]));
      const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
      download('pro-se-filing-packet-checklist.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    }));
  }

  if ($('printPacketBtn')) {
    $('printPacketBtn').addEventListener('click', () => gated('Print Filing Packet Checklist', 'Printable Checklist', () => {
      const list = selectedList();
      const rows = list.map((f) => `<tr><td><strong>${esc(f.code)}</strong></td><td>${esc(f.title)}<br><small>${esc(f.desc)}</small></td><td>${esc(f.jur)}</td><td>${esc(f.portal)}</td></tr>`).join('');
      const w = window.open('', '_blank');
      if (!w) { alert('Allow pop-ups to print.'); return; }
      w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pro Se Filing Packet Checklist</title>
<style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0 0 6px}p{font-size:13px;color:#444}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5}</style></head>
<body><h1>Custom Pro Se Court Filing Packet Checklist</h1><p>Verify local court supplements and current filing fees before submitting documents to the clerk.</p>
<table><thead><tr><th>Form #</th><th>Official Title &amp; Purpose</th><th>Jurisdiction</th><th>Official Judiciary Portal</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
      w.document.close();
      w.focus();
      w.print();
    }));
  }

  if ($('clearPacketBtn')) {
    $('clearPacketBtn').addEventListener('click', () => {
      selectedCodes.clear();
      render();
    });
  }

  syncChips();
  render();
})();
