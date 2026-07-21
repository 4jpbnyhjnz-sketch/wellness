/* =========================================================================
   HUB.JS — Navigation principale + fonctions tab wellness/RPE
   ========================================================================= */

const HUB_SECTIONS = ['gps', 'wellness', 'rpe', 'joueur-hub', 'tests'];

function switchHubSection(name) {
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hub === name);
  });
  HUB_SECTIONS.forEach(s => {
    const el = document.getElementById('hub-' + s);
    if (el) el.style.display = (s === name) ? 'block' : 'none';
  });
  if (name === 'wellness') renderWellnessSafe();
  if (name === 'rpe') { syncDateSelectors(); renderRpeSafe(); }
  if (name === 'joueur-hub' && typeof renderCrossPlayerSelect === 'function') renderCrossPlayerSelect();
  if (name === 'tests') {
    if (typeof renderTestResults === 'function') renderTestResults();
    if (typeof renderRankings === 'function') renderRankings();
    if (typeof renderEvoPlayerSelect === 'function') renderEvoPlayerSelect();
  }
}

/* ── Wellness render avec protection ── */
function renderWellnessSafe() {
  const metrics = document.getElementById('metrics');
  if (!metrics) return;

  if (typeof ALLDAYS === 'undefined' || !ALLDAYS.length) {
    metrics.innerHTML = '<div style="color:#f5a0a0;padding:20px;font-size:13px">⚠ Données non chargées. Cliquez "Actualiser".</div>';
    return;
  }

  // S'assurer que le sélecteur a la bonne valeur
  const sel = document.getElementById('dateSelect');
  if (sel && !sel.value && ALLDAYS.length) sel.value = ALLDAYS[ALLDAYS.length - 1];

  try {
    render();
  } catch(e) {
    metrics.innerHTML = '<div style="color:#f5a0a0;padding:20px;font-size:13px">⚠ Erreur render: ' + e.message + '</div>';
    console.error('Wellness render error:', e);
  }
}

/* ── RPE render avec protection ── */
function renderRpeSafe() {
  if (typeof ALLDAYS === 'undefined' || !ALLDAYS.length) return;
  const sel2 = document.getElementById('dateSelect2');
  if (sel2 && !sel2.value && ALLDAYS.length) sel2.value = ALLDAYS[ALLDAYS.length - 1];
  try {
    if (typeof renderRpe === 'function') renderRpe();
  } catch(e) { console.error('RPE render error:', e); }
}

function syncDateSelectors() {
  const sel1 = document.getElementById('dateSelect');
  const sel2 = document.getElementById('dateSelect2');
  if (!sel1 || !sel2) return;
  if (sel2.options.length === 0 && typeof ALLDAYS !== 'undefined') {
    ALLDAYS.forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel2.appendChild(o);
    });
  }
  sel2.value = sel1.value || (ALLDAYS.length ? ALLDAYS[ALLDAYS.length - 1] : '');
}

/* ── Onglets Wellness ── */
function switchWTab(name) {
  document.querySelectorAll('#hub-wellness .w-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes("'" + name + "'"));
  });
  ['joueurs', 'tableau', 'chart', 'legende'].forEach(t => {
    const p = document.getElementById('wtab-' + t);
    if (p) p.classList.toggle('active', t === name);
  });
  if (name === 'chart' && typeof ALLDAYS !== 'undefined' && ALLDAYS.length) {
    setTimeout(() => {
      const sel = document.getElementById('dateSelect');
      if (sel && typeof drawChart === 'function') drawChart(sel.value);
    }, 50);
  }
}

/* ── Onglets RPE ── */
function switchRpeTab(name) {
  document.querySelectorAll('#hub-rpe .w-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes("'" + name + "'"));
  });
  ['joueurs', 'individuel', 'srpe', 'reglages'].forEach(t => {
    const p = document.getElementById('rpetab-' + t);
    if (p) p.classList.toggle('active', t === name);
  });
  if (name === 'reglages' && typeof renderRpeReglages === 'function') {
    renderRpeReglages(document.getElementById('dateSelect2')?.value);
  }
}

/* ── Logo hub ── */
function initHubLogo() {
  const hubLogo = document.getElementById('hubLogo');
  if (hubLogo && typeof NISSA_LOGO_B64 !== 'undefined') {
    hubLogo.style.backgroundImage = `url('${NISSA_LOGO_B64}')`;
    hubLogo.style.backgroundSize = 'contain';
    hubLogo.style.backgroundRepeat = 'no-repeat';
    hubLogo.style.backgroundPosition = 'center';
  }
}

/* ── populateDateSelectors utilisé par hub ── */
function populateDateSelectors() {
  ['dateSelect', 'dateSelect2'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    ALLDAYS.forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel.appendChild(o);
    });
    sel.value = ALLDAYS[ALLDAYS.length - 1];
  });
}

/* ── moveDate (flèches nav date) ── */
function moveDate(dir) {
  const sel = document.getElementById('dateSelect');
  if (!sel || typeof ALLDAYS === 'undefined') return;
  const idx = ALLDAYS.indexOf(sel.value);
  const next = idx + dir;
  if (next >= 0 && next < ALLDAYS.length) {
    sel.value = ALLDAYS[next];
    const sel2 = document.getElementById('dateSelect2');
    if (sel2) sel2.value = ALLDAYS[next];
    renderWellnessSafe();
    renderRpeSafe();
  }
}

/* ── refreshData (bouton actualiser) ── */
async function refreshData() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.classList.add('loading');
  try {
    const ok = await loadWellnessData();
    if (ok) {
      populateDateSelectors();
      renderWellnessSafe();
    }
  } catch(e) { console.warn('Refresh error:', e); }
  if (btn) btn.classList.remove('loading');
}

/* ── Init principal ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation hub
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchHubSection(btn.dataset.hub));
  });

  if (typeof initTests === 'function') initTests();
  if (typeof initJoueur === 'function') initJoueur();
  initHubLogo();

  // Charger les données wellness
  try {
    const ok = await loadWellnessData();
    if (ok) {
      populateDateSelectors();
      // Pré-rendre wellness en fond (section cachée, pas grave)
      try { render(); } catch(e) { console.warn('Initial render:', e); }
    } else {
      // Afficher un message dans la section wellness
      const metrics = document.getElementById('metrics');
      if (metrics) metrics.innerHTML = '<div style="color:#f5a0a0;padding:20px;font-size:14px">⚠ Impossible de charger les données Google Sheet. Vérifiez la connexion et cliquez "Actualiser".</div>';
    }
  } catch(e) {
    console.warn('Wellness init error:', e.message);
    const metrics = document.getElementById('metrics');
    if (metrics) metrics.innerHTML = '<div style="color:#f5a0a0;padding:20px;font-size:14px">⚠ Erreur : ' + e.message + '</div>';
  }
});
