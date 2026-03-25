const state = { items: [], q: '', jurisdiction: '', topic: '', source: '', view: 'ALL', category: '' };;
const el=id=>document.getElementById(id);
const uniq=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y));

function generateInfographicSVG(item) {
  /**
   * Generate a clean infographic SVG summarizing key takeaways
   * Matches the Corporate Tech blue palette
   */
  const risk = item.risk_score || 50;
  const ia = item.impact_assessment;
  const prob = ia ? ia.probability_percent : 0;
  const repExp = ia ? (ia.reputational_exposure?.includes('High') || ia.reputational_exposure?.includes('Critical') ? 'High' : 'Medium') : 'Unknown';
  
  // Determine severity color
  let sevColor = '#00AEEF'; // Electric blue - default
  if (risk < 40) sevColor = '#0056B3'; // Cobalt - low
  else if (risk < 65) sevColor = '#00AEEF'; // Electric - medium
  else sevColor = '#d32f2f'; // Red - high

  const svg = `<svg width="200" height="120" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="background:linear-gradient(135deg,#F0F4F8,#ffffff);border-radius:8px;">
    <!-- Glass effect background -->
    <rect width="200" height="120" fill="rgba(255,255,255,0.15)" rx="8"/>
    
    <!-- Title -->
    <text x="100" y="16" font-size="11" font-weight="700" text-anchor="middle" fill="#002D62">Risk Overview</text>
    
    <!-- Risk Meter -->
    <rect x="15" y="24" width="170" height="4" fill="#E0E7F1" rx="2"/>
    <rect x="15" y="24" width="${170 * risk / 100}" height="4" fill="${sevColor}" rx="2"/>
    <text x="190" y="33" font-size="10" font-weight="700" fill="#0056B3">${risk}</text>
    
    <!-- Probability -->
    <circle cx="35" cy="55" r="18" fill="rgba(0,86,179,0.08)" stroke="#0056B3" stroke-width="2"/>
    <text x="35" y="52" font-size="12" font-weight="700" text-anchor="middle" fill="#0056B3">${prob}%</text>
    <text x="35" y="70" font-size="9" text-anchor="middle" fill="#002D62">Probability</text>
    
    <!-- Reputational Impact -->
    <circle cx="100" cy="55" r="18" fill="rgba(0,174,239,0.08)" stroke="#00AEEF" stroke-width="2"/>
    <text x="100" y="59" font-size="10" text-anchor="middle" fill="#0056B3" font-weight="600">${repExp.charAt(0)}</text>
    <text x="100" y="70" font-size="9" text-anchor="middle" fill="#002D62">Rep Risk</text>
    
    <!-- Category Badge -->
    <rect x="165" y="44" width="20" height="22" fill="${item.category === 'enforcement' ? '#d32f2f' : item.category === 'update' ? '#0056B3' : '#00AEEF'}" rx="3"/>
    <text x="175" y="59" font-size="14" font-weight="700" text-anchor="middle" fill="white">${item.category?.charAt(0).toUpperCase() || 'N'}</text>
  </svg>`;

  return svg;
}

 
function toCSV(rows){
  const esc=v=>{
    const s=String(v??'');
    return /[\",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
  };
  const headers=['date','jurisdiction','topics','title','summary','source','url','tags','impact_scenario','probability_percent','financial_loss_range','reputational_exposure','regulatory_disruption','confidence_level'];
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
  const jurisdictions=uniq(state.items.map(i=>i.jurisdiction));
  const topics=uniq(state.items.flatMap(i=>i.topics||[]));
  const sources=uniq(state.items.map(i=>i.source));
  const add=(sel,vals)=>{
    const first=sel.querySelector('option[value=""]');
    sel.innerHTML='';
    sel.appendChild(first);
    for(const v of vals){
      const o=document.createElement('option');
      o.value=v; o.textContent=v;
      sel.appendChild(o);
    }
  };
  add(el('jurisdiction'),jurisdictions);
  add(el('topic'),topics);
  add(el('source'),sources);
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
    const hay=[it.title,it.summary,it.source,(it.tags||[]).join(' '),(it.topics||[]).join(' ')].join(' ').toLowerCase();
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
  cards.innerHTML='';
  const rows=state.items.filter(matches).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  empty.hidden=rows.length!==0;
 
  for(const it of rows){
    const card=document.createElement('article');
    card.className='card';
 
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
    
    // Add date and jurisdiction
    meta.appendChild(pill(it.date||'—','pill accent'));
    meta.appendChild(pill(it.jurisdiction||'—','pill jur'));
    
    // Add first 2 topics
    (it.topics||[]).slice(0,2).forEach(t=>meta.appendChild(pill(t)));
 
    const h=document.createElement('h4');
    h.textContent=it.title;
 
    const p=document.createElement('p');
    p.textContent=it.summary;
 
    card.appendChild(meta);
    card.appendChild(h);
    card.appendChild(p);
    
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
      
      // Add infographic
      const infoDom = document.createElement('div');
      infoDom.style.marginTop = '10px';
      infoDom.innerHTML = generateInfographicSVG(it);
      card.appendChild(infoDom);
    }
    
    const a=document.createElement('a');
    a.href=it.url;
    a.target='_blank';
    a.rel='noreferrer';
    a.textContent='Open source →';
    card.appendChild(a);
    
    const s=document.createElement('div');
    s.style.marginTop='10px';
    s.style.fontSize='11px';
    s.style.color='var(--muted)';
    s.textContent=it.source;
    card.appendChild(s);
 
    cards.appendChild(card);
  }
 
  el('insights').onclick=()=>generateInsights(rows);
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
        'x-api-key': localStorage.getItem('claude_api_key') || '',
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
        throw new Error('Claude API key not configured. Set your API key in browser console: localStorage.setItem("claude_api_key", "sk-...")');
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
    
    // Render insights
    let html = `
      <div class="insights-section">
        <div class="insights-title">📊 Analysis Summary</div>
        <div class="insights-summary">${insights.summary}</div>
      </div>
      
      <div class="insights-section">
        <div class="insights-title">🎯 Key Takeaways</div>
        <ul style="margin:8px 0;padding-left:20px;">
    `;
    
    for (const takeaway of insights.key_takeaways) {
      html += `<li style="margin:6px 0;color:var(--text);font-size:12px;">${takeaway}</li>`;
    }
    
    html += `</ul></div>`;
    
    if (insights.related_sources && insights.related_sources.length > 0) {
      html += `<div class="insights-section">
        <div class="insights-title">🔗 Related Public Sources</div>
        <div class="insights-sources">`;
      
      for (const source of insights.related_sources.slice(0, 6)) {
        html += `
          <div class="insights-source">
            <div class="insights-source-title">${source.name}</div>
            <div class="insights-source-desc"><strong>Type:</strong> ${source.type}</div>
            <div class="insights-source-desc">${source.description}</div>
            <div class="insights-source-desc"><em>Relevance:</em> ${source.relevance}</div>
          </div>
        `;
      }
      
      html += `</div></div>`;
    }
    
    if (insights.infographic_description) {
      html += `<div class="insights-section">
        <div class="insights-title">📈 Recommended Infographic</div>
        <div class="insights-infographic">
          <div style="padding:16px;background:rgba(0,174,239,.05);border-radius:8px;">
            <strong style="color:var(--navy);">Infographic Theme:</strong>
            <p style="margin:8px 0;color:var(--text);font-size:12px;">${insights.infographic_description}</p>
            <p style="margin:8px 0;color:var(--muted);font-size:11px;">✓ Visual representation recommended</p>
          </div>
        </div>
      </div>`;
    }
    
    content.innerHTML = html;
    
  } catch (err) {
    content.innerHTML = `<div class="insights-error">
      <strong>⚠️ Error:</strong> ${err.message}<br/>
      <small style="margin-top:8px;display:block;">To use Claude insights, set your API key:<br/>
      <code style="background:#f0f0f0;padding:4px 6px;border-radius:3px;font-size:11px;">localStorage.setItem('claude_api_key', 'sk-...')</code></small>
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

function paintKPIs(kpis) {
  el('kpiTotal').textContent = kpis.total;
  el('kpiEnforcement').textContent = kpis.enforcement;
  el('kpiUpdates').textContent = kpis.updates;
  el('kpiNews').textContent = kpis.news;
  el('kpiHighRisk').textContent = kpis.highRisk;
  el('kpiNew').textContent = kpis.newItems30d;
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
 
async function init(){
  const res = await fetch('data/updates.json', { cache: 'no-store' });
  const payload=await res.json();
  state.items=payload.items||[];
  paintKPIs(computeKPIs(state.items));
  el('lastUpdated').textContent='Data generated: '+(payload.generated_at||'—');
  buildFilters();
  render();
 
  el('q').addEventListener('input',e=>{state.q=e.target.value;render();});
  el('jurisdiction').addEventListener('change',e=>{state.jurisdiction=e.target.value;render();});
  el('topic').addEventListener('change',e=>{state.topic=e.target.value;render();});
  el('source').addEventListener('change',e=>{state.source=e.target.value;render();});
  el('reset').addEventListener('click',()=>{
    state.q='';state.jurisdiction='';state.topic='';state.source='';state.view='ALL';
    el('q').value='';el('jurisdiction').value='';el('topic').value='';el('source').value='';
    document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="ALL"]').classList.add('active');
    render();
  });
  
  // Quick view buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.getAttribute('data-view') || 'ALL';
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
  
  // Load BIS Affiliate Rules monitoring data
  await loadAndRenderBIS();
  initBISToggle();
  
  // Load Export Controls data
  await loadAndRenderExportControls();
  initExportControlsToggle();
  
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
 
init().catch(err=>{
  console.error(err);
  el('lastUpdated').textContent='Failed to load data.';
});
