const state = {
  items: [], q: '', jurisdiction: '', topic: '', source: '',
  view: 'ALL', category: '', groupBy: 'none',
  page: 1, pageSize: 25,
  dateFilter: '', newSinceDate: '',
  bookmarks: new Set(JSON.parse(localStorage.getItem('bookmarks') || '[]'))
};
const el = id => document.getElementById(id);
const uniq = a => [...new Set(a)].filter(Boolean).sort((x, y) => x.localeCompare(y));

// ── Debug mode ──
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === 'true';
const debugLog = el('debugLog');
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addDebugLog(msg, type = 'log') {
  if (!DEBUG_MODE || !debugLog) return;
  const line = document.createElement('div');
  const colors = { log: '#d4d4d4', error: '#f48771', warn: '#dcdcaa' };
  line.style.color = colors[type] || colors.log;
  line.textContent = msg;
  debugLog.appendChild(line);
  debugLog.parentElement.scrollTop = debugLog.parentElement.scrollHeight;
  const debugBtn = el('toggleDebug');
  if (debugBtn) debugBtn.style.display = 'block';
  const debugConsole = el('debugConsole');
  if (debugConsole && debugConsole.style.display === 'none') debugConsole.style.display = 'block';
}

console.log = function (...args) { originalLog.apply(console, args); if (DEBUG_MODE) addDebugLog(args.join(' '), 'log'); };
console.error = function (...args) { originalError.apply(console, args); if (DEBUG_MODE) addDebugLog('❌ ' + args.join(' '), 'error'); };
console.warn = function (...args) { originalWarn.apply(console, args); if (DEBUG_MODE) addDebugLog('⚠️ ' + args.join(' '), 'warn'); };

// ── Dark mode ──
let darkMode = localStorage.getItem('darkMode') === 'true';
function applyDarkMode() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  const btn = el('darkModeBtn');
  if (btn) btn.textContent = darkMode ? '☀️ Light' : '🌙 Dark';
}
function toggleDarkMode() {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  applyDarkMode();
}

// ── URL filter sync ──
function syncUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.jurisdiction) params.set('jurisdiction', state.jurisdiction);
  if (state.topic) params.set('topic', state.topic);
  if (state.source) params.set('source', state.source);
  if (state.view !== 'ALL') params.set('view', state.view);
  if (state.dateFilter) params.set('date', state.dateFilter);
  const qs = params.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.has('q')) state.q = params.get('q');
  if (params.has('jurisdiction')) state.jurisdiction = params.get('jurisdiction');
  if (params.has('topic')) state.topic = params.get('topic');
  if (params.has('source')) state.source = params.get('source');
  if (params.has('view')) state.view = params.get('view');
  if (params.has('date')) state.dateFilter = params.get('date');
}

// ── Active filters display ──
function updateActiveFilters() {
  const filters = [];
  if (state.q) filters.push({ label: `Search: "${state.q}"`, key: 'q' });
  if (state.jurisdiction) filters.push({ label: `Jurisdiction: ${state.jurisdiction}`, key: 'jurisdiction' });
  if (state.topic) filters.push({ label: `Topic: ${state.topic}`, key: 'topic' });
  if (state.source) filters.push({ label: `Source: ${state.source}`, key: 'source' });
  if (state.view !== 'ALL') filters.push({ label: `View: ${state.view}`, key: 'view' });
  if (state.dateFilter) filters.push({ label: `Date: ${state.dateFilter}`, key: 'dateFilter' });

  const container = el('activeFilters');
  const filterTags = el('filterTags');
  if (filters.length === 0) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  filterTags.innerHTML = filters.map(f => `
    <span class="filter-tag">
      ${escapeHtml(f.label)}
      <button onclick="clearFilter('${f.key}')" title="Remove this filter">✕</button>
    </span>
  `).join('');
}

function clearFilter(key) {
  if (key === 'q') state.q = '';
  else if (key === 'jurisdiction') state.jurisdiction = '';
  else if (key === 'topic') state.topic = '';
  else if (key === 'source') state.source = '';
  else if (key === 'view') state.view = 'ALL';
  else if (key === 'dateFilter') state.dateFilter = '';

  el('q').value = state.q;
  el('jurisdiction').value = state.jurisdiction;
  el('topic').value = state.topic;
  el('source').value = state.source;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="ALL"]').classList.add('active');

  state.page = 1;
  syncUrl();
  updateActiveFilters();
  render();
}

function showDisclaimer() {
  if (!localStorage.getItem('disclaimerShown2026')) el('disclaimerBanner').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  applyDarkMode();

  const closeBtn = el('closeDisclaimer');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    el('disclaimerBanner').style.display = 'none';
    localStorage.setItem('disclaimerShown2026', 'true');
  });

  const howItWorksBtn = el('howItWorksBtn');
  if (howItWorksBtn) howItWorksBtn.addEventListener('click', () => { el('howItWorksModal').style.display = 'flex'; });

  const tourBtn = el('tourBtn');
  if (tourBtn) tourBtn.addEventListener('click', () => { el('tourModal').style.display = 'flex'; startInteractiveTour(); });

  const darkModeBtn = el('darkModeBtn');
  if (darkModeBtn) darkModeBtn.addEventListener('click', toggleDarkMode);

  if (!localStorage.getItem('welcomeBannerDismissed')) {
    const banner = el('welcomeBanner');
    if (banner) banner.style.display = 'flex';
  }
  const welcomeStart = el('welcomeStartTour');
  if (welcomeStart) welcomeStart.addEventListener('click', () => {
    el('welcomeBanner').style.display = 'none';
    localStorage.setItem('welcomeBannerDismissed', 'true');
    el('tourModal').style.display = 'flex';
    startInteractiveTour();
  });
  const welcomeDismiss = el('welcomeDismiss');
  if (welcomeDismiss) welcomeDismiss.addEventListener('click', () => {
    el('welcomeBanner').style.display = 'none';
    localStorage.setItem('welcomeBannerDismissed', 'true');
  });

  const apiSettingsBtn = el('apiSettingsBtn');
  if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', () => {
    const modal = el('apiSettingsModal');
    if (modal) {
      modal.style.display = 'flex';
      const hasKey = !!sessionStorage.getItem('claude_api_key');
      const status = el('apiKeyStatus');
      if (status) { status.textContent = hasKey ? '✅ API key is saved for this session.' : ''; status.className = hasKey ? 'status-ok' : ''; }
    }
  });
  const closeApiSettings = el('closeApiSettings');
  if (closeApiSettings) closeApiSettings.addEventListener('click', () => { el('apiSettingsModal').style.display = 'none'; });
  const saveApiKey = el('saveApiKey');
  if (saveApiKey) saveApiKey.addEventListener('click', () => {
    const input = el('apiKeyInput');
    const key = (input ? input.value : '').trim();
    const status = el('apiKeyStatus');
    if (!key) { if (status) { status.textContent = '⚠️ Please enter an API key.'; status.className = 'status-clear'; } return; }
    sessionStorage.setItem('claude_api_key', key);
    if (input) input.value = '';
    if (status) { status.textContent = '✅ Key saved for this session.'; status.className = 'status-ok'; }
  });
  const clearApiKey = el('clearApiKey');
  if (clearApiKey) clearApiKey.addEventListener('click', () => {
    sessionStorage.removeItem('claude_api_key');
    const input = el('apiKeyInput');
    if (input) input.value = '';
    const status = el('apiKeyStatus');
    if (status) { status.textContent = '🗑️ API key cleared.'; status.className = 'status-clear'; }
  });
  const apiModal = el('apiSettingsModal');
  if (apiModal) apiModal.addEventListener('click', e => { if (e.target === apiModal) apiModal.style.display = 'none'; });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  });

  document.querySelectorAll('[data-groupby]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.groupBy = btn.getAttribute('data-groupby') || 'none';
      state.page = 1;
      document.querySelectorAll('[data-groupby]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
});

function startInteractiveTour() {
  const steps = [
    { element: 'kpiTotal', title: '📊 Key Performance Indicators', description: 'Real-time counts of regulatory items. Charts below show 30-day trends.' },
    { element: 'q', title: '🔍 Search & Filter', description: 'Search by keywords or filter by jurisdiction, topic, and source. Click any topic or jurisdiction pill on a card to filter instantly.' },
    { element: 'quickviewsContainer', title: '⚡ Quick Views', description: 'Jump to Enforcements, Updates, News, High Risk, or your Bookmarks.' },
    { element: 'enforcementHeatmap', title: '📅 Enforcement Heatmap', description: 'Click any cell to drill into enforcement items from that date.' },
    { element: 'jurisdictionHeatmap', title: '🗺️ Jurisdiction Risk Map', description: 'Red/Amber/Green circles show risk intensity by region. Click for details.' },
    { element: 'regulatoryTimeline', title: '📈 Activity Timeline', description: 'Chronological view of regulatory events, color-coded by category.' },
    { element: 'deadlineCountdown', title: '⏰ Deadline Countdown', description: 'Upcoming consultation and enforcement deadlines sorted by days remaining.' },
    { element: 'insights', title: '🤖 AI-Generated Insights', description: 'Analyze filtered items with Claude AI for summaries and related sources.' },
    { element: 'cards', title: '📋 Regulatory Items', description: 'Cards show risk scores, impact assessments, and source links. Star any card to bookmark it.' }
  ];
  let currentStep = 0;
  function showTourStep(stepIndex) {
    if (stepIndex >= steps.length) { el('tourModal').style.display = 'none'; alert('Tour complete! Use "How It Works" for more details.'); return; }
    const step = steps[stepIndex];
    const elem = el(step.element);
    const stepDiv = el('tourStep');
    if (!elem) { showTourStep(stepIndex + 1); return; }
    stepDiv.innerHTML = `
      <div style="padding:20px;">
        <div style="font-size:36px;margin-bottom:12px;">${step.title.split(' ')[0]}</div>
        <h3 style="color:var(--navy);margin:0 0 12px;">${escapeHtml(step.title)}</h3>
        <p style="color:var(--text);margin:0 0 16px;line-height:1.6;">${escapeHtml(step.description)}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button style="padding:8px 12px;background:var(--cool-gray);border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;" onclick="document.getElementById('tourModal').style.display='none'">Skip</button>
          <button style="padding:8px 12px;background:var(--electric);border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;" onclick="window.tourNext()">Next</button>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--muted);text-align:center;">Step ${stepIndex + 1} of ${steps.length}</div>
      </div>`;
    currentStep = stepIndex;
  }
  window.tourNext = function () { showTourStep(currentStep + 1); };
  const startBtn = el('startTour');
  if (startBtn) startBtn.onclick = () => showTourStep(0);
}

function toCSV(rows) {
  const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; };
  const headers = ['date', 'jurisdiction', 'topics', 'title', 'status', 'keyTakeaway', 'summary', 'source', 'url', 'originalSourceUrl', 'tags', 'impact_scenario', 'probability_percent', 'financial_loss_range', 'reputational_exposure', 'regulatory_disruption', 'confidence_level'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => {
      if (h === 'impact_scenario') return esc(r.impact_assessment?.scenario || '');
      if (h === 'probability_percent') return esc(r.impact_assessment?.probability_percent || '');
      if (h === 'financial_loss_range') {
        if (r.impact_assessment) return esc(`$${r.impact_assessment.financial_loss_low_millions}M–$${r.impact_assessment.financial_loss_likely_millions}M–$${r.impact_assessment.financial_loss_high_millions}M`);
        return '';
      }
      if (h === 'reputational_exposure') return esc(r.impact_assessment?.reputational_exposure || '');
      if (h === 'regulatory_disruption') return esc(r.impact_assessment?.regulatory_disruption_days || '');
      if (h === 'confidence_level') return esc(r.impact_assessment?.confidence_level || '');
      const v = Array.isArray(r[h]) ? r[h].join(' | ') : r[h];
      return esc(v);
    }).join(','));
  }
  return lines.join('\n');
}

function download(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function buildFilters() {
  const jurisdictions = uniq(state.items.map(i => i.jurisdiction));
  const topics = uniq(state.items.flatMap(i => i.topics || []));
  const sources = uniq(state.items.map(i => i.source));
  const add = (sel, vals) => {
    sel.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = ''; allOpt.textContent = 'All';
    sel.appendChild(allOpt);
    for (const v of vals) { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); }
  };
  add(el('jurisdiction'), jurisdictions);
  add(el('topic'), topics);
  add(el('source'), sources);

  // Restore URL-driven values into dropdowns
  if (state.jurisdiction) el('jurisdiction').value = state.jurisdiction;
  if (state.topic) el('topic').value = state.topic;
  if (state.source) el('source').value = state.source;
  if (state.q) el('q').value = state.q;
  if (state.view !== 'ALL') {
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-view="${state.view}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
}

function matches(it) {
  if (state.category && it.category !== state.category) return false;
  const cat = (it.category || '').toUpperCase();
  if (state.view === 'ENFORCEMENT') { if (cat !== 'ENFORCEMENT') return false; }
  else if (state.view === 'UPDATE') { if (cat !== 'UPDATE') return false; }
  else if (state.view === 'NEWS') { if (cat !== 'NEWS') return false; }
  else if (state.view === 'HIGH-RISK') { if ((it.risk_score || 0) < 65) return false; }
  else if (state.view === 'BOOKMARKS') { if (!state.bookmarks.has(it.id)) return false; }

  if (state.dateFilter && it.date !== state.dateFilter) return false;

  const q = state.q.trim().toLowerCase();
  if (q) {
    const hay = [it.title, it.summary, it.source, it.keyTakeaway, it.businessImpact, (it.tags || []).join(' '), (it.topics || []).join(' ')].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (state.jurisdiction && it.jurisdiction !== state.jurisdiction) return false;
  if (state.source && it.source !== state.source) return false;
  if (state.topic && !(it.topics || []).includes(state.topic)) return false;
  return true;
}

function render() {
  const cards = el('cards');
  const empty = el('empty');
  const rows = state.items.filter(matches).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  empty.hidden = rows.length !== 0;
  updateActiveFilters();
  cards.innerHTML = '';

  if (state.groupBy === 'none') cards.classList.add('grid');
  else cards.classList.remove('grid');

  if (rows.length === 0) { renderPagination(0, 0); return; }

  if (state.groupBy === 'none') {
    const totalPages = Math.ceil(rows.length / state.pageSize);
    state.page = Math.min(state.page, Math.max(1, totalPages));
    const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const fragment = document.createDocumentFragment();
    for (const it of pageRows) fragment.appendChild(buildCard(it));
    cards.appendChild(fragment);
    renderPagination(rows.length, totalPages);
  } else {
    const groups = {};
    for (const it of rows) {
      const keys = state.groupBy === 'region'
        ? [it.jurisdiction || 'Global']
        : (it.topics && it.topics.length > 0 ? it.topics : ['Uncategorised']);
      for (const key of keys) { if (!groups[key]) groups[key] = []; groups[key].push(it); }
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    for (const key of sortedKeys) {
      const header = document.createElement('div');
      header.className = 'view-group-header';
      header.textContent = key + ' (' + groups[key].length + ')';
      cards.appendChild(header);
      const groupGrid = document.createElement('div');
      groupGrid.className = 'grid';
      groupGrid.style.padding = '0 0 8px';
      for (const it of groups[key]) groupGrid.appendChild(buildCard(it));
      cards.appendChild(groupGrid);
    }
    renderPagination(0, 0);
  }

  const insightsBtn = el('insights');
  if (insightsBtn) insightsBtn.onclick = () => generateInsights(rows);
}

function renderPagination(total, totalPages) {
  let pag = el('paginationControls');
  if (!pag) {
    pag = document.createElement('div');
    pag.id = 'paginationControls';
    pag.className = 'pagination-controls';
    const empty = el('empty');
    empty.after(pag);
  }
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  pag.innerHTML = `
    <span class="pagination-info">Page ${state.page} of ${totalPages} &nbsp;·&nbsp; ${total} items</span>
    <button class="btn secondary" onclick="changePage(-1)" ${state.page <= 1 ? 'disabled' : ''}>← Prev</button>
    <button class="btn secondary" onclick="changePage(1)" ${state.page >= totalPages ? 'disabled' : ''}>Next →</button>
  `;
}

window.changePage = function (dir) {
  state.page = Math.max(1, state.page + dir);
  render();
  el('cards').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function buildCard(it) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.animation = `slideInUp ${200 + Math.random() * 200}ms ease-out forwards`;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const pill = (t, c = 'pill') => {
    const s = document.createElement('span');
    s.className = c;
    s.textContent = t;
    return s;
  };

  // "New since last visit" badge
  if (state.newSinceDate && it.date > state.newSinceDate) {
    meta.appendChild(pill('New', 'pill new-badge'));
  }

  meta.appendChild(pill((it.category || 'news').toUpperCase(), 'pill ' + (it.category || 'news')));
  if (it.status) meta.appendChild(pill(it.status, 'pill status-' + it.status.toLowerCase().replace(/\s+/g, '-')));
  meta.appendChild(pill(it.date || '—', 'pill accent'));

  // Clickable jurisdiction pill
  const jurPill = pill(it.jurisdiction || '—', 'pill jur clickable-pill');
  if (it.jurisdiction) {
    jurPill.title = `Filter by jurisdiction: ${it.jurisdiction}`;
    jurPill.addEventListener('click', () => {
      state.jurisdiction = it.jurisdiction;
      state.page = 1;
      el('jurisdiction').value = it.jurisdiction;
      syncUrl(); updateActiveFilters(); render();
    });
  }
  meta.appendChild(jurPill);

  // Source link pill
  if (it.source) {
    const srcUrl = (it.url && /^https?:\/\//i.test(it.url)) ? it.url
      : (it.source_url && /^https?:\/\//i.test(it.source_url)) ? it.source_url
      : (it.originalSourceUrl && /^https?:\/\//i.test(it.originalSourceUrl)) ? it.originalSourceUrl
      : '';
    if (srcUrl) {
      const srcPill = document.createElement('a');
      srcPill.className = 'pill source-pill';
      srcPill.textContent = '↗ ' + it.source;
      srcPill.href = srcUrl;
      srcPill.target = '_blank';
      srcPill.rel = 'noreferrer';
      srcPill.title = 'Open source: ' + it.source;
      meta.appendChild(srcPill);
    } else {
      meta.appendChild(pill(it.source, 'pill source-pill no-link'));
    }
  }

  // Clickable topic pills
  (it.topics || []).slice(0, 2).forEach(t => {
    const tp = pill(t, 'pill clickable-pill');
    tp.title = `Filter by topic: ${t}`;
    tp.addEventListener('click', () => {
      state.topic = t;
      state.page = 1;
      el('topic').value = t;
      syncUrl(); updateActiveFilters(); render();
    });
    meta.appendChild(tp);
  });

  card.appendChild(meta);

  // Bookmark button
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-btn' + (state.bookmarks.has(it.id) ? ' bookmarked' : '');
  bookmarkBtn.title = state.bookmarks.has(it.id) ? 'Remove bookmark' : 'Bookmark this item';
  bookmarkBtn.textContent = state.bookmarks.has(it.id) ? '★' : '☆';
  bookmarkBtn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (state.bookmarks.has(it.id)) { state.bookmarks.delete(it.id); bookmarkBtn.textContent = '☆'; bookmarkBtn.classList.remove('bookmarked'); bookmarkBtn.title = 'Bookmark this item'; }
    else { state.bookmarks.add(it.id); bookmarkBtn.textContent = '★'; bookmarkBtn.classList.add('bookmarked'); bookmarkBtn.title = 'Remove bookmark'; }
    localStorage.setItem('bookmarks', JSON.stringify([...state.bookmarks]));
    if (state.view === 'BOOKMARKS') render();
  });
  card.appendChild(bookmarkBtn);

  const takeaway = it.keyTakeaway || it.businessImpact;
  if (takeaway) {
    const ktBox = document.createElement('div');
    ktBox.className = 'key-takeaway';
    const ktLabel = document.createElement('div');
    ktLabel.className = 'key-takeaway-label';
    ktLabel.textContent = 'Key Takeaway for Compliance';
    const ktP = document.createElement('p');
    ktP.textContent = takeaway;
    ktBox.appendChild(ktLabel); ktBox.appendChild(ktP);
    card.appendChild(ktBox);
  }

  const h = document.createElement('h4');
  h.textContent = sanitizeAndRender(it.title);
  card.appendChild(h);

  const p = document.createElement('p');
  p.textContent = sanitizeAndRender(it.summary);
  card.appendChild(p);

  if (it.consultationDeadline) {
    const dl = document.createElement('div');
    dl.className = 'consultation-deadline';
    dl.textContent = '📅 Consultation closes: ' + it.consultationDeadline;
    card.appendChild(dl);
  }

  if (it.risk_score !== undefined) {
    const riskBox = document.createElement('div');
    riskBox.className = 'risk-score';
    const label = document.createElement('span'); label.className = 'risk-score-label'; label.textContent = 'Risk:';
    const value = document.createElement('span'); value.className = 'risk-score-value'; value.textContent = it.risk_score;
    const meter = document.createElement('div'); meter.className = 'risk-meter';
    const fill = document.createElement('div'); fill.className = 'risk-meter-fill'; fill.style.width = it.risk_score + '%';
    meter.appendChild(fill);
    riskBox.appendChild(label); riskBox.appendChild(value); riskBox.appendChild(meter);
    card.appendChild(riskBox);
  }

  if (it.impact_assessment) {
    const ia = it.impact_assessment;
    const impactBox = document.createElement('div');
    impactBox.className = 'impact-box';
    impactBox.innerHTML = `<strong>Hubbard Calibration</strong>
      <em>${escapeHtml(ia.scenario)}</em>
      <span>Probability: <strong>${escapeHtml(String(ia.probability_percent))}%</strong></span>
      <span>Financial: $${escapeHtml(String(ia.financial_loss_low_millions))}M–${escapeHtml(String(ia.financial_loss_likely_millions))}M–${escapeHtml(String(ia.financial_loss_high_millions))}M</span>
      <span>Reputational: ${escapeHtml(ia.reputational_exposure)}</span>
      <span>Disruption: ${escapeHtml(String(ia.regulatory_disruption_days))}</span>
      <span style="font-size:10px;">Confidence: ${escapeHtml(ia.confidence_level)}</span>`;
    card.appendChild(impactBox);
  }

  if (it.url && /^https?:\/\//i.test(it.url)) {
    const a = document.createElement('a');
    a.href = it.url; a.target = '_blank'; a.rel = 'noreferrer';
    a.textContent = it.source ? `↗ Read at ${it.source}` : 'Open source →';
    card.appendChild(a);
  }

  const altUrl = it.originalSourceUrl || it.source_url;
  if (altUrl && altUrl !== it.url && /^https?:\/\//i.test(altUrl)) {
    const origA = document.createElement('a');
    origA.href = altUrl; origA.target = '_blank'; origA.rel = 'noreferrer';
    origA.className = 'original-source-link'; origA.textContent = '📄 Original Regulatory Source →';
    origA.style.display = 'block';
    card.appendChild(origA);
  }

  return card;
}

// ── Deadline Countdown Panel ──
function renderDeadlineCountdown(items) {
  const section = el('deadlineCountdown');
  if (!section) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlines = items
    .filter(it => it.consultationDeadline)
    .map(it => {
      const d = new Date(it.consultationDeadline);
      const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      return { ...it, daysLeft };
    })
    .filter(it => it.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  if (deadlines.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  const list = section.querySelector('#deadlineList');
  if (!list) return;
  list.innerHTML = '';
  for (const it of deadlines) {
    const urgency = it.daysLeft <= 7 ? 'deadline-urgent' : it.daysLeft <= 30 ? 'deadline-soon' : 'deadline-ok';
    const div = document.createElement('div');
    div.className = `deadline-item ${urgency}`;
    div.innerHTML = `
      <div class="deadline-days">${it.daysLeft}d</div>
      <div class="deadline-meta">
        <div class="deadline-title">${escapeHtml(it.title)}</div>
        <div class="deadline-info">${escapeHtml(it.jurisdiction)} · closes ${escapeHtml(it.consultationDeadline)}</div>
      </div>`;
    list.appendChild(div);
  }
}

function renderRegulatoryTimeline(items) {
  const container = el('regulatoryTimeline');
  if (!container || !window.vis) return;
  const loader = el('timelineLoader');
  if (loader) loader.remove();
  const timelineItems = items
    .filter(item => item.date)
    .slice(0, 50)
    .map((item, idx) => ({
      id: idx,
      content: `<div style="font-size:11px;padding:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.title.substring(0, 40))}</div>`,
      start: new Date(item.date),
      className: `timeline-${item.category || 'news'}`,
      title: escapeHtml(item.title)
    }))
    .sort((a, b) => a.start - b.start);
  const dataset = new vis.DataSet(timelineItems);
  const options = {
    responsive: true, margin: { item: { horizontal: 0, vertical: 5 }, axis: 10 },
    orientation: { axis: 'bottom', item: 'bottom' },
    cluster: { enable: false }, horizontalScroll: true, zoomKey: 'ctrlKey', stack: false,
    timeaxis: { scale: 'month', step: 1 }
  };
  container.innerHTML = '';
  new vis.Timeline(container, dataset, options);
}

function renderInsightRiskBubble(contentDiv, items) {
  const canvasId = 'insightBubbleChart_' + Date.now();
  contentDiv.innerHTML = `<div class="insights-section"><div class="insights-title">🫧 Risk Assessment Matrix (Probability vs Financial Impact)</div><canvas id="${canvasId}" style="max-height:300px;"></canvas></div>` + contentDiv.innerHTML;
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const bubbleData = items.filter(item => item.impact_assessment).map(item => {
      const ia = item.impact_assessment;
      return { x: ia.probability_percent || 50, y: ia.financial_loss_likely_millions || 10, r: (item.risk_score || 50) / 3, label: item.title.substring(0, 30), category: item.category };
    });
    if (bubbleData.length === 0) return;
    const categoryColors = { enforcement: '#d32f2f', update: '#0056B3', news: '#00AEEF' };
    new Chart(canvas, {
      type: 'bubble',
      data: { datasets: [{ label: 'Risk Scenarios', data: bubbleData, backgroundColor: bubbleData.map(d => categoryColors[d.category] || '#00AEEF'), borderColor: bubbleData.map(d => categoryColors[d.category] || '#00AEEF'), borderWidth: 2, opacity: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: ctx => { const item = bubbleData[ctx.dataIndex]; return `Probability: ${item.x}% | Financial: $${item.y}M`; } } } },
        scales: { x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Probability (%)' }, min: 0, max: 100 }, y: { title: { display: true, text: 'Financial Loss ($M)' }, min: 0 } }
      }
    });
  }, 100);
}

async function generateInsights(items) {
  if (items.length === 0) { alert('No items to analyze. Please adjust your filters.'); return; }
  const panel = el('insightsPanel');
  const content = el('insightsContent');
  panel.style.display = 'flex';
  content.innerHTML = '<div class="loading-spinner">Analyzing with Claude AI<br/><small>This may take a moment...</small></div>';
  setTimeout(() => renderInsightRiskBubble(content, items.slice(0, 10)), 500);
  try {
    const itemSummaries = items.slice(0, 5).map(it => ({ title: it.title, category: it.category, summary: it.summary, jurisdiction: it.jurisdiction, topics: it.topics, date: it.date, risk_score: it.risk_score }));
    const prompt = `You are a regulatory intelligence analyst. Analyze these regulatory/enforcement items and provide:
1. A concise summary (2-3 sentences) of the key themes and implications
2. A list of 4-6 related public sources that cover similar topics
3. Key takeaways for compliance teams

Items: ${JSON.stringify(itemSummaries, null, 2)}

Respond as JSON: {"summary":"...","key_takeaways":["..."],"related_sources":[{"name":"...","type":"...","description":"...","relevance":"..."}],"infographic_description":"..."}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': sessionStorage.getItem('claude_api_key') || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { if (response.status === 401) throw new Error('Claude API key not configured or invalid. Click ⚙️ API Settings to enter your key.'); throw new Error(`API Error: ${response.status}`); }
    const data = await response.json();
    const responseText = data.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: responseText, key_takeaways: [], related_sources: [] };
    let html = `<div class="insights-section"><div class="insights-title">📊 Analysis Summary</div><div class="insights-summary">${escapeHtml(insights.summary)}</div></div>
      <div class="insights-section"><div class="insights-title">🎯 Key Takeaways</div><ul style="margin:8px 0;padding-left:20px;">`;
    for (const t of insights.key_takeaways) html += `<li style="margin:6px 0;color:var(--text);font-size:12px;">${escapeHtml(t)}</li>`;
    html += '</ul></div>';
    if (insights.related_sources?.length > 0) {
      html += '<div class="insights-section"><div class="insights-title">🔗 Related Public Sources</div><div class="insights-sources">';
      for (const source of insights.related_sources.slice(0, 6)) {
        html += `<div class="insights-source"><div class="insights-source-title">${escapeHtml(source.name)}</div><div class="insights-source-desc"><strong>Type:</strong> ${escapeHtml(source.type)}</div><div class="insights-source-desc">${escapeHtml(source.description)}</div><div class="insights-source-desc"><em>Relevance:</em> ${escapeHtml(source.relevance)}</div></div>`;
      }
      html += '</div></div>';
    }
    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = `<div class="insights-error"><strong>⚠️ Error:</strong> ${escapeHtml(err.message)}<br/><small style="margin-top:8px;display:block;">Click <strong>⚙️ API Settings</strong> to enter your API key.</small></div>`;
  }
}

function computeKPIs(items) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    total: items.length,
    newItems30d: items.filter(item => new Date(item.date) >= thirtyDaysAgo).length,
    enforcement: items.filter(item => item.category === 'enforcement').length,
    updates: items.filter(item => item.category === 'update').length,
    news: items.filter(item => item.category === 'news').length,
    highRisk: items.filter(item => item.risk_score && item.risk_score >= 65).length
  };
}

function generateSparklineData(items, category, days = 30) {
  const now = new Date();
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    let count = 0;
    if (category === 'all') count = items.filter(item => item.date === dateStr).length;
    else count = items.filter(item => item.date === dateStr && item.category === category).length;
    data.push(count);
  }
  return data;
}

function renderSparkline(canvasId, data, color = '#00AEEF') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: { labels: Array.from({ length: data.length }, (_, i) => i), datasets: [{ data, borderColor: color, backgroundColor: color + '15', borderWidth: 1.5, fill: true, pointRadius: 0, tension: 0.4, spanGaps: true }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } }
  });
}

function paintKPIs(kpis, items) {
  const animateCounter = (elementId, endValue) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (window.countUp && typeof window.countUp.CountUp === 'function') {
      const counter = new window.countUp.CountUp(elementId, endValue, { duration: 1.2, useEasing: true, separator: ',' });
      if (!counter.error) counter.start(); else el.textContent = endValue;
    } else el.textContent = endValue;
  };
  animateCounter('kpiTotal', kpis.total);
  animateCounter('kpiEnforcement', kpis.enforcement);
  animateCounter('kpiUpdates', kpis.updates);
  animateCounter('kpiNews', kpis.news);
  animateCounter('kpiHighRisk', kpis.highRisk);
  animateCounter('kpiNew', kpis.newItems30d);
  if (items && items.length > 0) {
    setTimeout(() => {
      renderSparkline('sparklineTotal', generateSparklineData(items, 'all'), '#00AEEF');
      renderSparkline('sparklineEnforcement', generateSparklineData(items, 'enforcement'), '#d32f2f');
      renderSparkline('sparklineUpdates', generateSparklineData(items, 'update'), '#0056B3');
      renderSparkline('sparklineNews', generateSparklineData(items, 'news'), '#00AEEF');
      const now = new Date();
      const highRiskData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        return items.filter(item => item.date === dateStr && item.risk_score >= 65).length;
      });
      renderSparkline('sparklineHighRisk', highRiskData, '#ff6b6b');
      renderSparkline('sparklineNew', generateSparklineData(items, 'all'), '#4ecdc4');
    }, 100);
  }
}

// ── Specialized panel loaders (with escapeHtml applied to all dynamic content) ──

async function loadAndRenderBIS() {
  try {
    const res = await fetch('data/bis-monitoring.json', { cache: 'no-store' });
    const bisData = await res.json();
    el('bisPeriod').textContent = `Monitoring Period: ${bisData.monitoring_period}`;
    const highlightsContainer = el('bisHighlights');
    highlightsContainer.innerHTML = '';
    for (const highlight of bisData.week.highlights) {
      const card = document.createElement('div');
      card.className = 'bis-highlight';
      const statusClass = `bis-status-${escapeHtml(highlight.priority)}`;
      let html = `<div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="bis-highlight-title">${escapeHtml(highlight.title)}</div>
        <span class="bis-status-badge ${statusClass}">${escapeHtml(highlight.priority.toUpperCase())}</span>
      </div>`;
      const details = highlight.details;
      for (const [key, value] of Object.entries(details)) {
        if (key === 'risk_level') continue;
        const displayKey = key.replace(/_/g, ' ');
        html += `<p><strong>${escapeHtml(displayKey.charAt(0).toUpperCase() + displayKey.slice(1))}:</strong> ${escapeHtml(String(value))}</p>`;
      }
      card.innerHTML = html;
      highlightsContainer.appendChild(card);
    }
    const actionsContainer = el('bisActionItems');
    actionsContainer.innerHTML = '';
    for (const item of bisData.action_items) {
      const actionEl = document.createElement('div');
      actionEl.className = `bis-action-item ${escapeHtml(item.priority)}`;
      actionEl.innerHTML = `
        <div class="bis-action-item-title">✓ ${escapeHtml(item.title)}</div>
        <div class="bis-action-item-desc">${escapeHtml(item.description)}</div>
        <div class="bis-action-item-deadline">Deadline: ${escapeHtml(item.deadline)}</div>`;
      actionsContainer.appendChild(actionEl);
    }
    const resourcesContainer = el('bisResources');
    resourcesContainer.innerHTML = '';
    for (const resource of bisData.monitoring_resources) {
      const resourceEl = document.createElement('div');
      resourceEl.className = 'bis-resource';
      const safeUrl = /^https?:\/\//i.test(resource.url || '') ? resource.url : '#';
      resourceEl.innerHTML = `
        <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(resource.name)}</a>
        <div class="bis-resource-type">${escapeHtml(resource.type)}</div>`;
      resourcesContainer.appendChild(resourceEl);
    }
    el('bisComplianceNote').textContent = bisData.compliance_notes;
    el('showBisBtn').style.display = 'block';
  } catch (err) { console.error('Error loading BIS data:', err); }
}

function initBISToggle() {
  const showBtn = el('showBisBtn'), bisSection = el('bisSection'), closeBtn = el('bisPanelToggle');
  if (showBtn) showBtn.addEventListener('click', () => { bisSection.style.display = 'block'; showBtn.style.display = 'none'; window.scrollTo({ top: bisSection.offsetTop - 100, behavior: 'smooth' }); });
  if (closeBtn) closeBtn.addEventListener('click', () => { bisSection.style.display = 'none'; showBtn.style.display = 'block'; });
}

async function loadAndRenderExportControls() {
  try {
    const res = await fetch('data/export-controls.json', { cache: 'no-store' });
    const ecData = await res.json();
    const resourcesContainer = el('exportControlsResources');
    resourcesContainer.innerHTML = '';
    for (const resource of ecData.export_control_resources) {
      const card = document.createElement('div');
      card.className = 'export-control-resource';
      const safeUrl = /^https?:\/\//i.test(resource.url || '') ? resource.url : '#';
      card.innerHTML = `
        <div class="export-control-resource-title">${escapeHtml(resource.name)}</div>
        <div class="export-control-resource-org">${escapeHtml(resource.organization)}</div>
        <div class="export-control-resource-desc">${escapeHtml(resource.description)}</div>
        <div>
          <span class="export-control-resource-category">${escapeHtml(resource.category.replace(/-/g, ' ').toUpperCase())}</span>
          <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer" style="margin-left:8px;">Visit →</a>
        </div>`;
      resourcesContainer.appendChild(card);
    }
    const topicsContainer = el('exportControlsTopics');
    topicsContainer.innerHTML = '';
    for (const topic of ecData.key_topics) {
      const tagEl = document.createElement('div');
      tagEl.className = 'topic-tag';
      tagEl.textContent = topic;
      topicsContainer.appendChild(tagEl);
    }
    el('exportControlsComplianceNote').textContent = ecData.compliance_note;
    el('showExportControlsBtn').style.display = 'block';
  } catch (err) { console.error('Error loading export controls data:', err); }
}

function initExportControlsToggle() {
  const showBtn = el('showExportControlsBtn'), ecSection = el('exportControlsSection'), closeBtn = el('exportControlsPanelToggle');
  if (showBtn) showBtn.addEventListener('click', () => { ecSection.style.display = 'block'; showBtn.style.display = 'none'; window.scrollTo({ top: ecSection.offsetTop - 100, behavior: 'smooth' }); });
  if (closeBtn) closeBtn.addEventListener('click', () => { ecSection.style.display = 'none'; showBtn.style.display = 'block'; });
}

async function loadAndRenderDataPrivacy() {
  try {
    const res = await fetch('data/data-privacy.json', { cache: 'no-store' });
    const dpData = await res.json();
    const sourcesContainer = el('dataPrivacySources');
    sourcesContainer.innerHTML = '';
    for (const source of dpData.data_privacy_sources) {
      const card = document.createElement('div');
      card.className = 'data-privacy-source';
      let resourcesHtml = '';
      if (source.resources?.length > 0) {
        resourcesHtml = '<div class="data-privacy-resource-list">';
        for (const r of source.resources) {
          const safeUrl = /^https?:\/\//i.test(r.url || '') ? r.url : '#';
          const resType = r.jurisdiction ? ` (${escapeHtml(r.jurisdiction)})` : '';
          resourcesHtml += `<div class="data-privacy-resource-item">
            <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(r.name)}</a>
            <div class="data-privacy-resource-type">${escapeHtml(r.type.replace(/-/g, ' ').toUpperCase())}${resType}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }
      card.innerHTML = `
        <div class="data-privacy-source-org">🔐 ${escapeHtml(source.organization)}</div>
        <div class="data-privacy-source-desc">${escapeHtml(source.description)}</div>
        <div class="data-privacy-source-best"><strong>Best for:</strong> ${escapeHtml(source.best_for)}</div>
        ${resourcesHtml}`;
      sourcesContainer.appendChild(card);
    }
    const topicsContainer = el('dataPrivacyTopics');
    topicsContainer.innerHTML = '';
    for (const topic of dpData.key_topics) { const t = document.createElement('div'); t.className = 'topic-tag'; t.textContent = topic; topicsContainer.appendChild(t); }
    el('dataPrivacyComplianceNote').textContent = dpData.compliance_note;
    el('showDataPrivacyBtn').style.display = 'block';
  } catch (err) { console.error('Error loading data privacy data:', err); }
}

function initDataPrivacyToggle() {
  const showBtn = el('showDataPrivacyBtn'), dpSection = el('dataPrivacySection'), closeBtn = el('dataPrivacyPanelToggle');
  if (showBtn) showBtn.addEventListener('click', () => { dpSection.style.display = 'block'; showBtn.style.display = 'none'; window.scrollTo({ top: dpSection.offsetTop - 100, behavior: 'smooth' }); });
  if (closeBtn) closeBtn.addEventListener('click', () => { dpSection.style.display = 'none'; showBtn.style.display = 'block'; });
}

async function loadAndRenderDataResidency() {
  try {
    const res = await fetch('data/data-residency.json', { cache: 'no-store' });
    const drData = await res.json();
    const sourcesContainer = el('dataResidencySources');
    sourcesContainer.innerHTML = '';
    for (const source of drData.data_residency_sources) {
      const card = document.createElement('div');
      card.className = 'data-residency-source';
      let resourcesHtml = '';
      if (source.resources?.length > 0) {
        resourcesHtml = '<div class="data-residency-resource-list">';
        for (const r of source.resources) {
          const safeUrl = /^https?:\/\//i.test(r.url || '') ? r.url : '#';
          const resType = r.jurisdiction ? ` (${escapeHtml(r.jurisdiction)})` : (r.scope ? ` (${escapeHtml(r.scope)})` : '');
          resourcesHtml += `<div class="data-residency-resource-item">
            <div class="data-residency-resource-org">${escapeHtml(r.organization)}</div>
            <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(r.title)}</a>
            <div class="data-residency-resource-type">${escapeHtml(r.type.replace(/-/g, ' ').toUpperCase())}${resType}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }
      card.innerHTML = `
        <div class="data-residency-source-category">🏛️ ${escapeHtml(source.name)}</div>
        <div class="data-residency-source-desc">${escapeHtml(source.description)}</div>
        ${resourcesHtml}`;
      sourcesContainer.appendChild(card);
    }
    const topicsContainer = el('dataResidencyTopics');
    topicsContainer.innerHTML = '';
    for (const topic of drData.key_topics) { const t = document.createElement('div'); t.className = 'topic-tag'; t.textContent = topic; topicsContainer.appendChild(t); }
    el('dataResidencyComplianceNote').textContent = drData.compliance_note;
    el('showDataResidencyBtn').style.display = 'block';
  } catch (err) { console.error('Error loading data residency data:', err); }
}

function initDataResidencyToggle() {
  const showBtn = el('showDataResidencyBtn'), drSection = el('dataResidencySection'), closeBtn = el('dataResidencyPanelToggle');
  if (showBtn) showBtn.addEventListener('click', () => { drSection.style.display = 'block'; showBtn.style.display = 'none'; window.scrollTo({ top: drSection.offsetTop - 100, behavior: 'smooth' }); });
  if (closeBtn) closeBtn.addEventListener('click', () => { drSection.style.display = 'none'; showBtn.style.display = 'block'; });
}

async function loadAndRenderResponsibleAI() {
  try {
    const res = await fetch('data/responsible-ai.json', { cache: 'no-store' });
    const raiData = await res.json();
    const categoriesContainer = el('responsibleAICategories');
    categoriesContainer.innerHTML = '';
    for (const source of raiData.responsible_ai_sources) {
      const card = document.createElement('div');
      card.className = 'responsible-ai-category';
      let resourcesHtml = '';
      if (source.resources?.length > 0) {
        resourcesHtml = '<div class="responsible-ai-resource-list">';
        for (const r of source.resources) {
          const scopeLabel = r.jurisdiction ? ` (${r.jurisdiction})` : (r.scope ? ` (${r.scope})` : '');
          resourcesHtml += `<div class="responsible-ai-resource-item">
            <div class="responsible-ai-resource-org">${escapeHtml(r.organization)}</div>
            <a href="${escapeHtml(r.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.title)}</a>
            <div class="responsible-ai-resource-type">${escapeHtml(r.type.replace(/-/g, ' ').toUpperCase())}${escapeHtml(scopeLabel)}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }
      card.innerHTML = `
        <div class="responsible-ai-category-name">🔹 ${escapeHtml(source.name)}</div>
        <div class="responsible-ai-category-desc">${escapeHtml(source.description)}</div>
        ${resourcesHtml}`;
      categoriesContainer.appendChild(card);
    }
    const topicsContainer = el('responsibleAITopics');
    topicsContainer.innerHTML = '';
    for (const topic of raiData.key_topics) { const t = document.createElement('div'); t.className = 'topic-tag'; t.textContent = topic; topicsContainer.appendChild(t); }
    el('responsibleAIComplianceNote').textContent = raiData.compliance_note;
    el('showResponsibleAIBtn').style.display = 'block';
  } catch (err) { console.error('Error loading Responsible AI data:', err); }
}

function initResponsibleAIToggle() {
  const showBtn = el('showResponsibleAIBtn'), raiSection = el('responsibleAISection'), closeBtn = el('responsibleAIPanelToggle');
  if (showBtn) showBtn.addEventListener('click', () => { raiSection.style.display = 'block'; showBtn.style.display = 'none'; window.scrollTo({ top: raiSection.offsetTop - 100, behavior: 'smooth' }); });
  if (closeBtn) closeBtn.addEventListener('click', () => { raiSection.style.display = 'none'; showBtn.style.display = 'block'; });
}

function renderEnforcementHeatmap(items) {
  const container = el('enforcementHeatmap');
  if (!container) return;
  const loader = el('enforcementHeatmapLoader');
  if (loader) loader.remove();

  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - 365);

  const seen = new Set(), dateMap = {}, usDateMap = {};
  let totalActions = 0, usActions = 0;
  const jurisdictionCounts = {};

  items.forEach(item => {
    if (item.category !== 'enforcement') return;
    if (seen.has(item.id)) return;
    seen.add(item.id);
    const d = item.date;
    if (!d) return;
    const itemDate = new Date(d);
    if (itemDate < windowStart || itemDate > today) return;
    dateMap[d] = (dateMap[d] || 0) + 1;
    totalActions++;
    const jur = item.jurisdiction || 'Unknown';
    jurisdictionCounts[jur] = (jurisdictionCounts[jur] || 0) + 1;
    if (jur === 'United States') { usDateMap[d] = (usDateMap[d] || 0) + 1; usActions++; }
  });

  const maxCount = Math.max(1, ...Object.values(dateMap), 0);
  const peakEntry = Object.entries(jurisdictionCounts).sort((a, b) => b[1] - a[1])[0];
  const colorScale = ['#f0f0f0', '#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
  const intensityLabels = ['None', 'Low', 'Moderate', 'Elevated', 'High', 'Peak'];

  function getIntensity(count) { return count === 0 ? 0 : Math.min(5, Math.ceil((count / maxCount) * 5)); }
  function tooltipText(dateStr, count, hasUS) {
    if (count === 0) return dateStr + ': No enforcement activity recorded.';
    const label = intensityLabels[getIntensity(count)];
    const plural = count !== 1 ? 's' : '';
    const usNote = hasUS ? '\nIncludes US-jurisdiction event(s) — evaluate extraterritorial exposure.' : '';
    const varNote = count <= 3 ? '\nNote: Small counts carry high variation; interpret directionally.' : '';
    return dateStr + ': ' + count + ' enforcement event' + plural + ' — ' + label + ' activity signal.' + usNote + varNote;
  }

  const days = [];
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({ date, dateStr, count: dateMap[dateStr] || 0, usCount: usDateMap[dateStr] || 0 });
  }

  if (days.length === 0) { container.innerHTML = '<p style="color:var(--muted);font-size:12px;">No enforcement data available.</p>'; return; }

  const weeks = [];
  let week = [];
  const firstDow = (days[0].date.getDay() + 6) % 7;
  for (let p = 0; p < firstDow; p++) week.push(null);
  days.forEach(day => { week.push(day); if (week.length === 7) { weeks.push(week); week = []; } });
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels = {};
  weeks.forEach((w, wi) => { for (const day of w) { if (day && day.date.getDate() <= 7) { if (!monthLabels[wi]) monthLabels[wi] = monthNames[day.date.getMonth()]; break; } } });

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'overflow-x:auto;';

  const statsBar = document.createElement('div');
  statsBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:11px;';
  const mkStat = (html, extra = '') => { const s = document.createElement('span'); s.style.cssText = `background:rgba(0,45,98,.06);border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--navy);${extra}`; s.innerHTML = html; return s; };
  statsBar.appendChild(mkStat(`<strong>Rolling window:</strong> ${windowStart.toISOString().split('T')[0]} – ${today.toISOString().split('T')[0]}`));
  statsBar.appendChild(mkStat(`<strong>Enforcement events:</strong> ${totalActions}`));
  if (peakEntry) statsBar.appendChild(mkStat(`<strong>Peak jurisdiction:</strong> ${escapeHtml(peakEntry[0])} (${peakEntry[1]})`));
  if (usActions > 0) { const u = mkStat(`🇺🇸 US activity: ${usActions} event${usActions !== 1 ? 's' : ''} — extraterritorial risk signal`, 'background:rgba(165,15,21,.07);border:1px solid rgba(165,15,21,.25);color:#a50f15;font-weight:600;'); statsBar.appendChild(u); }
  wrapper.appendChild(statsBar);

  const monthRow = document.createElement('div');
  monthRow.style.cssText = 'display:flex;gap:2px;margin-bottom:2px;padding-left:22px;';
  weeks.forEach((_, wi) => { const lbl = document.createElement('div'); lbl.style.cssText = 'width:14px;font-size:9px;color:var(--muted);text-align:center;overflow:visible;white-space:nowrap;'; lbl.textContent = monthLabels[wi] || ''; monthRow.appendChild(lbl); });
  wrapper.appendChild(monthRow);

  const gridArea = document.createElement('div');
  gridArea.style.cssText = 'display:flex;align-items:flex-start;gap:0;';

  const dowLabels = document.createElement('div');
  dowLabels.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-right:4px;flex-shrink:0;';
  ['M', '', 'W', '', 'F', '', ''].forEach(lbl => {
    const d = document.createElement('div');
    d.style.cssText = 'width:14px;height:14px;font-size:9px;color:var(--muted);line-height:14px;text-align:right;padding-right:2px;';
    d.textContent = lbl;
    dowLabels.appendChild(d);
  });
  gridArea.appendChild(dowLabels);

  const calGrid = document.createElement('div');
  calGrid.style.cssText = 'display:flex;gap:2px;';
  weeks.forEach(w => {
    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
    w.forEach(day => {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:14px;height:14px;border-radius:2px;flex-shrink:0;';
      if (!day) { cell.style.background = 'transparent'; }
      else {
        const intensity = getIntensity(day.count);
        cell.style.background = colorScale[intensity];
        cell.style.border = '1px solid rgba(0,0,0,0.07)';
        cell.style.cursor = 'pointer';
        cell.title = tooltipText(day.dateStr, day.count, day.usCount > 0);
        cell.addEventListener('mouseenter', () => { cell.style.transform = 'scale(1.4)'; cell.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)'; cell.style.zIndex = '10'; cell.style.position = 'relative'; });
        cell.addEventListener('mouseleave', () => { cell.style.transform = ''; cell.style.boxShadow = ''; cell.style.zIndex = ''; cell.style.position = ''; });
        // Drill-down: click to filter cards to that date's enforcement items
        if (day.count > 0) {
          cell.addEventListener('click', () => {
            state.dateFilter = day.dateStr;
            state.view = 'ENFORCEMENT';
            state.page = 1;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            const enfBtn = document.querySelector('[data-view="ENFORCEMENT"]');
            if (enfBtn) enfBtn.classList.add('active');
            syncUrl(); updateActiveFilters(); render();
            el('cards').scrollIntoView({ behavior: 'smooth' });
          });
          cell.title += '\nClick to filter cards to this date.';
        }
      }
      col.appendChild(cell);
    });
    calGrid.appendChild(col);
  });
  gridArea.appendChild(calGrid);
  wrapper.appendChild(gridArea);

  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--muted);flex-wrap:wrap;';
  legend.appendChild(Object.assign(document.createElement('span'), { textContent: 'Activity signal:' }));
  colorScale.forEach((color, i) => {
    const item = document.createElement('span');
    item.style.cssText = 'display:flex;align-items:center;gap:3px;';
    const swatch = document.createElement('span');
    swatch.style.cssText = `display:inline-block;width:12px;height:12px;background:${color};border-radius:2px;border:1px solid rgba(0,0,0,0.1);flex-shrink:0;`;
    item.appendChild(swatch);
    item.appendChild(Object.assign(document.createElement('span'), { textContent: intensityLabels[i] }));
    legend.appendChild(item);
  });
  wrapper.appendChild(legend);

  const context = document.createElement('div');
  context.style.cssText = 'margin-top:16px;padding:12px 14px;background:rgba(0,45,98,.04);border-radius:8px;border-left:3px solid var(--navy);font-size:12px;color:var(--text);line-height:1.55;';
  context.innerHTML = `<strong style="display:block;margin-bottom:6px;color:var(--navy);font-size:13px;">Decision-Relevant Context</strong>
    <p style="margin:0 0 8px;">This heatmap is a <em>decision-support tool</em>. Observed enforcement frequency reduces uncertainty about future enforcement probability—it does not predict it with certainty. <strong>Click any active cell to drill into that date's items.</strong></p>
    <p style="margin:0 0 8px;"><strong>Extraterritorial Enforcement (US):</strong> US enforcement carries risk implications beyond US borders via FCPA, OFAC, and EAR/ITAR statutes.</p>
    <p style="margin:0;"><strong>Use alongside:</strong> exposure indicators, jurisdiction-specific risk scores, and qualified legal counsel.</p>`;
  wrapper.appendChild(context);

  const disclaimer = document.createElement('div');
  disclaimer.style.cssText = 'margin-top:10px;padding:10px 14px;background:rgba(211,47,47,.04);border-radius:8px;border-left:3px solid rgba(211,47,47,.35);font-size:11px;color:var(--muted);line-height:1.55;';
  const disclList = document.createElement('ul');
  disclList.style.cssText = 'margin:0;padding-left:16px;';
  ['This heatmap reflects <strong>observed enforcement activity volume</strong> within the data feed only.', '<strong>Low activity does not imply low risk.</strong> Jurisdictions with limited enforcement capacity may show low counts despite elevated latent risk.', 'Cell intensity reflects relative magnitude within this rolling window only—<strong>not a risk score</strong>.', 'Small counts (1–3 events) carry high statistical variation; interpret directionally.', 'This tool is for internal triage only. Always consult original regulatory sources and qualified legal counsel.'].forEach(text => {
    const li = document.createElement('li');
    li.style.cssText = 'margin-bottom:4px;';
    li.innerHTML = text;
    disclList.appendChild(li);
  });
  disclaimer.innerHTML = '<strong style="display:block;margin-bottom:6px;color:#b71c1c;font-size:12px;">⚠️ Important Disclaimer / Limitations</strong>';
  disclaimer.appendChild(disclList);
  wrapper.appendChild(disclaimer);

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function renderJurisdictionHeatmap(items) {
  const container = el('jurisdictionHeatmap');
  if (!container || !window.L) return;
  const loader = el('jurisdictionHeatmapLoader');
  if (loader) loader.remove();
  const mapId = 'jurisdictionMap_' + Date.now();
  container.innerHTML = `<div id="${mapId}" style="width:100%;height:100%;"></div>`;
  setTimeout(() => {
    const map = L.map(mapId).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    const jurisdictionCounts = {}, jurisdictionRisks = {};
    items.forEach(item => {
      const jur = item.jurisdiction || 'Global';
      jurisdictionCounts[jur] = (jurisdictionCounts[jur] || 0) + 1;
      jurisdictionRisks[jur] = (jurisdictionRisks[jur] || 0) + (item.risk_score || 50);
    });
    const coords = { 'United States': [37.09, -95.71], 'European Union': [54.53, 15.26], 'United Kingdom': [55.38, -3.44], 'UAE': [23.42, 53.85], 'China': [35.86, 104.20], 'Global': [20, 0] };
    Object.entries(jurisdictionRisks).forEach(([jur, riskSum]) => {
      const count = jurisdictionCounts[jur] || 0;
      const avgRisk = count > 0 ? Math.round(riskSum / count) : 50;
      const c = coords[jur] || [0, 0];
      const color = avgRisk >= 65 ? '#d32f2f' : avgRisk >= 50 ? '#ff9800' : '#4caf50';
      L.circleMarker(c, { radius: Math.min(30, Math.max(8, count * 2)), fillColor: color, color, weight: 2, opacity: 0.8, fillOpacity: 0.6 })
        .bindPopup(`<div style="font-size:12px;"><strong>${escapeHtml(jur)}</strong><br/>Items: ${count}<br/>Avg Risk: ${avgRisk}<br/>Category: ${avgRisk >= 65 ? 'High Risk' : avgRisk >= 50 ? 'Medium Risk' : 'Stable'}</div>`)
        .addTo(map);
    });
  }, 100);
}

async function init() {
  showDisclaimer();

  ['kpiTotal', 'kpiEnforcement', 'kpiUpdates', 'kpiNews', 'kpiHighRisk', 'kpiNew'].forEach(id => {
    const kpiEl = el(id);
    if (kpiEl) kpiEl.innerHTML = '<span class="kpi-skeleton"></span>';
  });

  // Apply URL params before fetching
  applyUrlParams();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let res;
    try { res = await fetch('data/updates.json', { cache: 'no-store', signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch updates.json`);
    const payload = await res.json();
    state.items = payload.items || [];

    // "New since last visit" tracking
    const lastVisitGenAt = localStorage.getItem('lastVisitGenAt') || '';
    const currentGenAt = payload.generated_at || '';
    state.newSinceDate = lastVisitGenAt ? lastVisitGenAt.split('T')[0] : '';
    if (currentGenAt) localStorage.setItem('lastVisitGenAt', currentGenAt);

    const kpis = computeKPIs(state.items);
    paintKPIs(kpis, state.items);

    const rawDate = payload.generated_at || payload.lastUpdated || '';
    const formattedDate = rawDate ? rawDate.split('T')[0] : '';
    const newCount = state.newSinceDate ? state.items.filter(it => it.date > state.newSinceDate).length : 0;
    el('lastUpdated').textContent = formattedDate
      ? `🕐 Last updated: ${formattedDate}${newCount ? ` · ${newCount} new` : ''}`
      : '⚠️ Update status unknown';

    buildFilters();
    render();
    renderDeadlineCountdown(state.items);
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const msg = isTimeout ? 'Request timed out after 8 seconds' : err.message;
    console.error('[INIT] Error loading main data:', msg);
    el('lastUpdated').textContent = '⚠️ Data unavailable — check update pipeline';
    ['kpiTotal', 'kpiEnforcement', 'kpiUpdates', 'kpiNews', 'kpiHighRisk', 'kpiNew'].forEach(id => { const kpiEl = el(id); if (kpiEl) kpiEl.textContent = '—'; });
    const empty = el('empty');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <p class="empty-title">Data unavailable</p>
        <p class="empty-subtitle">${escapeHtml(msg)}</p>
        <button class="btn" onclick="location.reload()">🔄 Retry</button>`;
    }
    ['enforcementHeatmap', 'jurisdictionHeatmap', 'regulatoryTimeline'].forEach(id => { const c = el(id); if (c) c.innerHTML = '<div class="viz-error">⚠️ Data unavailable — visualisation cannot be rendered</div>'; });
  }

  try { renderEnforcementHeatmap(state.items); } catch (e) { console.warn('Enforcement heatmap failed:', e); const c = el('enforcementHeatmap'); if (c) c.innerHTML = '<div class="viz-error">⚠️ Enforcement heatmap failed to render</div>'; }
  try { renderJurisdictionHeatmap(state.items); } catch (e) { console.warn('Jurisdiction heatmap failed:', e); const c = el('jurisdictionHeatmap'); if (c) c.innerHTML = '<div class="viz-error">⚠️ Jurisdiction map failed to render</div>'; }
  try { renderRegulatoryTimeline(state.items); } catch (e) { console.warn('Regulatory timeline failed:', e); const c = el('regulatoryTimeline'); if (c) c.innerHTML = '<div class="viz-error">⚠️ Timeline failed to render</div>'; }

  el('q').addEventListener('input', e => { state.q = e.target.value; state.page = 1; syncUrl(); updateActiveFilters(); render(); });
  el('jurisdiction').addEventListener('change', e => { state.jurisdiction = e.target.value; state.page = 1; syncUrl(); updateActiveFilters(); render(); });
  el('topic').addEventListener('change', e => { state.topic = e.target.value; state.page = 1; syncUrl(); updateActiveFilters(); render(); });
  el('source').addEventListener('change', e => { state.source = e.target.value; state.page = 1; syncUrl(); updateActiveFilters(); render(); });
  el('reset').addEventListener('click', () => {
    state.q = ''; state.jurisdiction = ''; state.topic = ''; state.source = ''; state.view = 'ALL'; state.dateFilter = ''; state.page = 1;
    el('q').value = ''; el('jurisdiction').value = ''; el('topic').value = ''; el('source').value = '';
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="ALL"]').classList.add('active');
    syncUrl(); updateActiveFilters(); render();
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.getAttribute('data-view') || 'ALL';
      state.page = 1;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      syncUrl(); updateActiveFilters(); render();
    });
  });

  const exportBtn = el('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const rows = state.items.filter(matches).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (rows.length === 0) { alert('No items to export with the current filters.'); return; }
    download('regulatory-report-' + new Date().toISOString().split('T')[0] + '.csv', toCSV(rows), 'text/csv;charset=utf-8;');
  });

  const printBtn = el('printBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const alertBtn = el('alertBtn'), alertNote = el('alertSavedNote');
  if (alertBtn) alertBtn.addEventListener('click', () => {
    const filterState = { q: state.q, jurisdiction: state.jurisdiction, topic: state.topic, source: state.source, view: state.view, savedAt: new Date().toISOString() };
    const alerts = JSON.parse(localStorage.getItem('savedAlerts') || '[]');
    alerts.push(filterState);
    localStorage.setItem('savedAlerts', JSON.stringify(alerts));
    if (alertNote) { alertNote.textContent = '✅ Filter alert saved — your preferences are stored for next visit.'; alertNote.classList.add('visible'); setTimeout(() => alertNote.classList.remove('visible'), 4000); }
  });

  try { await loadAndRenderBIS(); initBISToggle(); } catch (err) { console.warn('[INIT] Error loading BIS data:', err); }
  try { await loadAndRenderExportControls(); initExportControlsToggle(); } catch (err) { console.warn('[INIT] Error loading Export Controls data:', err); }
  try { await loadAndRenderDataPrivacy(); initDataPrivacyToggle(); } catch (err) { console.warn('[INIT] Error loading Data Privacy data:', err); }
  try { await loadAndRenderDataResidency(); initDataResidencyToggle(); } catch (err) { console.warn('[INIT] Error loading Data Residency data:', err); }
  try { await loadAndRenderResponsibleAI(); initResponsibleAIToggle(); } catch (err) { console.warn('[INIT] Error loading Responsible AI data:', err); }

  el('closeInsights').addEventListener('click', () => { el('insightsPanel').style.display = 'none'; });
  el('insightsPanel').addEventListener('click', e => { if (e.target === el('insightsPanel')) el('insightsPanel').style.display = 'none'; });
}

function sanitizeAndRender(rawContent) {
  if (!rawContent) return '';
  const temp = document.createElement('div');
  temp.innerHTML = rawContent;
  return (temp.textContent || temp.innerText || '').trim();
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

function renderInsight(containerId, update) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let content = sanitizeAndRender(update.description);
  if (!content) content = 'Details unavailable. Please refer to the original source.';
  const safeUrl = /^https?:\/\//i.test(update.source_url || '') ? update.source_url : '#';
  container.innerHTML = `<h3>${escapeHtml(update.title)}</h3>
    <p class="meta">${escapeHtml(new Date(update.date).toDateString())} · ${escapeHtml(update.jurisdiction)}</p>
    <p>${escapeHtml(content)}</p>
    <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">View official source</a>`;
}

function filterByCategory(updates, category) {
  const results = updates.filter(u => u.category === category);
  if (results.length === 0) return [{ title: 'No Responsible AI regulatory updates today', description: '', date: new Date().toISOString(), jurisdiction: '', source_url: '#' }];
  return results;
}

function renderRiskBadges(update) {
  const badges = [];
  if (update.severity) badges.push(`<span class="badge severity-${escapeHtml(update.severity.toLowerCase())}">${escapeHtml(update.severity)}</span>`);
  if (update.likelihood) badges.push(`<span class="badge severity-${escapeHtml(update.likelihood.toLowerCase())}">${escapeHtml(update.likelihood)}</span>`);
  return badges.join(' ');
}

(async () => {
  try {
    await init();
  } catch (err) {
    console.error('[APP INIT] Fatal error:', err);
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) lastUpdated.textContent = '⚠️ Data unavailable — check update pipeline';
    const empty = document.getElementById('empty');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `<div class="empty-icon">⚠️</div>
        <p class="empty-title">Data unavailable</p>
        <p class="empty-subtitle">${escapeHtml(err.message || 'Unknown error')}</p>
        <button class="btn" onclick="location.reload()">🔄 Retry</button>`;
    }
  }
})();
