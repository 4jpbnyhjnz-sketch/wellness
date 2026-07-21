/* =========================================================================
   JOUEUR.JS — Vue croisée joueur (GPS + Wellness + RPE + Tests)
   ========================================================================= */

function getAllKnownPlayers() {
  const names = new Set();
  // From GPS roster
  if (typeof roster !== 'undefined') Object.keys(roster).forEach(n => names.add(n));
  // From wellness
  if (typeof WD !== 'undefined' && WD) {
    Object.values(WD).forEach(day => {
      if (day.r) day.r.forEach(p => names.add(p.n));
    });
  }
  // From tests
  if (typeof savedTests !== 'undefined') savedTests.forEach(t => names.add(t.player));
  return [...names].sort();
}

function renderCrossPlayerSelect() {
  const sel = document.getElementById('crossPlayerSelect');
  if (!sel) return;
  const cur = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  getAllKnownPlayers().forEach(n => {
    const o = document.createElement('option'); o.value = n; o.textContent = n;
    if (n === cur) o.selected = true;
    sel.appendChild(o);
  });
  if (cur) renderCrossPlayer(cur);
}

function renderCrossPlayer(name) {
  const content = document.getElementById('crossPlayerContent');
  if (!content || !name) return;
  content.innerHTML = '';

  const group = typeof roster !== 'undefined' ? roster[name] : '—';
  const position = typeof rosterPositions !== 'undefined' ? rosterPositions[name] : '';

  // Header
  const header = document.createElement('div');
  header.className = 'player-profile-header';
  header.innerHTML = `
    <div style="width:52px;height:52px;background:rgba(204,17,34,.2);border:2px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--accent)">${name.charAt(0)}</div>
    <div>
      <div class="player-profile-name">${name}</div>
      <div class="player-profile-group">${group || ''}${position ? ' · ' + position : ''}</div>
    </div>
  `;
  content.appendChild(header);

  // ── Section GPS ──────────────────────────────────────────────────────────
  const gpsSessions = typeof savedSessions !== 'undefined'
    ? savedSessions.filter(s => [...(s.groups['3/4'] || []), ...(s.groups.Avant || [])].some(p => (p.displayName || p.player) === name))
    : [];
  const gpsMatches = typeof savedMatches !== 'undefined'
    ? savedMatches.filter(m => [...(m.groups['3/4'] || []), ...(m.groups.Avant || [])].some(p => (p.displayName || p.player) === name))
    : [];

  content.appendChild(makeCrossSection('📊 GPS — Séances', () => {
    if (!gpsSessions.length) return '<p class="cross-empty">Aucune séance GPS enregistrée.</p>';
    return buildMiniGpsTable(gpsSessions, name);
  }));

  if (gpsMatches.length) {
    content.appendChild(makeCrossSection('⚽ GPS — Matchs', () => buildMiniGpsTable(gpsMatches, name)));
  }

  // ── Section Wellness ─────────────────────────────────────────────────────
  content.appendChild(makeCrossSection('💚 Wellness — Hooper', () => {
    if (typeof WD === 'undefined' || !Object.keys(WD).length) return '<p class="cross-empty">Données wellness non chargées.</p>';
    const wellDays = (typeof ALLDAYS !== 'undefined' ? ALLDAYS : []).filter(d => WD[d] && WD[d].r && WD[d].r.some(r => r.n === name));
    if (!wellDays.length) return '<p class="cross-empty">Aucune réponse wellness pour ce joueur.</p>';
    const recent = wellDays.slice(-10).reverse();
    const rows = recent.map(d => {
      const r = WD[d].r.find(r => r.n === name);
      const fa = Math.min(100, Math.max(0, ((35 - r.S) / 30) * 100));
      const fac = fa >= 60 ? '#2ecc8a' : fa >= 45 ? '#e0b341' : fa >= 30 ? '#e8862e' : '#cc1122';
      return `<tr>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--text2)">${d}</td>
        <td class="mono" style="color:${r.S<=15?'#2ecc8a':r.S<=20?'#e0b341':'#cc1122'}">${r.S}/35</td>
        <td style="color:${fac};font-weight:600">${fa.toFixed(0)}/100</td>
        <td>${r.s} <td>${r.H}</td><td>${r.B}</td><td>${r.f}</td><td>${r.t}</td>
      </tr>`;
    }).join('');
    return `<table class="rpe-session-table"><thead><tr><th>Date</th><th>Score</th><th>Forme</th><th>Somm.</th><th>C.H.</th><th>C.B.</th><th>Fat.</th><th>Stress</th></tr></thead><tbody>${rows}</tbody></table>`;
  }));

  // ── Section RPE ──────────────────────────────────────────────────────────
  content.appendChild(makeCrossSection('💪 RPE', () => {
    if (typeof RPE === 'undefined' || !Object.keys(RPE).length) return '<p class="cross-empty">Données RPE non chargées.</p>';
    const rpeHistory = [];
    (typeof RPEDAYS !== 'undefined' ? RPEDAYS : []).forEach(d => {
      (RPE[d].sessions || []).filter(s => s.n === name).forEach(s => rpeHistory.push({ date: d, type: s.type, score: s.score }));
    });
    if (!rpeHistory.length) return '<p class="cross-empty">Aucune réponse RPE pour ce joueur.</p>';
    const recent = rpeHistory.slice(-10).reverse();
    const rows = recent.map(r => {
      const col = r.score <= 3 ? '#2ecc8a' : r.score <= 5 ? '#e0b341' : r.score <= 7 ? '#e8862e' : '#cc1122';
      return `<tr><td style="font-family:'JetBrains Mono',monospace;color:var(--text2)">${r.date}</td><td>${r.type}</td><td class="mono" style="color:${col}">${r.score}/10</td></tr>`;
    }).join('');
    return `<table class="rpe-session-table"><thead><tr><th>Date</th><th>Type</th><th>RPE</th></tr></thead><tbody>${rows}</tbody></table>`;
  }));

  // ── Section Tests Physiques ───────────────────────────────────────────────
  content.appendChild(makeCrossSection('🏃 Tests Physiques', () => {
    const playerTests = typeof savedTests !== 'undefined' ? savedTests.filter(t => t.player === name) : [];
    if (!playerTests.length) return '<p class="cross-empty">Aucun test physique enregistré pour ce joueur.</p>';

    // Group by test type
    const byType = {};
    playerTests.forEach(t => {
      if (!byType[t.type]) byType[t.type] = [];
      byType[t.type].push(t);
    });

    return Object.entries(byType).map(([tid, tests]) => {
      const def = TEST_TYPES.find(d => d.id === tid) || { label: tid, unit: '', lower: false };
      const sorted = tests.slice().sort((a, b) => a.date.localeCompare(b.date));
      const best = def.lower ? Math.min(...sorted.map(t => t.value)) : Math.max(...sorted.map(t => t.value));
      const rows = sorted.reverse().map(t => {
        const isBest = t.value === best;
        return `<tr><td style="font-family:'JetBrains Mono',monospace;color:var(--text2)">${t.date}</td><td class="mono" style="color:${isBest?'var(--accent)':'var(--text)'}${isBest?';font-weight:700':''}">${t.value} ${def.unit}${isBest?' 🏆':''}</td><td style="font-size:11px;color:var(--text2)">${t.context||''}</td></tr>`;
      }).join('');
      return `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">${def.label}</div><table class="rpe-session-table" style="margin:0"><thead><tr><th>Date</th><th>Valeur</th><th>Contexte</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');
  }));
}

function buildMiniGpsTable(sessions, playerName) {
  if (typeof METRIC_COLUMNS === 'undefined') return '<p class="cross-empty">Module GPS non chargé.</p>';
  const cols = ['distance', 'pctHi', 'vmax', 'accelMax', 'contacts', 'rhie'];
  const visibleCols = METRIC_COLUMNS.filter(c => cols.includes(c.key));
  const rows = sessions.slice().sort((a, b) => b.id - a.id).slice(0, 10).map(s => {
    const p = [...(s.groups['3/4'] || []), ...(s.groups.Avant || [])].find(p => (p.displayName || p.player) === playerName);
    if (!p) return '';
    const label = s.date || s.opponent || s.journee || '—';
    const cells = visibleCols.map(c => {
      const v = p[c.key];
      return `<td class="mono">${Number.isFinite(v) ? fmt(v, c.decimals) : '—'}</td>`;
    }).join('');
    return `<tr><td style="font-family:'JetBrains Mono',monospace;color:var(--text2)">${label}</td>${cells}</tr>`;
  }).join('');
  const headers = visibleCols.map(c => `<th>${c.abbr}</th>`).join('');
  return `<table class="rpe-session-table"><thead><tr><th>Date</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function makeCrossSection(title, contentFn) {
  const section = document.createElement('div');
  section.className = 'cross-section';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'cross-section-title';
  titleDiv.textContent = title;
  section.appendChild(titleDiv);
  const body = document.createElement('div');
  body.className = 'cross-section-body';
  try { body.innerHTML = contentFn(); } catch(e) { body.innerHTML = '<p class="cross-empty">Erreur de chargement.</p>'; }
  section.appendChild(body);
  return section;
}

function initJoueur() {
  const sel = document.getElementById('crossPlayerSelect');
  if (sel) sel.addEventListener('change', e => renderCrossPlayer(e.target.value));
}
