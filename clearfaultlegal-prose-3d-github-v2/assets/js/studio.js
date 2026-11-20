(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('sceneCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const FIELD_MAP = [
    ['projectTitle', 'title'],
    ['incidentType', 'incidentType'],
    ['caseId', 'caseId'],
    ['preparedBy', 'preparedBy'],
    ['sceneNotes', 'sceneNotes']
  ];

  function createEmptyState() {
    return {
      title: 'Untitled incident reconstruction',
      incidentType: '',
      caseId: '',
      preparedBy: '',
      sceneNotes: '',
      imageData: null,
      routes: [],
      markers: [],
      events: [],
      evidence: []
    };
  }

  function normalizeState(raw) {
    const base = createEmptyState();
    if (!raw || typeof raw !== 'object') return base;
    base.title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : (typeof raw.projectTitle === 'string' && raw.projectTitle.trim() ? raw.projectTitle : base.title);
    base.incidentType = typeof raw.incidentType === 'string' ? raw.incidentType : '';
    base.caseId = typeof raw.caseId === 'string' ? raw.caseId : '';
    base.preparedBy = typeof raw.preparedBy === 'string' ? raw.preparedBy : '';
    base.sceneNotes = typeof raw.sceneNotes === 'string' ? raw.sceneNotes : '';
    base.imageData = typeof raw.imageData === 'string' && raw.imageData.startsWith('data:image/') ? raw.imageData : null;
    base.routes = Array.isArray(raw.routes)
      ? raw.routes.filter((r) => r && typeof r === 'object').map((r) => ({
          id: String(r.id || uid()),
          name: String(r.name || 'Route'),
          color: typeof r.color === 'string' ? r.color : '#58b8ff',
          description: String(r.description || ''),
          points: Array.isArray(r.points)
            ? r.points
                .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
                .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
            : []
        }))
      : [];
    base.markers = Array.isArray(raw.markers)
      ? raw.markers
          .filter((m) => m && Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.y)))
          .map((m) => ({
            id: String(m.id || uid()),
            type: markerStyles[m.type] ? m.type : 'event',
            label: String(m.label || m.type || 'Marker'),
            x: Number(m.x),
            y: Number(m.y),
            description: String(m.description || '')
          }))
      : [];
    base.events = Array.isArray(raw.events)
      ? raw.events.filter((e) => e && typeof e === 'object').map((e) => ({
          id: String(e.id || uid()),
          time: String(e.time || ''),
          title: String(e.title || ''),
          description: String(e.description || '')
        }))
      : [];
    base.evidence = Array.isArray(raw.evidence)
      ? raw.evidence.filter((e) => e && typeof e === 'object').map((e) => ({
          uid: String(e.uid || uid()),
          id: String(e.id || ''),
          type: String(e.type || 'Other'),
          description: String(e.description || ''),
          classification: String(e.classification || 'Documented fact')
        }))
      : [];
    return base;
  }

  const markerStyles = {
    event: { color: '#f4b942', symbol: '◆', name: 'Event / occurrence' },
    contact: { color: '#ff6868', symbol: '✕', name: 'Contact / interaction' },
    injury: { color: '#d58cff', symbol: '○', name: 'Reported injury area' },
    reference: { color: '#70d6b0', symbol: '●', name: 'Reference / evidence' },
    interest: { color: '#a9c7e8', symbol: '□', name: 'Area of interest' }
  };

  let state = createEmptyState();
  let mode = 'select'; // 'select' | 'route' | 'marker'
  let activeTab = 'scene';
  let selectedRouteId = '';
  let bgImage = null;
  let zoomLevel = 1;

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function uid() {
    return 'i' + Math.random().toString(36).slice(2, 10);
  }

  function syncInputs() {
    FIELD_MAP.forEach(([elId, key]) => {
      const el = $(elId);
      if (el) el.value = state[key] || '';
    });
  }

  function updateState() {
    FIELD_MAP.forEach(([elId, key]) => {
      const el = $(elId);
      if (el) state[key] = el.value;
    });
  }

  function getActiveRoute() {
    if (!state.routes.length) return null;
    const found = state.routes.find((r) => r.id === selectedRouteId);
    if (found) return found;
    selectedRouteId = state.routes[0].id;
    return state.routes[0];
  }

  function setMode(nextMode) {
    mode = nextMode;
    canvas.classList.toggle('placing', mode !== 'select');

    const routeBtn = $('routeMode');
    const markerBtn = $('markerMode');
    if (routeBtn) {
      const isRoute = mode === 'route';
      routeBtn.classList.toggle('active-mode', isRoute);
      routeBtn.textContent = isRoute ? 'Stop plotting route points (Esc)' : 'Plot points on scene';
    }
    if (markerBtn) {
      const isMarker = mode === 'marker';
      markerBtn.classList.toggle('active-mode', isMarker);
      markerBtn.textContent = isMarker ? 'Cancel marker placement (Esc)' : 'Place marker on scene';
    }

    if (mode === 'route') {
      const r = getActiveRoute();
      $('modeHint').textContent = r
        ? `Plotting route "${r.name}" — click or tap the scene to add points in sequence (Esc to stop)`
        : 'Add a route first to begin plotting points';
    } else if (mode === 'marker') {
      $('modeHint').textContent = 'Marker mode active — click or tap the scene to place the selected marker';
    } else {
      $('modeHint').textContent = 'View mode — select a workflow action to add route points or markers';
    }
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach((b) => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('hidden', p.id !== 'tab-' + tab);
    });
    setMode('select');
  }

  function applyZoom() {
    canvas.style.width = `${Math.round(zoomLevel * 100)}%`;
    const zoomLabel = $('zoomReadout');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  function drawLabelPill(text, x, y, bgColor, textColor) {
    ctx.save();
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(text);
    const padX = 10;
    const boxW = metrics.width + padX * 2;
    const boxH = 28;
    const drawX = Math.max(8, Math.min(canvas.width - boxW - 8, x));
    const drawY = Math.max(8, Math.min(canvas.height - boxH - 80, y));

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(drawX, drawY, boxW, boxH, 7);
    } else {
      const r = 7;
      ctx.moveTo(drawX + r, drawY);
      ctx.lineTo(drawX + boxW - r, drawY);
      ctx.quadraticCurveTo(drawX + boxW, drawY, drawX + boxW, drawY + r);
      ctx.lineTo(drawX + boxW, drawY + boxH - r);
      ctx.quadraticCurveTo(drawX + boxW, drawY + boxH, drawX + boxW - r, drawY + boxH);
      ctx.lineTo(drawX + r, drawY + boxH);
      ctx.quadraticCurveTo(drawX, drawY + boxH, drawX, drawY + boxH - r);
      ctx.lineTo(drawX, drawY + r);
      ctx.quadraticCurveTo(drawX, drawY, drawX + r, drawY);
      ctx.closePath();
    }
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, drawX + padX, drawY + boxH / 2 + 1);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImage) {
      const s = Math.min(canvas.width / bgImage.width, (canvas.height - 76) / bgImage.height);
      const w = bgImage.width * s;
      const h = bgImage.height * s;
      ctx.drawImage(bgImage, (canvas.width - w) / 2, ((canvas.height - 76) - h) / 2, w, h);
    } else {
      ctx.strokeStyle = '#dce3e9';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height - 76);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height - 76; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.save();
      ctx.fillStyle = '#6c7c8c';
      ctx.font = '600 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Upload a scene photograph, aerial map, or diagram — or plot directly on this grid', 36, 36);
      ctx.restore();
    }

    // Draw movement routes
    state.routes.forEach((r) => {
      if (!r.points.length) return;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      r.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();

      r.points.forEach((p, i) => {
        ctx.fillStyle = r.color;
        ctx.strokeStyle = '#0b1220';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#07111f';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), p.x, p.y + 1);
      });
      ctx.restore();

      drawLabelPill(r.name, r.points[0].x + 22, r.points[0].y - 34, 'rgba(11, 18, 32, 0.88)', r.color);
    });

    // Draw markers
    state.markers.forEach((m) => {
      const st = markerStyles[m.type] || markerStyles.event;
      ctx.save();
      ctx.fillStyle = st.color;
      ctx.strokeStyle = '#101827';
      ctx.lineWidth = 4;

      if (m.type === 'injury') {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (m.type === 'interest') {
        ctx.beginPath();
        ctx.rect(m.x - 17, m.y - 17, 34, 34);
        ctx.fill();
        ctx.stroke();
      } else if (m.type === 'contact') {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (m.type !== 'injury') {
        ctx.fillStyle = '#0b1220';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.symbol, m.x, m.y + 1);
      }
      ctx.restore();

      drawLabelPill(m.label || st.name, m.x + 24, m.y - 30, 'rgba(16, 24, 39, 0.9)', '#edf3fb');
    });

    // Exhibit title bar at bottom of canvas
    ctx.save();
    ctx.fillStyle = '#0e1929';
    ctx.fillRect(0, canvas.height - 76, canvas.width, 76);
    ctx.strokeStyle = '#2a3a50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 76);
    ctx.lineTo(canvas.width, canvas.height - 76);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#edf3fb';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(state.title || 'Untitled incident reconstruction', 26, canvas.height - 42);

    ctx.fillStyle = '#9aabc0';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    const metaLine = [state.incidentType, state.caseId, state.preparedBy ? `Prepared by: ${state.preparedBy}` : '']
      .filter(Boolean)
      .join('  ·  ');
    ctx.fillText(metaLine || 'Illustrative visual exhibit — user-entered geometry and annotations', 26, canvas.height - 17);
    ctx.restore();

    renderLists();
  }

  function renderLists() {
    $('routeCount').textContent = state.routes.length;
    $('markerCount').textContent = state.markers.length;

    const currentRoute = getActiveRoute();

    $('routeList').innerHTML = state.routes.length
      ? state.routes
          .map(
            (r) => `
          <div class="item ${currentRoute && currentRoute.id === r.id ? 'selected' : ''}">
            <div class="item-body">
              <strong><span class="swatch" style="background:${esc(r.color)}"></span>${esc(r.name)}</strong>
              <small>${r.points.length} ${r.points.length === 1 ? 'point' : 'points'}${r.description ? ' · ' + esc(r.description) : ''}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini" data-act="select-route" data-id="${esc(r.id)}">Plot</button>
              <button type="button" class="btn mini" data-act="edit-route" data-id="${esc(r.id)}">Edit</button>
              <button type="button" class="btn mini danger" data-act="del-route" data-id="${esc(r.id)}" aria-label="Delete route">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No routes yet. Add a route in Step 2 to begin plotting.</div>';

    $('markerList').innerHTML = state.markers.length
      ? state.markers
          .map(
            (m) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(m.label || m.type)}</strong>
              <small>${esc((markerStyles[m.type] && markerStyles[m.type].name) || m.type)}${m.description ? ' · ' + esc(m.description) : ''}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini" data-act="edit-marker" data-id="${esc(m.id)}">Edit</button>
              <button type="button" class="btn mini danger" data-act="del-marker" data-id="${esc(m.id)}" aria-label="Delete marker">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No markers yet.</div>';

    // Preserve selectedRouteId when rebuilding the dropdown options
    const routeSelect = $('activeRoute');
    routeSelect.innerHTML = state.routes.length
      ? state.routes.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')
      : '<option value="">No routes created yet</option>';
    if (currentRoute) {
      routeSelect.value = currentRoute.id;
    }

    $('timelineList').innerHTML = state.events.length
      ? state.events
          .map(
            (e) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(e.time ? e.time + ' · ' : '')}${esc(e.title)}</strong>
              <small>${esc(e.description)}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini danger" data-act="del-event" data-id="${esc(e.id)}" aria-label="Delete event">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No events added yet.</div>';

    $('evidenceList').innerHTML = state.evidence.length
      ? state.evidence
          .map(
            (e) => `
          <div class="item">
            <div class="item-body">
              <strong>${esc(e.id)} · ${esc(e.type)}</strong>
              <small>${esc(e.classification)} · ${esc(e.description)}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini danger" data-act="del-evidence" data-id="${esc(e.uid)}" aria-label="Delete evidence item">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No evidence items recorded.</div>';

    const routeModeBtn = $('routeMode');
    if (routeModeBtn) routeModeBtn.disabled = state.routes.length === 0;
    const undoBtn = $('undoPoint');
    if (undoBtn) undoBtn.disabled = !currentRoute || currentRoute.points.length === 0;
  }

  function getSummary(format) {
    updateState();
    return {
      title: state.title || 'Untitled incident reconstruction',
      format,
      routes: state.routes.length,
      markers: state.markers.length,
      events: state.events.length,
      evidence: state.evidence.length
    };
  }

  function runThroughGate(label, format, callback) {
    if (window.ExhibitExportGate && typeof window.ExhibitExportGate.requestExport === 'function') {
      window.ExhibitExportGate.requestExport(label, getSummary(format), callback);
    } else {
      callback();
    }
  }

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

  function slugTitle() {
    return (state.title || 'incident-project')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'incident-project';
  }

  function projectData() {
    updateState();
    return { ...state, version: 2, exportedAt: new Date().toISOString() };
  }

  function executeSaveJson() {
    download(
      slugTitle() + '.json',
      new Blob([JSON.stringify(projectData(), null, 2)], { type: 'application/json' })
    );
  }

  function executeExportPng() {
    updateState();
    draw();
    canvas.toBlob((b) => {
      if (b) download(slugTitle() + '-exhibit.png', b);
    }, 'image/png');
  }

  function executePrint() {
    updateState();
    draw();
    const w = window.open('', '_blank');
    if (!w) {
      alert('Allow pop-ups in your browser to print the exhibit.');
      return;
    }
    const url = canvas.toDataURL('image/png');
    const timelineRows = state.events
      .map((e) => `<tr><td>${esc(e.time)}</td><td>${esc(e.title)}</td><td>${esc(e.description)}</td></tr>`)
      .join('');
    const evidenceRows = state.evidence
      .map((e) => `<tr><td>${esc(e.id)}</td><td>${esc(e.type)}</td><td>${esc(e.classification)}</td><td>${esc(e.description)}</td></tr>`)
      .join('');

    w.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(state.title)} — Printable Exhibit</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
  h1{font-size:20px;margin:0 0 6px}
  .meta{color:#444;font-size:13px;margin:0 0 14px}
  img{width:100%;height:auto;border:1px solid #ccc;border-radius:4px}
  h2{font-size:15px;margin:20px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
  th{background:#f1f3f5}
  .disclaimer{margin-top:16px;padding:10px;border-left:3px solid #997322;background:#fbf7ea;font-size:11px;color:#333}
</style></head><body>
  <h1>${esc(state.title)}</h1>
  <p class="meta">${esc([state.incidentType, state.caseId, state.preparedBy ? 'Prepared by: ' + state.preparedBy : ''].filter(Boolean).join(' · '))}</p>
  <img id="exhibitImg" src="${url}" alt="Incident scene exhibit">
  ${state.sceneNotes ? `<p><strong>Scene notes:</strong> ${esc(state.sceneNotes)}</p>` : ''}
  ${timelineRows ? `<h2>Event Chronology</h2><table><thead><tr><th>Time / Sequence</th><th>Event</th><th>Description</th></tr></thead><tbody>${timelineRows}</tbody></table>` : ''}
  ${evidenceRows ? `<h2>Evidence Register</h2><table><thead><tr><th>ID</th><th>Type</th><th>Classification</th><th>Description / Source</th></tr></thead><tbody>${evidenceRows}</tbody></table>` : ''}
  <div class="disclaimer">This visual exhibit was assembled from user-entered data. It is an illustrative visual aid and does not independently authenticate evidence, calculate dynamics, establish causation, or constitute an expert or medical opinion.</div>
</body></html>`);
    w.document.close();

    const img = w.document.getElementById('exhibitImg');
    const triggerPrint = () => {
      w.focus();
      w.print();
    };
    if (img && !img.complete) {
      img.onload = triggerPrint;
    } else {
      setTimeout(triggerPrint, 150);
    }
  }

  function executeExportCsv() {
    updateState();
    const rows = [['Category', 'ID / Name', 'Description', 'Classification / Details']];
    state.routes.forEach((r) => rows.push(['Route', r.name, r.description, `${r.points.length} points (${r.color})`]));
    state.markers.forEach((m) => rows.push(['Marker', m.label, m.description, m.type]));
    state.events.forEach((e) => rows.push(['Timeline', e.time, e.title, e.description]));
    state.evidence.forEach((e) => rows.push(['Evidence', e.id, e.description, e.classification]));
    const csv = rows
      .map((row) => row.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
    download(slugTitle() + '-summary.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  // Event bindings
  document.querySelectorAll('.tab').forEach((b) => {
    b.addEventListener('click', () => setTab(b.dataset.tab));
  });

  canvas.addEventListener('click', (e) => {
    if (mode === 'select') return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;

    if (y > canvas.height - 76) return; // keep points above footer bar

    if (mode === 'route') {
      const route = getActiveRoute();
      if (!route) {
        alert('Add a route first before plotting points.');
        setMode('select');
        return;
      }
      route.points.push({ x, y });
      draw();
      // Stay in continuous route mode so users can click sequential points smoothly
      $('modeHint').textContent = `Point #${route.points.length} added to "${route.name}" — click again for next point or press Esc to stop`;
    } else if (mode === 'marker') {
      const type = $('markerType').value;
      const defaultLabel = $('markerType').selectedOptions[0].text;
      state.markers.push({
        id: uid(),
        type,
        label: $('markerLabel').value.trim() || defaultLabel,
        x,
        y,
        description: $('markerDescription').value.trim()
      });
      $('markerLabel').value = '';
      $('markerDescription').value = '';
      setMode('select');
      $('modeHint').textContent = 'Marker placed on scene';
      draw();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode !== 'select') {
      setMode('select');
    }
  });

  $('sceneImage').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imageData = reader.result;
      bgImage = new Image();
      bgImage.onload = draw;
      bgImage.src = state.imageData;
    };
    reader.readAsDataURL(f);
  });

  $('clearImage').addEventListener('click', () => {
    state.imageData = null;
    bgImage = null;
    $('sceneImage').value = '';
    draw();
  });

  $('addRoute').addEventListener('click', () => {
    const name = $('routeName').value.trim();
    if (!name) {
      alert('Enter a route name first.');
      $('routeName').focus();
      return;
    }
    const newRoute = {
      id: uid(),
      name,
      color: $('routeColor').value,
      description: $('routeDescription').value.trim(),
      points: []
    };
    state.routes.push(newRoute);
    selectedRouteId = newRoute.id;
    $('routeName').value = '';
    $('routeDescription').value = '';
    draw();
    setMode('route');
  });

  $('activeRoute').addEventListener('change', (e) => {
    selectedRouteId = e.target.value;
    draw();
    if (mode === 'route') setMode('route');
  });

  $('routeMode').addEventListener('click', () => {
    if (!getActiveRoute()) {
      alert('Add a route first.');
      return;
    }
    setMode(mode === 'route' ? 'select' : 'route');
  });

  $('undoPoint').addEventListener('click', () => {
    const r = getActiveRoute();
    if (r && r.points.length) {
      r.points.pop();
      draw();
    }
  });

  $('markerMode').addEventListener('click', () => {
    setMode(mode === 'marker' ? 'select' : 'marker');
  });

  $('addEvent').addEventListener('click', () => {
    const title = $('eventTitle').value.trim();
    if (!title) {
      alert('Enter an event title.');
      $('eventTitle').focus();
      return;
    }
    state.events.push({
      id: uid(),
      time: $('eventTime').value.trim(),
      title,
      description: $('eventDescription').value.trim()
    });
    ['eventTime', 'eventTitle', 'eventDescription'].forEach((k) => ($(k).value = ''));
    draw();
  });

  $('addEvidence').addEventListener('click', () => {
    const id = $('evidenceId').value.trim();
    const description = $('evidenceDescription').value.trim();
    if (!id || !description) {
      alert('Enter both an evidence ID and a description/source.');
      return;
    }
    state.evidence.push({
      uid: uid(),
      id,
      type: $('evidenceType').value,
      description,
      classification: $('evidenceClass').value
    });
    ['evidenceId', 'evidenceDescription'].forEach((k) => ($(k).value = ''));
    draw();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;

    if (act === 'select-route') {
      selectedRouteId = id;
      setTab('routes');
      draw();
      setMode('route');
      return;
    }
    if (act === 'edit-route') {
      const route = state.routes.find((x) => x.id === id);
      if (!route) return;
      const nextName = prompt('Edit route name:', route.name);
      if (nextName !== null && nextName.trim()) {
        route.name = nextName.trim();
        const nextDesc = prompt('Edit route description (optional):', route.description || '');
        if (nextDesc !== null) route.description = nextDesc.trim();
        draw();
      }
      return;
    }
    if (act === 'edit-marker') {
      const marker = state.markers.find((x) => x.id === id);
      if (!marker) return;
      const nextLabel = prompt('Edit marker label:', marker.label || '');
      if (nextLabel !== null && nextLabel.trim()) {
        marker.label = nextLabel.trim();
        const nextDesc = prompt('Edit marker description / source note:', marker.description || '');
        if (nextDesc !== null) marker.description = nextDesc.trim();
        draw();
      }
      return;
    }
    if (act === 'del-route') {
      state.routes = state.routes.filter((x) => x.id !== id);
      if (selectedRouteId === id) selectedRouteId = state.routes[0] ? state.routes[0].id : '';
      if (!state.routes.length && mode === 'route') setMode('select');
    }
    if (act === 'del-marker') state.markers = state.markers.filter((x) => x.id !== id);
    if (act === 'del-event') state.events = state.events.filter((x) => x.id !== id);
    if (act === 'del-evidence') state.evidence = state.evidence.filter((x) => x.uid !== id);
    draw();
  });

  // Export & Save actions routed through the modular Export Gate
  $('saveBtn').addEventListener('click', () => runThroughGate('Save Project File (JSON)', 'Project JSON', executeSaveJson));
  $('exportJson').addEventListener('click', () => runThroughGate('Download Project File (JSON)', 'Project JSON', executeSaveJson));
  $('exportPng').addEventListener('click', () => runThroughGate('Export Scene Exhibit (PNG)', 'PNG Image (1400×800)', executeExportPng));
  $('printBtn').addEventListener('click', () => runThroughGate('Print Visual Exhibit', 'Printable Exhibit', executePrint));
  $('exportReport').addEventListener('click', () => runThroughGate('Download Summary Register (CSV)', 'CSV Summary Report', executeExportCsv));

  $('importBtn').addEventListener('click', () => $('projectFile').click());
  $('projectFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const parsed = JSON.parse(rd.result);
        state = normalizeState(parsed);
        selectedRouteId = state.routes[0] ? state.routes[0].id : '';
        syncInputs();
        bgImage = null;
        if (state.imageData) {
          bgImage = new Image();
          bgImage.onload = draw;
          bgImage.src = state.imageData;
        } else {
          draw();
        }
      } catch (err) {
        alert('Could not open that project file. Make sure it is a valid Incident Reconstruction Studio JSON export.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('newProject').addEventListener('click', () => {
    if (!confirm('Start a new blank project? Export your current work first if you want to keep it.')) return;
    state = createEmptyState();
    selectedRouteId = '';
    bgImage = null;
    syncInputs();
    $('sceneImage').value = '';
    zoomLevel = 1;
    applyZoom();
    draw();
    setTab('scene');
  });

  $('zoomIn').addEventListener('click', () => {
    zoomLevel = Math.min(2.5, Number((zoomLevel + 0.25).toFixed(2)));
    applyZoom();
  });
  $('zoomOut').addEventListener('click', () => {
    zoomLevel = Math.max(0.75, Number((zoomLevel - 0.25).toFixed(2)));
    applyZoom();
  });
  $('fitView').addEventListener('click', () => {
    zoomLevel = 1;
    applyZoom();
    draw();
  });

  FIELD_MAP.forEach(([elId, key]) => {
    const el = $(elId);
    if (!el) return;
    el.addEventListener('input', () => {
      state[key] = el.value;
      draw();
    });
  });

  syncInputs();
  applyZoom();
  draw();
})();
