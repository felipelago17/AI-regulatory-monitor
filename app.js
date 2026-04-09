const state = { items: [], q: '', jurisdiction: '', topic: '', source: '', view: 'ALL', category: '', groupBy: 'none' };
const el=id=>document.getElementById(id);
const uniq=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y));

// ── Debug mode: only active when ?debug=true is in the URL ──
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === 'true';

// Setup debug console (only intercepts console when debug mode is on)
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

  // Show debug button and console only in debug mode
  const debugBtn = el('toggleDebug');
  if (debugBtn) debugBtn.style.display = 'block';
  const debugConsole = el('debugConsole');
  if (debugConsole && debugConsole.style.display === 'none') {
    debugConsole.style.display = 'block';
  }
}

console.log = function(...args) {
  originalLog.apply(console, args);
  if (DEBUG_MODE) addDebugLog(args.join(' '), 'log');
};

console.error = function(...args) {
  originalError.apply(console, args);
  if (DEBUG_MODE) addDebugLog('❌ ' + args.join(' '), 'error');
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  if (DEBUG_MODE) addDebugLog('⚠️ ' + args.join(' '), 'warn');
};

// UI/UX Enhancements
function updateActiveFilters() {
  /**
   * Display active filters with ability to clear individually
   */
  const filters = [];
  if (state.q) filters.push({ label: `Search: "${state.q}"`, key: 'q' });
  if (state.jurisdiction) filters.push({ label: `Jurisdiction: ${state.jurisdiction}`, key: 'jurisdiction' });
  if (state.topic) filters.push({ label: `Topic: ${state.topic}`, key: 'topic' });
  if (state.source) filters.push({ label: `Source: ${state.source}`, key: 'source' });
  if (state.view !== 'ALL') filters.push({ label: `View: ${state.view}`, key: 'view' });
  
  const container = el('activeFilters');
  const filterTags = el('filterTags');
  
  if (filters.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  filterTags.innerHTML = filters.map(f => `
    <span class="filter-tag">
      ${f.label}
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
  
  el('q').value = state.q;
  el('jurisdiction').value = state.jurisdiction;
  el('topic').value = state.topic;
  el('source').value = state.source;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="ALL"]').classList.add('active');
  
  updateActiveFilters();
  render();
}

function showDisclaimer() {
  /**
   * Show disclaimer banner on first visit
   */
  if (!localStorage.getItem('disclaimerShown2026')) {
    el('disclaimerBanner').style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = el('closeDisclaimer');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      el('disclaimerBanner').style.display = 'none';
      localStorage.setItem('disclaimerShown2026', 'true');
    });
  }
  
  // How It Works button
  const howItWorksBtn = el('howItWorksBtn');
  if (howItWorksBtn) {
    howItWorksBtn.addEventListener('click', () => {
      el('howItWorksModal').style.display = 'flex';
    });
  }
  
  // Tour button
  const tourBtn = el('tourBtn');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      el('tourModal').style.display = 'flex';
      startInteractiveTour();
    });
  }

  // Welcome banner: show once per session (localStorage flag)
  if (!localStorage.getItem('welcomeBannerDismissed')) {
    const banner = el('welcomeBanner');
    if (banner) banner.style.display = 'flex';
  }
  const welcomeStart = el('welcomeStartTour');
  if (welcomeStart) {
    welcomeStart.addEventListener('click', () => {
      el('welcomeBanner').style.display = 'none';
      localStorage.setItem('welcomeBannerDismissed', 'true');
      el('tourModal').style.display = 'flex';
      startInteractiveTour();
    });
  }
  const welcomeDismiss = el('welcomeDismiss');
  if (welcomeDismiss) {
    welcomeDismiss.addEventListener('click', () => {
      el('welcomeBanner').style.display = 'none';
      localStorage.setItem('welcomeBannerDismissed', 'true');
    });
  }

  // ⚙️ API Settings modal
  const apiSettingsBtn = el('apiSettingsBtn');
  if (apiSettingsBtn) {
    apiSettingsBtn.addEventListener('click', () => {
      const modal = el('apiSettingsModal');
      if (modal) {
        modal.style.display = 'flex';
        // Show whether a key is already stored
        const hasKey = !!sessionStorage.getItem('claude_api_key');
        const status = el('apiKeyStatus');
        if (status) {
          status.textContent = hasKey ? '✅ API key is saved for this session.' : '';
          status.className = hasKey ? 'status-ok' : '';
        }
      }
    });
  }
  const closeApiSettings = el('closeApiSettings');
  if (closeApiSettings) {
    closeApiSettings.addEventListener('click', () => {
      el('apiSettingsModal').style.display = 'none';
    });
  }
  const saveApiKey = el('saveApiKey');
  if (saveApiKey) {
    saveApiKey.addEventListener('click', () => {
      const input = el('apiKeyInput');
      const key = (input ? input.value : '').trim();
      const status = el('apiKeyStatus');
      if (!key) {
        if (status) { status.textContent = '⚠️ Please enter an API key.'; status.className = 'status-clear'; }
        return;
      }
      sessionStorage.setItem('claude_api_key', key);
      if (input) input.value = '';
      if (status) { status.textContent = '✅ Key saved for this session. It will be cleared when you close this tab.'; status.className = 'status-ok'; }
    });
  }
  const clearApiKey = el('clearApiKey');
  if (clearApiKey) {
    clearApiKey.addEventListener('click', () => {
      sessionStorage.removeItem('claude_api_key');
      const input = el('apiKeyInput');
      if (input) input.value = '';
      const status = el('apiKeyStatus');
      if (status) { status.textContent = '🗑️ API key cleared.'; status.className = 'status-clear'; }
    });
  }
  // Close API Settings modal on outside click
  const apiModal = el('apiSettingsModal');
  if (apiModal) {
    apiModal.addEventListener('click', e => {
      if (e.target === apiModal) apiModal.style.display = 'none';
    });
  }

  // Close other modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // View-group toggle (Regional / Topic)
  document.querySelectorAll('[data-groupby]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.groupBy = btn.getAttribute('data-groupby') || 'none';
      document.querySelectorAll('[data-groupby]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
});

function startInteractiveTour() {
  /**
   * Interactive tour highlighting key features
   */
  const steps = [
    {
      element: 'kpiTotal',
      title: '📊 Key Performance Indicators',
      description: 'Real-time counts of regulatory items. The charts below show 30-day trends.',
      position: 'bottom'
    },
    {
      element: 'q',
      title: '🔍 Search & Filter',
      description: 'Search by keywords or filter by jurisdiction, topic, and source. View active filters below the search bar.',
      position: 'bottom'
    },
    {
      element: 'quickviewsContainer',
      title: '⚡ Quick Views',
      description: 'Jump to specific categories: All items, Enforcements (penalties), Updates (new rules), News, or items with high risk scores.',
      position: 'bottom'
    },
    {
      element: 'enforcementHeatmap',
      title: '📅 Enforcement Heatmap',
      description: 'See 365 days of enforcement activity intensity. Darker cells mean more regulatory action.',
      position: 'top'
    },
    {
      element: 'jurisdictionHeatmap',
      title: '🗺️ Jurisdiction Risk Map',
      description: 'Red/Amber/Green circles show risk intensity by regulatory region. Click for details.',
      position: 'top'
    },
    {
      element: 'regulatoryTimeline',
      title: '📈 Activity Timeline',
      description: 'Chronological view of regulatory events. Color-coded by enforcement (red), updates (blue), or news (cyan).',
      position: 'top'
    },
    {
      element: 'insights',
      title: '🤖 AI-Generated Insights',
      description: 'Click to analyze filtered items with Claude AI. Get summaries, related sources, and risk visualization.',
      position: 'top'
    },
    {
      element: 'cards',
      title: '📋 Regulatory Items',
      description: 'Each card shows a regulatory event with risk scores, impact assessment, and source links.',
      position: 'top'
    }
  ];
  
  let currentStep = 0;
  
  function showTourStep(stepIndex) {
    if (stepIndex >= steps.length) {
      el('tourModal').style.display = 'none';
      alert('Tour complete! Explore the monitor and use "How It Works" for more details.');
      return;
    }
    
    const step = steps[stepIndex];
    const elem = el(step.element);
    const stepDiv = el('tourStep');
    
    if (!elem) {
      showTourStep(stepIndex + 1);
      return;
    }
    
    stepDiv.innerHTML = `
      <div style="padding:20px;">
        <div style="font-size:36px;margin-bottom:12px;">${step.title.split(' ')[0]}</div>
        <h3 style="color:var(--navy);margin:0 0 12px;">${step.title}</h3>
        <p style="color:var(--text);margin:0 0 16px;line-height:1.6;">${step.description}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button onclick="event.stopPropagation()" style="padding:8px 12px;background:var(--cool-gray);border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;" onclick="document.getElementById('tourModal').style.display='none'">Skip</button>
          <button onclick="event.stopPropagation()" style="padding:8px 12px;background:var(--electric);border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;" onclick="window.tourNext()">Next</button>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--muted);text-align:center;">Step ${stepIndex + 1} of ${steps.length}</div>
      </div>
    `;
    
    currentStep = stepIndex;
  }
  
  window.tourNext = function() {
    showTourStep(currentStep + 1);
  };
  
  const startBtn = el('startTour');
  if (startBtn) {
    startBtn.onclick = () => showTourStep(0);
  }
}



 
function toCSV(rows){
  const esc=v=>{
    const s=String(v??'');
    return /[\",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
  };
  const headers=['date','jurisdiction','topics','title','status','keyTakeaway','summary','source','url','originalSourceUrl','tags','impact_scenario','probability_percent','financial_loss_range','reputational_exposure','regulatory_disruption','confidence_level'];
  const lines=[headers.join(',')];
  for(const r of rows){
    lines.push(headers.map(h=>{
      if(h==='impact_scenario'){
        return esc(r.impact_assessment?.scenario||'');
      }else if(h==='probability_percent'){
        return esc(r.impact_assessment?.probability_percent||'');
      }else if(h==='financial_loss_range'){
        if(r.impact_assessment)return esc(`$${r.impact_assessment.financial_loss_low_millions}M–$${r.impact_assessment.financial_loss_likely_millions}M–$${r.impact_assessment.financial_loss_high_millions}M`);
        return '';
      }else if(h==='reputational_exposure'){
        return esc(r.impact_assessment?.reputational_exposure||'');
      }else if(h==='regulatory_disruption'){
        return esc(r.impact_assessment?.regulatory_disruption_days||'');
      }else if(h==='confidence_level'){
        return esc(r.impact_assessment?.confidence_level||'');
      }else{
        const v=Array.isArray(r[h])?r[h].join(' | '):r[h];
        return esc(v);
      }
    }).join(','));
  }
  return lines.join('\n');
}
 
function download(name,content,type='text/plain'){
  const blob=new Blob([content],{type});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
 
function buildFilters(){
  console.log('[buildFilters] Starting...');
  console.log('[buildFilters] state.items.length:', state.items.length);
  
  const jurisdictions=uniq(state.items.map(i=>i.jurisdiction));
  const topics=uniq(state.items.flatMap(i=>i.topics||[]));
  const sources=uniq(state.items.map(i=>i.source));
  
  console.log('[buildFilters] jurisdictions:', jurisdictions.length);
  console.log('[buildFilters] topics:', topics.length);
  console.log('[buildFilters] sources:', sources.length);
  
  const add=(sel,vals)=>{
    console.log('[buildFilters.add] Building #' + sel.id + ' with ' + vals.length + ' values');
    if (!sel) {
      console.error('[buildFilters.add] Element #' + sel.id + ' not found!');
      return;
    }
    
    // Clear and recreate All option
    sel.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All';
    sel.appendChild(allOpt);
    
    // Add new options
    for(const v of vals){
      const o=document.createElement('option');
      o.value=v; 
      o.textContent=v;
      sel.appendChild(o);
    }
    console.log('[buildFilters.add] #' + sel.id + ' complete: ' + sel.options.length + ' total options');
  };
  
  add(el('jurisdiction'),jurisdictions);
  add(el('topic'),topics);
  add(el('source'),sources);
  
  console.log('[buildFilters] DONE!');
}
 
function matches(it){
  // Category filter
  if(state.category && it.category !== state.category) return false;
  
  // Quick View preset filters based on category
  const cat = (it.category || '').toUpperCase();
  
  if (state.view === 'ENFORCEMENT') {
    if (cat !== 'ENFORCEMENT') return false;
  } else if (state.view === 'UPDATE') {
    if (cat !== 'UPDATE') return false;
  } else if (state.view === 'NEWS') {
    if (cat !== 'NEWS') return false;
  } else if (state.view === 'HIGH-RISK') {
    const riskScore = it.risk_score || 0;
    if (riskScore < 65) return false;
  }
  
  const q=state.q.trim().toLowerCase();
  if(q){
    const hay=[it.title,it.summary,it.source,it.keyTakeaway,it.businessImpact,(it.tags||[]).join(' '),(it.topics||[]).join(' ')].join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  if(state.jurisdiction && it.jurisdiction!==state.jurisdiction) return false;
  if(state.source && it.source!==state.source) return false;
  if(state.topic && !(it.topics||[]).includes(state.topic)) return false;
  return true;
}
 
function render(){
  const cards=el('cards');
  const empty=el('empty');
  const rows=state.items.filter(matches).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  empty.hidden=rows.length!==0;
  
  // Update active filters display
  updateActiveFilters();
  
  cards.innerHTML='';
  // Remove grid class when using grouped layout
  if (state.groupBy === 'none') {
    cards.classList.add('grid');
  } else {
    cards.classList.remove('grid');
  }

  if (rows.length === 0) return;

  if (state.groupBy === 'none') {
    // Flat list
    const fragment = document.createDocumentFragment();
    for (const it of rows) fragment.appendChild(buildCard(it));
    cards.appendChild(fragment);
  } else {
    // Grouped list
    const groups = {};
    for (const it of rows) {
      const keys = state.groupBy === 'region'
        ? [it.jurisdiction || 'Global']
        : (it.topics && it.topics.length > 0 ? it.topics : ['Uncategorised']);
      for (const key of keys) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(it);
      }
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
  }

  const insightsBtn = el('insights');
  if (insightsBtn) {
    insightsBtn.onclick = () => generateInsights(rows);
  }
}

function buildCard(it) {
    const card=document.createElement('article');
    card.className='card';
    card.style.animation = `slideInUp ${200 + Math.random() * 200}ms ease-out forwards`;

    const meta=document.createElement('div');
    meta.className='meta';

    const pill=(t,c='pill')=>{
      const s=document.createElement('span');
      s.className=c;
      s.textContent=t;
      return s;
    };
    
    // Add category pill
    const categoryClass = 'pill ' + (it.category || 'news');
    meta.appendChild(pill((it.category || 'news').toUpperCase(), categoryClass));
    
    // Lifecycle status badge
    if (it.status) {
      meta.appendChild(pill(it.status, 'pill status-' + it.status.toLowerCase().replace(/\s+/g,'-')));
    }
    
    // Add date and jurisdiction
    meta.appendChild(pill(it.date||'—','pill accent'));
    meta.appendChild(pill(it.jurisdiction||'—','pill jur'));
    
    // Add first 2 topics
    (it.topics||[]).slice(0,2).forEach(t=>meta.appendChild(pill(t)));

    const h=document.createElement('h4');
    h.textContent=it.title;

    card.appendChild(meta);

    // Key Takeaway callout — shown before narrative summary
    const takeaway = it.keyTakeaway || it.businessImpact;
    if (takeaway) {
      const ktBox = document.createElement('div');
      ktBox.className = 'key-takeaway';
      const ktLabel = document.createElement('div');
      ktLabel.className = 'key-takeaway-label';
      ktLabel.textContent = 'Key Takeaway for Compliance';
      const ktP = document.createElement('p');
      ktP.textContent = takeaway;
      ktBox.appendChild(ktLabel);
      ktBox.appendChild(ktP);
      card.appendChild(ktBox);
    }

    card.appendChild(h);

    const p=document.createElement('p');
    p.textContent=it.summary;
    card.appendChild(p);

    // Consultation deadline
    if (it.consultationDeadline) {
      const dl = document.createElement('div');
      dl.className = 'consultation-deadline';
      dl.textContent = '📅 Consultation closes: ' + it.consultationDeadline;
      card.appendChild(dl);
    }
    
    // Risk score with meter
    if(it.risk_score !== undefined){
      const riskBox = document.createElement('div');
      riskBox.className = 'risk-score';
      
      const label = document.createElement('span');
      label.className = 'risk-score-label';
      label.textContent = 'Risk:';
      
      const value = document.createElement('span');
      value.className = 'risk-score-value';
      value.textContent = it.risk_score;
      
      const meter = document.createElement('div');
      meter.className = 'risk-meter';
      
      const fill = document.createElement('div');
      fill.className = 'risk-meter-fill';
      fill.style.width = it.risk_score + '%';
      
      meter.appendChild(fill);
      
      riskBox.appendChild(label);
      riskBox.appendChild(value);
      riskBox.appendChild(meter);
      
      card.appendChild(riskBox);
    }
    
    // Render impact assessment if present
    if(it.impact_assessment){
      const ia = it.impact_assessment;
      const impactBox = document.createElement('div');
      impactBox.className = 'impact-box';
      
      let impactHTML = '<strong>Hubbard Calibration</strong>';
      impactHTML += `<em>${ia.scenario}</em>`;
      impactHTML += `<span>Probability: <strong>${ia.probability_percent}%</strong></span>`;
      impactHTML += `<span>Financial: $${ia.financial_loss_low_millions}M–${ia.financial_loss_likely_millions}M–${ia.financial_loss_high_millions}M</span>`;
      impactHTML += `<span>Reputational: ${ia.reputational_exposure}</span>`;
      impactHTML += `<span>Disruption: ${ia.regulatory_disruption_days}</span>`;
      impactHTML += `<span style="font-size:10px;">Confidence: ${ia.confidence_level}</span>`;
      
      impactBox.innerHTML = impactHTML;
      card.appendChild(impactBox);
    }
    
    const a=document.createElement('a');
    a.href=it.url;
    a.target='_blank';
    a.rel='noreferrer';
    a.textContent='Open source →';
    card.appendChild(a);

    // Original source URL
    const srcUrl = it.originalSourceUrl || it.source_url;
    if (srcUrl && srcUrl !== it.url && /^https?:\/\//i.test(srcUrl)) {
      const origA = document.createElement('a');
      origA.href = srcUrl;
      origA.target = '_blank';
      origA.rel = 'noreferrer';
      origA.className = 'original-source-link';
      origA.textContent = '📄 Original Regulatory Source →';
      origA.style.display = 'block';
      card.appendChild(origA);
    }
    
    const s=document.createElement('div');
    s.style.marginTop='10px';
    s.style.fontSize='11px';
    s.style.color='var(--muted)';
    s.textContent=it.source;
    card.appendChild(s);

    return card;
}

function renderRegulatoryTimeline(items) {
  /**
   * Timeline visualization of regulatory events using vis-timeline
   */
  const container = el('regulatoryTimeline');
  if (!container || !window.vis) return;
  
  // Remove skeleton loader
  const loader = el('timelineLoader');
  if (loader) loader.remove();
  
  // Prepare timeline data
  const timelineItems = items
    .filter(item => item.date)
    .slice(0, 50) // Limit to 50 most recent items
    .map((item, idx) => ({
      id: idx,
      content: `<div style="font-size:11px;padding:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title.substring(0, 40)}</div>`,
      start: new Date(item.date),
      className: `timeline-${item.category || 'news'}`,
      title: item.title
    }))
    .sort((a, b) => a.start - b.start);
  
  const dataset = new vis.DataSet(timelineItems);
  
  const options = {
    responsive: true,
    margin: {
      item: { horizontal: 0, vertical: 5 },
      axis: 10
    },
    orientation: {
      axis: 'bottom',
      item: 'bottom'
    },
    template: null,
    groupTemplate: null,
    cluster: { enable: false },
    horizontalScroll: true,
    zoomKey: 'ctrlKey',
    stack: false,
    timeaxis: {
      scale: 'month',
      step: 1
    }
  };
  
  container.innerHTML = '';
  new vis.Timeline(container, dataset, options);
}

function renderInsightRiskBubble(contentDiv, items) {
  /**
   * Render a risk bubble chart in the insights panel
   * X-axis: Probability | Y-axis: Financial Loss | Size: Risk Score
   */
  const canvasId = 'insightBubbleChart_' + Date.now();
  const bubbleHtml = `
    <div class="insights-section">
      <div class="insights-title">🫧 Risk Assessment Matrix (Probability vs Financial Impact)</div>
      <canvas id="${canvasId}" style="max-height:300px;"></canvas>
    </div>
  `;
  
  // Insert at beginning of content
  contentDiv.innerHTML = bubbleHtml + contentDiv.innerHTML;
  
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const bubbleData = items
      .filter(item => item.impact_assessment)
      .map(item => {
        const ia = item.impact_assessment;
        return {
          x: ia.probability_percent || 50,
          y: ia.financial_loss_likely_millions || 10,
          r: (item.risk_score || 50) / 3,
          label: item.title.substring(0, 30),
          category: item.category
        };
      });
    
    if (bubbleData.length === 0) return;
    
    const categoryColors = {
      enforcement: '#d32f2f',
      update: '#0056B3',
      news: '#00AEEF'
    };
    
    new Chart(canvas, {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Risk Scenarios',
          data: bubbleData,
          backgroundColor: bubbleData.map(d => categoryColors[d.category] || '#00AEEF'),
          borderColor: bubbleData.map(d => categoryColors[d.category] || '#00AEEF'),
          borderWidth: 2,
          opacity: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = bubbleData[context.dataIndex];
                return `Probability: ${item.x}% | Financial Risk: $${item.y}M`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: true, text: 'Probability of Impact (%)' },
            min: 0,
            max: 100
          },
          y: {
            title: { display: true, text: 'Financial Loss Range ($M)' },
            min: 0
          }
        }
      }
    });
  }, 100);
}

async function generateInsights(items) {
  /**
   * Generate AI insights using Claude API
   * Shows infographic and identifies related public sources
   */
  if (items.length === 0) {
    alert('No items to analyze. Please adjust your filters.');
    return;
  }
  
  const panel = el('insightsPanel');
  const content = el('insightsContent');
  
  panel.style.display = 'flex';
  content.innerHTML = '<div class="loading-spinner">Analyzing with Claude AI<br/><small>This may take a moment...</small></div>';
  
  // Render risk bubble chart while loading insights
  setTimeout(() => {
    renderInsightRiskBubble(content, items.slice(0, 10));
  }, 500);
  
  try {
    // Prepare summary of items for Claude
    const itemSummaries = items.slice(0, 5).map(it => ({
      title: it.title,
      category: it.category,
      summary: it.summary,
      jurisdiction: it.jurisdiction,
      topics: it.topics,
      date: it.date,
      risk_score: it.risk_score
    }));
    
    const prompt = `You are a regulatory intelligence analyst. Analyze these regulatory/enforcement items and provide:

1. A concise summary (2-3 sentences) of the key themes and implications
2. A list of 4-6 related public sources (regulatory bodies, news outlets, research institutes) that cover similar topics
3. Key takeaways for compliance teams

Items to analyze:
${JSON.stringify(itemSummaries, null, 2)}

Please format your response as JSON with these fields:
{
  "summary": "...",
  "key_takeaways": ["takeaway1", "takeaway2", ...],
  "related_sources": [
    {"name": "Source Name", "type": "Category", "description": "Brief description", "relevance": "how it's relevant"}
  ],
  "infographic_description": "Description of ideal infographic for this topic"
}`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sessionStorage.getItem('claude_api_key') || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Claude API key not configured or invalid. Click ⚙️ API Settings in the top bar to enter your key.');
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const responseText = data.content[0].text;
    
    // Parse JSON response from Claude
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      summary: responseText,
      key_takeaways: [],
      related_sources: [],
      infographic_description: 'Compliance dashboard'
    };
    
    // Render insights — all dynamic values are escaped to prevent raw HTML display
    let html = `
      <div class="insights-section">
        <div class="insights-title">📊 Analysis Summary</div>
        <div class="insights-summary">${escapeHtml(insights.summary)}</div>
      </div>
      
      <div class="insights-section">
        <div class="insights-title">🎯 Key Takeaways</div>
        <ul style="margin:8px 0;padding-left:20px;">
    `;
    
    for (const takeaway of insights.key_takeaways) {
      html += `<li style="margin:6px 0;color:var(--text);font-size:12px;">${escapeHtml(takeaway)}</li>`;
    }
    
    html += `</ul></div>`;
    
    if (insights.related_sources && insights.related_sources.length > 0) {
      html += `<div class="insights-section">
        <div class="insights-title">🔗 Related Public Sources</div>
        <div class="insights-sources">`;
      
      for (const source of insights.related_sources.slice(0, 6)) {
        html += `
          <div class="insights-source">
            <div class="insights-source-title">${escapeHtml(source.name)}</div>
            <div class="insights-source-desc"><strong>Type:</strong> ${escapeHtml(source.type)}</div>
            <div class="insights-source-desc">${escapeHtml(source.description)}</div>
            <div class="insights-source-desc"><em>Relevance:</em> ${escapeHtml(source.relevance)}</div>
          </div>
        `;
      }
      
      html += `</div></div>`;
    }
    

    
    content.innerHTML = html;
    
  } catch (err) {
    content.innerHTML = `<div class="insights-error">
      <strong>⚠️ Error:</strong> ${escapeHtml(err.message)}<br/>
      <small style="margin-top:8px;display:block;">To use Claude insights, click <strong>⚙️ API Settings</strong> in the top bar to enter your API key securely.</small>
    </div>`;
  }
}

function computeKPIs(items) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const total = items.length;
  
  const newItems = items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= thirtyDaysAgo;
  }).length;
  
  const enforcement = items.filter(item => item.category === 'enforcement').length;
  const updates = items.filter(item => item.category === 'update').length;
  const news = items.filter(item => item.category === 'news').length;
  
  const highRisk = items.filter(item => item.risk_score && item.risk_score >= 65).length;
  
  return {
    total,
    newItems30d: newItems,
    enforcement,
    updates,
    news,
    highRisk
  };
}

function generateSparklineData(items, category, days = 30) {
  /**
   * Generate 30-day trend data for sparklines
   * Returns array of daily counts
   */
  const now = new Date();
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    let count = 0;
    if (category === 'all') {
      count = items.filter(item => item.date === dateStr).length;
    } else {
      count = items.filter(item => item.date === dateStr && item.category === category).length;
    }
    data.push(count);
  }
  return data;
}

function renderSparkline(canvasId, data, color = '#00AEEF') {
  /**
   * Render a simple sparkline chart using Chart.js
   */
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: data.length}, (_, i) => i),
      datasets: [{
        label: '',
        data: data,
        borderColor: color,
        backgroundColor: color + '15',
        borderWidth: 1.5,
        fill: true,
        pointRadius: 0,
        tension: 0.4,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true }
      }
    }
  });
}

function paintKPIs(kpis, items) {
  // Use CountUp.js for animated counter cards, fallback if not available
  const animateCounter = (elementId, endValue) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (window.countUp && typeof window.countUp.CountUp === 'function') {
      const options = {
        duration: 1.2,
        useEasing: true,
        separator: ','
      };
      const counter = new window.countUp.CountUp(elementId, endValue, options);
      if (!counter.error) {
        counter.start();
      } else {
        el.textContent = endValue;
      }
    } else {
      // Fallback: just set the value directly
      el.textContent = endValue;
    }
  };

  animateCounter('kpiTotal', kpis.total);
  animateCounter('kpiEnforcement', kpis.enforcement);
  animateCounter('kpiUpdates', kpis.updates);
  animateCounter('kpiNews', kpis.news);
  animateCounter('kpiHighRisk', kpis.highRisk);
  animateCounter('kpiNew', kpis.newItems30d);
  
  // Generate sparklines with 30-day trend data
  if (items && items.length > 0) {
    setTimeout(() => {
      renderSparkline('sparklineTotal', generateSparklineData(items, 'all'), '#00AEEF');
      renderSparkline('sparklineEnforcement', generateSparklineData(items, 'enforcement'), '#d32f2f');
      renderSparkline('sparklineUpdates', generateSparklineData(items, 'update'), '#0056B3');
      renderSparkline('sparklineNews', generateSparklineData(items, 'news'), '#00AEEF');
      
      const highRiskData = generateSparklineData(items, 'all').map((_, i) => {
        const allData = generateSparklineData(items, 'all');
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split('T')[0];
        return items.filter(item => item.date === dateStr && item.risk_score >= 65).length;
      });
      renderSparkline('sparklineHighRisk', highRiskData, '#ff6b6b');
      renderSparkline('sparklineNew', generateSparklineData(items, 'all'), '#4ecdc4');
    }, 100);
  }
}

async function loadAndRenderBIS() {
  try {
    const res = await fetch('data/bis-monitoring.json', { cache: 'no-store' });
    const bisData = await res.json();
    
    // Update period display
    el('bisPeriod').textContent = `Monitoring Period: ${bisData.monitoring_period}`;
    
    // Render highlights
    const highlightsContainer = el('bisHighlights');
    highlightsContainer.innerHTML = '';
    for (const highlight of bisData.week.highlights) {
      const card = document.createElement('div');
      card.className = 'bis-highlight';
      
      const statusClass = `bis-status-${highlight.priority}`;
      let html = `<div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="bis-highlight-title">${highlight.title}</div>
        <span class="bis-status-badge ${statusClass}">${highlight.priority.toUpperCase()}</span>
      </div>`;
      
      const details = highlight.details;
      for (const [key, value] of Object.entries(details)) {
        if (key === 'risk_level') continue;
        const displayKey = key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1);
        html += `<p><strong>${displayKey}:</strong> ${value}</p>`;
      }
      
      card.innerHTML = html;
      highlightsContainer.appendChild(card);
    }
    
    // Render action items
    const actionsContainer = el('bisActionItems');
    actionsContainer.innerHTML = '';
    for (const item of bisData.action_items) {
      const actionEl = document.createElement('div');
      actionEl.className = `bis-action-item ${item.priority}`;
      actionEl.innerHTML = `
        <div class="bis-action-item-title">✓ ${item.title}</div>
        <div class="bis-action-item-desc">${item.description}</div>
        <div class="bis-action-item-deadline">Deadline: ${item.deadline}</div>
      `;
      actionsContainer.appendChild(actionEl);
    }
    
    // Render resources
    const resourcesContainer = el('bisResources');
    resourcesContainer.innerHTML = '';
    for (const resource of bisData.monitoring_resources) {
      const resourceEl = document.createElement('div');
      resourceEl.className = 'bis-resource';
      resourceEl.innerHTML = `
        <a href="${resource.url}" target="_blank" rel="noreferrer">${resource.name}</a>
        <div class="bis-resource-type">${resource.type}</div>
      `;
      resourcesContainer.appendChild(resourceEl);
    }
    
    // Set compliance note
    el('bisComplianceNote').textContent = bisData.compliance_notes;
    
    // Show BIS section button
    el('showBisBtn').style.display = 'block';
  } catch (err) {
    console.error('Error loading BIS data:', err);
  }
}

function initBISToggle() {
  const showBtn = el('showBisBtn');
  const bisSection = el('bisSection');
  const closeBtn = el('bisPanelToggle');
  
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      bisSection.style.display = 'block';
      showBtn.style.display = 'none';
      window.scrollTo({ top: bisSection.offsetTop - 100, behavior: 'smooth' });
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      bisSection.style.display = 'none';
      showBtn.style.display = 'block';
    });
  }
}

async function loadAndRenderExportControls() {
  try {
    const res = await fetch('data/export-controls.json', { cache: 'no-store' });
    const ecData = await res.json();
    
    // Render resources
    const resourcesContainer = el('exportControlsResources');
    resourcesContainer.innerHTML = '';
    for (const resource of ecData.export_control_resources) {
      const card = document.createElement('div');
      card.className = 'export-control-resource';
      card.innerHTML = `
        <div class="export-control-resource-title">${resource.name}</div>
        <div class="export-control-resource-org">${resource.organization}</div>
        <div class="export-control-resource-desc">${resource.description}</div>
        <div>
          <span class="export-control-resource-category">${resource.category.replace(/-/g, ' ').toUpperCase()}</span>
          <a href="${resource.url}" target="_blank" rel="noreferrer" style="margin-left: 8px;">Visit →</a>
        </div>
      `;
      resourcesContainer.appendChild(card);
    }
    
    // Render topics
    const topicsContainer = el('exportControlsTopics');
    topicsContainer.innerHTML = '';
    for (const topic of ecData.key_topics) {
      const tagEl = document.createElement('div');
      tagEl.className = 'topic-tag';
      tagEl.textContent = topic;
      topicsContainer.appendChild(tagEl);
    }
    
    // Set compliance note
    el('exportControlsComplianceNote').textContent = ecData.compliance_note;
    
    // Show Export Controls section button
    el('showExportControlsBtn').style.display = 'block';
  } catch (err) {
    console.error('Error loading export controls data:', err);
  }
}

function initExportControlsToggle() {
  const showBtn = el('showExportControlsBtn');
  const ecSection = el('exportControlsSection');
  const closeBtn = el('exportControlsPanelToggle');
  
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      ecSection.style.display = 'block';
      showBtn.style.display = 'none';
      window.scrollTo({ top: ecSection.offsetTop - 100, behavior: 'smooth' });
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      ecSection.style.display = 'none';
      showBtn.style.display = 'block';
    });
  }
}

async function loadAndRenderDataPrivacy() {
  try {
    const res = await fetch('data/data-privacy.json', { cache: 'no-store' });
    const dpData = await res.json();
    
    // Render sources
    const sourcesContainer = el('dataPrivacySources');
    sourcesContainer.innerHTML = '';
    for (const source of dpData.data_privacy_sources) {
      const card = document.createElement('div');
      card.className = 'data-privacy-source';
      
      let resourcesHtml = '';
      if (source.resources && source.resources.length > 0) {
        resourcesHtml = '<div class="data-privacy-resource-list">';
        for (const res of source.resources) {
          const resType = res.jurisdiction ? ` (${res.jurisdiction})` : '';
          resourcesHtml += `<div class="data-privacy-resource-item">
            <a href="${res.url}" target="_blank" rel="noreferrer">${res.name}</a>
            <div class="data-privacy-resource-type">${res.type.replace(/-/g, ' ').toUpperCase()}${resType}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }
      
      card.innerHTML = `
        <div class="data-privacy-source-org">🔐 ${source.organization}</div>
        <div class="data-privacy-source-desc">${source.description}</div>
        <div class="data-privacy-source-best"><strong>Best for:</strong> ${source.best_for}</div>
        ${resourcesHtml}
      `;
      sourcesContainer.appendChild(card);
    }
    
    // Render topics
    const topicsContainer = el('dataPrivacyTopics');
    topicsContainer.innerHTML = '';
    for (const topic of dpData.key_topics) {
      const tagEl = document.createElement('div');
      tagEl.className = 'topic-tag';
      tagEl.textContent = topic;
      topicsContainer.appendChild(tagEl);
    }
    
    // Set compliance note
    el('dataPrivacyComplianceNote').textContent = dpData.compliance_note;
    
    // Show Data Privacy section button
    el('showDataPrivacyBtn').style.display = 'block';
  } catch (err) {
    console.error('Error loading data privacy data:', err);
  }
}

function initDataPrivacyToggle() {
  const showBtn = el('showDataPrivacyBtn');
  const dpSection = el('dataPrivacySection');
  const closeBtn = el('dataPrivacyPanelToggle');
  
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      dpSection.style.display = 'block';
      showBtn.style.display = 'none';
      window.scrollTo({ top: dpSection.offsetTop - 100, behavior: 'smooth' });
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dpSection.style.display = 'none';
      showBtn.style.display = 'block';
    });
  }
}

async function loadAndRenderDataResidency() {
  try {
    const res = await fetch('data/data-residency.json', { cache: 'no-store' });
    const drData = await res.json();
    
    // Render sources
    const sourcesContainer = el('dataResidencySources');
    sourcesContainer.innerHTML = '';
    for (const source of drData.data_residency_sources) {
      const card = document.createElement('div');
      card.className = 'data-residency-source';
      
      let resourcesHtml = '';
      if (source.resources && source.resources.length > 0) {
        resourcesHtml = '<div class="data-residency-resource-list">';
        for (const res of source.resources) {
          const resType = res.jurisdiction ? ` (${res.jurisdiction})` : (res.scope ? ` (${res.scope})` : '');
          resourcesHtml += `<div class="data-residency-resource-item">
            <div class="data-residency-resource-org">${res.organization}</div>
            <a href="${res.url}" target="_blank" rel="noreferrer">${res.title}</a>
            <div class="data-residency-resource-type">${res.type.replace(/-/g, ' ').toUpperCase()}${resType}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }
      
      card.innerHTML = `
        <div class="data-residency-source-category">🏛️ ${source.name}</div>
        <div class="data-residency-source-desc">${source.description}</div>
        ${resourcesHtml}
      `;
      sourcesContainer.appendChild(card);
    }
    
    // Render topics
    const topicsContainer = el('dataResidencyTopics');
    topicsContainer.innerHTML = '';
    for (const topic of drData.key_topics) {
      const tagEl = document.createElement('div');
      tagEl.className = 'topic-tag';
      tagEl.textContent = topic;
      topicsContainer.appendChild(tagEl);
    }
    
    // Set compliance note
    el('dataResidencyComplianceNote').textContent = drData.compliance_note;
    
    // Show Data Residency section button
    el('showDataResidencyBtn').style.display = 'block';
  } catch (err) {
    console.error('Error loading data residency data:', err);
  }
}

function initDataResidencyToggle() {
  const showBtn = el('showDataResidencyBtn');
  const drSection = el('dataResidencySection');
  const closeBtn = el('dataResidencyPanelToggle');
  
  if (showBtn) {
    showBtn.addEventListener('click', () => {
      drSection.style.display = 'block';
      showBtn.style.display = 'none';
      window.scrollTo({ top: drSection.offsetTop - 100, behavior: 'smooth' });
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drSection.style.display = 'none';
      showBtn.style.display = 'block';
    });
  }
}

async function loadAndRenderResponsibleAI() {
  try {
    const res = await fetch('data/responsible-ai.json', { cache: 'no-store' });
    const raiData = await res.json();

    // Render source categories
    const categoriesContainer = el('responsibleAICategories');
    categoriesContainer.innerHTML = '';
    for (const source of raiData.responsible_ai_sources) {
      const card = document.createElement('div');
      card.className = 'responsible-ai-category';

      let resourcesHtml = '';
      if (source.resources && source.resources.length > 0) {
        resourcesHtml = '<div class="responsible-ai-resource-list">';
        for (const res of source.resources) {
          const scopeLabel = res.jurisdiction ? ` (${res.jurisdiction})` : (res.scope ? ` (${res.scope})` : '');
          resourcesHtml += `<div class="responsible-ai-resource-item">
            <div class="responsible-ai-resource-org">${escapeHtml(res.organization)}</div>
            <a href="${escapeHtml(res.url)}" target="_blank" rel="noreferrer">${escapeHtml(res.title)}</a>
            <div class="responsible-ai-resource-type">${escapeHtml(res.type.replace(/-/g, ' ').toUpperCase())}${escapeHtml(scopeLabel)}</div>
          </div>`;
        }
        resourcesHtml += '</div>';
      }

      card.innerHTML = `
        <div class="responsible-ai-category-name">🔹 ${escapeHtml(source.name)}</div>
        <div class="responsible-ai-category-desc">${escapeHtml(source.description)}</div>
        ${resourcesHtml}
      `;
      categoriesContainer.appendChild(card);
    }

    // Render key topics
    const topicsContainer = el('responsibleAITopics');
    topicsContainer.innerHTML = '';
    for (const topic of raiData.key_topics) {
      const tagEl = document.createElement('div');
      tagEl.className = 'topic-tag';
      tagEl.textContent = topic;
      topicsContainer.appendChild(tagEl);
    }

    // Set compliance note
    el('responsibleAIComplianceNote').textContent = raiData.compliance_note;

    // Show Responsible AI button
    el('showResponsibleAIBtn').style.display = 'block';
  } catch (err) {
    console.error('Error loading Responsible AI data:', err);
  }
}

function initResponsibleAIToggle() {
  const showBtn = el('showResponsibleAIBtn');
  const raiSection = el('responsibleAISection');
  const closeBtn = el('responsibleAIPanelToggle');

  if (showBtn) {
    showBtn.addEventListener('click', () => {
      raiSection.style.display = 'block';
      showBtn.style.display = 'none';
      window.scrollTo({ top: raiSection.offsetTop - 100, behavior: 'smooth' });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      raiSection.style.display = 'none';
      showBtn.style.display = 'block';
    });
  }
}

function renderEnforcementHeatmap(items) {
  /**
   * Cal-heatmap style calendar showing enforcement frequency by date
   */
  const container = el('enforcementHeatmap');
  if (!container) return;
  
  // Remove skeleton loader
  const loader = el('enforcementHeatmapLoader');
  if (loader) loader.remove();

  // Group items by date
  const dateMap = {};
  items.forEach(item => {
    if (item.category === 'enforcement') {
      dateMap[item.date] = (dateMap[item.date] || 0) + 1;
    }
  });
  
  // Get last 365 days
  const today = new Date();
  const maxCount = Math.max(1, ...Object.values(dateMap));
  const weeks = [];
  let currentWeek = [];
  
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const count = dateMap[dateStr] || 0;
    
    const intensity = Math.min(5, Math.floor((count / maxCount) * 5));
    const colors = ['#f0f0f0', '#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
    
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.cssText = `
      display:inline-block;
      width:14px;
      height:14px;
      margin:2px;
      border-radius:3px;
      background:${colors[intensity]};
      border:1px solid #e0e0e0;
      cursor:pointer;
      transition:all 200ms;
    `;
    cell.title = `${dateStr}: ${count} enforcement action${count !== 1 ? 's' : ''}`;
    cell.addEventListener('mouseenter', () => {
      cell.style.transform = 'scale(1.4)';
      cell.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    });
    cell.addEventListener('mouseleave', () => {
      cell.style.transform = 'scale(1)';
      cell.style.boxShadow = 'none';
    });
    
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      const weekDiv = document.createElement('div');
      weekDiv.style.cssText = 'margin-bottom:4px;';
      currentWeek.forEach(c => weekDiv.appendChild(c));
      weeks.push(weekDiv);
      currentWeek = [];
    }
  }
  
  if (currentWeek.length > 0) {
    const weekDiv = document.createElement('div');
    weekDiv.style.cssText = 'margin-bottom:4px;';
    currentWeek.forEach(c => weekDiv.appendChild(c));
    weeks.push(weekDiv);
  }
  
  container.innerHTML = `
    <div style="display:flex;gap:8px;align-items:flex-start;overflow-x:auto;padding:8px;">
      <div style="display:flex;flex-direction:column;gap:4px;white-space:nowrap;font-size:10px;color:var(--muted);">
        <div>Jan</div><div>Apr</div><div>Jul</div><div>Oct</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
  `;
  
  weeks.forEach(w => {
    const div = document.createElement('div');
    div.appendChild(w);
    container.appendChild(div);
  });
  
  container.innerHTML += '</div></div>';
}

function renderJurisdictionHeatmap(items) {
  /**
   * Animated jurisdiction risk intensity map
   * Shows enforcement intensity by jurisdiction
   */
  const container = el('jurisdictionHeatmap');
  if (!container || !window.L) return;
  
  // Remove skeleton loader
  const loader = el('jurisdictionHeatmapLoader');
  if (loader) loader.remove();
  
  // Initialize Leaflet map
  const mapId = 'jurisdictionMap_' + Date.now();
  container.innerHTML = `<div id="${mapId}" style="width:100%;height:100%;"></div>`;
  
  setTimeout(() => {
    const map = L.map(mapId).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
      style: { filter: 'grayscale(30%)' }
    }).addTo(map);
    
    // Count items by jurisdiction
    const jurisdictionCounts = {};
    const jurisdictionRisks = {};
    
    items.forEach(item => {
      const jur = item.jurisdiction || 'Global';
      jurisdictionCounts[jur] = (jurisdictionCounts[jur] || 0) + 1;
      
      const risk = item.risk_score || 50;
      jurisdictionRisks[jur] = (jurisdictionRisks[jur] || 0) + risk;
    });
    
    // Major jurisdiction coordinates
    const jurisdictionCoords = {
      'United States': [37.0902, -95.7129],
      'European Union': [54.5260, 15.2551],
      'United Kingdom': [55.3781, -3.4360],
      'UAE': [23.4241, 53.8478],
      'China': [35.8617, 104.1954],
      'Global': [20, 0]
    };
    
    // Add markers for each jurisdiction
    Object.entries(jurisdictionRisks).forEach(([jur, riskSum]) => {
      const count = jurisdictionCounts[jur] || 0;
      const avgRisk = count > 0 ? Math.round(riskSum / count) : 50;
      
      const coords = jurisdictionCoords[jur] || [0, 0];
      const color = avgRisk >= 65 ? '#d32f2f' : avgRisk >= 50 ? '#ff9800' : '#4caf50';
      const radius = Math.min(30, Math.max(8, count * 2));
      
      L.circleMarker(coords, {
        radius: radius,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.6,
        className: 'jur-marker'
      }).bindPopup(`
        <div style="font-size:12px;">
          <strong>${jur}</strong><br/>
          Items: ${count}<br/>
          Avg Risk: ${avgRisk}<br/>
          Category: ${avgRisk >= 65 ? 'High Risk' : avgRisk >= 50 ? 'Medium Risk' : 'Stable'}
        </div>
      `).addTo(map);
    });
  }, 100);
}

async function init(){
  // Show disclaimer banner on first visit
  showDisclaimer();
  
  console.log('[INIT] Fetching data/updates.json...');

  // Show KPI skeleton shimmer while loading
  ['kpiTotal','kpiEnforcement','kpiUpdates','kpiNews','kpiHighRisk','kpiNew'].forEach(id => {
    const kpiEl = el(id);
    if (kpiEl) kpiEl.innerHTML = '<span class="kpi-skeleton"></span>';
  });

  try {
    // Fetch with 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch('data/updates.json', { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch updates.json`);
    }
    const payload=await res.json();
    state.items=payload.items||[];
    console.log('[INIT] Loaded', state.items.length, 'items');
    
    const kpis = computeKPIs(state.items);
    console.log('[INIT] KPIs calculated:', kpis);
    
    paintKPIs(kpis, state.items);
    console.log('[INIT] KPIs painted');

    // Format "Last Updated" badge from data
    const rawDate = payload.generated_at || payload.lastUpdated || '';
    const formattedDate = rawDate ? rawDate.split('T')[0] : '';
    el('lastUpdated').textContent = formattedDate
      ? '🕐 Last updated: ' + formattedDate
      : '⚠️ Update status unknown';
    console.log('[INIT] lastUpdated set to:', formattedDate);
    
    console.log('[INIT] Before buildFilters, state.items:', state.items.length);
    buildFilters();
    console.log('[INIT] Filters built - jurisdiction:', el('jurisdiction').options.length, 'options');
    
    render();
    console.log('[INIT] Main grid rendered with', state.items.length, 'items');
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const msg = isTimeout ? 'Request timed out after 8 seconds' : err.message;
    console.error('[INIT] Error loading main data:', msg);
    el('lastUpdated').textContent = '⚠️ Data unavailable — check update pipeline';

    // Clear KPI skeletons with explicit error state
    ['kpiTotal','kpiEnforcement','kpiUpdates','kpiNews','kpiHighRisk','kpiNew'].forEach(id => {
      const kpiEl = el(id);
      if (kpiEl) kpiEl.textContent = '—';
    });

    // Show error in empty state
    const empty = el('empty');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <p class="empty-title">Data unavailable — check update pipeline</p>
        <p class="empty-subtitle">${escapeHtml(msg)}</p>
      `;
    }

    // Show error state in viz containers
    const vizError = '<div class="viz-error">⚠️ Data unavailable — visualisation cannot be rendered</div>';
    ['enforcementHeatmap','jurisdictionHeatmap','regulatoryTimeline'].forEach(id => {
      const c = el(id);
      if (c) c.innerHTML = vizError;
    });
  }
  
  // Render visualizations with error handling
  try {
    renderEnforcementHeatmap(state.items);
  } catch (e) {
    console.warn('Enforcement heatmap failed:', e);
    const c = el('enforcementHeatmap');
    if (c) c.innerHTML = '<div class="viz-error">⚠️ Enforcement heatmap failed to render</div>';
  }
  try {
    renderJurisdictionHeatmap(state.items);
  } catch (e) {
    console.warn('Jurisdiction heatmap failed:', e);
    const c = el('jurisdictionHeatmap');
    if (c) c.innerHTML = '<div class="viz-error">⚠️ Jurisdiction map failed to render</div>';
  }
  try {
    renderRegulatoryTimeline(state.items);
  } catch (e) {
    console.warn('Regulatory timeline failed:', e);
    const c = el('regulatoryTimeline');
    if (c) c.innerHTML = '<div class="viz-error">⚠️ Timeline failed to render</div>';
  }
 
  el('q').addEventListener('input',e=>{state.q=e.target.value;updateActiveFilters();render();});
  el('jurisdiction').addEventListener('change',e=>{state.jurisdiction=e.target.value;updateActiveFilters();render();});
  el('topic').addEventListener('change',e=>{state.topic=e.target.value;updateActiveFilters();render();});
  el('source').addEventListener('change',e=>{state.source=e.target.value;updateActiveFilters();render();});
  el('reset').addEventListener('click',()=>{
    state.q='';state.jurisdiction='';state.topic='';state.source='';state.view='ALL';
    el('q').value='';el('jurisdiction').value='';el('topic').value='';el('source').value='';
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="ALL"]').classList.add('active');
    updateActiveFilters();
    render();
  });
  
  // Quick view buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.getAttribute('data-view') || 'ALL';
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateActiveFilters();
      render();
    });
  });

  // Generate Report (CSV export of currently filtered rows)
  const exportBtn = el('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const rows = state.items.filter(matches).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      if (rows.length === 0) { alert('No items to export with the current filters.'); return; }
      download('regulatory-report-' + new Date().toISOString().split('T')[0] + '.csv', toCSV(rows), 'text/csv;charset=utf-8;');
    });
  }

  // Alert subscription: save current filter state in localStorage
  const alertBtn = el('alertBtn');
  const alertNote = el('alertSavedNote');
  if (alertBtn) {
    alertBtn.addEventListener('click', () => {
      const filterState = {
        q: state.q,
        jurisdiction: state.jurisdiction,
        topic: state.topic,
        source: state.source,
        view: state.view,
        savedAt: new Date().toISOString()
      };
      const alerts = JSON.parse(localStorage.getItem('savedAlerts') || '[]');
      alerts.push(filterState);
      localStorage.setItem('savedAlerts', JSON.stringify(alerts));
      if (alertNote) {
        alertNote.textContent = '✅ Filter alert saved — your preferences are stored for next visit.';
        alertNote.classList.add('visible');
        setTimeout(() => alertNote.classList.remove('visible'), 4000);
      }
    });
  }
  
  // Load BIS Affiliate Rules monitoring data
  try {
    await loadAndRenderBIS();
    initBISToggle();
  } catch (err) {
    console.warn('[INIT] Error loading BIS data:', err);
  }
  
  // Load Export Controls data
  try {
    await loadAndRenderExportControls();
    initExportControlsToggle();
  } catch (err) {
    console.warn('[INIT] Error loading Export Controls data:', err);
  }
  
  // Load Data Privacy data
  try {
    await loadAndRenderDataPrivacy();
    initDataPrivacyToggle();
  } catch (err) {
    console.warn('[INIT] Error loading Data Privacy data:', err);
  }
  
  // Load Data Residency data
  try {
    await loadAndRenderDataResidency();
    initDataResidencyToggle();
  } catch (err) {
    console.warn('[INIT] Error loading Data Residency data:', err);
  }

  // Load Responsible AI data
  try {
    await loadAndRenderResponsibleAI();
    initResponsibleAIToggle();
  } catch (err) {
    console.warn('[INIT] Error loading Responsible AI data:', err);
  }
  
  // Close insights panel
  el('closeInsights').addEventListener('click', () => {
    el('insightsPanel').style.display = 'none';
  });
  
  // Close insights when clicking outside
  el('insightsPanel').addEventListener('click', (e) => {
    if (e.target === el('insightsPanel')) {
      el('insightsPanel').style.display = 'none';
    }
  });
}

// Basic HTML sanitizer + fallback
function sanitizeAndRender(rawContent) {
  if (!rawContent) return "";

  // Always strip to plain text via a temporary DOM element to avoid
  // regex-based sanitization bypasses and XSS risks
  const temp = document.createElement("div");
  temp.innerHTML = rawContent;
  return (temp.textContent || temp.innerText || "").trim();
}

function escapeHtml(str) {
  if (!str) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

function renderInsight(containerId, update) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let content = sanitizeAndRender(update.description);

  if (!content) {
    content = "Details unavailable. Please refer to the original source.";
  }

  // Validate source_url to allow only safe http/https URLs
  const safeUrl = /^https?:\/\//i.test(update.source_url || "") ? update.source_url : "#";

  container.innerHTML = `
    <h3>${escapeHtml(update.title)}</h3>
    <p class="meta">
      ${escapeHtml(new Date(update.date).toDateString())} · ${escapeHtml(update.jurisdiction)}
    </p>
    <p>${escapeHtml(content)}</p>
    <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">View official source</a>
  `;
}

function filterByCategory(updates, category) {
  const results = updates.filter(u => u.category === category);

  if (results.length === 0) {
    return [{
      title: "No Responsible AI regulatory updates today",
      description: "",
      date: new Date().toISOString(),
      jurisdiction: "",
      source_url: "#"
    }];
  }

  return results;
}

function renderRiskBadges(update) {
  const badges = [];
  if (update.severity) {
    badges.push(`<span class="badge severity-${escapeHtml(update.severity.toLowerCase())}">${escapeHtml(update.severity)}</span>`);
  }
  if (update.likelihood) {
    badges.push(`<span class="badge severity-${escapeHtml(update.likelihood.toLowerCase())}">${escapeHtml(update.likelihood)}</span>`);
  }
  return badges.join(" ");
}

// Initialize immediately since script is at end of <body>
// This ensures DOM is fully loaded before init() runs
(async () => {
  try {
    console.log('[APP INIT] Starting application...');
    await init();
    console.log('[APP INIT] Application initialized successfully');
  } catch (err) {
    console.error('[APP INIT] Fatal error:', err);
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
      lastUpdated.textContent = '⚠️ Data unavailable — check update pipeline';
    }
    const empty = document.getElementById('empty');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <p class="empty-title">Data unavailable — check update pipeline</p>
        <p class="empty-subtitle">${(err.message || 'Unknown error')}</p>
      `;
    }
  }
})();
