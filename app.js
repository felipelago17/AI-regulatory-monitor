const state={items:[],q:'',jurisdiction:'',topic:'',source:''};
const el=id=>document.getElementById(id);
const uniq=a=>[...new Set(a)].filter(Boolean).sort((x,y)=>x.localeCompare(y));
 
function toCSV(rows){
  const esc=v=>{
    const s=String(v??'');
    return /[\",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
  };
  const headers=['date','jurisdiction','topics','title','summary','source','url','tags'];
  const lines=[headers.join(',')];
  for(const r of rows){
    lines.push(headers.map(h=>{
      const v=Array.isArray(r[h])?r[h].join(' | '):r[h];
      return esc(v);
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
    card.appendChild(a);
    card.appendChild(s);
 
    cards.appendChild(card);
  }
 
  el('export').onclick=()=>download('aiq-regulatory-monitor.csv',toCSV(rows),'text/csv');
}
 
async function init(){
  const res=await fetch('updates.json',{cache:'no-store'});
  const payload=await res.json();
  state.items=payload.items||[];
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
 
init().catch(err=>{
  console.error(err);
  el('lastUpdated').textContent='Failed to load data.';
});
