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
    if (el) el.style.display = s === name ? 'block' : 'none';
  });

  if (name === 'wellness' && ALLDAYS.length) render();
  if (name === 'rpe') { syncDateSelectors(); if (ALLDAYS.length) renderRpe(); }
  if (name === 'joueur') renderCrossPlayerSelect();
  if (name === 'tests') { renderTestResults(); renderEvoPlayerSelect(); renderRankings(); }
  if (name === 'gps') {
    if (typeof rerenderIfLoaded === 'function') rerenderIfLoaded();
  }
}

function syncDateSelectors() {
  const sel1 = document.getElementById('dateSelect');
  const sel2 = document.getElementById('dateSelect2');
  if (!sel1 || !sel2) return;
  if (sel2.options.length === 0 && ALLDAYS.length) {
    ALLDAYS.forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel2.appendChild(o);
    });
  }
  sel2.value = sel1.value;
}

function initHubLogo() {
  const el = document.getElementById('hubLogo');
  if (!el) return;
  if (typeof NISSA_LOGO_B64 !== 'undefined' && NISSA_LOGO_B64) {
    el.style.backgroundImage = `url('${NISSA_LOGO_B64}')`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
  }
  // Also inject into GPS report sections
  ['reportLogoBlock', 'matchReportLogoBlock'].forEach(id => {
    const block = document.getElementById(id);
    if (!block) return;
    const img = document.createElement('img');
    img.src = typeof NISSA_LOGO_B64 !== 'undefined' ? NISSA_LOGO_B64 : '';
    img.alt = 'Nissa Rugby';
    img.style.height = '48px';
    block.appendChild(img);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Init GPS module
  if (typeof initGPS === 'function') initGPS();
  if (typeof initTests === 'function') initTests();
  if (typeof initJoueur === 'function') initJoueur();

  // Wire hub navigation
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchHubSection(btn.dataset.hub));
  });

  // Init hub logo
  initHubLogo();

  // Show header
  const header = document.getElementById('hub-header');
  if (header) header.style.display = 'flex';

  // Load wellness data
  try {
    const ok = await loadWellnessData();
    if (ok) {
      populateDateSelectors();
      render();
    }
  } catch(e) {
    console.warn('Wellness init error:', e);
  }

  // Hide loading screen
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.classList.add('hidden');
  }, 600);
});
