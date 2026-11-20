(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene3dCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const PRESETS = {
    car: { label: 'Car', w: 1.9, d: 4.4, h: 1.45, color: '#58b8ff', movable: true },
    truck: { label: 'Truck / SUV', w: 2.3, d: 6.0, h: 2.3, color: '#75d6b0', movable: true },
    person: { label: 'Person', w: 0.7, d: 0.7, h: 1.75, color: '#f4b942', movable: true },
    cyclist: { label: 'Cyclist', w: 0.85, d: 1.9, h: 1.65, color: '#ff9f68', movable: true },
    building: { label: 'Wall / Building', w: 4.5, d: 4.5, h: 3.4, color: '#8ea0b8', movable: false },
    hazard: { label: 'Hazard / Cone', w: 1.0, d: 1.0, h: 1.1, color: '#ff7272', movable: false },
    impact: { label: 'Impact Point', w: 1.4, d: 1.4, h: 0.25, color: '#ff5d73', movable: false }
  };

  function emptyState() {
    return {
      title: 'Untitled 3D incident animation',
      caseId: '',
      backdrop: 'intersection', // 'intersection' | 'road' | 'lot' | 'grid'
      duration: 6,
      notes: '',
      camera: { yaw: 34, pitch: 30, dist: 28 },
      actors: []
    };
  }

  let state = emptyState();
  let selectedId = '';
  let editKeyframe = 'start'; // 'start' | 'end'
  let currentTime = 0;
  let playing = false;
  let playSpeed = 1;
  let lastFrameTs = 0;
  let recording = false;

  // Pointer interaction state: drag selected actor on 3D floor OR orbit camera on empty ground
  let pointerMode = null; // 'actor' | 'orbit'
  let dragActorId = '';
  let dragOffset = { x: 0, z: 0 };
  let lastPointer = { x: 0, y: 0 };

  function uid() {
    return 'a_' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#58b8ff');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [88, 184, 255];
  }

  function shadeHex(hex, factor) {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${clamp(Math.round(r * factor), 0, 255)}, ${clamp(Math.round(g * factor), 0, 255)}, ${clamp(Math.round(b * factor), 0, 255)})`;
  }

  // Physically accurate 3D perspective camera projection + exact ground-plane inverse
  const CX = canvas.width / 2;
  const CY = canvas.height / 2 + 25;
  const FOV = 920;

  function project(x, y, z) {
    const yaw = (state.camera.yaw * Math.PI) / 180;
    const pitch = (state.camera.pitch * Math.PI) / 180;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    const rx = x * cosY - z * sinY;
    const rz0 = x * sinY + z * cosY;
    const camY = y * cosP + rz0 * sinP;
    const camZ = -y * sinP + rz0 * cosP + state.camera.dist;
    const depth = Math.max(1.2, camZ);
    const scale = FOV / depth;

    return {
      sx: CX + rx * scale,
      sy: CY - camY * scale,
      depth,
      visible: camZ > 1.2
    };
  }

  function unprojectGround(sx, sy) {
    const yaw = (state.camera.yaw * Math.PI) / 180;
    const pitch = (state.camera.pitch * Math.PI) / 180;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    const ny = (CY - sy) / FOV;
    const denom = sinP - ny * cosP;
    if (Math.abs(denom) < 0.0005) return null;

    const rz0 = (ny * state.camera.dist) / denom;
    const camZ = rz0 * cosP + state.camera.dist;
    if (camZ <= 1.2) return null;

    const rx = ((sx - CX) / FOV) * camZ;
    const x = rx * cosY + rz0 * sinY;
    const z = -rx * sinY + rz0 * cosY;
    return { x: clamp(x, -19, 19), z: clamp(z, -19, 19) };
  }

  function getActorPoseAt(actor, t) {
    const dur = Math.max(1, Number(state.duration) || 6);
    const sT = clamp(Number(actor.startTime) || 0, 0, dur);
    const eT = clamp(Number(actor.endTime ?? dur), sT + 0.1, dur);

    if (actor.type === 'impact') {
      return {
        x: actor.startX,
        z: actor.startZ,
        rot: actor.rot || 0,
        visible: playing || recording ? t >= sT : true
      };
    }

    const moves = actor.hasMotion && (Math.hypot(actor.endX - actor.startX, actor.endZ - actor.startZ) > 0.15);
    if (!moves) {
      return { x: actor.startX, z: actor.startZ, rot: actor.rot || 0, visible: true };
    }

    // While paused and editing the End keyframe, show actor at its End spot if scrubber is near start
    let u = clamp((t - sT) / (eT - sT), 0, 1);
    const x = actor.startX + (actor.endX - actor.startX) * u;
    const z = actor.startZ + (actor.endZ - actor.startZ) * u;

    // Auto-face direction of motion unless manual rotation override is locked
    let rot = actor.rot || 0;
    if (actor.autoFace !== false) {
      const dx = actor.endX - actor.startX;
      const dz = actor.endZ - actor.startZ;
      if (Math.hypot(dx, dz) > 0.15) {
        rot = (Math.atan2(dx, dz) * 180) / Math.PI;
      }
    }
    return { x, z, rot, visible: true };
  }

  function pushBoxFaces(out, cx, cy, cz, w, d, h, rotDeg, color, isSel, alpha) {
    const hw = w / 2, hd = d / 2;
    const rad = ((rotDeg || 0) * Math.PI) / 180;
    const cosR = Math.cos(rad), sinR = Math.sin(rad);

    function toW(lx, ly, lz) {
      return [cx + lx * cosR + lz * sinR, cy + ly, cz - lx * sinR + lz * cosR];
    }

    const verts = [
      toW(-hw, 0, -hd), toW(hw, 0, -hd), toW(hw, 0, hd), toW(-hw, 0, hd),
      toW(-hw, h, -hd), toW(hw, h, -hd), toW(hw, h, hd), toW(-hw, h, hd)
    ];
    const proj = verts.map(([vx, vy, vz]) => project(vx, vy, vz));
    const defs = [
      { idx: [4, 5, 6, 7], shade: 1.12 }, // top
      { idx: [2, 3, 7, 6], shade: 0.96 }, // front (+z)
      { idx: [0, 1, 5, 4], shade: 0.72 }, // back (-z)
      { idx: [1, 2, 6, 5], shade: 0.84 }, // right
      { idx: [3, 0, 4, 7], shade: 0.66 }  // left
    ];

    defs.forEach((f) => {
      const pts = f.idx.map((i) => proj[i]);
      const avgDepth = pts.reduce((a, p) => a + p.depth, 0) / 4;
      out.push({
        pts,
        avgDepth,
        fill: shadeHex(color, f.shade),
        stroke: isSel ? '#ffffff' : 'rgba(7, 16, 30, 0.72)',
        lineWidth: isSel ? 2.2 : 1.1,
        alpha: alpha ?? 0.98
      });
    });
  }

  function addActorGeometry(faces, actor, pose) {
    const isSel = actor.id === selectedId;
    const { x, z, rot } = pose;
    const rad = (rot * Math.PI) / 180;
    const sinR = Math.sin(rad), cosR = Math.cos(rad);
    const offset = (lx, lz) => [x + lx * cosR + lz * sinR, z - lx * sinR + lz * cosR];

    if (actor.type === 'car') {
      // Lower chassis + upper cabin + bright front windshield indicator
      pushBoxFaces(faces, x, 0.12, z, actor.w, actor.d, 0.68, rot, actor.color, isSel);
      const [cabX, cabZ] = offset(0, -0.25);
      pushBoxFaces(faces, cabX, 0.80, cabZ, actor.w * 0.84, actor.d * 0.52, 0.62, rot, shadeHex(actor.color, 1.15), isSel);
      const [wsX, wsZ] = offset(0, 0.92);
      pushBoxFaces(faces, wsX, 0.82, wsZ, actor.w * 0.78, 0.22, 0.50, rot, '#d8f1ff', false, 0.92);
    } else if (actor.type === 'truck') {
      pushBoxFaces(faces, x, 0.2, z, actor.w, actor.d, 0.85, rot, actor.color, isSel);
      const [cabX, cabZ] = offset(0, 1.65);
      pushBoxFaces(faces, cabX, 1.05, cabZ, actor.w * 0.92, 1.85, 1.15, rot, shadeHex(actor.color, 1.12), isSel);
      const [boxX, boxZ] = offset(0, -1.0);
      pushBoxFaces(faces, boxX, 1.05, boxZ, actor.w * 0.95, 3.3, 1.35, rot, shadeHex(actor.color, 0.88), isSel);
      const [wsX, wsZ] = offset(0, 2.55);
      pushBoxFaces(faces, wsX, 1.25, wsZ, actor.w * 0.84, 0.18, 0.72, rot, '#d8f1ff', false, 0.92);
    } else if (actor.type === 'person') {
      pushBoxFaces(faces, x, 0, z, 0.56, 0.42, 1.25, rot, actor.color, isSel);
      pushBoxFaces(faces, x, 1.28, z, 0.42, 0.42, 0.44, rot, '#ffe4c4', isSel);
    } else if (actor.type === 'cyclist') {
      pushBoxFaces(faces, x, 0.05, z, 0.36, 1.85, 0.72, rot, '#c9d6e6', isSel);
      pushBoxFaces(faces, x, 0.75, z, 0.54, 0.5, 0.68, rot, actor.color, isSel);
      pushBoxFaces(faces, x, 1.45, z, 0.36, 0.36, 0.36, rot, '#ffe4c4', isSel);
    } else if (actor.type === 'hazard') {
      pushBoxFaces(faces, x, 0, z, 1.05, 1.05, 0.22, rot, '#38465a', isSel);
      pushBoxFaces(faces, x, 0.22, z, 0.68, 0.68, 0.78, rot, actor.color, isSel);
    } else if (actor.type === 'impact') {
      pushBoxFaces(faces, x, 0.04, z, 1.4, 1.4, 0.16, rot, actor.color, isSel, 0.85);
      pushBoxFaces(faces, x, 0.2, z, 0.24, 0.24, 2.2, rot, '#ffd27d', false, 0.88);
    } else {
      pushBoxFaces(faces, x, 0, z, actor.w, actor.d, actor.h, rot, actor.color, isSel);
    }
  }

  function drawQuad(ptsWorld, fill, stroke) {
    const pts = ptsWorld.map(([x, y, z]) => project(x, y, z));
    if (pts.some((p) => !p.visible)) return;
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLine3D(a, b, color, width, dash) {
    const p1 = project(a[0], a[1], a[2]);
    const p2 = project(b[0], b[1], b[2]);
    if (!p1.visible || !p2.visible) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackdrop() {
    // Base ground slab
    drawQuad([[-20, 0, -20], [20, 0, -20], [20, 0, 20], [-20, 0, 20]], '#132033', '#273a52');

    if (state.backdrop === 'intersection') {
      // North-South & East-West roads
      drawQuad([[-5.2, 0.01, -20], [5.2, 0.01, -20], [5.2, 0.01, 20], [-5.2, 0.01, 20]], '#232f40');
      drawQuad([[-20, 0.01, -5.2], [20, 0.01, -5.2], [20, 0.01, 5.2], [-20, 0.01, 5.2]], '#232f40');
      // Center lane yellow dividers
      drawLine3D([0, 0.02, -20], [0, 0.02, -6.2], '#e5b84b', 2.4, [10, 8]);
      drawLine3D([0, 0.02, 6.2], [0, 0.02, 20], '#e5b84b', 2.4, [10, 8]);
      drawLine3D([-20, 0.02, 0], [-6.2, 0.02, 0], '#e5b84b', 2.4, [10, 8]);
      drawLine3D([6.2, 0.02, 0], [20, 0.02, 0], '#e5b84b', 2.4, [10, 8]);
      // Crosswalk stripes on all 4 sides
      for (let s = -4.2; s <= 4.2; s += 1.4) {
        drawQuad([[s - 0.3, 0.02, -6.2], [s + 0.3, 0.02, -6.2], [s + 0.3, 0.02, -4.8], [s - 0.3, 0.02, -4.8]], 'rgba(237,243,251,0.7)');
        drawQuad([[s - 0.3, 0.02, 4.8], [s + 0.3, 0.02, 4.8], [s + 0.3, 0.02, 6.2], [s - 0.3, 0.02, 6.2]], 'rgba(237,243,251,0.7)');
        drawQuad([[-6.2, 0.02, s - 0.3], [-4.8, 0.02, s - 0.3], [-4.8, 0.02, s + 0.3], [-6.2, 0.02, s + 0.3]], 'rgba(237,243,251,0.7)');
        drawQuad([[4.8, 0.02, s - 0.3], [6.2, 0.02, s - 0.3], [6.2, 0.02, s + 0.3], [4.8, 0.02, s + 0.3]], 'rgba(237,243,251,0.7)');
      }
    } else if (state.backdrop === 'road') {
      drawQuad([[-20, 0.01, -6.5], [20, 0.01, -6.5], [20, 0.01, 6.5], [-20, 0.01, 6.5]], '#232f40');
      drawLine3D([-20, 0.02, 0], [20, 0.02, 0], '#e5b84b', 2.8);
      drawLine3D([-20, 0.02, -3.2], [20, 0.02, -3.2], 'rgba(237,243,251,0.65)', 1.8, [12, 10]);
      drawLine3D([-20, 0.02, 3.2], [20, 0.02, 3.2], 'rgba(237,243,251,0.65)', 1.8, [12, 10]);
    } else if (state.backdrop === 'lot') {
      drawQuad([[-18, 0.01, -18], [18, 0.01, -18], [18, 0.01, 18], [-18, 0.01, 18]], '#1e2b3c', '#354b66');
      // Walkway strip at north edge + parking stall lines
      drawQuad([[-18, 0.02, -18], [18, 0.02, -18], [18, 0.02, -14], [-18, 0.02, -14]], '#34475e');
      for (let x = -15; x <= 15; x += 3) {
        drawLine3D([x, 0.02, -14], [x, 0.02, -8.5], 'rgba(237,243,251,0.55)', 1.6);
        drawLine3D([x, 0.02, 8.5], [x, 0.02, 14], 'rgba(237,243,251,0.55)', 1.6);
      }
    }

    // Subtle reference grid over ground
    const gridAlpha = state.backdrop === 'grid' ? 0.22 : 0.08;
    for (let i = -20; i <= 20; i += 4) {
      drawLine3D([i, 0.015, -20], [i, 0.015, 20], `rgba(154,171,192,${gridAlpha})`, 1);
      drawLine3D([-20, 0.015, i], [20, 0.015, i], `rgba(154,171,192,${gridAlpha})`, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#09111f');
    grad.addColorStop(1, '#132237');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackdrop();

    // Draw motion path guides for actors that move (when not actively recording video)
    if (!recording) {
      state.actors.forEach((a) => {
        if (!a.hasMotion) return;
        const dist = Math.hypot(a.endX - a.startX, a.endZ - a.startZ);
        if (dist < 0.15) return;
        const isSel = a.id === selectedId;
        drawLine3D([a.startX, 0.08, a.startZ], [a.endX, 0.08, a.endZ], a.color, isSel ? 4 : 2.5, [10, 7]);
        const sp = project(a.startX, 0.08, a.startZ);
        const ep = project(a.endX, 0.08, a.endZ);
        if (sp.visible) {
          ctx.save();
          ctx.fillStyle = a.color;
          ctx.strokeStyle = '#07111f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, isSel ? 11 : 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (isSel) {
            ctx.fillStyle = '#07111f';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', sp.sx, sp.sy + 0.5);
          }
          ctx.restore();
        }
        if (ep.visible) {
          ctx.save();
          ctx.strokeStyle = a.color;
          ctx.fillStyle = '#0b1220';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ep.sx, ep.sy, isSel ? 11 : 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (isSel) {
            ctx.fillStyle = a.color;
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('E', ep.sx, ep.sy + 0.5);
          }
          ctx.restore();
        }
      });
    }

    // Collect & depth-sort all 3D geometry faces at currentTime
    const faces = [];
    const activePoses = [];
    state.actors.forEach((actor) => {
      const pose = getActorPoseAt(actor, currentTime);
      if (!pose.visible) return;
      activePoses.push({ actor, pose });
      addActorGeometry(faces, actor, pose);
    });

    faces.sort((a, b) => b.avgDepth - a.avgDepth);
    faces.forEach((face) => {
      if (face.pts.some((p) => !p.visible)) return;
      ctx.save();
      ctx.globalAlpha = face.alpha;
      ctx.fillStyle = face.fill;
      ctx.strokeStyle = face.stroke;
      ctx.lineWidth = face.lineWidth;
      ctx.beginPath();
      face.pts.forEach((p, idx) => (idx ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Floating readable labels above each visible actor
    activePoses.forEach(({ actor, pose }) => {
      const topY = actor.type === 'impact' ? 2.6 : (actor.h || 1.6) + 0.65;
      const top = project(pose.x, topY, pose.z);
      if (!top.visible) return;
      const isSel = actor.id === selectedId && !recording;
      const txt = actor.label || PRESETS[actor.type]?.label || 'Object';
      ctx.save();
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      const w = ctx.measureText(txt).width + 18;
      const bx = top.sx - w / 2;
      const by = top.sy - 14;
      ctx.fillStyle = isSel ? '#62b6ff' : 'rgba(11, 18, 32, 0.9)';
      ctx.fillRect(bx, by, w, 25);
      ctx.strokeStyle = isSel ? '#ffffff' : actor.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, w, 25);
      ctx.fillStyle = isSel ? '#07111f' : '#edf3fb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, top.sx, by + 13);
      ctx.restore();
    });

    // Empty workspace hint when no objects placed yet
    if (!state.actors.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 25, 41, 0.85)';
      ctx.fillRect(canvas.width / 2 - 310, 26, 620, 48);
      ctx.strokeStyle = '#3a5980';
      ctx.strokeRect(canvas.width / 2 - 310, 26, 620, 48);
      ctx.fillStyle = '#dbeeff';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click "+ Car", "+ Truck", or "+ Person" above — then drag directly on the 3D scene', canvas.width / 2, 50);
      ctx.restore();
    }

    // Bottom exhibit title & timestamp bar
    ctx.save();
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, canvas.height - 62, canvas.width, 62);
    ctx.strokeStyle = '#2a3a50';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 62);
    ctx.lineTo(canvas.width, canvas.height - 62);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#edf3fb';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(state.title || 'Untitled 3D incident animation', 22, canvas.height - 33);

    ctx.fillStyle = '#9aabc0';
    ctx.font = '13px system-ui, sans-serif';
    const meta = [
      state.caseId ? `Case Ref: ${state.caseId}` : '',
      `Time: ${currentTime.toFixed(1)}s / ${Number(state.duration).toFixed(1)}s`,
      'Illustrative 3D visual aid — user-entered positions & timing'
    ].filter(Boolean).join('  ·  ');
    ctx.fillText(meta, 22, canvas.height - 13);
    ctx.restore();
  }

  function updateTimeReadout() {
    $('timeScrubber').max = String(state.duration);
    $('timeScrubber').value = String(currentTime.toFixed(2));
    $('timeDisplay').textContent = `${currentTime.toFixed(1)}s / ${Number(state.duration).toFixed(1)}s`;
  }

  function renderActorPanel() {
    $('actorCount').textContent = String(state.actors.length);
    $('actorList').innerHTML = state.actors.length
      ? state.actors
          .map(
            (a) => `
          <div class="item ${a.id === selectedId ? 'selected' : ''}">
            <div class="item-body">
              <strong><span class="swatch" style="background:${esc(a.color)}"></span>${esc(a.label)}</strong>
              <small>${esc(PRESETS[a.type]?.label || a.type)}${a.hasMotion ? ' · Moves Start → End' : a.type === 'impact' ? ` · Appears at ${Number(a.startTime || 0).toFixed(1)}s` : ' · Stationary'}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="btn mini" data-act="sel" data-id="${esc(a.id)}">Select</button>
              <button type="button" class="btn mini danger" data-act="del" data-id="${esc(a.id)}" aria-label="Remove">×</button>
            </div>
          </div>`
          )
          .join('')
      : '<div class="empty">No items on stage yet. Tap any "+ Add" button above to begin.</div>';

    const sel = state.actors.find((a) => a.id === selectedId);
    const box = $('selectedControls');
    if (!sel) {
      box.classList.add('hidden');
      return;
    }

    box.classList.remove('hidden');
    $('selLabel').value = sel.label;
    $('selColor').value = sel.color;
    $('selRot').value = Math.round(sel.rot || 0);
    $('selRotVal').textContent = `${Math.round(sel.rot || 0)}°`;

    const motionSection = $('motionSection');
    const impactSection = $('impactSection');
    if (sel.type === 'impact') {
      motionSection.classList.add('hidden');
      impactSection.classList.remove('hidden');
      $('impactTime').value = sel.startTime || 0;
    } else {
      impactSection.classList.add('hidden');
      motionSection.classList.remove('hidden');
      $('selHasMotion').checked = Boolean(sel.hasMotion);
      $('keyframeBox').classList.toggle('hidden', !sel.hasMotion);
      $('kfStartBtn').classList.toggle('active', editKeyframe === 'start');
      $('kfEndBtn').classList.toggle('active', editKeyframe === 'end');
      $('selStartTime').value = sel.startTime ?? 0;
      $('selEndTime').value = sel.endTime ?? state.duration;
    }
  }

  function addActor(type) {
    const p = PRESETS[type] || PRESETS.car;
    const n = state.actors.filter((a) => a.type === type).length + 1;
    // Place nicely offset from origin so multiple additions don't stack directly on top of each other
    const offsetIndex = state.actors.length;
    const sx = ((offsetIndex % 3) - 1) * 4.5;
    const sz = Math.floor(offsetIndex / 3) * 3.5;

    const actor = {
      id: uid(),
      type,
      label: `${p.label} ${n}`,
      color: p.color,
      w: p.w,
      d: p.d,
      h: p.h,
      startX: sx,
      startZ: sz,
      endX: p.movable ? clamp(sx + 8, -17, 17) : sx,
      endZ: sz,
      hasMotion: Boolean(p.movable),
      autoFace: Boolean(p.movable),
      rot: 0,
      startTime: type === 'impact' ? Number((state.duration / 2).toFixed(1)) : 0,
      endTime: state.duration
    };
    state.actors.push(actor);
    selectedId = actor.id;
    editKeyframe = 'start';
    currentTime = 0;
    updateTimeReadout();
    renderActorPanel();
    draw();
  }

  // Hit-test actors on canvas by projected bounding center
  function hitTestActor(sx, sy) {
    let best = null;
    let bestDist = 48;
    state.actors.forEach((a) => {
      const pose = getActorPoseAt(a, currentTime);
      if (!pose.visible) return;
      const p = project(pose.x, (a.h || 1.2) * 0.45, pose.z);
      if (!p.visible) return;
      const d = Math.hypot(p.sx - sx, p.sy - sy);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    });
    return best;
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      sx: ((e.clientX - rect.left) * canvas.width) / rect.width,
      sy: ((e.clientY - rect.top) * canvas.height) / rect.height
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const { sx, sy } = canvasCoords(e);
    const hit = hitTestActor(sx, sy);
    const groundPt = unprojectGround(sx, sy);

    if (hit && groundPt) {
      playing = false;
      syncPlayBtn();
      selectedId = hit.id;
      pointerMode = 'actor';
      dragActorId = hit.id;
      const isEnd = hit.hasMotion && editKeyframe === 'end';
      const ax = isEnd ? hit.endX : hit.startX;
      const az = isEnd ? hit.endZ : hit.startZ;
      dragOffset = { x: ax - groundPt.x, z: az - groundPt.z };
      renderActorPanel();
      draw();
    } else {
      pointerMode = 'orbit';
      lastPointer = { x: e.clientX, y: e.clientY };
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerMode) return;
    if (pointerMode === 'actor') {
      const actor = state.actors.find((a) => a.id === dragActorId);
      if (!actor) return;
      const { sx, sy } = canvasCoords(e);
      const groundPt = unprojectGround(sx, sy);
      if (!groundPt) return;
      const nx = clamp(groundPt.x + dragOffset.x, -18.5, 18.5);
      const nz = clamp(groundPt.z + dragOffset.z, -18.5, 18.5);
      if (actor.hasMotion && editKeyframe === 'end') {
        actor.endX = nx;
        actor.endZ = nz;
        currentTime = actor.endTime ?? state.duration;
      } else {
        actor.startX = nx;
        actor.startZ = nz;
        if (!actor.hasMotion) {
          actor.endX = nx;
          actor.endZ = nz;
        }
        currentTime = actor.startTime ?? 0;
      }
      updateTimeReadout();
      draw();
    } else if (pointerMode === 'orbit') {
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      lastPointer = { x: e.clientX, y: e.clientY };
      state.camera.yaw = ((state.camera.yaw + dx * 0.45 + 180) % 360 + 360) % 360 - 180;
      state.camera.pitch = clamp(state.camera.pitch + dy * 0.35, 8, 84);
      draw();
    }
  });

  canvas.addEventListener('pointerup', () => { pointerMode = null; dragActorId = ''; });
  canvas.addEventListener('pointercancel', () => { pointerMode = null; dragActorId = ''; });

  // Animation playback loop
  function syncPlayBtn() {
    $('playToggleBtn').textContent = playing ? '⏸ Pause' : '▶ Play 3D Animation';
  }

  function tick(ts) {
    if (!playing) return;
    if (!lastFrameTs) lastFrameTs = ts;
    const dt = Math.min(0.1, (ts - lastFrameTs) / 1000) * playSpeed;
    lastFrameTs = ts;
    currentTime += dt;
    if (currentTime >= state.duration) {
      if (recording) {
        currentTime = state.duration;
        playing = false;
        updateTimeReadout();
        draw();
        syncPlayBtn();
        return;
      }
      currentTime = 0; // loop smoothly during normal preview
    }
    updateTimeReadout();
    draw();
    requestAnimationFrame(tick);
  }

  function startPlayback(fromZero) {
    if (fromZero) currentTime = 0;
    playing = true;
    lastFrameTs = 0;
    syncPlayBtn();
    requestAnimationFrame(tick);
  }

  // UI Event Bindings
  document.querySelectorAll('[data-add-actor]').forEach((btn) => {
    btn.addEventListener('click', () => addActor(btn.dataset.addActor));
  });

  $('backdropSelect').addEventListener('change', (e) => {
    state.backdrop = e.target.value;
    draw();
  });

  $('durationSelect').addEventListener('change', (e) => {
    const nextDur = Number(e.target.value) || 6;
    state.actors.forEach((a) => {
      if (a.endTime === state.duration || a.endTime > nextDur) a.endTime = nextDur;
    });
    state.duration = nextDur;
    currentTime = clamp(currentTime, 0, state.duration);
    updateTimeReadout();
    renderActorPanel();
    draw();
  });

  $('playToggleBtn').addEventListener('click', () => {
    if (playing) {
      playing = false;
      syncPlayBtn();
    } else {
      startPlayback(currentTime >= state.duration - 0.05);
    }
  });

  $('replayBtn').addEventListener('click', () => startPlayback(true));

  $('speedSelect').addEventListener('change', (e) => {
    playSpeed = Number(e.target.value) || 1;
  });

  $('timeScrubber').addEventListener('input', (e) => {
    playing = false;
    syncPlayBtn();
    currentTime = Number(e.target.value) || 0;
    updateTimeReadout();
    draw();
  });

  // 1-Click Camera Buttons
  $('camIso').addEventListener('click', () => { state.camera = { yaw: 34, pitch: 30, dist: 28 }; draw(); });
  $('camTop').addEventListener('click', () => { state.camera = { yaw: 0, pitch: 82, dist: 32 }; draw(); });
  $('camStreet').addEventListener('click', () => { state.camera = { yaw: 20, pitch: 11, dist: 21 }; draw(); });
  $('camZoomIn').addEventListener('click', () => { state.camera.dist = clamp(state.camera.dist - 4, 12, 54); draw(); });
  $('camZoomOut').addEventListener('click', () => { state.camera.dist = clamp(state.camera.dist + 4, 12, 54); draw(); });

  // Selected Actor Controls
  $('selLabel').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.label = $('selLabel').value;
    renderActorPanel();
    draw();
  });

  $('selColor').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.color = $('selColor').value;
    renderActorPanel();
    draw();
  });

  $('selRot').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.rot = Number($('selRot').value) || 0;
    sel.autoFace = false;
    $('selRotVal').textContent = `${Math.round(sel.rot)}°`;
    draw();
  });

  $('selHasMotion').addEventListener('change', (e) => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.hasMotion = e.target.checked;
    if (sel.hasMotion && Math.hypot(sel.endX - sel.startX, sel.endZ - sel.startZ) < 0.2) {
      sel.endX = clamp(sel.startX + 7, -17, 17);
      sel.endZ = sel.startZ;
      sel.autoFace = true;
    }
    renderActorPanel();
    draw();
  });

  $('kfStartBtn').addEventListener('click', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    editKeyframe = 'start';
    playing = false;
    syncPlayBtn();
    currentTime = sel ? (sel.startTime ?? 0) : 0;
    updateTimeReadout();
    renderActorPanel();
    draw();
  });

  $('kfEndBtn').addEventListener('click', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    editKeyframe = 'end';
    playing = false;
    syncPlayBtn();
    currentTime = sel ? (sel.endTime ?? state.duration) : state.duration;
    updateTimeReadout();
    renderActorPanel();
    draw();
  });

  $('selStartTime').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.startTime = clamp(Number($('selStartTime').value) || 0, 0, state.duration - 0.5);
    draw();
  });

  $('selEndTime').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.endTime = clamp(Number($('selEndTime').value) || state.duration, (sel.startTime || 0) + 0.5, state.duration);
    draw();
  });

  $('impactTime').addEventListener('input', () => {
    const sel = state.actors.find((a) => a.id === selectedId);
    if (!sel) return;
    sel.startTime = clamp(Number($('impactTime').value) || 0, 0, state.duration);
    renderActorPanel();
    draw();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'sel') {
      selectedId = id;
      renderActorPanel();
      draw();
    } else if (act === 'del') {
      state.actors = state.actors.filter((a) => a.id !== id);
      if (selectedId === id) selectedId = state.actors[0] ? state.actors[0].id : '';
      renderActorPanel();
      draw();
    }
  });

  ['scene3dTitle', 'scene3dCaseId', 'scene3dNotes'].forEach((id) => {
    $(id).addEventListener('input', () => {
      state.title = $('scene3dTitle').value;
      state.caseId = $('scene3dCaseId').value;
      state.notes = $('scene3dNotes').value;
      draw();
    });
  });

  // Exports (all routed cleanly through ExhibitExportGate)
  function slug() {
    return (state.title || '3d-incident-animation').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || '3d-incident-animation';
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

  function gated(label, format, fn) {
    const summary = {
      metrics: [
        { label: 'Animation Title', value: state.title || '3D Animation' },
        { label: 'Export Format', value: format },
        { label: 'Scene Items', value: `${state.actors.length} actors` },
        { label: 'Clip Length', value: `${state.duration}s (${state.backdrop})` }
      ]
    };
    if (window.ExhibitExportGate) window.ExhibitExportGate.requestExport(label, summary, fn);
    else fn();
  }

  function executeRecordWebm() {
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      alert('Your current browser does not support direct WebM video recording. Use "Print 3-Frame Storyboard" or "Export Snapshot PNG" instead.');
      return;
    }
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      recording = false;
      $('studioBadge').classList.remove('recording-pill');
      $('studioBadge').textContent = 'Simple 3D Animation Studio';
      download(slug() + '.webm', new Blob(chunks, { type: mime }));
      draw();
    };

    recording = true;
    $('studioBadge').classList.add('recording-pill');
    $('studioBadge').textContent = 'Recording 3D Video...';
    playSpeed = 1;
    $('speedSelect').value = '1';
    currentTime = 0;
    draw();
    rec.start();
    startPlayback(true);
    setTimeout(() => {
      playing = false;
      syncPlayBtn();
      if (rec.state !== 'inactive') rec.stop();
    }, state.duration * 1000 + 250);
  }

  function executeStoryboardPrint() {
    const savedT = currentTime;
    const savedRec = recording;
    recording = true;
    const stamps = [0, Number((state.duration / 2).toFixed(1)), state.duration];
    const frames = stamps.map((t) => {
      currentTime = t;
      draw();
      return { t, url: canvas.toDataURL('image/png') };
    });
    currentTime = savedT;
    recording = savedRec;
    draw();

    const w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print the 3-frame storyboard.'); return; }
    const framesHtml = frames
      .map((f, i) => `<div class="frame"><h3>Frame ${i + 1} — Time ${f.t.toFixed(1)}s</h3><img src="${f.url}" alt="3D frame at ${f.t}s"></div>`)
      .join('');
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(state.title)} — 3D Storyboard</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 6px}p{font-size:13px;color:#444}.frame{margin:16px 0;page-break-inside:avoid}h3{font-size:14px;margin:0 0 6px}img{width:100%;height:auto;border:1px solid #ccc;border-radius:4px}.note{margin-top:16px;padding:10px;border-left:3px solid #997322;background:#fbf7ea;font-size:11px}</style></head>
<body><h1>${esc(state.title)} — 3D Incident Storyboard</h1>
<p>${esc([state.caseId ? 'Case Ref: ' + state.caseId : '', state.notes].filter(Boolean).join(' · '))}</p>
${framesHtml}
<div class="note">Illustrative 3D visual aid assembled from user-entered positions and timing. Does not calculate collision physics, speeds, or legal causation.</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 250);
  }

  $('recordWebmBtn').addEventListener('click', () => gated('Record & Download 3D Video (.webm)', '3D Animation Video (.webm)', executeRecordWebm));
  $('export3dPng').addEventListener('click', () => gated('Export Current 3D Frame (PNG)', 'PNG Snapshot (1400×800)', () => {
    draw();
    canvas.toBlob((b) => { if (b) download(slug() + `-frame-${currentTime.toFixed(1)}s.png`, b); }, 'image/png');
  }));
  $('storyboardBtn').addEventListener('click', () => gated('Print 3-Frame 3D Storyboard', 'Printable 3-Frame Exhibit', executeStoryboardPrint));
  $('export3dJson').addEventListener('click', () => gated('Save 3D Animation Project (JSON)', 'Project JSON', () => {
    download(slug() + '-3d-anim.json', new Blob([JSON.stringify({ ...state, tool: 'simple-3d-animation-studio', version: 2 }, null, 2)], { type: 'application/json' }));
  }));

  $('open3dBtn').addEventListener('click', () => $('open3dFile').click());
  $('open3dFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        state = {
          ...emptyState(),
          title: String(d.title || 'Untitled 3D incident animation'),
          caseId: String(d.caseId || ''),
          backdrop: d.backdrop || 'intersection',
          duration: Number(d.duration) || 6,
          notes: String(d.notes || ''),
          camera: d.camera && Number.isFinite(d.camera.yaw) ? d.camera : { yaw: 34, pitch: 30, dist: 28 },
          actors: Array.isArray(d.actors) ? d.actors : []
        };
        selectedId = state.actors[0] ? state.actors[0].id : '';
        $('scene3dTitle').value = state.title;
        $('scene3dCaseId').value = state.caseId;
        $('scene3dNotes').value = state.notes;
        $('backdropSelect').value = state.backdrop;
        $('durationSelect').value = String(state.duration);
        currentTime = 0;
        updateTimeReadout();
        renderActorPanel();
        draw();
      } catch (err) {
        alert('Could not open that 3D animation JSON file.');
      }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  $('new3dBtn').addEventListener('click', () => {
    if (!confirm('Clear the 3D Animation Studio? Save JSON first if you want to keep your scene.')) return;
    playing = false;
    syncPlayBtn();
    state = emptyState();
    selectedId = '';
    currentTime = 0;
    $('scene3dTitle').value = state.title;
    $('scene3dCaseId').value = '';
    $('scene3dNotes').value = '';
    $('backdropSelect').value = state.backdrop;
    $('durationSelect').value = String(state.duration);
    updateTimeReadout();
    renderActorPanel();
    draw();
  });

  updateTimeReadout();
  renderActorPanel();
  draw();
})();
