/*
 * Clear Fault Legal — Modular Export & Payment Access Gate
 *
 * Routes every tool's download/export/print action through one access checkpoint.
 * To connect Stripe Checkout or Authorize.net later:
 *   1. Set mode = 'checkout'
 *   2. Set checkoutUrl or implement verifyEntitlement()
 */
(() => {
  const EXPORT_GATE_CONFIG = {
    mode: 'preview',
    checkoutUrl: '',
    async verifyEntitlement() {
      return false;
    }
  };

  let pendingAction = null;

  function ensureModal() {
    let backdrop = document.getElementById('exportGateBackdrop');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'exportGateBackdrop';
    backdrop.className = 'gate-backdrop hidden';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'gateModalTitle');
    backdrop.innerHTML = `
      <div class="gate-modal">
        <div class="gate-header">
          <div>
            <span class="status-pill" id="gateModeBadge">Export Access Checkpoint</span>
            <h2 id="gateModalTitle" style="margin-top:10px">Prepare Deliverable Export</h2>
          </div>
          <button type="button" class="btn mini" id="gateCloseBtn" aria-label="Close export dialog">Close</button>
        </div>
        <p class="muted" id="gateDescription" style="margin:0 0 12px"></p>
        <div class="gate-summary" id="gateSummary"></div>
        <div class="info-box" id="gateStatusNote"></div>
        <div class="gate-actions">
          <button type="button" class="btn" id="gateCancelBtn">Return to Tool</button>
          <button type="button" class="btn primary" id="gateConfirmBtn">Continue to Export</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.classList.add('hidden');
      pendingAction = null;
    };

    backdrop.querySelector('#gateCloseBtn').addEventListener('click', close);
    backdrop.querySelector('#gateCancelBtn').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) close();
    });

    backdrop.querySelector('#gateConfirmBtn').addEventListener('click', () => {
      if (EXPORT_GATE_CONFIG.mode === 'checkout') {
        if (EXPORT_GATE_CONFIG.checkoutUrl) {
          window.location.href = EXPORT_GATE_CONFIG.checkoutUrl;
        }
        return;
      }
      const fn = pendingAction;
      close();
      if (typeof fn === 'function') fn();
    });

    return backdrop;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function buildStatsHtml(summary) {
    if (Array.isArray(summary.metrics) && summary.metrics.length) {
      return summary.metrics
        .slice(0, 4)
        .map((m) => `<div class="gate-stat"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`)
        .join('');
    }
    return `
      <div class="gate-stat"><span>Project</span><strong>${esc(summary.title || 'Untitled')}</strong></div>
      <div class="gate-stat"><span>Export Format</span><strong>${esc(summary.format || 'File')}</strong></div>
      <div class="gate-stat"><span>Routes / Markers</span><strong>${summary.routes ?? 0} routes · ${summary.markers ?? 0} markers</strong></div>
      <div class="gate-stat"><span>Chronology / Evidence</span><strong>${summary.events ?? 0} events · ${summary.evidence ?? 0} items</strong></div>
    `;
  }

  async function requestExport(exportLabel, projectSummary, executeFn) {
    if (EXPORT_GATE_CONFIG.mode === 'checkout') {
      const entitled = await EXPORT_GATE_CONFIG.verifyEntitlement();
      if (entitled) {
        executeFn();
        return;
      }
    }

    const backdrop = ensureModal();
    pendingAction = executeFn;

    backdrop.querySelector('#gateModalTitle').textContent = exportLabel;
    backdrop.querySelector('#gateDescription').textContent =
      'Review your deliverable summary before exporting. All uploaded files and entries remain inside your local browser session.';
    backdrop.querySelector('#gateSummary').innerHTML = buildStatsHtml(projectSummary || {});

    const noteEl = backdrop.querySelector('#gateStatusNote');
    const confirmBtn = backdrop.querySelector('#gateConfirmBtn');

    if (EXPORT_GATE_CONFIG.mode === 'checkout') {
      backdrop.querySelector('#gateModeBadge').textContent = 'Licensed Export Required';
      noteEl.textContent = EXPORT_GATE_CONFIG.checkoutUrl
        ? 'Complete checkout to unlock downloads for this workspace.'
        : 'Checkout mode is enabled, but checkoutUrl has not been configured yet in assets/js/export-gate.js.';
      confirmBtn.textContent = EXPORT_GATE_CONFIG.checkoutUrl ? 'Proceed to Checkout' : 'Checkout Not Configured';
      confirmBtn.disabled = !EXPORT_GATE_CONFIG.checkoutUrl;
    } else {
      backdrop.querySelector('#gateModeBadge').textContent = 'Pre-Launch Export Access';
      noteEl.textContent =
        'Payment processing is not yet enabled. You can export your deliverable now during pre-launch access. When billing is configured, this checkpoint connects directly to checkout.';
      confirmBtn.textContent = 'Download / Export Now';
      confirmBtn.disabled = false;
    }

    backdrop.classList.remove('hidden');
    confirmBtn.focus();
  }

  window.ExhibitExportGate = {
    config: EXPORT_GATE_CONFIG,
    requestExport
  };
})();
