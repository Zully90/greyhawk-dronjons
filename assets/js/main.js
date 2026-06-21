// main.js — replaces inline script in index.html, uses state module and thresholds
import * as state from './state.js';
import { computeMaxSospiri, beaconFor } from './thresholds.js';

// determine session from query param
function sessionFromURL() {
  const p = new URLSearchParams(window.location.search);
  return p.get('session') || 'default';
}

let sN = 0;

function q(id){return document.getElementById(id);}

function cS(delta){
  const mx = computeMaxSospiri(Number(q('lvl').value), Number(q('des').value));
  const cap = mx === Infinity ? Math.max(sN + 20, 20) : mx;
  sN = Math.max(0, Math.min(cap, sN + delta));
  applyStateToStore();
}

function applyStateToStore(){
  const data = { sospiri: sN, des: Number(q('des').value) || 1, livello: Number(q('lvl').value) || 1 };
  state.setState(data);
}

function render(stateObj){
  if(!stateObj) return;
  sN = stateObj.sospiri || 0;
  q('des').value = stateObj.des || 1;
  q('lvl').value = stateObj.livello || 1;
  // update UI
  q('sN').textContent = sN;
  const mx = computeMaxSospiri(Number(q('lvl').value), Number(q('des').value));
  q('sMax').textContent = mx===Infinity? '∞' : mx;
  const pipC = q('pips'); pipC.innerHTML='';
  const total = mx===Infinity? Math.max(sN,8) : Math.min(mx,14);
  for(let i=0;i<total;i++){
    const p = document.createElement('div'); p.className='pip';
    if(i<sN){ p.style.background='#378ADD'; p.style.borderColor='#378ADD'; }
    pipC.appendChild(p);
  }
  const sus = q('sus'); if(sN>0){ sus.style.display='flex'; q('susV').textContent = `−${sN} ai TS Follia e Percezione`; } else sus.style.display='none';
  const b = beaconFor(sN);
  const bc = q('bcard'); bc.style.background = b.bg; bc.style.borderColor = 'transparent';
  q('blvl').textContent = b.lv; q('blvl').style.color = b.tcol; q('bico').style.color = b.tcol;
  const bb = q('bbadge'); bb.style.background = b.tcol; bb.style.color='#111'; bb.textContent = sN + ' Sospiro' + (sN!==1?'i':'');
  q('bdesc').textContent = b.d; q('bdesc').style.color = b.tcol;
  // actions
  const qa = q('qa'); qa.innerHTML='';
  const acts = [
    {lbl:'Impeto Predatorio −1',minLv:3,spend:1},
    {lbl:'Velo di Ombre −2',minLv:5,spend:2},
    {lbl:'Interrogare −1',minLv:5,spend:1},
    {lbl:'Nutrire la Lama −tutto',minLv:5,spend:sN},
    {lbl:'Liberare il Gregge −tutto',minLv:9,spend:sN,minSpend:3},
    {lbl:'Forma Predatore −3',minLv:13,spend:3},
    {lbl:'Patto col Gregge −4',minLv:13,spend:4},
  ];
  const l = Number(q('lvl').value)||1;
  acts.forEach(a=>{
    if(l>=a.minLv){
      const btn = document.createElement('button'); btn.textContent=a.lbl; btn.style.fontSize='12px';
      const canDo = sN>=a.spend && (a.minSpend===undefined||sN>=a.minSpend);
      btn.disabled = !canDo;
      btn.onclick = ()=>{ cS(-a.spend); };
      qa.appendChild(btn);
    }
  });
  buildSoglie(l);
}

function buildSoglie(l){
  const sl = q('slist'); sl.innerHTML='';
  const DATA = window.__DRONJONS_DATA__ || [];
  DATA.forEach((s, idx)=>{
    const unlocked = l>=s.minLv;
    const card = document.createElement('div'); card.className='card';
    const head = document.createElement('div'); head.className='sh';
    head.innerHTML = `
      <div style="width:4px;height:30px;border-radius:2px;background:${unlocked?s.col:'#333'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:500;color:${unlocked?'var(--t1)':'var(--t3)'};">${s.name}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:1px;">${s.lv} · ${s.cap}</div>
      </div>
      <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${unlocked?s.col+'20':'#2a2825'};color:${unlocked?s.col:'var(--t3)'};">${unlocked?'Sbloccata':'Lv '+s.minLv}</span>
      <i class="ti ti-chevron-down" style="font-size:15px;color:var(--t3);transition:transform .2s;flex-shrink:0;"></i>`;
    const body = document.createElement('div'); body.style.cssText='padding:0 14px 14px;display:none;';
    if(unlocked){
      let html=''; s.ab.forEach(a=>{ html+=`<div style="padding:7px 0;border-top:.5px solid var(--border);"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><i class="ti ${a.ico}" style="font-size:15px;color:${s.col};" aria-hidden="true"></i><span style="font-size:14px;font-weight:500;color:var(--t1);">${a.n}</span><span class="atag">${a.tag}</span>${a.cost?`<span style="font-size:11px;padding:1px 6px;border-radius:4px;background:${s.col}20;color:${s.col};">${a.cost}</span>`:''}</div>${a.trigger?`<div style="font-size:12px;color:var(--t3);margin-top:3px;font-style:italic;line-height:1.4;">Trigger: ${a.trigger}</div>`:''}<div style="font-size:13px;color:var(--t2);margin-top:3px;line-height:1.55;">${a.t}</div></div>` });
      s.dr.forEach(d=>{ html+=`<div style="margin-top:8px;padding:8px 10px;border-radius:var(--border-radius-md);background:var(--warn-bg);border-left:3px solid var(--warn-border);"><div style="font-size:13px;font-weight:500;color:var(--warn-fg);display:flex;align-items:center;gap:5px;"><i class="ti ti-alert-triangle" style="font-size:13px;" aria-hidden="true"></i>${d.n}</div><div style="font-size:13px;color:var(--t2);margin-top:2px;line-height:1.45;">${d.t}</div></div>` });
      body.innerHTML = html;
    } else {
      body.innerHTML = `<div style="font-size:13px;color:var(--t3);padding:8px 0;">Disponibile al livello ${s.minLv}.</div>`;
    }
    let open = (idx===0);
    const toggle = ()=>{ open=!open; body.style.display=open?'block':'none'; }
    head.addEventListener('click', toggle);
    if(open) body.style.display='block';
    card.appendChild(head); card.appendChild(body); sl.appendChild(card);
  });
}

// wire up initial UI
function setupDOM(){
  // attach handlers to plus/minus buttons
  const minus = document.querySelector('button[aria-label="Rimuovi sospiro"]');
  const plus = document.querySelector('button[aria-label="Aggiungi sospiro"]');
  if(minus) minus.addEventListener('click', ()=>cS(-1));
  if(plus) plus.addEventListener('click', ()=>cS(1));
  // inputs change
  ['lvl','des'].forEach(id=>{ const el = q(id); if(el) el.addEventListener('input', ()=>applyStateToStore()); });
}

async function start(){
  const session = sessionFromURL();
  // expose DATA to builder
  if(!window.__DRONJONS_DATA__) window.__DRONJONS_DATA__ = window.DATA || [];
  await state.openSession(session);
  setupDOM();
  // subscribe to state changes
  state.subscribe(st=>{ render(st); });
}

start();
