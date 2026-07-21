/* =========================================================================
   HUB.JS — Navigation principale
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
  if (name === 'wellness' && typeof render === 'function' && typeof ALLDAYS !== 'undefined' && ALLDAYS.length) render();
  if (name === 'rpe') { syncDateSelectors(); if (typeof renderRpe === 'function' && typeof ALLDAYS !== 'undefined' && ALLDAYS.length) renderRpe(); }
  if (name === 'joueur-hub' && typeof renderCrossPlayerSelect === 'function') renderCrossPlayerSelect();
  if (name === 'tests') {
    if (typeof renderTestResults === 'function') renderTestResults();
    if (typeof renderRankings === 'function') renderRankings();
    if (typeof renderEvoPlayerSelect === 'function') renderEvoPlayerSelect();
  }
}

function syncDateSelectors() {
  const sel1 = document.getElementById('dateSelect');
  const sel2 = document.getElementById('dateSelect2');
  if (!sel1 || !sel2) return;
  if (sel2.options.length === 0 && typeof ALLDAYS !== 'undefined') {
    ALLDAYS.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; sel2.appendChild(o); });
  }
  sel2.value = sel1.value;
}

function initHubLogo() {
  const hubLogo = document.getElementById('hubLogo');
  if (hubLogo && typeof NISSA_LOGO_B64 !== 'undefined') {
    hubLogo.style.backgroundImage = `url('${NISSA_LOGO_B64}')`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchHubSection(btn.dataset.hub));
  });
  if (typeof initTests === 'function') initTests();
  if (typeof initJoueur === 'function') initJoueur();
  initHubLogo();

  try {
    const ok = await loadWellnessData();
    if (ok) { populateDateSelectors(); if (typeof render === 'function') render(); }
  } catch(e) { console.warn('Wellness:', e.message); }
});
