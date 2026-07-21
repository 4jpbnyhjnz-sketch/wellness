/* =========================================================================
   HUB.JS — Navigation principale et initialisation globale
   ========================================================================= */

const HUB_SECTIONS = ['gps', 'wellness', 'rpe', 'joueur', 'tests'];

function switchHubSection(name) {
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hub === name);
  });
  HUB_SECTIONS.forEach(s => {
    const el = document.getElementById('hub-' + s);
    if (el) el.style.display = (s === name) ? 'block' : 'none';
  });

  if (name === 'wellness' && typeof render === 'function' && ALLDAYS.length) render();
  if (name === 'rpe') {
    syncDateSelectors();
    if (typeof renderRpe === 'function' && ALLDAYS.length) renderRpe();
  }
  if (name === 'joueur') {
    if (typeof renderCrossPlayerSelect === 'function') renderCrossPlayerSelect();
  }
  if (name === 'tests') {
    if (typeof renderTestResults === 'function') renderTestResults();
    if (typeof renderRankings === 'function') renderRankings();
    if (typeof renderEvoPlayerSelect === 'function') renderEvoPlayerSelect();
  }
  if (name === 'gps') {
    if (typeof rerenderGPSIfNeeded === 'function') rerenderGPSIfNeeded();
  }
}

function syncDateSelectors() {
  const sel1 = document.getElementById('dateSelect');
  const sel2 = document.getElementById('dateSelect2');
  if (!sel1 || !sel2) return;
  if (sel2.options.length === 0 && typeof ALLDAYS !== 'undefined' && ALLDAYS.length) {
    ALLDAYS.forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel2.appendChild(o);
    });
  }
  sel2.value = sel1.value;
}

function initHubLogo() {
  // Hub header logo
  const hubLogo = document.getElementById('hubLogo');
  if (hubLogo && typeof NISSA_LOGO_B64 !== 'undefined' && NISSA_LOGO_B64) {
    hubLogo.style.backgroundImage = `url('${NISSA_LOGO_B64}')`;
  }
  // GPS report logo blocks
  ['reportLogoBlock', 'matchReportLogoBlock'].forEach(id => {
    const block = document.getElementById(id);
    if (!block || block.hasChildNodes()) return;
    if (typeof NISSA_LOGO_B64 !== 'undefined') {
      const img = document.createElement('img');
      img.src = NISSA_LOGO_B64;
      img.alt = 'Nissa Rugby';
      img.style.height = '48px';
      block.appendChild(img);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wire main hub navigation
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchHubSection(btn.dataset.hub));
  });

  // GPS tab navigation is already wired by gps.js's own DOMContentLoaded
  // Tests and Joueur inits
  if (typeof initTests === 'function') initTests();
  if (typeof initJoueur === 'function') initJoueur();

  // Inject logos
  initHubLogo();

  // Show header
  const header = document.getElementById('hub-header');
  if (header) header.style.display = 'flex';

  // Load wellness data (async)
  try {
    const ok = await loadWellnessData();
    if (ok) {
      populateDateSelectors();
      if (typeof render === 'function') render();
    }
  } catch(e) {
    console.warn('Wellness init error:', e);
  }

  // Hide loading screen
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.classList.add('hidden');
  }, 700);
});
