/* =========================================================================
   WELLNESS.JS — Données wellness + RPE depuis Google Sheets
   ========================================================================= */

var SHEET_ID = '1mCZoixP13DpIE1kMbkH0tZpTrPwfOIaF3tuPaZhIfIU';
var GID = '219874091';
var CSV_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=csv&gid=' + GID;
var WD = {}, ALLDAYS = [], chartInst = null, srpeChartInst = null;
var PAVG21 = {}, PAVG3 = {}, PPERS = {};
var RPE = {}, RPEDAYS = [];
var SRPE_WEEK = {}, SRPE_WEEKS = [];
var RAW_ROWS = [];
var CURRENT_VIEW = 'wellness';

var OVERRIDES_KEY = 'nissa_espoirs_rpe_overrides_v1';
function loadOverrides() {
  try { var r = localStorage.getItem(OVERRIDES_KEY); return r ? JSON.parse(r) : {durations:{}, typeFixes:{}}; }
  catch(e) { return {durations:{}, typeFixes:{}}; }
}
function saveOverrides() { try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(RPE_OVERRIDES)); } catch(e) {} }
var RPE_OVERRIDES = loadOverrides();

var SHEET_ID = '1mCZoixP13DpIE1kMbkH0tZpTrPwfOIaF3tuPaZhIfIU';
var GID = '219874091';
var CSV_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=csv&gid=' + GID;
var WD = {}, ALLDAYS = [], chartInst = null;
var PAVG21 = {}, PAVG3 = {}, PPERS = {};
var RPE = {}, RPEDAYS = [];
var SRPE_WEEK = {}, SRPE_WEEKS = [];
var RAW_ROWS = [];

var OVERRIDES_KEY = 'nissa_espoirs_rpe_overrides_v1';
function loadOverrides() {
  try {
    var raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {durations:{}, typeFixes:{}};
    var parsed = JSON.parse(raw);
    return {durations: parsed.durations || {}, typeFixes: parsed.typeFixes || {}};
  } catch(e) { return {durations:{}, typeFixes:{}}; }
}
function saveOverrides() {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(RPE_OVERRIDES)); } catch(e) {}
}
var RPE_OVERRIDES = loadOverrides();

function parseCSV(text) {
  var lines = text.trim().split('\n');
  return lines.map(function(line) {
    var cols = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

function processData(rows) {
  var wByDate = {}, wRowsByDate = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r.length < 8) continue;
    if ((r[2]||'').trim() !== 'Welness') continue;
    var date = (r[0]||'').trim().split(' ')[0];
    var nom = (r[1]||'').trim();
    if (!date || !nom || nom.toLowerCase() === 'test') continue;
    var s=parseInt(r[3]),H=parseInt(r[4]),B=parseInt(r[5]),f=parseInt(r[6]),t=parseInt(r[7]);
    if (isNaN(s)||isNaN(H)||isNaN(B)||isNaN(f)||isNaN(t)) continue;
    var S=s+H+B+f+t;
    if (!wByDate[date]) wByDate[date]=[];
    if (wByDate[date].indexOf(nom)===-1) wByDate[date].push(nom);
    if (!wRowsByDate[date]) wRowsByDate[date]=[];
    wRowsByDate[date].push({n:nom,s:s,H:H,B:B,f:f,t:t,S:S});
  }
  var allP=[];
  Object.keys(wByDate).forEach(function(d){wByDate[d].forEach(function(p){if(allP.indexOf(p)===-1)allP.push(p);});});
  var roster=allP.sort();
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b;},0)/arr.length*100)/100:null;}
  var out={};
  Object.keys(wRowsByDate).forEach(function(date){
    var rws=wRowsByDate[date],ps={};
    rws.forEach(function(r){ps[r.n]=true;});
    out[date]={n:rws.length,aS:avg(rws.map(function(r){return r.S;})),as:avg(rws.map(function(r){return r.s;})),aH:avg(rws.map(function(r){return r.H;})),aB:avg(rws.map(function(r){return r.B;})),aF:avg(rws.map(function(r){return r.f;})),aT:avg(rws.map(function(r){return r.t;})),r:rws,ab:roster.filter(function(p){return !ps[p];}).sort()};
  });

  // ── RPE : parsing des lignes 'Rpe' ────────────────────────
  var rpeRowsByDate = {};
  for (var ri = 1; ri < rows.length; ri++) {
    var rr = rows[ri];
    if (rr.length < 11) continue;
    if ((rr[2]||'').trim() !== 'Rpe') continue;
    var rdate = (rr[0]||'').trim().split(' ')[0];
    var rnom = (rr[1]||'').trim();
    var rtype = (rr[9]||'').trim();
    var rscore = parseFloat(rr[10]);
    var rts = (rr[0]||'').trim();
    var fixKey = rdate+'|'+rnom+'|'+rts;
    if (RPE_OVERRIDES.typeFixes[fixKey]) rtype = RPE_OVERRIDES.typeFixes[fixKey];
    if (!rdate || !rnom || rnom.toLowerCase()==='test' || isNaN(rscore) || !rtype) continue;
    if (!rpeRowsByDate[rdate]) rpeRowsByDate[rdate] = [];
    rpeRowsByDate[rdate].push({n:rnom, type:rtype, score:rscore, ts:rts});
  }
  var rpeOut = {};
  Object.keys(rpeRowsByDate).forEach(function(date) {
    var rws = rpeRowsByDate[date];
    var byType = {};
    rws.forEach(function(s) {
      if (!byType[s.type]) byType[s.type] = [];
      byType[s.type].push(s.score);
    });
    var typeAvgs = Object.keys(byType).map(function(t) {
      return {type:t, avg:avg(byType[t]), n:byType[t].length};
    }).sort(function(a,b){ return b.avg - a.avg; });
    rpeOut[date] = {sessions: rws, typeAvgs: typeAvgs, n: rws.length};
  });
  var rpeDates = Object.keys(rpeOut).sort(function(a,b){return a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''));});

  // ── sRPE collectif : duree par type de seance ──────────────
  function sessionDuration(type, date) {
    var key = date+'|'+type;
    if (RPE_OVERRIDES.durations[key] != null) return RPE_OVERRIDES.durations[key];
    var t = type.toLowerCase();
    if (t.indexOf('off feet') !== -1) return 30;
    if (t.indexOf('match') !== -1) return 110;
    return 60;
  }

  // sRPE du jour (collectif) = somme sur les types de (moyenne RPE du type ce jour * duree du type)
  var srpeByDate = {};
  rpeDates.forEach(function(date) {
    var typeAvgs = rpeOut[date].typeAvgs;
    var detail = typeAvgs.map(function(t) {
      var dur = sessionDuration(t.type, date);
      return {type:t.type, avg:t.avg, duration:dur, srpe:Math.round(t.avg*dur)};
    });
    var total = detail.reduce(function(s,d){return s+d.srpe;},0);
    srpeByDate[date] = {detail:detail, total:total};
  });

  // Regrouper par semaine ISO (lundi-dimanche)
  function parseFR(dstr) {
    var p = dstr.split('/');
    return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
  }
  function mondayOf(dt) {
    var day = dt.getDay(); // 0=dim,1=lun,...
    var diff = (day === 0 ? -6 : 1 - day);
    var m = new Date(dt);
    m.setDate(dt.getDate() + diff);
    m.setHours(0,0,0,0);
    return m;
  }
  function fmtFR(dt) {
    return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();
  }

  var srpeByWeek = {}; // key = monday date string -> {total, byType:{type:sum}, dates:[...]}
  rpeDates.forEach(function(date) {
    var dt = parseFR(date);
    var mon = mondayOf(dt);
    var key = fmtFR(mon);
    if (!srpeByWeek[key]) srpeByWeek[key] = {total:0, byType:{}, dates:[]};
    srpeByWeek[key].dates.push(date);
    srpeByWeek[key].total += srpeByDate[date].total;
    srpeByDate[date].detail.forEach(function(d) {
      if (!srpeByWeek[key].byType[d.type]) srpeByWeek[key].byType[d.type] = 0;
      srpeByWeek[key].byType[d.type] += d.srpe;
    });
  });
  var srpeWeeks = Object.keys(srpeByWeek).sort(function(a,b){
    return parseFR(a) - parseFR(b);
  });

  var sd=Object.keys(out).sort(function(a,b){return a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''));});
  var pa21={},pa3={},pp={};
  for (var di=0;di<sd.length;di++) {
    var d=sd[di];pa21[d]={};pa3[d]={};pp[d]={};
    var w21=sd.slice(Math.max(0,di-21),di),w3=sd.slice(Math.max(0,di-3),di);
    for (var pi=0;pi<roster.length;pi++) {
      var pl=roster[pi];
      var sc21=w21.map(function(wd){var rr=(wRowsByDate[wd]||[]).filter(function(r){return r.n===pl;})[0];return rr?rr.S:null;}).filter(function(v){return v!==null;});
      pa21[d][pl]=sc21.length>=3?Math.round(sc21.reduce(function(a,b){return a+b;},0)/sc21.length*100)/100:null;
      var sc3=w3.map(function(wd){var rr=(wRowsByDate[wd]||[]).filter(function(r){return r.n===pl;})[0];return rr?rr.S:null;}).filter(function(v){return v!==null;});
      pa3[d][pl]=sc3.length>=1?Math.round(sc3.reduce(function(a,b){return a+b;},0)/sc3.length*100)/100:null;
      var streak=0;
      for (var j=di;j>=0;j--) {
        var pd=sd[j];
        var prow=(wRowsByDate[pd]||[]).filter(function(r){return r.n===pl;})[0];
        if (!prow) break;
        var fa=Math.min(100,Math.max(0,((35-prow.S)/30)*100));
        var n21s=sd.slice(Math.max(0,j-21),j).map(function(wd){var rr=(wRowsByDate[wd]||[]).filter(function(r){return r.n===pl;})[0];return rr?rr.S:null;}).filter(function(v){return v!==null;});
        var n21=n21s.length>=3?n21s.reduce(function(a,b){return a+b;},0)/n21s.length:null;
        var en=n21?((prow.S-n21)/n21)*100:0;
        if (fa<60||en>10){streak++;}else{break;}
      }
      pp[d][pl]=streak;
    }
  }
  return {out:out,total:rows.length-1,roster:roster,pa21:pa21,pa3:pa3,pp:pp,rpeOut:rpeOut,rpeDates:rpeDates,srpeByWeek:srpeByWeek,srpeWeeks:srpeWeeks};
}

function calcStatut(fa,e21,e3,streak,r) {
  if (fa<30) return 'rouge';
  if (e21!==null&&e21>30) return 'rouge';
  if (e3!==null&&e3>30) return 'rouge';
  if (r.s===7||r.f===7||r.t===7) return 'rouge';
  if (streak>=7) return 'rouge';
  if (fa>=30&&fa<=44) return 'orange';
  if (e21!==null&&e21>20&&e21<=30) return 'orange';
  if (e3!==null&&e3>20&&e3<=30) return 'orange';
  if (r.s===6||r.f===6||r.t===6) return 'orange';
  if (streak>=5) return 'orange';
  if (fa>=45&&fa<=59) return 'jaune';
  if (e21!==null&&e21>10&&e21<=20) return 'jaune';
  if (e3!==null&&e3>10&&e3<=20) return 'jaune';
  if ([r.s,r.H,r.B,r.f,r.t].some(function(v){return v===5;})) return 'jaune';
  return 'vert';
}

var SORD={rouge:0,orange:1,jaune:2,vert:3};
var SLBL={vert:'Vert',jaune:'Jaune',orange:'Orange',rouge:'Rouge'};
var SICN={vert:'&#128994;',jaune:'&#128993;',orange:'&#128992;',rouge:'&#128308;'};
var SCSS={vert:'statut-vert',jaune:'statut-jaune',orange:'statut-orange',rouge:'statut-rouge'};

function setProgress(pct,msg){document.getElementById('loader-bar').style.width=pct+'%';if(msg)document.getElementById('loader-sub').textContent=msg;}

async function loadData() {
  setProgress(10,'Connexion au Google Sheet...');
  try {
    var resp=await fetch(CSV_URL+'&t='+Date.now());
    if (!resp.ok) throw new Error('HTTP '+resp.status);
    setProgress(50,'Analyse des données...');
    var text=await resp.text();
    var rows=parseCSV(text);
    RAW_ROWS=rows;
    setProgress(80,'Calcul des statistiques...');
    var res=processData(rows);
    WD=res.out;PAVG21=res.pa21;PAVG3=res.pa3;PPERS=res.pp;
    RPE=res.rpeOut;RPEDAYS=res.rpeDates;
    SRPE_WEEK=res.srpeByWeek;SRPE_WEEKS=res.srpeWeeks;
    buildRpeRoster();
    ALLDAYS=Object.keys(WD).sort(function(a,b){return a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''));});
    setProgress(100,'Pret !');
    document.getElementById('stats-badge').textContent=res.total+' entrees · '+ALLDAYS.length+' jours · '+res.roster.length+' joueurs';
    document.getElementById('last-updated').textContent='Mis a jour le '+new Date().toLocaleString('fr-FR');
    return true;
  } catch(e) {
    document.getElementById('loader-error').style.display='block';
    document.getElementById('err-msg').textContent=e.message;
    document.getElementById('err-detail').textContent=CSV_URL;
    return false;
  }
}

async function init() {
  var ok=await loadData();if(!ok)return;
  var sel=document.getElementById('dateSelect');sel.innerHTML='';
  ALLDAYS.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o);});
  sel.value=ALLDAYS[ALLDAYS.length-1];
  document.getElementById('loading-screen').classList.add('hidden');
  
  render();
}

function reprocessData() {
  if (!RAW_ROWS.length) return;
  var res=processData(RAW_ROWS);
  WD=res.out;PAVG21=res.pa21;PAVG3=res.pa3;PPERS=res.pp;
  RPE=res.rpeOut;RPEDAYS=res.rpeDates;
  SRPE_WEEK=res.srpeByWeek;SRPE_WEEKS=res.srpeWeeks;
  buildRpeRoster();
  render();
}

async function refreshData() {
  var btn=document.getElementById('btn-refresh');btn.classList.add('loading');
  var prev=document.getElementById('dateSelect').value;
  var ok=await loadData();
  if (ok) {
    var sel=document.getElementById('dateSelect');sel.innerHTML='';
    ALLDAYS.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o);});
    sel.value=ALLDAYS.indexOf(prev)!==-1?prev:ALLDAYS[ALLDAYS.length-1];
    render();
  }
  btn.classList.remove('loading');
}

function sc(v){return v<=3?'#2ecc8a':v<=3.9?'#e0b341':v<=4.9?'#e8862e':v<=5.9?'#cc1122':v<=6.9?'#a30d1a':'#7a0712';}
function slbl(v){return v<=3?'Tres bon':v<=4?'Correct':v<=5?'Moyen':v<=6?'Mauvais':'Critique';}
function scolor(v){return v<=12?'#2ecc8a':v<=18?'#e0b341':'#cc1122';}

function fmtPct(v) {
  if (v===null) return '<span style="color:var(--text2)">-</span>';
  var sign=v>0?'+':'';
  var col=v>20?'#cc1122':v>10?'#e8862e':v>5?'#e0b341':v<-5?'#2ecc8a':'#8b90a7';
  return '<span class="mono" style="color:'+col+'">'+sign+v.toFixed(0)+'%</span>';
}

function buildComment(r,statut) {
  var parts=[];
  if (statut==='rouge') {
    if (r.s===7) parts.push('Sommeil critique');
    if (r.f===7) parts.push('Fatigue critique');
    if (r.t===7) parts.push('Stress critique');
    if (r._fa<30) parts.push('Forme effondree');
    if (r._streak>=7) parts.push(r._streak+'j cons.');
    if (r._e21!==null&&r._e21>30) parts.push('+'+r._e21.toFixed(0)+'% vs norme');
    if (r._e3!==null&&r._e3>30) parts.push('+'+r._e3.toFixed(0)+'% vs 3j');
    if (!parts.length) parts.push('Intervention requise');
  } else if (statut==='orange') {
    if (r.s===6) parts.push('Sommeil degrade');
    if (r.f===6) parts.push('Fatigue elevee');
    if (r.t===6) parts.push('Stress eleve');
    if (r._streak>=5) parts.push(r._streak+'j cons.');
    if (r._e21!==null&&r._e21>20) parts.push('+'+r._e21.toFixed(0)+'% vs norme');
    if (r._e3!==null&&r._e3>20) parts.push('+'+r._e3.toFixed(0)+'% vs 3j');
    if (!parts.length) parts.push('Discussion recommandee');
  } else if (statut==='jaune') {
    if ([r.s,r.H,r.B,r.f,r.t].some(function(v){return v===5;})) parts.push('Note a 5');
    if (r._e21!==null&&r._e21>10) parts.push('+'+r._e21.toFixed(0)+'% vs norme');
    if (r._e3!==null&&r._e3>10) parts.push('+'+r._e3.toFixed(0)+'% vs 3j');
    if (!parts.length) parts.push('Surveiller evolution');
  }
  return parts.join(' · ');
}

function render() {
  var d=document.getElementById('dateSelect').value;
  var agg=WD[d];
  var a21=PAVG21[d]||{},a3=PAVG3[d]||{},pp=PPERS[d]||{};

  document.getElementById('dateInfo').innerHTML='<strong>'+d+'</strong> &middot; '+agg.n+' r&eacute;ponse'+(agg.n>1?'s':'');

  document.getElementById('metrics').innerHTML=[
    {label:'Joueurs',val:agg.n,sub:'reponses',color:'#6c63ff'},
    {label:'Score moyen',val:agg.aS?agg.aS.toFixed(1):'–',sub:'/ 35 pts',color:scolor(agg.aS)},
    {label:'Sommeil',val:agg.as.toFixed(1),sub:slbl(agg.as),color:sc(agg.as)},
    {label:'Corb. haut',val:agg.aH.toFixed(1),sub:slbl(agg.aH),color:sc(agg.aH)},
    {label:'Corb. bas',val:agg.aB.toFixed(1),sub:slbl(agg.aB),color:sc(agg.aB)},
    {label:'Fatigue',val:agg.aF.toFixed(1),sub:slbl(agg.aF),color:sc(agg.aF)},
    {label:'Stress',val:agg.aT.toFixed(1),sub:slbl(agg.aT),color:sc(agg.aT)},
  ].map(function(m){return '<div class="metric-card" style="--m-color:'+m.color+'"><div class="metric-label">'+m.label+'</div><div class="metric-value" style="color:'+m.color+'">'+m.val+'</div><div class="metric-sub">'+m.sub+'</div></div>';}).join('');

  var ai=[];
  if (agg.aF>=4.5) ai.push('Fatigue collective : '+agg.aF.toFixed(1)+'/7');
  if (agg.aS>=20) ai.push('Score critique : '+agg.aS.toFixed(1)+'/35');
  if (agg.as>=5) ai.push('Sommeil : '+agg.as.toFixed(1)+'/7');
  var highs=agg.r?agg.r.filter(function(r){return r.f>=5||r.s>=6;}).map(function(r){return r.n;}):[]; 
  if (highs.length) ai.push('A surveiller : '+highs.join(', '));
  document.getElementById('alerts-body').innerHTML=ai.map(function(a){return '<div class="alert-item">• '+a+'</div>';}).join('');
  document.getElementById('alerts').classList.toggle('visible',ai.length>0);

  var ab=agg.ab||[];
  document.getElementById('absent-section').innerHTML=ab.length
    ?'<div class="absent-section"><div class="absent-header"><div class="absent-title">&#10060; N\'ont pas répondu <span class="absent-count">'+ab.length+'</span></div></div><div class="absent-grid">'+ab.map(function(n){return '<div class="absent-chip">'+n+'</div>';}).join('')+'</div></div>'
    :'<div style="background:rgba(46,204,138,.06);border:1px solid rgba(46,204,138,.2);border-radius:10px;padding:12px 18px;margin-bottom:20px;font-size:13px;color:#2ecc8a;font-weight:500">&#9989; Tous les joueurs ont répondu !</div>';
  document.getElementById('present-count').textContent=agg.n;

  if (agg.r) {
    var enriched=agg.r.map(function(r) {
      var fa=Math.min(100,Math.max(0,((35-r.S)/30)*100));
      var avg21=a21[r.n]!==undefined?a21[r.n]:null;
      var avg3=a3[r.n]!==undefined?a3[r.n]:null;
      var e21=avg21!==null?((r.S-avg21)/avg21)*100:null;
      var e3=avg3!==null?((r.S-avg3)/avg3)*100:null;
      var streak=pp[r.n]||0;
      var statut=calcStatut(fa,e21,e3,streak,r);
      return {n:r.n,s:r.s,H:r.H,B:r.B,f:r.f,t:r.t,S:r.S,_fa:fa,_avg21:avg21,_avg3:avg3,_e21:e21,_e3:e3,_streak:streak,_statut:statut};
    });
    var sorted=enriched.slice().sort(function(a,b){var od=SORD[a._statut]-SORD[b._statut];return od!==0?od:b.S-a.S;});

    document.getElementById('players-grid').innerHTML=sorted.map(function(r) {
      var c=scolor(r.S),statut=r._statut;
      var fac=r._fa>=70?'#2ecc8a':r._fa>=40?'#e0b341':'#cc1122';
      var pct=function(v){return Math.min(100,(v/7)*100).toFixed(1);};

      var p21='';
      if (r._e21!==null){var sg=r._e21>0?'+':'';var col=r._e21>5?'#cc1122':r._e21<-5?'#2ecc8a':'#8b90a7';var ar=r._e21>5?'&#8593;':r._e21<-5?'&#8595;':'&#8594;';p21='<div class="ind-pill"><span class="ind-lbl">vs 21j</span><span class="ind-val" style="color:'+col+'">'+sg+r._e21.toFixed(0)+'%</span><span class="ind-sub" style="color:'+col+'">'+ar+' '+r._avg21.toFixed(1)+'</span></div>';}
      else{p21='<div class="ind-pill"><span class="ind-lbl">vs 21j</span><span class="ind-val" style="color:var(--text2)">-</span><span class="ind-sub">insuf.</span></div>';}

      var p3='';
      if (r._e3!==null){var sg3=r._e3>0?'+':'';var col3=r._e3>10?'#cc1122':r._e3>5?'#e0b341':r._e3<-5?'#2ecc8a':'#8b90a7';var ar3=r._e3>5?'&#8593;':r._e3<-5?'&#8595;':'&#8594;';p3='<div class="ind-pill"><span class="ind-lbl">vs 3j</span><span class="ind-val" style="color:'+col3+'">'+sg3+r._e3.toFixed(0)+'%</span><span class="ind-sub" style="color:'+col3+'">'+ar3+' '+r._avg3.toFixed(1)+'</span></div>';}
      else{p3='<div class="ind-pill"><span class="ind-lbl">vs 3j</span><span class="ind-val" style="color:var(--text2)">-</span><span class="ind-sub">insuf.</span></div>';}

      var ph='';
      if (r._streak>=3){var cls=r._streak>=5?'danger':'warn';var ic=r._streak>=5?'&#128308;':'&#128993;';ph='<div class="persist-badge '+cls+'">'+ic+' '+r._streak+'j cons. dégradés</div>';}

      var als=[];
      [['Sommeil',r.s],['Fatigue',r.f],['Stress',r.t]].forEach(function(p){
        var lbl=p[0],val=p[1];
        if (val===7) als.push({cls:'critique',icon:'&#128680;',txt:lbl+' critique ('+val+'/7)'});
        else if (val===6) als.push({cls:'discussion',icon:'&#9888;',txt:lbl+' discussion ('+val+'/7)'});
        else if (val===5) als.push({cls:'vigilance',icon:'&#128065;',txt:lbl+' vigilance ('+val+'/7)'});
      });
      [['Corb.H',r.H],['Corb.B',r.B]].forEach(function(p){
        var lbl=p[0],val=p[1];
        if (val===7) als.push({cls:'discussion',icon:'&#9888;',txt:lbl+' discussion ('+val+'/7)'});
        else if (val===6) als.push({cls:'vigilance',icon:'&#128065;',txt:lbl+' vigilance ('+val+'/7)'});
      });
      var ah=als.length?'<div class="player-alerts">'+als.map(function(a){return '<div class="pal '+a.cls+'">'+a.icon+' '+a.txt+'</div>';}).join('')+'</div>':'';

      var bars=[['Sommeil',r.s],['Corb. haut',r.H],['Corb. bas',r.B],['Fatigue',r.f],['Stress',r.t]].map(function(p){
        var lbl=p[0],val=p[1];
        return '<div class="score-row"><span class="lbl">'+lbl+'</span><div class="score-track"><div class="score-fill" style="width:'+pct(val)+'%;background:'+sc(val)+'"></div></div><span class="score-num" style="color:'+sc(val)+'">'+val+'</span></div>';
      }).join('');

      return '<div class="player-card s-'+statut+'">'
        +'<div class="player-name">'+r.n
        +'<span class="somme-pill" style="background:'+c+'22;color:'+c+'">&Sigma; '+r.S+'</span>'
        +'<span class="statut-badge '+SCSS[statut]+'">'+SICN[statut]+' '+SLBL[statut]+'</span>'
        +'</div>'
        +'<div class="player-indicators">'
        +'<div class="ind-pill"><span class="ind-lbl">Forme</span><span class="ind-val" style="color:'+fac+'">'+r._fa.toFixed(0)+'</span><span class="ind-sub">/ 100</span></div>'
        +p21+p3
        +'</div>'
        +ph+ah+bars
        +'</div>';
    }).join('');

    document.getElementById('dash-tbody').innerHTML=sorted.map(function(r) {
      var statut=r._statut;
      var bc={vert:'#2ecc8a',jaune:'#e0b341',orange:'#e8862e',rouge:'#cc1122'}[statut];
      var fac=r._fa>=60?'#2ecc8a':r._fa>=45?'#e0b341':r._fa>=30?'#e8862e':'#cc1122';
      var sk=r._streak>=7?'<span style="color:#e8564a;font-weight:700">'+r._streak+'j &#128308;</span>':r._streak>=5?'<span style="color:#e67e22;font-weight:700">'+r._streak+'j &#129001;</span>':r._streak>=3?'<span style="color:#f5a623">'+r._streak+'j &#128993;</span>':'<span style="color:var(--text2)">'+(r._streak>0?r._streak+'j':'-')+'</span>';
      return '<tr style="border-left:3px solid '+bc+'">'
        +'<td><span class="statut-badge '+SCSS[statut]+'">'+SICN[statut]+' '+SLBL[statut]+'</span></td>'
        +'<td class="nom-cell">'+r.n+'</td>'
        +'<td><span class="mono" style="color:'+scolor(r.S)+'">'+r.S+'/35</span></td>'
        +'<td><span class="mono" style="color:'+fac+'">'+r._fa.toFixed(0)+'/100</span></td>'
        +'<td>'+fmtPct(r._e21)+'</td>'
        +'<td>'+fmtPct(r._e3)+'</td>'
        +'<td>'+sk+'</td>'
        +'<td class="comment-cell">'+buildComment(r,statut)+'</td>'
        +'</tr>';
    }).join('');
  }

  var tItems=[
    {label:'Score total moyen',val:agg.aS,max:35},
    {label:'Sommeil',val:agg.as,max:7},
    {label:'Courbatures haut',val:agg.aH,max:7},
    {label:'Courbatures bas',val:agg.aB,max:7},
    {label:'Fatigue',val:agg.aF,max:7},
    {label:'Stress',val:agg.aT,max:7},
  ];
  var di=ALLDAYS.indexOf(d);
  var prevDay=di>0?WD[ALLDAYS[di-1]]:null;
  var pm=prevDay?{'Score total moyen':prevDay.aS,'Sommeil':prevDay.as,'Courbatures haut':prevDay.aH,'Courbatures bas':prevDay.aB,'Fatigue':prevDay.aF,'Stress':prevDay.aT}:{};
  document.getElementById('avg-tbody').innerHTML=tItems.map(function(it) {
    var pct=Math.min(100,(it.val/it.max)*100).toFixed(1);
    var color=it.max===35?scolor(it.val):sc(it.val);
    var prev=pm[it.label],trend='';
    if (prev!=null){var diff=it.val-prev;var arr=diff>0.1?'&#8593;':diff<-0.1?'&#8595;':'&#8594;';var tc=diff>0.1?'#cc1122':diff<-0.1?'#2ecc8a':'#8b90a7';trend='<span style="color:'+tc+';font-weight:700">'+arr+' '+Math.abs(diff).toFixed(1)+'</span>';}
    return '<tr><td>'+it.label+'</td><td class="val-cell" style="color:'+color+'">'+it.val.toFixed(2)+'</td><td style="width:200px"><div class="tbl-bar" style="width:'+pct+'%;background:'+color+';max-width:200px"></div></td><td style="font-size:13px">'+trend+'</td></tr>';
  }).join('');

  if (document.getElementById('tab-chart').classList.contains('active')) setTimeout(function(){drawChart(d);},50);
  if (CURRENT_VIEW==='rpe') { renderRpe(); if (document.getElementById('rpetab-individuel').classList.contains('active')) renderRpeIndiv(); }
}

function drawChart(d) {
  if (typeof Chart === 'undefined') { setTimeout(function(){drawChart(d);}, 100); return; }
  var idx=ALLDAYS.indexOf(d),start=Math.max(0,idx-29),win=ALLDAYS.slice(start,idx+1);
  var labels=win.map(function(x){return x.slice(0,5);});
  function ds(key,label,color,div){return {label:label,borderColor:color,backgroundColor:color+'18',data:win.map(function(x){return WD[x][key]?+(WD[x][key]/(div||1)).toFixed(2):null;}),tension:0.35,pointRadius:3,fill:false,spanGaps:true,borderWidth:2,pointHoverRadius:5};}
  if (chartInst) { chartInst.destroy(); chartInst = null; }
  var canvas = document.getElementById('trendChart');
  chartInst=new Chart(canvas,{type:'line',data:{labels:labels,datasets:[ds('aS','Score','#cc1122',2),ds('as','Sommeil','#2ecc8a'),ds('aF','Fatigue','#f5a623'),ds('aT','Stress','#ff6644'),ds('aB','Corb.bas','#5bc4f5')]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a0000',borderColor:'rgba(204,17,34,0.3)',borderWidth:1,titleColor:'#f0f0f0',bodyColor:'#888',padding:10}},scales:{y:{min:0,max:18,ticks:{stepSize:3,color:'#888',font:{size:11}},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'transparent'}},x:{ticks:{color:'#888',font:{size:10},maxTicksLimit:12},grid:{display:false},border:{color:'rgba(255,255,255,0.06)'}}}}});
}

function rpeColor(v){return v<=3?'#2ecc8a':v<=4.9?'#e0b341':v<=6.9?'#e8862e':'#cc1122';}

function renderRpePlayersGrid(rpeDay) {
  if (!rpeDay || !rpeDay.sessions.length) {
    document.getElementById('rpe-players-grid').innerHTML = '<div style="color:var(--text2);font-size:13px;padding:14px">Aucune séance RPE enregistrée pour cette date.</div>';
    return;
  }
  var byPlayer = {};
  rpeDay.sessions.forEach(function(s) {
    if (!byPlayer[s.n]) byPlayer[s.n] = [];
    byPlayer[s.n].push(s);
  });
  var players = Object.keys(byPlayer).sort(function(a,b) {
    var avgA = byPlayer[a].reduce(function(x,s){return x+s.score;},0)/byPlayer[a].length;
    var avgB = byPlayer[b].reduce(function(x,s){return x+s.score;},0)/byPlayer[b].length;
    return avgB - avgA;
  });

  document.getElementById('rpe-players-grid').innerHTML = players.map(function(p) {
    var sessions = byPlayer[p].slice().sort(function(a,b){return (a.ts||'').localeCompare(b.ts||'');});
    var avg = sessions.reduce(function(x,s){return x+s.score;},0)/sessions.length;
    var col = rpeColor(avg);
    var statutClass = avg<=3?'s-vert':avg<=4.9?'s-jaune':avg<=6.9?'s-orange':'s-rouge';

    var sessionsHTML = sessions.map(function(s) {
      var heure = (s.ts||'').split(' ')[1] || '';
      var sc = rpeColor(s.score);
      return '<div class="score-row"><span class="lbl">'+s.type+'</span><div class="score-track"><div class="score-fill" style="width:'+Math.min(100,(s.score/10)*100)+'%;background:'+sc+'"></div></div><span class="score-num" style="color:'+sc+'">'+s.score+'</span></div>';
    }).join('');

    return '<div class="player-card '+statutClass+'">'
      + '<div class="player-name">'+p
      + '<span class="somme-pill" style="background:'+col+'22;color:'+col+'">'+avg.toFixed(1)+' /10</span>'
      + '<span class="statut-badge" style="background:'+col+';color:#fff">'+sessions.length+' séance'+(sessions.length>1?'s':'')+'</span>'
      + '</div>'
      + sessionsHTML
      + '</div>';
  }).join('');
}

var RPE_ROSTER = [];
var RPE_CURRENT_MISSING_TYPE = null;

function buildRpeRoster() {
  var allPlayers = [];
  RPEDAYS.forEach(function(d) {
    (RPE[d].sessions||[]).forEach(function(s) {
      if (allPlayers.indexOf(s.n) === -1) allPlayers.push(s.n);
    });
  });
  RPE_ROSTER = allPlayers.sort();
}

function renderRpeMissing(rpeDay) {
  var types = rpeDay && rpeDay.typeAvgs ? rpeDay.typeAvgs.map(function(t){return t.type;}) : [];

  if (!types.length) {
    document.getElementById('rpe-missing-type-tabs').innerHTML = '';
    document.getElementById('rpe-missing-grid').innerHTML = '<div class="rpe-missing-empty">Aucun type de séance enregistré ce jour.</div>';
    return;
  }

  if (RPE_CURRENT_MISSING_TYPE === null || types.indexOf(RPE_CURRENT_MISSING_TYPE) === -1) {
    RPE_CURRENT_MISSING_TYPE = types[0];
  }

  document.getElementById('rpe-missing-type-tabs').innerHTML = types.map(function(t, idx) {
    var cls = t === RPE_CURRENT_MISSING_TYPE ? 'rpe-missing-type-btn active' : 'rpe-missing-type-btn';
    return '<button class="'+cls+'" data-rpe-type-idx="'+idx+'" onclick="selectRpeMissingTypeByIdx(this)">'+t+'</button>';
  }).join('');
  window.__RPE_MISSING_TYPES__ = types;

  var present = {};
  rpeDay.sessions.forEach(function(s) {
    if (s.type === RPE_CURRENT_MISSING_TYPE) present[s.n] = true;
  });
  var missing = RPE_ROSTER.filter(function(p){ return !present[p]; });

  document.getElementById('rpe-missing-grid').innerHTML = missing.length
    ? missing.map(function(p){ return '<div class="rpe-missing-chip">'+p+'</div>'; }).join('')
    : '<div class="rpe-missing-empty">&#9989; Tous les joueurs ont rempli ce type de séance.</div>';
}

function selectRpeMissingTypeByIdx(btn) {
  var idx = parseInt(btn.getAttribute('data-rpe-type-idx'));
  var types = window.__RPE_MISSING_TYPES__ || [];
  RPE_CURRENT_MISSING_TYPE = types[idx];
  var d = document.getElementById('dateSelect').value;
  renderRpeMissing(RPE[d]);
}

function renderRpe() {
  var d = document.getElementById('dateSelect').value;
  var rpeDay = RPE[d];
  document.getElementById('rpe-date-label').textContent = d;
  document.getElementById('rpe-date-label2').textContent = d;

  renderRpePlayersGrid(rpeDay);
  renderRpeMissing(rpeDay);

  if (!rpeDay || !rpeDay.sessions.length) {
    document.getElementById('rpe-responded-count').textContent = '0';
    document.getElementById('rpe-type-grid').innerHTML = '<div style="color:var(--text2);font-size:13px;padding:14px">Aucune séance RPE enregistrée pour cette date.</div>';
    document.getElementById('rpe-sessions-tbody').innerHTML = '';
    return;
  }

  var uniquePlayers = {};
  rpeDay.sessions.forEach(function(s){ uniquePlayers[s.n] = true; });
  document.getElementById('rpe-responded-count').textContent = Object.keys(uniquePlayers).length;

  document.getElementById('rpe-type-grid').innerHTML = rpeDay.typeAvgs.map(function(t) {
    var col = rpeColor(t.avg);
    return '<div class="rpe-type-card" style="border-left-color:'+col+'">'
      + '<div class="rpe-type-name">'+t.type+'</div>'
      + '<div class="rpe-type-val" style="color:'+col+'">'+t.avg.toFixed(1)+'<span style="font-size:13px;color:var(--text2)"> /10</span></div>'
      + '<div class="rpe-type-sub">'+t.n+' séance'+(t.n>1?'s':'')+'</div>'
      + '</div>';
  }).join('');

  var sortedSessions = rpeDay.sessions.slice().sort(function(a,b){ return (a.ts||'').localeCompare(b.ts||''); });
  document.getElementById('rpe-sessions-tbody').innerHTML = sortedSessions.map(function(s) {
    var heure = (s.ts||'').split(' ')[1] || '-';
    var col = rpeColor(s.score);
    return '<tr><td style="font-family:\'JetBrains Mono\',monospace;color:var(--text2)">'+heure+'</td><td style="font-weight:600">'+s.n+'</td><td>'+s.type+'</td><td><span class="mono" style="color:'+col+'">'+s.score+'/10</span></td></tr>';
  }).join('');
}

function buildRpePlayerSelect() {
  var allPlayers = RPE_ROSTER.length ? RPE_ROSTER : [];
  var sel = document.getElementById('rpePlayerSelect');
  var prevVal = sel.value;
  sel.innerHTML = '';
  allPlayers.forEach(function(p) {
    var o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o);
  });
  if (allPlayers.indexOf(prevVal) !== -1) sel.value = prevVal;
}

function renderRpeIndiv() {
  var player = document.getElementById('rpePlayerSelect').value;
  if (!player) { document.getElementById('rpeindiv-content').innerHTML = ''; return; }

  var history = [];
  RPEDAYS.forEach(function(d) {
    (RPE[d].sessions||[]).forEach(function(s) {
      if (s.n === player) history.push({date:d, type:s.type, score:s.score, ts:s.ts});
    });
  });
  history.sort(function(a,b){ return (b.ts||'').localeCompare(a.ts||''); });

  if (!history.length) {
    document.getElementById('rpeindiv-content').innerHTML = '<div style="color:var(--text2);font-size:13px">Aucune séance RPE enregistrée pour ce joueur.</div>';
    return;
  }

  var scores = history.map(function(h){return h.score;});
  var avgAll = scores.reduce(function(a,b){return a+b;},0)/scores.length;
  var last10 = scores.slice(0,10);
  var avgLast10 = last10.reduce(function(a,b){return a+b;},0)/last10.length;
  var maxScore = Math.max.apply(null, scores);

  var byType = {};
  history.forEach(function(h){ if(!byType[h.type]) byType[h.type]=[]; byType[h.type].push(h.score); });
  var typeStats = Object.keys(byType).map(function(t){
    var arr = byType[t];
    return {type:t, avg:arr.reduce(function(a,b){return a+b;},0)/arr.length, n:arr.length};
  }).sort(function(a,b){return b.n-a.n;});

  var html = '<div class="rpe-indiv-stats">'
    + '<div class="rpe-indiv-stat"><div class="rpe-indiv-stat-val" style="color:'+rpeColor(avgAll)+'">'+avgAll.toFixed(1)+'</div><div class="rpe-indiv-stat-lbl">Moyenne globale</div></div>'
    + '<div class="rpe-indiv-stat"><div class="rpe-indiv-stat-val" style="color:'+rpeColor(avgLast10)+'">'+avgLast10.toFixed(1)+'</div><div class="rpe-indiv-stat-lbl">Moy. 10 dernières</div></div>'
    + '<div class="rpe-indiv-stat"><div class="rpe-indiv-stat-val" style="color:'+rpeColor(maxScore)+'">'+maxScore+'</div><div class="rpe-indiv-stat-lbl">Pic max</div></div>'
    + '<div class="rpe-indiv-stat"><div class="rpe-indiv-stat-val">'+history.length+'</div><div class="rpe-indiv-stat-lbl">Séances totales</div></div>'
    + '</div>';

  html += '<div class="section-label">Moyenne par type de séance</div>';
  html += '<div class="rpe-type-grid">' + typeStats.map(function(t){
    var col = rpeColor(t.avg);
    return '<div class="rpe-type-card" style="border-left-color:'+col+'"><div class="rpe-type-name">'+t.type+'</div><div class="rpe-type-val" style="color:'+col+'">'+t.avg.toFixed(1)+'<span style="font-size:13px;color:var(--text2)"> /10</span></div><div class="rpe-type-sub">'+t.n+' séance'+(t.n>1?'s':'')+'</div></div>';
  }).join('') + '</div>';

  html += '<div class="section-label" style="margin-top:20px">Historique des séances (les plus récentes)</div>';
  html += '<div class="rpe-history-wrap">' + history.slice(0,40).map(function(h) {
    var col = rpeColor(h.score);
    return '<div class="rpe-history-row"><span class="rpe-history-date">'+h.date+'</span><span class="rpe-history-type">'+h.type+'</span><span class="rpe-history-score" style="color:'+col+'">'+h.score+'/10</span></div>';
  }).join('') + '</div>';

  document.getElementById('rpeindiv-content').innerHTML = html;
}

var CURRENT_VIEW = 'wellness';

function switchView(view) {
  CURRENT_VIEW = view;
  document.getElementById('vs-wellness').classList.toggle('active', view==='wellness');
  document.getElementById('vs-rpe').classList.toggle('active', view==='rpe');
  document.getElementById('view-wellness').style.display = view==='wellness' ? 'block' : 'none';
  document.getElementById('view-rpe').style.display = view==='rpe' ? 'block' : 'none';
  if (view==='rpe') {
    renderRpe();
    buildRpePlayerSelect();
    if (document.getElementById('rpetab-individuel').classList.contains('active')) renderRpeIndiv();
  }
}

function switchTab(name) {
  var tabs=['joueurs','dashboard','moyennes','chart','legende'];
  var tabBtns = document.querySelectorAll('#view-wellness .tab-btn');
  tabBtns.forEach(function(t,i){t.classList.toggle('active',tabs[i]===name);});
  document.querySelectorAll('#view-wellness .tab-panel').forEach(function(p){p.classList.remove('active');});
  document.getElementById('tab-'+name).classList.add('active');
  if (name==='chart') setTimeout(function(){drawChart(document.getElementById('dateSelect').value);},50);
}

var srpeChartInst = null;

function renderSrpeChart() {
  if (!SRPE_WEEKS.length) {
    document.getElementById('srpe-current-week').textContent = '-';
    document.getElementById('srpe-avg-week').textContent = '-';
    document.getElementById('srpe-week-tbody').innerHTML = '<tr><td colspan="3" style="color:var(--text2)">Aucune donnée sRPE disponible.</td></tr>';
    return;
  }

  var totals = SRPE_WEEKS.map(function(w){ return SRPE_WEEK[w].total; });
  var currentWeek = totals[totals.length-1];
  var avgWeek = totals.reduce(function(a,b){return a+b;},0) / totals.length;

  document.getElementById('srpe-current-week').textContent = Math.round(currentWeek).toLocaleString('fr-FR');
  document.getElementById('srpe-avg-week').textContent = Math.round(avgWeek).toLocaleString('fr-FR');

  document.getElementById('srpe-week-tbody').innerHTML = SRPE_WEEKS.slice().reverse().map(function(w) {
    var wk = SRPE_WEEK[w];
    var detailStr = Object.keys(wk.byType).map(function(t){ return t+': '+Math.round(wk.byType[t]); }).join(' · ');
    return '<tr><td style="font-weight:600">'+w+'</td><td><span class="mono">'+Math.round(wk.total).toLocaleString('fr-FR')+'</span></td><td style="font-size:11px;color:var(--text2)">'+detailStr+'</td></tr>';
  }).join('');

  if (typeof Chart === 'undefined') { setTimeout(renderSrpeChart, 100); return; }
  var labels = SRPE_WEEKS.map(function(w){ return w.slice(0,5); });
  var data = SRPE_WEEKS.map(function(w){ return Math.round(SRPE_WEEK[w].total); });
  if (srpeChartInst) { srpeChartInst.destroy(); srpeChartInst = null; }
  var canvas = document.getElementById('srpeChart');
  srpeChartInst = new Chart(canvas, {
    type:'bar',
    data:{labels:labels, datasets:[{label:'sRPE collectif', data:data, backgroundColor:'#cc1122cc', borderColor:'#cc1122', borderWidth:1, borderRadius:4}]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{backgroundColor:'#1a0000', borderColor:'rgba(204,17,34,0.3)', borderWidth:1, titleColor:'#f0f0f0', bodyColor:'#888', padding:10}},
      scales:{
        y:{beginAtZero:true, ticks:{color:'#888', font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'}, border:{color:'transparent'}},
        x:{ticks:{color:'#888', font:{size:10}, maxTicksLimit:15}, grid:{display:false}, border:{color:'rgba(255,255,255,0.06)'}}
      }
    }
  });
}

function switchRpeTab(name) {
  var tabs=['joueurs','individuel','srpe','reglages'];
  var tabBtns = document.querySelectorAll('#view-rpe .tab-btn');
  tabBtns.forEach(function(t,i){t.classList.toggle('active',tabs[i]===name);});
  document.querySelectorAll('#view-rpe .tab-panel').forEach(function(p){p.classList.remove('active');});
  document.getElementById('rpetab-'+name).classList.add('active');
  if (name==='individuel') { buildRpePlayerSelect(); renderRpeIndiv(); }
  if (name==='srpe') setTimeout(renderSrpeChart, 50);
  if (name==='reglages') renderRpeReglages();
}

function defaultSessionDuration(type) {
  var t = type.toLowerCase();
  if (t.indexOf('off feet') !== -1) return 30;
  if (t.indexOf('match') !== -1) return 110;
  return 60;
}

function renderRpeReglages() {
  var d = document.getElementById('dateSelect').value;
  document.getElementById('reglages-date-label').textContent = d;
  var rpeDay = RPE[d];

  if (!rpeDay || !rpeDay.sessions.length) {
    document.getElementById('reglages-duration-tbody').innerHTML = '<tr><td colspan="4" style="color:var(--text2)">Aucune séance RPE ce jour.</td></tr>';
    document.getElementById('reglages-type-tbody').innerHTML = '<tr><td colspan="5" style="color:var(--text2)">Aucune séance RPE ce jour.</td></tr>';
    return;
  }

  var types = rpeDay.typeAvgs.map(function(t){return t.type;});

  document.getElementById('reglages-duration-tbody').innerHTML = types.map(function(t, idx) {
    var def = defaultSessionDuration(t);
    var key = d+'|'+t;
    var cur = RPE_OVERRIDES.durations[key] != null ? RPE_OVERRIDES.durations[key] : def;
    return '<tr><td style="font-weight:600">'+t+'</td><td style="color:var(--text2)">'+def+' min</td>'
      + '<td><input type="number" min="0" step="5" id="dur-input-'+idx+'" value="'+cur+'" style="width:80px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-family:\'JetBrains Mono\',monospace"></td>'
      + '<td><button class="btn-nav" style="width:auto;padding:0 12px;font-size:12px" data-rpe-date="'+d+'" data-rpe-type="'+t+'" data-rpe-input="dur-input-'+idx+'" onclick="saveDurationOverride(this)">Enregistrer</button></td></tr>';
  }).join('');

  var sortedSessions = rpeDay.sessions.slice().sort(function(a,b){ return (a.ts||'').localeCompare(b.ts||''); });
  document.getElementById('reglages-type-tbody').innerHTML = sortedSessions.map(function(s, idx) {
    var heure = (s.ts||'').split(' ')[1] || '-';
    var opts = types.map(function(t){ return '<option value="'+t+'"'+(t===s.type?' selected':'')+'>'+t+'</option>'; }).join('');
    return '<tr><td style="font-family:\'JetBrains Mono\',monospace;color:var(--text2)">'+heure+'</td><td style="font-weight:600">'+s.n+'</td><td>'+s.type+'</td>'
      + '<td><select id="type-fix-'+idx+'" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-family:var(--font)">'+opts+'</select></td>'
      + '<td><button class="btn-nav" style="width:auto;padding:0 12px;font-size:12px" data-rpe-date="'+d+'" data-rpe-player="'+s.n+'" data-rpe-ts="'+s.ts+'" data-rpe-select="type-fix-'+idx+'" onclick="saveTypeFix(this)">Corriger</button></td></tr>';
  }).join('');
}

function saveDurationOverride(btn) {
  var date = btn.getAttribute('data-rpe-date');
  var type = btn.getAttribute('data-rpe-type');
  var inputId = btn.getAttribute('data-rpe-input');
  var val = parseFloat(document.getElementById(inputId).value);
  if (isNaN(val) || val < 0) { alert('Duree invalide'); return; }
  RPE_OVERRIDES.durations[date+'|'+type] = val;
  saveOverrides();
  reprocessData();
  switchRpeTab('reglages');
}

function saveTypeFix(btn) {
  var date = btn.getAttribute('data-rpe-date');
  var player = btn.getAttribute('data-rpe-player');
  var ts = btn.getAttribute('data-rpe-ts');
  var selectId = btn.getAttribute('data-rpe-select');
  var newType = document.getElementById(selectId).value;
  RPE_OVERRIDES.typeFixes[date+'|'+player+'|'+ts] = newType;
  saveOverrides();
  reprocessData();
  switchRpeTab('reglages');
}

function resetReglagesDay() {
  var d = document.getElementById('dateSelect').value;
  if (!confirm('Réinitialiser les réglages (durée + corrections) pour '+d+' ?')) return;
  Object.keys(RPE_OVERRIDES.durations).forEach(function(k){ if (k.indexOf(d+'|')===0) delete RPE_OVERRIDES.durations[k]; });
  Object.keys(RPE_OVERRIDES.typeFixes).forEach(function(k){ if (k.indexOf(d+'|')===0) delete RPE_OVERRIDES.typeFixes[k]; });
  saveOverrides();
  reprocessData();
  switchRpeTab('reglages');
}

function moveDate(dir) {
  var sel=document.getElementById('dateSelect');
  var idx=ALLDAYS.indexOf(sel.value),next=idx+dir;
  if (next>=0&&next<ALLDAYS.length){sel.value=ALLDAYS[next];render();}
}
/* ── Fonctions d'intégration hub ── */

function setProgress(pct, msg) {
  var bar = document.getElementById('loader-bar');
  var sub = document.getElementById('loader-sub');
  if (bar) bar.style.width = pct + '%';
  if (sub && msg) sub.textContent = msg;
}

async function loadWellnessData() {
  setProgress(10, 'Connexion au Google Sheet...');
  try {
    var resp = await fetch(CSV_URL + '&t=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    setProgress(50, 'Analyse des données...');
    var text = await resp.text();
    var rows = parseCSV(text);
    RAW_ROWS = rows;
    setProgress(80, 'Calcul des statistiques...');
    var res = processData(rows);
    WD = res.out; PAVG21 = res.pa21; PAVG3 = res.pa3; PPERS = res.pp;
    RPE = res.rpeOut; RPEDAYS = res.rpeDates;
    SRPE_WEEK = res.srpeByWeek; SRPE_WEEKS = res.srpeWeeks;
    buildRpeRoster();
    ALLDAYS = Object.keys(WD).sort(function(a,b){ return a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join('')); });
    setProgress(100, 'Prêt !');
    var badge = document.getElementById('stats-badge');
    if (badge) { badge.textContent = res.total + ' entrées · ' + ALLDAYS.length + ' jours · ' + res.roster.length + ' joueurs'; badge.style.display = ''; }
    return true;
  } catch(e) {
    var errEl = document.getElementById('loader-error');
    var errDetail = document.getElementById('err-detail');
    if (errEl) errEl.style.display = 'block';
    if (errDetail) errDetail.textContent = e.message;
    console.warn('Wellness load error:', e.message);
    return false;
  }
}

function populateDateSelectors() {
  ['dateSelect', 'dateSelect2'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    ALLDAYS.forEach(function(d) {
      var o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel.appendChild(o);
    });
    sel.value = ALLDAYS[ALLDAYS.length - 1];
  });
}

async function refreshData() {
  var btn = document.getElementById('btn-refresh');
  if (btn) btn.classList.add('loading');
  var prev = document.getElementById('dateSelect') ? document.getElementById('dateSelect').value : null;
  var ok = await loadWellnessData();
  if (ok) {
    populateDateSelectors();
    if (prev && ALLDAYS.indexOf(prev) !== -1) {
      document.getElementById('dateSelect').value = prev;
      var sel2 = document.getElementById('dateSelect2');
      if (sel2) sel2.value = prev;
    }
    render();
  }
  if (btn) btn.classList.remove('loading');
}

function moveDate(dir) {
  var sel = document.getElementById('dateSelect');
  if (!sel) return;
  var idx = ALLDAYS.indexOf(sel.value), next = idx + dir;
  if (next >= 0 && next < ALLDAYS.length) {
    sel.value = ALLDAYS[next];
    var sel2 = document.getElementById('dateSelect2');
    if (sel2) sel2.value = ALLDAYS[next];
    render();
    if (document.getElementById('hub-rpe') && document.getElementById('hub-rpe').style.display !== 'none') renderRpe();
  }
}

function switchWTab(name) {
  var tabs = ['joueurs', 'tableau', 'chart', 'legende'];
  document.querySelectorAll('#hub-wellness .tab-btn').forEach(function(b, i) { b.classList.toggle('active', tabs[i] === name); });
  tabs.forEach(function(t) {
    var p = document.getElementById('wtab-' + t);
    if (p) p.classList.toggle('active', t === name);
  });
  if (name === 'chart' && ALLDAYS.length) setTimeout(function(){ drawChart(document.getElementById('dateSelect').value); }, 50);
}
