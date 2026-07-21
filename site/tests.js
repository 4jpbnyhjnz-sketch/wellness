/* =========================================================================
   TESTS.JS — Tests physiques
   ========================================================================= */

const TEST_TYPES = [
  { id:'10m',       label:'10m sprint',  unit:'s',    lower:true  },
  { id:'20m',       label:'20m sprint',  unit:'s',    lower:true  },
  { id:'30m',       label:'30m sprint',  unit:'s',    lower:true  },
  { id:'50m',       label:'50m sprint',  unit:'s',    lower:true  },
  { id:'yoyo',      label:'Yo-Yo test',  unit:'m',    lower:false },
  { id:'bronco',    label:'Bronco',      unit:'s',    lower:true  },
  { id:'tirage',    label:'Tirage',      unit:'reps', lower:false },
  { id:'planche',   label:'Planche',     unit:'s',    lower:false },
  { id:'bench',     label:'Bench press', unit:'kg',   lower:false },
  { id:'backsquat', label:'Back squat',  unit:'kg',   lower:false },
  { id:'clean',     label:'Clean',       unit:'kg',   lower:false },
  { id:'cmj',       label:'CMJ',         unit:'cm',   lower:false },
  { id:'broadjump', label:'Broad jump',  unit:'cm',   lower:false },
];

const TESTS_STORAGE_KEY = 'gpsSavedTests_v1';

function loadSavedTests() {
  try { const r = localStorage.getItem(TESTS_STORAGE_KEY); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}
function saveSavedTests(list) {
  localStorage.setItem(TESTS_STORAGE_KEY, JSON.stringify(list));
}
let savedTests = loadSavedTests();

// ── Formulaire de saisie ──────────────────────────────────────────────────

let testEntryCount = 0;

function addTestEntry() {
  const container = document.getElementById('testEntriesContainer');
  const idx = testEntryCount++;
  const div = document.createElement('div');
  div.className = 'test-entry';
  div.id = 'test-entry-' + idx;

  // Player select (from GPS roster)
  const playerNames = typeof roster !== 'undefined' ? Object.keys(roster).sort() : [];
  const playerSel = document.createElement('select');
  playerSel.className = 'test-entry-player';
  const emptyOpt = document.createElement('option');
  emptyOpt.value = ''; emptyOpt.textContent = '— Joueur —';
  playerSel.appendChild(emptyOpt);
  playerNames.forEach(n => {
    const o = document.createElement('option'); o.value = n; o.textContent = n;
    playerSel.appendChild(o);
  });

  // Test type select
  const testSel = document.createElement('select');
  testSel.className = 'test-entry-type';
  TEST_TYPES.forEach(t => {
    const o = document.createElement('option'); o.value = t.id;
    o.textContent = t.label + ' (' + t.unit + ')';
    testSel.appendChild(o);
  });

  // Value input
  const valInput = document.createElement('input');
  valInput.type = 'number'; valInput.step = '0.01'; valInput.placeholder = 'Valeur';
  valInput.className = 'test-entry-value';

  // Notes
  const notesInput = document.createElement('input');
  notesInput.type = 'text'; notesInput.placeholder = 'Note (optionnel)';
  notesInput.className = 'test-entry-notes'; notesInput.style.flex = '1';

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn btn-secondary remove-btn'; removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => div.remove());

  div.appendChild(playerSel);
  div.appendChild(testSel);
  div.appendChild(valInput);
  div.appendChild(notesInput);
  div.appendChild(removeBtn);
  container.appendChild(div);
}

function saveTests() {
  const date = document.getElementById('testDate').value;
  const context = document.getElementById('testContext').value.trim();
  if (!date) { alert('Veuillez sélectionner une date.'); return; }

  const entries = document.querySelectorAll('.test-entry');
  const newTests = [];
  let errors = 0;

  entries.forEach(entry => {
    const player = entry.querySelector('.test-entry-player').value;
    const type = entry.querySelector('.test-entry-type').value;
    const val = parseFloat(entry.querySelector('.test-entry-value').value);
    const notes = entry.querySelector('.test-entry-notes').value.trim();
    if (!player || isNaN(val)) { errors++; return; }
    newTests.push({ id: Date.now() + Math.random(), date, context, player, type, value: val, notes });
  });

  if (errors) alert(errors + ' entrée(s) ignorée(s) (joueur ou valeur manquant).');
  if (!newTests.length) return;

  savedTests.push(...newTests);
  saveSavedTests(savedTests);
  document.getElementById('testEntriesContainer').innerHTML = '';
  testEntryCount = 0;
  renderTestResults();
  renderRankings();
  alert('✓ ' + newTests.length + ' test(s) enregistré(s) !');
}

// ── Résultats ─────────────────────────────────────────────────────────────

function renderTestResults() {
  const container = document.getElementById('testResultsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!savedTests.length) {
    container.innerHTML = '<p class="cross-empty">Aucun test enregistré.</p>';
    return;
  }

  // Group by date+context
  const groups = {};
  savedTests.forEach(t => {
    const key = t.date + '|' + (t.context || '');
    if (!groups[key]) groups[key] = { date: t.date, context: t.context || '', tests: [] };
    groups[key].tests.push(t);
  });

  Object.values(groups)
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(g => {
      const details = document.createElement('details');
      details.className = 'test-result-session';
      const summary = document.createElement('summary');
      summary.textContent = g.date + (g.context ? ' — ' + g.context : '') + ' (' + g.tests.length + ' résultat(s))';
      details.appendChild(summary);

      const table = document.createElement('table');
      table.className = 'rpe-session-table';
      table.style.margin = '0';
      table.innerHTML = '<thead><tr><th>Joueur</th><th>Test</th><th>Valeur</th><th>Notes</th><th></th></tr></thead>';
      const tbody = document.createElement('tbody');
      g.tests.forEach(t => {
        const testDef = TEST_TYPES.find(tt => tt.id === t.type) || { label: t.type, unit: '' };
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="font-weight:600">${t.player}</td><td>${testDef.label}</td><td class="mono" style="color:var(--accent)">${t.value} ${testDef.unit}</td><td style="font-size:11px;color:var(--text2)">${t.notes || '—'}</td><td><button class="remove-btn" onclick="deleteTest('${t.id}')">✕</button></td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      details.appendChild(table);
      container.appendChild(details);
    });
}

function deleteTest(id) {
  if (!confirm('Supprimer ce résultat ?')) return;
  savedTests = savedTests.filter(t => String(t.id) !== String(id));
  saveSavedTests(savedTests);
  renderTestResults();
  renderRankings();
}

// ── Classements ───────────────────────────────────────────────────────────

function populateRankingSelect() {
  const sel = document.getElementById('rankingTestSelect');
  if (!sel) return;
  sel.innerHTML = '';
  TEST_TYPES.forEach(t => {
    const o = document.createElement('option'); o.value = t.id; o.textContent = t.label;
    sel.appendChild(o);
  });
}

function renderRankings() {
  const container = document.getElementById('rankingContainer');
  if (!container) return;
  const testId = document.getElementById('rankingTestSelect')?.value || TEST_TYPES[0].id;
  const groupFilter = document.getElementById('rankingGroupSelect')?.value || 'all';
  const testDef = TEST_TYPES.find(t => t.id === testId) || TEST_TYPES[0];

  // Get best result per player for this test
  const bests = {};
  savedTests
    .filter(t => t.type === testId)
    .filter(t => {
      if (groupFilter === 'all') return true;
      if (typeof roster !== 'undefined') return roster[t.player] === groupFilter;
      return true;
    })
    .forEach(t => {
      if (!bests[t.player]) { bests[t.player] = t; return; }
      const isBetter = testDef.lower ? t.value < bests[t.player].value : t.value > bests[t.player].value;
      if (isBetter) bests[t.player] = t;
    });

  const sorted = Object.values(bests).sort((a, b) => testDef.lower ? a.value - b.value : b.value - a.value);

  container.innerHTML = '';
  if (!sorted.length) {
    container.innerHTML = '<p class="cross-empty">Aucun résultat pour ce test.</p>';
    return;
  }

  const card = document.createElement('div');
  card.className = 'test-ranking-card';
  card.innerHTML = `<div class="test-ranking-header">🏆 Classement — ${testDef.label} (${testDef.unit}) ${testDef.lower ? '· moins = mieux' : '· plus = mieux'}</div>`;

  sorted.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'test-ranking-row';
    const rankClass = i === 0 ? 'test-rank-1' : i === 1 ? 'test-rank-2' : i === 2 ? 'test-rank-3' : '';
    row.innerHTML = `
      <div class="test-rank-num ${rankClass}">${i + 1}</div>
      <div style="flex:1;font-weight:600">${t.player}</div>
      <div class="mono" style="color:var(--accent);font-size:16px">${t.value} <span style="font-size:11px;color:var(--text2)">${testDef.unit}</span></div>
      <div style="font-size:11px;color:var(--text2)">${t.date}</div>
    `;
    card.appendChild(row);
  });
  container.appendChild(card);
}

// ── Évolution ─────────────────────────────────────────────────────────────

function renderEvoPlayerSelect() {
  const sel = document.getElementById('evoPlayerSelect');
  if (!sel) return;
  const names = [...new Set(savedTests.map(t => t.player))].sort();
  const cur = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  names.forEach(n => {
    const o = document.createElement('option'); o.value = n; o.textContent = n;
    if (n === cur) o.selected = true;
    sel.appendChild(o);
  });
}

function populateEvoTestSelect() {
  const sel = document.getElementById('evoTestSelect');
  if (!sel) return;
  sel.innerHTML = '';
  TEST_TYPES.forEach(t => {
    const o = document.createElement('option'); o.value = t.id; o.textContent = t.label;
    sel.appendChild(o);
  });
}

function renderEvoChart() {
  const player = document.getElementById('evoPlayerSelect')?.value;
  const testId = document.getElementById('evoTestSelect')?.value;
  const chartEl = document.getElementById('evoChartContainer');
  const statsEl = document.getElementById('evoStatsContainer');
  if (!chartEl || !player || !testId) return;

  const testDef = TEST_TYPES.find(t => t.id === testId) || TEST_TYPES[0];
  const items = savedTests
    .filter(t => t.player === player && t.type === testId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const xLabels = items.map(t => t.date + (t.context ? ' ' + t.context.slice(0, 8) : ''));
  const values = items.map(t => t.value);

  // Use the GPS line chart function if available
  if (typeof buildLineChartSvg === 'function') {
    const svg = buildLineChartSvg(
      [{ name: testDef.label, color: '#D6001C', values }],
      xLabels, testDef.unit
    );
    chartEl.innerHTML = svg || '<p class="cross-empty">Aucune donnée.</p>';
  } else {
    chartEl.innerHTML = items.length
      ? `<p style="padding:16px;color:var(--text2)">Chargement du graphique...</p>`
      : '<p class="cross-empty">Aucun résultat pour ce joueur et ce test.</p>';
  }

  statsEl.innerHTML = '';
  if (!values.length) return;

  const chips = [
    { label: 'Meilleur', val: testDef.lower ? Math.min(...values) : Math.max(...values) },
    { label: 'Dernier', val: values[values.length - 1] },
    { label: 'Moyenne', val: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 },
    { label: 'Nb. tests', val: values.length, noUnit: true },
  ];

  const row = document.createElement('div');
  row.className = 'test-stat-chips';
  chips.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'test-stat-chip';
    chip.innerHTML = `<div class="test-stat-chip-val">${c.val}${c.noUnit ? '' : ' ' + testDef.unit}</div><div class="test-stat-chip-lbl">${c.label}</div>`;
    row.appendChild(chip);
  });
  statsEl.appendChild(row);
}

function switchTestTab(name) {
  const tabs = ['saisie', 'resultats', 'classement', 'evolution'];
  document.querySelectorAll('#hub-tests .tab-btn').forEach((b, i) => b.classList.toggle('active', tabs[i] === name));
  tabs.forEach(t => {
    const p = document.getElementById('testtab-' + t);
    if (p) p.classList.toggle('active', t === name);
  });
  if (name === 'resultats') renderTestResults();
  if (name === 'classement') { renderRankings(); renderEvoPlayerSelect(); }
  if (name === 'evolution') { renderEvoPlayerSelect(); renderEvoChart(); }
}

function initTests() {
  // Default date = today
  const dateInput = document.getElementById('testDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  document.getElementById('addTestEntryBtn')?.addEventListener('click', addTestEntry);
  document.getElementById('saveTestsBtn')?.addEventListener('click', saveTests);

  populateRankingSelect();
  populateEvoTestSelect();

  document.getElementById('rankingTestSelect')?.addEventListener('change', renderRankings);
  document.getElementById('rankingGroupSelect')?.addEventListener('change', renderRankings);
  document.getElementById('evoPlayerSelect')?.addEventListener('change', renderEvoChart);
  document.getElementById('evoTestSelect')?.addEventListener('change', renderEvoChart);

  // Add first empty test entry by default
  addTestEntry();
}
