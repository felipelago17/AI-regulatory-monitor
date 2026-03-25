const state = { items: [], q: '', jurisdiction: '', topic: '', source: '', view: 'ALL' };;
const el=id=>document.getElementById(id);
const uniq=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y));
 
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
  // Quick View preset filters
  const jur = ((it.jurisdiction || '') + ' ' + (it.region || '')).toUpperCase();
  const topicsText = (it.topics || []).join(' ').toLowerCase();
  const tagsText = (it.tags || []).join(' ').toLowerCase();
  const titleText = (it.title || '').toLowerCase();
  const summaryText = (it.summary || '').toLowerCase();
 
  if (state.view === 'UAE') {
    if (!jur.includes('UAE')) return false;
  }
 
  if (state.view === 'UK') {
    if (!jur.includes('UK') && !jur.includes('UNITED KINGDOM')) return false;
  }
 
  if (state.view === 'AI') {
    const hay = [topicsText, tagsText, titleText, summaryText].join(' ');
    // Match broad AI governance content
    if (!(hay.includes(' ai ') || hay.includes('artificial intelligence') || hay.includes('responsible ai') || hay.includes('ai governance'))) {
      return false;
    }
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
 
    meta.appendChild(pill(it.date||'—','pill accent'));
    meta.appendChild(pill(it.jurisdiction||'—','pill jur'));
    (it.topics||[]).slice(0,3).forEach(t=>meta.appendChild(pill(t)));
 
    const h=document.createElement('h4');
    h.textContent=it.title;
 
    const p=document.createElement('p');
    p.textContent=it.summary;
 
    const a=document.createElement('a');
    a.href=it.url;
    a.target='_blank';
    a.rel='noreferrer';
    a.textContent='Open source →';
 
    const s=document.createElement('div');
    s.style.marginTop='10px';
    s.style.fontSize='11px';
    s.style.color='rgba(169,184,218,.8)';
    s.textContent=it.source;
 
    card.appendChild(meta);
    card.appendChild(h);
    card.appendChild(p);
    
    // Render impact assessment if present
    if(it.impact_assessment){
      const ia = it.impact_assessment;
      const riskBox = document.createElement('div');
      riskBox.style.cssText = 'margin-top:12px;padding:10px;background:rgba(255,59,92,.08);border:1px solid rgba(255,59,92,.2);border-radius:8px;font-size:11px;';
      
      let riskHTML = '<strong style="color:#ffd6df;">Impact Assessment (Hubbard calibration)</strong><br/>';
      riskHTML += `<em style="color:rgba(255,214,223,.7);">${ia.scenario}</em><br/>`;
      riskHTML += `<span style="color:#a9b8da;">Probability: ${ia.probability_percent}%</span><br/>`;
      riskHTML += `<span style="color:#a9b8da;">Financial loss: $${ia.financial_loss_low_millions}–${ia.financial_loss_likely_millions}–${ia.financial_loss_high_millions}M</span><br/>`;
      riskHTML += `<span style="color:#a9b8da;">Reputational: ${ia.reputational_exposure}</span><br/>`;
      riskHTML += `<span style="color:#a9b8da;">Disruption: ${ia.regulatory_disruption_days} days</span><br/>`;
      riskHTML += `<span style="color:rgba(169,184,218,.6);font-size:10px;">Confidence: ${ia.confidence_level}</span>`;
      
      riskBox.innerHTML = riskHTML;
      card.appendChild(riskBox);
    }
    
    card.appendChild(a);
    card.appendChild(s);
 
    cards.appendChild(card);
  }
 
  el('export').onclick=()=>download('ai-regulatory-monitor.csv',toCSV(rows),'text/csv');
}

function computeKPIs(items) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const total = items.length;
  
  const newItems = items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= thirtyDaysAgo;
  }).length;
  
  const highImpact = items.filter(item => item.impact === 'high' || item.impact === 'critical').length;
  
  const uaeItems = items.filter(item => {
    const jur = (item.jurisdiction || '').toUpperCase();
    const region = (item.region || '').toUpperCase();
    return jur.includes('UAE') || region.includes('UAE');
  }).length;
  
  const ukItems = items.filter(item => {
    const jur = (item.jurisdiction || '').toUpperCase();
    return jur.includes('UK') || jur.includes('UNITED KINGDOM');
  }).length;
  
  const aiItems = items.filter(item => {
    const topicsText = (item.topics || []).join(' ').toLowerCase();
    const tagsText = (item.tags || []).join(' ').toLowerCase();
    const titleText = (item.title || '').toLowerCase();
    const summaryText = (item.summary || '').toLowerCase();
    const hay = [topicsText, tagsText, titleText, summaryText].join(' ');
    return hay.includes('ai') || hay.includes('artificial intelligence') || hay.includes('responsible ai') || hay.includes('ai governance');
  }).length;
  
  return {
    total,
    newItems30d: newItems,
    highImpact,
    uae: uaeItems,
    uk: ukItems,
    ai: aiItems
  };
}

function paintKPIs(kpis) {
  el('kpiTotal').textContent = kpis.total;
  el('kpiNew').textContent = kpis.newItems30d;
  el('kpiHigh').textContent = kpis.highImpact;
  el('kpiUAE').textContent = kpis.uae;
  el('kpiUK').textContent = kpis.uk;
  el('kpiAI').textContent = kpis.ai;
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
    state.q='';state.jurisdiction='';state.topic='';state.source='';
    el('q').value='';el('jurisdiction').value='';el('topic').value='';el('source').value='';
    render();
  });
}
 
init(// Quick view buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.getAttribute('data-view') || 'ALL';
 
      // Highlight active button
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
 
      render();
    });
  })).catch(err=>{
  console.error(err);
  el('lastUpdated').textContent='Failed to load data.';
});
