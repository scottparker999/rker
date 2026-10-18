"use strict";
const PLAN = {
  push:{name:"Push",sub:"Tuesday",dow:2,mins:45,ex:[
    {id:"floor-press",n:"Dumbbell floor press",sets:4,lo:6,hi:8,start:"10–14 kg",unit:"per hand",rest:150,load:"kg",
     how:"Lie with knees bent, dumbbells above your chest. Lower until your upper arms touch the floor at about 45°, pause, then press. Don't bounce the elbows."},
    {id:"ohp",n:"Standing overhead press",sets:3,lo:8,hi:8,start:"6–10 kg",unit:"per hand",rest:90,load:"kg",
     how:"Dumbbells at shoulder height, abs and glutes braced. Press to lockout without leaning back, then lower under control."},
    {id:"fe-pushup",n:"Feet-elevated push-ups",sets:3,lo:10,hi:15,start:"Bodyweight",unit:"+ backpack later",rest:90,load:"bw",
     how:"Feet on a step or chair, hands slightly wider than shoulders. Body straight, chest to just above the floor, push up. Add a loaded backpack once 15 is easy."},
    {id:"lateral",n:"Lateral raises",sets:3,lo:12,hi:15,start:"3–5 kg",unit:"per hand",rest:60,load:"kg",
     how:"Raise the dumbbells out to shoulder height, leading with the elbows, then lower slowly. No swinging."},
    {id:"oh-tri",n:"Overhead tricep extension",sets:3,lo:10,hi:12,start:"8–12 kg",unit:"one dumbbell",rest:60,load:"kg",
     how:"One dumbbell overhead in both hands. Elbows pointing forward, lower behind your head, then straighten."},
    {id:"ext-rot",n:"Band external rotation",sets:2,lo:15,hi:15,start:"Light band",unit:"per arm",rest:45,load:"band",
     how:"Band at elbow height, stand side-on, elbow at 90° and tucked in. Rotate the forearm outward, return slowly."}
  ]},
  pull:{name:"Pull",sub:"Thursday",dow:4,mins:50,ex:[
    {id:"bo-row",n:"Bent-over row",sets:4,lo:6,hi:8,start:"10–14 kg",unit:"per hand",rest:120,load:"kg",
     how:"Hinge to about 45° with a flat back. Pull to your lower ribs, squeeze the shoulder blades, lower under control."},
    {id:"pullup",n:"Pull-ups or pullovers",sets:3,lo:null,hi:null,start:"Bodyweight / 8–12 kg",unit:"as many as possible",rest:120,load:"bw",
     how:"Chin over the bar, then lower fully. No bar: floor dumbbell pullovers for 12, one dumbbell arcing behind your head and back."},
    {id:"oa-row",n:"One-arm dumbbell row",sets:3,lo:10,hi:10,start:"12–16 kg",unit:"per side",rest:60,load:"kg",
     how:"Free hand braced on knee or chair, back flat. Drive the elbow back towards your hip, lower fully."},
    {id:"face-pull",n:"Face pulls",sets:3,lo:15,hi:15,start:"Light–medium band",unit:"or 3–5 kg rear-delt flyes",rest:50,load:"band",
     how:"Band at face height, palms down. Pull towards your face, hands finishing beside your ears with elbows high."},
    {id:"curl",n:"Bicep curls",sets:3,lo:10,hi:12,start:"6–10 kg",unit:"per hand",rest:60,load:"kg",
     how:"Elbows pinned at your sides. Curl up, lower over 2–3 seconds. No swinging."},
    {id:"wrist",n:"Wrist curls + reverse",sets:2,lo:15,hi:15,start:"4–7 kg / 2–4 kg",unit:"palm up / palm down",rest:45,load:"kg",
     how:"Forearm on thigh, wrist past the knee. Curl the wrist up, lower slowly. Repeat palm down with a lighter weight."}
  ]},
  upper:{name:"Upper + legs",sub:"Saturday",dow:6,mins:55,ex:[
    {id:"pushup",n:"Push-ups",sets:3,lo:null,hi:null,start:"Bodyweight",unit:"as many as possible",rest:90,load:"bw",
     how:"Hands slightly wider than shoulders, body straight. Stop 1–2 reps before your form breaks."},
    {id:"shrug",n:"Dumbbell shrugs",sets:3,lo:12,hi:12,start:"14–20 kg",unit:"per hand",rest:60,load:"kg",
     how:"Lift the shoulders straight up to your ears, hold a second, lower. Don't roll them."},
    {id:"hammer",n:"Hammer curls",sets:2,lo:12,hi:12,start:"8–10 kg",unit:"per hand",rest:60,load:"kg",
     how:"Palms facing each other throughout, elbows still."},
    {id:"skull",n:"Floor skull crushers",sets:2,lo:12,hi:12,start:"5–8 kg",unit:"per hand",rest:60,load:"kg",
     how:"Lying down, dumbbells above chest. Bend only at the elbows to lower beside your head, then straighten."},
    {id:"woodchop",n:"Half-kneeling woodchop",sets:2,lo:10,hi:10,start:"Medium band / 4–6 kg",unit:"per side",rest:45,load:"band",
     how:"Kneel side-on to a high anchor. Pull diagonally down across your body to the opposite hip, rotating through the torso."},
    {id:"rdl",n:"Romanian deadlift",sets:3,lo:8,hi:8,start:"12–16 kg",unit:"per hand",rest:120,load:"kg",
     how:"Slight knee bend, push the hips back, lower until a strong hamstring stretch. Flat back, drive the hips forward to stand."},
    {id:"split",n:"Rear-foot-elevated split squat",sets:2,lo:10,hi:10,start:"Bodyweight → 4–8 kg",unit:"per leg",rest:75,load:"kg",
     how:"Back foot on a low step. Lower until the front thigh is about parallel, push up through the front heel."},
    {id:"calf",n:"Single-leg calf raises",sets:2,lo:15,hi:15,start:"Bodyweight → 8–12 kg",unit:"per leg",rest:45,load:"kg",
     how:"On a step edge, heel below the step, rise high onto your toes."}
  ]}
};
const ORDER = ["push","pull","upper"];
const EX = {}; ORDER.forEach(d=>PLAN[d].ex.forEach(e=>EX[e.id]={...e,day:d}));

const $ = s=>document.querySelector(s);
const el = (tag,attrs={},...kids)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")n.className=v;else if(k.startsWith("on"))n.addEventListener(k.slice(2),v);else if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;n.append(c.nodeType?c:document.createTextNode(c))}return n};
const iso = d=>{const z=new Date(d);z.setMinutes(z.getMinutes()-z.getTimezoneOffset());return z.toISOString().slice(0,10)};
const fmtDate = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"});
const fmtShort = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short"});
const num = v=>{if(v===""||v==null)return null;const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
const fmtKg = n=>n==null?"–":(Math.round(n*10)/10).toString();

function defaultDay(){const dow=new Date().getDay();for(let i=0;i<7;i++){const d=(dow+i)%7;const hit=ORDER.find(k=>PLAN[k].dow===d);if(hit)return hit}return "push"}

const S = {tab:"log",day:defaultDay(),date:iso(new Date()),autoDate:true,sessions:{},body:{},play:{},db:null,draft:null,dirty:false,timer:null,confirmClear:false};

/* ---------- storage ---------- */
function setStatus(t,ok){const s=$("#status");s.textContent=t;s.classList.toggle("ok",!!ok)}
const sid = ()=>S.date+"_"+S.day;
function loadDraft(){
  saveNow(); // keep any edit still waiting for its save before switching drafts
  const ex=S.sessions[sid()];
  S.draft = ex?JSON.parse(JSON.stringify(ex)):{date:S.date,day:S.day,entries:{}};
  S.dirty=false; S.confirmClear=false;
}
let saveT=null;
function scheduleSave(){S.dirty=true;showSync();clearTimeout(saveT);saveT=setTimeout(saveNow,600)}
// Saving is synchronous: the change is queued on the phone straight away and synced later.
function saveNow(){
  clearTimeout(saveT);
  if(!S.dirty||!S.draft)return;
  const body={...JSON.parse(JSON.stringify(S.draft)),updatedAt:new Date().toISOString()};
  S.dirty=false;
  S.db.collection("sessions").doc(body.date+"_"+body.day).set(body);
  showSync();
}

/* ---------- history helpers ---------- */
function sessionsSorted(){return Object.values(S.sessions).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)}
function doneSets(entry){return (entry||[]).filter(s=>s&&s.done)}
function lastFor(exId,beforeDate,excludeId){
  const list=sessionsSorted().filter(s=>(s.date+"_"+s.day)!==excludeId&&s.date<=beforeDate&&doneSets(s.entries&&s.entries[exId]).length);
  return list.length?list[list.length-1]:null;
}
function best(exId,sess){
  const sets=doneSets(sess.entries[exId]);if(!sets.length)return null;
  const e=EX[exId];
  if(e.load==="kg"){const k=Math.max(...sets.map(s=>s.kg??0));return k}
  return Math.max(...sets.map(s=>s.reps??0));
}
function readyToProgress(e,sess){
  if(e.hi==null)return null;
  const sets=doneSets(sess.entries[e.id]);
  if(sets.length<e.sets)return false;
  return sets.slice(0,e.sets).every(s=>(s.reps??0)>=e.hi);
}

/* ---------- rest timer ---------- */
let audio=null;
function beep(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=880;g.gain.setValueAtTime(.001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.25,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.5);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.55)}catch(e){}}
function startTimer(secs,label){
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
  S.timer={end:Date.now()+secs*1000,total:secs,label,beeped:false};
  $("#timer").hidden=false;tick();
}
function tick(){
  const t=S.timer;if(!t)return;
  const left=Math.round((t.end-Date.now())/1000);
  const a=Math.abs(left);
  $("#timer-t").textContent=(left<0?"+":"")+Math.floor(a/60)+":"+String(a%60).padStart(2,"0");
  $("#timer-lbl").textContent=left>0?"Rest · next: "+t.label:"Rest's up. Go again.";
  $("#timer").classList.toggle("over",left<=0);
  $("#timer-bar").style.width=Math.max(0,Math.min(100,(1-left/t.total)*100))+"%";
  if(left<=0&&!t.beeped){t.beeped=true;beep()}
  clearTimeout(t.h);t.h=setTimeout(tick,250);
}
$("#timer-add").onclick=()=>{if(S.timer){S.timer.end+=15000;S.timer.total+=15;S.timer.beeped=false;tick()}};
$("#timer-skip").onclick=()=>{if(S.timer)clearTimeout(S.timer.h);S.timer=null;$("#timer").hidden=true};

/* ---------- views ---------- */
const tickIcon=()=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.innerHTML='<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';return s};

function renderLog(){
  const m=$("#main");m.replaceChildren();
  const rt=recentTennis();
  if(rt)m.append(el("div",{class:"notice"},el("b",{},(rt.date===iso(new Date())?"Tennis today: ":"Tennis last night: ")+fmtDur(rt.durationMin)+", "+fmtInt(rt.activeKcal)+" kcal. "),
    "Eat a little extra today to stay in surplus"+(S.day==="upper"?", and go easy on the legs block if they're heavy.":". Grip may be tired, so stop sets when form slips.")));
  m.append(el("div",{class:"daybar"},ORDER.map(k=>el("button",{type:"button","aria-pressed":String(S.day===k),onclick:()=>{saveNow();S.day=k;loadDraft();renderLog()}},el("b",{},PLAN[k].name),el("span",{},PLAN[k].sub+" · ~"+PLAN[k].mins+" min")))));
  const p=PLAN[S.day];
  m.append(el("div",{class:"daterow"},
    el("label",{for:"sess-date"},"Session date ",el("input",{type:"date",id:"sess-date",value:S.date,max:iso(new Date()),onchange:e=>{if(e.target.value){saveNow();S.date=e.target.value;S.autoDate=S.date===iso(new Date());loadDraft();renderLog()}}})),
    el("span",{},S.sessions[sid()]?"Logged · edits save automatically":"Ticks save automatically")
  ));
  p.ex.forEach((e,idx)=>m.append(exCard(e,p.ex[idx+1])));
  // footer actions
  const exists=!!S.sessions[sid()];
  if(exists){
    m.append(el("div",{class:"row"},
      S.confirmClear
        ? [el("span",{class:"hint"},"Delete this session's log?"),el("button",{type:"button",class:"btn danger",onclick:clearSession},"Delete"),el("button",{type:"button",class:"btn quiet",onclick:()=>{S.confirmClear=false;renderLog()}},"Keep")]
        : el("button",{type:"button",class:"btn quiet",onclick:()=>{S.confirmClear=true;renderLog()}},"Delete this session")
    ));
  }
  m.append(el("p",{class:"hint"},"Warm up 5–10 minutes first. Finish each set with 1–2 reps in the tank. Grey numbers are last session's; tick a set to accept them."+("wakeLock" in navigator?" The screen stays on while this tab is open.":"")));
}
function clearSession(){
  clearTimeout(saveT);S.dirty=false; // drop the pending save so it can't bring the session back
  S.db.collection("sessions").doc(sid()).delete();
  loadDraft();renderLog();
}

function exCard(e,next){
  const last=lastFor(e.id,S.date,sid());
  const lastSets=last?doneSets(last.entries[e.id]):[];
  const ready=last?readyToProgress(e,last):null;
  const entries=S.draft.entries[e.id]=S.draft.entries[e.id]||[];
  const target=e.hi==null?e.sets+" × max":e.sets+" × "+(e.lo===e.hi?e.hi:e.lo+"–"+e.hi);
  const lastTxt=last?(e.load==="kg"?lastSets.map(s=>fmtKg(s.kg)+"×"+(s.reps??"–")).join(", "):lastSets.map(s=>(s.kg?"+"+fmtKg(s.kg)+"kg×":"")+(s.reps??"–")).join(", ")):null;
  const card=el("section",{class:"ex","aria-label":e.n},
    el("div",{class:"ex-top"},el("h2",{},e.n),el("span",{class:"target"},target)),
    el("div",{class:"specs"},el("span",{},"Start ",el("b",{},e.start)," ",e.unit),el("span",{},"Rest ",el("b",{},e.rest>=120?Math.floor(e.rest/60)+(e.rest%60?":"+String(e.rest%60).padStart(2,"0"):"")+" min":e.rest+" s"))),
    last?el("div",{class:"last"},el("span",{class:"num"},fmtShort(last.date)+": "+lastTxt),
      ready===true?el("span",{class:"chip up"},e.load==="kg"?"Add 1–2 kg":"Make it harder"):ready===false?el("span",{class:"chip hold"},"Same again"):null)
      :el("div",{class:"last"},"First time. Start at the low end and find your weight."),
  );
  const sets=el("div",{class:"sets"});
  for(let i=0;i<e.sets;i++){
    const cur=entries[i]||{kg:null,reps:null,done:false};
    const prev=lastSets[i]||lastSets[lastSets.length-1]||null;
    const kgPh=prev&&prev.kg!=null?fmtKg(prev.kg):(e.load==="kg"?"":"–");
    const repPh=prev&&prev.reps!=null?String(prev.reps):(e.hi==null?"":String(e.hi));
    const row=el("div",{class:"set"+(cur.done?" done":"")});
    const kgIn=el("input",{type:"number",inputmode:"decimal",step:"0.5",min:"0",id:`kg-${e.id}-${i}`,"aria-label":`${e.n} set ${i+1} kilograms`,placeholder:kgPh,value:cur.kg??""});
    const rIn=el("input",{type:"number",inputmode:"numeric",step:"1",min:"0",id:`reps-${e.id}-${i}`,"aria-label":`${e.n} set ${i+1} reps`,placeholder:repPh,value:cur.reps??""});
    const write=()=>{entries[i]={kg:num(kgIn.value),reps:num(rIn.value),done:row.classList.contains("done")};scheduleSave()};
    kgIn.addEventListener("input",write);rIn.addEventListener("input",write);
    const btn=el("button",{type:"button",class:"tick","aria-label":`Mark set ${i+1} done`,"aria-pressed":String(!!cur.done),onclick:()=>{
      const on=!row.classList.contains("done");
      if(on){if(kgIn.value===""&&kgPh!==""&&kgPh!=="–")kgIn.value=kgPh;if(rIn.value===""&&repPh!=="")rIn.value=repPh}
      row.classList.toggle("done",on);btn.setAttribute("aria-pressed",String(on));write();
      if(on){const lastSet=i===e.sets-1;startTimer(lastSet?Math.max(e.rest,90):e.rest,lastSet?(next?next.n:"session done"):e.n+" set "+(i+2))}
    }},tickIcon());
    row.append(el("span",{class:"n"},String(i+1)),
      el("div",{class:"field"},kgIn,el("i",{},e.load==="band"?"kg?":e.load==="bw"?"+kg":"kg")),
      el("div",{class:"field"},rIn,el("i",{},"reps")),btn);
    sets.append(row);
  }
  card.append(sets,el("details",{class:"how"},el("summary",{},"How to do it"),el("p",{},e.how)));
  return card;
}

function sparkSVG(vals,w,h,pad){
  const ns="http://www.w3.org/2000/svg";const s=document.createElementNS(ns,"svg");
  s.setAttribute("viewBox",`0 0 ${w} ${h}`);s.setAttribute("class","spark");s.setAttribute("aria-hidden","true");
  const lo=Math.min(...vals),hi=Math.max(...vals),r=hi-lo||1;
  const pts=vals.map((v,i)=>[pad+(vals.length===1?0:i*(w-2*pad)/(vals.length-1)),h-pad-((v-lo)/r)*(h-2*pad)]);
  const line=document.createElementNS(ns,"polyline");line.setAttribute("points",pts.map(p=>p.join(",")).join(" "));
  line.setAttribute("fill","none");line.setAttribute("stroke","var(--accent)");line.setAttribute("stroke-width","1.8");line.setAttribute("stroke-linejoin","round");
  const dot=document.createElementNS(ns,"circle");const L=pts[pts.length-1];dot.setAttribute("cx",L[0]);dot.setAttribute("cy",L[1]);dot.setAttribute("r","2.8");dot.setAttribute("fill","var(--accent)");
  s.append(line,dot);return s;
}

function renderProgress(){
  const m=$("#main");m.replaceChildren();
  const all=sessionsSorted().filter(s=>Object.values(s.entries||{}).some(x=>doneSets(x).length));
  const now=new Date();const weekAgo=iso(new Date(now-6*864e5));
  const thisWeek=all.filter(s=>s.date>=weekAgo).length;
  const bodies=Object.values(S.body).filter(b=>b.weight!=null).sort((a,b)=>a.date<b.date?-1:1);
  const bwChange=bodies.length>1?bodies[bodies.length-1].weight-bodies[0].weight:null;
  m.append(el("section",{class:"panel"},el("h2",{},"Overview"),
    el("div",{class:"kpis"},
      el("div",{class:"kpi"},el("b",{class:"num"},String(all.length)),el("span",{},"sessions logged")),
      el("div",{class:"kpi"},el("b",{class:"num"},thisWeek+"/3"),el("span",{},"last 7 days")),
      el("div",{class:"kpi"},el("b",{class:"num"},bwChange==null?"–":(bwChange>=0?"+":"")+fmtKg(bwChange)),el("span",{},"kg bodyweight"))
    ),
    all.length?null:el("p",{class:"empty"},"Your trends appear here after you log sessions on the Train tab. Each lift needs two sessions to show a line.")
  ));
  ORDER.forEach(d=>{
    const p=PLAN[d];const panel=el("section",{class:"panel"},el("h2",{},p.name));
    p.ex.forEach(e=>{
      const pts=all.filter(s=>doneSets(s.entries[e.id]).length).map(s=>({date:s.date,v:best(e.id,s)}));
      const unit=e.load==="kg"?"kg":"reps";
      const row=el("div",{class:"trend"},el("div",{class:"nm"},e.n,el("small",{},pts.length?pts.length+" session"+(pts.length>1?"s":"")+" · best "+(e.load==="kg"?"weight":"reps"):"Not logged yet")));
      if(pts.length>=2)row.append(sparkSVG(pts.map(p=>p.v),92,28,3));else row.append(el("span",{}));
      if(pts.length){const f=pts[0].v,l=pts[pts.length-1].v,dl=l-f;
        row.append(el("div",{class:"v"},fmtKg(l)+" "+unit,pts.length>1?el("span",{class:"d "+(dl>0?"pos":dl<0?"neg":"flat")},(dl>0?"+":"")+fmtKg(dl)+" since "+fmtShort(pts[0].date)):null));
      }else row.append(el("div",{class:"v"},"–"));
      panel.append(row);
    });
    m.append(panel);
  });
  m.append(el("section",{class:"panel"},el("h2",{},"Your data"),
    el("p",{class:"hint"},"Download a copy for your records or a spreadsheet."),
    el("div",{class:"row"},
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("lifts")},"Lifts (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("play")},"Tennis (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("body")},"Body (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("backup")},"Full backup (JSON)"))));
}

function bodyChart(rows){
  const W=600,H=200,P={l:38,r:12,t:12,b:24};const ns="http://www.w3.org/2000/svg";
  const s=document.createElementNS(ns,"svg");s.setAttribute("viewBox",`0 0 ${W} ${H}`);s.setAttribute("class","chart");s.setAttribute("role","img");
  const vals=rows.map(r=>r.weight);let lo=Math.floor(Math.min(...vals)-0.5),hi=Math.ceil(Math.max(...vals)+0.5);if(hi-lo<2){hi+=1;lo-=1}
  const t0=new Date(rows[0].date).getTime(),t1=new Date(rows[rows.length-1].date).getTime(),tr=t1-t0||1;
  const X=d=>P.l+(new Date(d).getTime()-t0)/tr*(W-P.l-P.r),Y=v=>P.t+(hi-v)/(hi-lo)*(H-P.t-P.b);
  s.setAttribute("aria-label",`Bodyweight from ${rows[0].weight} kg to ${rows[rows.length-1].weight} kg`);
  const step=Math.max(1,Math.ceil((hi-lo)/4));
  for(let v=lo;v<=hi;v+=step){const g=document.createElementNS(ns,"line");g.setAttribute("x1",P.l);g.setAttribute("x2",W-P.r);g.setAttribute("y1",Y(v));g.setAttribute("y2",Y(v));g.setAttribute("stroke","var(--line)");s.append(g);
    const t=document.createElementNS(ns,"text");t.setAttribute("x",P.l-6);t.setAttribute("y",Y(v)+4);t.setAttribute("text-anchor","end");t.textContent=v;s.append(t)}
  [rows[0],rows[rows.length-1]].forEach((r,i)=>{const t=document.createElementNS(ns,"text");t.setAttribute("x",i?W-P.r:P.l);t.setAttribute("y",H-6);t.setAttribute("text-anchor",i?"end":"start");t.textContent=fmtShort(r.date);s.append(t)});
  const area=document.createElementNS(ns,"path");
  area.setAttribute("d","M"+rows.map(r=>X(r.date)+","+Y(r.weight)).join("L")+`L${X(rows[rows.length-1].date)},${H-P.b}L${X(rows[0].date)},${H-P.b}Z`);
  area.setAttribute("fill","var(--accent-soft)");s.append(area);
  const line=document.createElementNS(ns,"polyline");line.setAttribute("points",rows.map(r=>X(r.date)+","+Y(r.weight)).join(" "));line.setAttribute("fill","none");line.setAttribute("stroke","var(--accent)");line.setAttribute("stroke-width","2.2");line.setAttribute("stroke-linejoin","round");s.append(line);
  rows.forEach((r,i)=>{const c=document.createElementNS(ns,"circle");c.setAttribute("cx",X(r.date));c.setAttribute("cy",Y(r.weight));c.setAttribute("r",i===rows.length-1?4.5:2.5);c.setAttribute("fill","var(--accent)");s.append(c)});
  return s;
}

function renderBody(){
  const m=$("#main");m.replaceChildren();
  const today=iso(new Date());const cur=S.body[today]||{};
  const f=(id,label,unit,val)=>el("label",{for:id},label,el("div",{class:"field"},el("input",{type:"number",inputmode:"decimal",step:"0.1",min:"0",id,value:val??""}),el("i",{},unit)));
  const form=el("form",{class:"form",onsubmit:async ev=>{
    ev.preventDefault();
    const d=$("#b-date").value||today;
    const rec={date:d,weight:num($("#b-weight").value),arm:num($("#b-arm").value),chest:num($("#b-chest").value),waist:num($("#b-waist").value),photo:$("#b-photo").checked,updatedAt:new Date().toISOString()};
    if([rec.weight,rec.arm,rec.chest,rec.waist].every(v=>v==null)&&!rec.photo){$("#b-msg").textContent="Enter at least one measurement.";return}
    $("#b-msg").textContent="Saving…";
    try{await S.db.collection("body").doc(d).set(rec);$("#b-msg").textContent="Saved for "+fmtDate(d)+(Sync.state==="offline"?". It will sync when you're back online.":".");renderBodyLists()}
    catch(e){$("#b-msg").textContent="Couldn't save. Try again in a moment."}
  }},
    el("label",{for:"b-date",class:"full"},"Date",el("div",{class:"field"},el("input",{type:"date",id:"b-date",value:today,max:today,onchange:e=>{const r=S.body[e.target.value]||{};$("#b-weight").value=r.weight??"";$("#b-arm").value=r.arm??"";$("#b-chest").value=r.chest??"";$("#b-waist").value=r.waist??"";$("#b-photo").checked=!!r.photo}}))),
    f("b-weight","Bodyweight","kg",cur.weight),f("b-arm","Arm (flexed)","cm",cur.arm),f("b-chest","Chest","cm",cur.chest),f("b-waist","Waist","cm",cur.waist),
    el("label",{class:"check full",for:"b-photo"},el("input",{type:"checkbox",id:"b-photo",checked:!!cur.photo}),"Progress photo taken (every 4 weeks)"),
    el("div",{class:"row full"},el("button",{type:"submit",class:"btn primary"},"Save entry"),el("span",{class:"hint",id:"b-msg","aria-live":"polite"}))
  );
  m.append(el("section",{class:"panel"},el("h2",{},"Log measurements"),el("p",{class:"hint"},"Weigh in weekly, same time of day. Measure arms and chest monthly."),form));
  m.append(el("div",{id:"body-lists",class:"stack"}));
  renderBodyLists();
}
function renderBodyLists(){
  const box=$("#body-lists");if(!box)return;box.replaceChildren();
  const rows=Object.values(S.body).sort((a,b)=>a.date<b.date?-1:1);
  const w=rows.filter(r=>r.weight!=null);
  const chart=el("section",{class:"panel"},el("h2",{},"Bodyweight"));
  if(w.length>=2){
    const days=(new Date(w[w.length-1].date)-new Date(w[0].date))/864e5;
    const perMonth=days>0?(w[w.length-1].weight-w[0].weight)/days*30.4:0;
    const verdict=days<21?"Keep logging; the trend needs about three weeks.":perMonth<0.25?"Below target. Eat a little more.":perMonth>0.75?"Faster than needed; some of it may be fat.":"On target for lean gain.";
    chart.append(el("p",{class:"hint"},el("b",{class:"num"},(perMonth>=0?"+":"")+perMonth.toFixed(2)+" kg/month")," · goal +0.25 to +0.5. ",verdict),bodyChart(w));
  }else chart.append(el("p",{class:"empty"},w.length?"One weigh-in so far. The chart starts with your second.":"No weigh-ins yet. Log your first one above."));
  box.append(chart);
  if(rows.length){
    const tb=el("tbody");rows.slice().reverse().forEach(r=>tb.append(el("tr",{},el("td",{},fmtShort(r.date)),el("td",{},fmtKg(r.weight)),el("td",{},fmtKg(r.arm)),el("td",{},fmtKg(r.chest)),el("td",{},fmtKg(r.waist)),el("td",{},r.photo?"✓":""))));
    box.append(el("section",{class:"panel"},el("h2",{},"History"),el("div",{class:"tablewrap"},el("table",{class:"hist"},el("thead",{},el("tr",{},["Date","kg","Arm","Chest","Waist","Photo"].map(h=>el("th",{},h)))),tb))));
  }
}

function render(){
  document.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===S.tab)));
  ({log:renderLog,play:renderPlay,progress:renderProgress,body:renderBody})[S.tab]();
  syncWake();
}
/* ---------- Play: tennis sessions from Apple Health ---------- */
const ZONES=[{n:"Z1",lo:0,hi:.6,label:"Easy"},{n:"Z2",lo:.6,hi:.7,label:"Steady"},{n:"Z3",lo:.7,hi:.8,label:"Moderate"},{n:"Z4",lo:.8,hi:.9,label:"Hard"},{n:"Z5",lo:.9,hi:9,label:"Max"}];
// Max heart rate, fixed at the peak recorded on 7 Oct 2026 (sustained 192–196 bpm, so not a sensor glitch).
// It falls by about 1 bpm a year: review it every year or two.
const MAX_HR=196;
function playSorted(){return Object.values(S.play||{}).filter(p=>p&&p.date).sort((a,b)=>(a.start||a.date)<(b.start||b.date)?1:-1)}
function hrMax(){return MAX_HR}
function zoneMinutes(p,max){
  const z=[0,0,0,0,0];if(!Array.isArray(p.hr))return null;
  for(const v of p.hr){if(v==null)continue;const r=v/max;const i=ZONES.findIndex(Z=>r>=Z.lo&&r<Z.hi);z[i<0?4:i]++}
  return z.some(Boolean)?z:null;
}
const fmtDur=min=>{if(min==null)return "–";const h=Math.floor(min/60),m=Math.round(min%60);return h?h+"h "+String(m).padStart(2,"0")+"m":m+"m"};
const fmtInt=n=>n==null?"–":Math.round(n).toLocaleString("en-AU");
const fmtClock=hhmm=>{if(!hhmm)return "";const[h,m]=hhmm.split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+(h<12?"am":"pm")};
function weekStart(dateStr){const d=new Date(dateStr+"T12:00:00");const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return iso(d)}

function recentTennis(){
  // a session that finished within the last 20 hours
  const now=Date.now();
  return playSorted().find(p=>{const t=Date.parse((p.end||p.start||"").replace(" ","T").replace(/ ([+-]\d\d)(\d\d)$/,"$1:$2"));return Number.isFinite(t)&&now-t>=0&&now-t<20*3600e3});
}

function zoneBar(z){
  const total=z.reduce((a,b)=>a+b,0);
  const bar=el("div",{class:"zbar",role:"img","aria-label":ZONES.map((Z,i)=>`${Z.n} ${z[i]} min`).join(", ")});
  z.forEach((v,i)=>{if(!v)return;const seg=el("span",{class:"z"+(i+1),title:`${ZONES[i].n} ${ZONES[i].label}: ${v} min`});seg.style.flexGrow=v;bar.append(seg)});
  const hard=z[3]+z[4];
  return [bar,el("div",{class:"zlegend"},ZONES.map((Z,i)=>el("span",{},el("i",{class:"z"+(i+1)}),`${Z.n} ${z[i]}m`)),el("span",{class:"zhard"},Math.round(hard/total*100)+"% hard"))];
}

function hrTrace(p,max){
  const ns="http://www.w3.org/2000/svg",W=600,H=140,P={l:34,r:8,t:8,b:20};
  const pts=p.hr.map((v,i)=>v==null?null:[i,v]).filter(Boolean);if(pts.length<2)return null;
  const lo=Math.max(40,Math.floor(Math.min(...pts.map(q=>q[1]))/20)*20),hi=Math.ceil(Math.max(...pts.map(q=>q[1]),max*.9)/20)*20;
  const n=p.hr.length-1||1;const X=i=>P.l+i/n*(W-P.l-P.r),Y=v=>P.t+(hi-v)/(hi-lo)*(H-P.t-P.b);
  const s=document.createElementNS(ns,"svg");s.setAttribute("viewBox",`0 0 ${W} ${H}`);s.setAttribute("class","chart");s.setAttribute("role","img");
  s.setAttribute("aria-label",`Heart rate during the session, average ${p.avgHr}, max ${p.maxHr} bpm`);
  const mk=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);return e};
  // zone bands
  ZONES.forEach((Z,i)=>{const top=Math.min(hi,Z.hi*max),bot=Math.max(lo,Z.lo*max);if(top<=bot)return;
    s.append(mk("rect",{x:P.l,y:Y(top),width:W-P.l-P.r,height:Y(bot)-Y(top),class:"band z"+(i+1)}))});
  for(let v=lo;v<=hi;v+=20){s.append(mk("line",{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),stroke:"var(--line)"}));const t=mk("text",{x:P.l-6,y:Y(v)+4,"text-anchor":"end"});t.textContent=v;s.append(t)}
  let d="";let pen=false;p.hr.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1);pen=true});
  s.append(mk("path",{d,fill:"none",stroke:"var(--ink)","stroke-width":"1.6","stroke-linejoin":"round"}));
  const last=p.hr.length-1;[[0,"0"],[last,fmtDur(last)]].forEach(([i,l],k)=>{const t=mk("text",{x:X(i),y:H-4,"text-anchor":k?"end":"start"});t.textContent=l;s.append(t)});
  return s;
}

function playCard(p,max){
  const z=zoneMinutes(p,max);
  const stats=[
    ["Energy",fmtInt(p.activeKcal),"kcal"],["Avg HR",fmtInt(p.avgHr),"bpm"],["Max HR",fmtInt(p.maxHr),"bpm"],
    ["Distance",p.distanceKm==null?"–":p.distanceKm.toFixed(1),"km"],["Steps",fmtInt(p.steps),""],
    ["Court",p.tempC==null?"–":Math.round(p.tempC)+"°",p.humidity==null?"":p.humidity+"%"]];
  const card=el("section",{class:"pcard","aria-label":"Tennis "+fmtDate(p.date)},
    el("div",{class:"ex-top"},el("div",{},el("h2",{},fmtDate(p.date)),el("div",{class:"meta-line"},[fmtClock(p.startTime),fmtClock(p.endTime)].filter(Boolean).join(" – "))),
      el("span",{class:"pdur"},fmtDur(p.durationMin))),
    el("dl",{class:"pstats"},stats.map(([k,v,u])=>el("div",{},el("dt",{},k),el("dd",{},el("b",{class:"num"},v),u?" "+u:"")))),
    z?zoneBar(z):null);
  if(Array.isArray(p.hr)&&p.hr.some(v=>v!=null)){
    const det=el("details",{class:"how"},el("summary",{},"Heart rate trace"));
    det.addEventListener("toggle",()=>{if(det.open&&!det.querySelector("svg")){const c=hrTrace(p,max);if(c)det.append(c)}},{once:false});
    card.append(det);
  }
  return card;
}

function weeklyChart(weeks){
  const ns="http://www.w3.org/2000/svg",W=600,H=170,P={l:30,r:8,t:12,b:24};
  const mk=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);return e};
  const maxH=Math.max(4,Math.ceil(Math.max(...weeks.map(w=>w.min/60))));
  const s=mk("svg",{viewBox:`0 0 ${W} ${H}`,class:"chart",role:"img","aria-label":"Hours of tennis per week, last 8 weeks"});
  const bw=(W-P.l-P.r)/weeks.length,Y=v=>P.t+(maxH-v)/maxH*(H-P.t-P.b);
  const step=maxH>8?2:1;
  for(let v=0;v<=maxH;v+=step){s.append(mk("line",{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),stroke:"var(--line)"}));const t=mk("text",{x:P.l-6,y:Y(v)+4,"text-anchor":"end"});t.textContent=v+"h";s.append(t)}
  weeks.forEach((w,i)=>{const h=w.min/60,x=P.l+i*bw+bw*.18,wd=bw*.64;
    if(h>0)s.append(mk("rect",{x,y:Y(h),width:wd,height:Y(0)-Y(h),rx:3,fill:i===weeks.length-1?"var(--accent)":"var(--accent-soft)",stroke:"var(--accent)","stroke-width":i===weeks.length-1?0:1}));
    if(w.n){const t=mk("text",{x:x+wd/2,y:Y(h)-5,"text-anchor":"middle"});t.textContent=w.n+"×";s.append(t)}
    const t=mk("text",{x:x+wd/2,y:H-6,"text-anchor":"middle"});t.textContent=i===weeks.length-1?"This wk":fmtShort(w.start);s.append(t)});
  return s;
}

let playShown=8;
function renderPlay(){
  const m=$("#main");m.replaceChildren();
  const list=playSorted(),max=hrMax();
  const thisWk=weekStart(iso(new Date()));
  const weeks=[];for(let i=7;i>=0;i--){const d=new Date(thisWk+"T12:00:00");d.setDate(d.getDate()-7*i);weeks.push({start:iso(d),min:0,n:0,kcal:0})}
  list.forEach(p=>{const w=weeks.find(w=>w.start===weekStart(p.date));if(w){w.min+=p.durationMin||0;w.n++;w.kcal+=p.activeKcal||0}});
  const cur=weeks[weeks.length-1],prev=weeks.slice(3,7),avgMin=prev.reduce((a,w)=>a+w.min,0)/4;

  if(!list.length){
    m.append(el("section",{class:"panel"},el("h2",{},"Tennis"),
      el("p",{class:"empty"},"No tennis sessions yet. They appear here automatically once Health Auto Export is syncing your Apple Watch workouts. You can also import an export file below.")));
  }else{
    m.append(el("section",{class:"panel"},el("h2",{},"This week"),
      el("div",{class:"kpis"},
        el("div",{class:"kpi"},el("b",{class:"num"},String(cur.n)),el("span",{},cur.n===1?"session":"sessions")),
        el("div",{class:"kpi"},el("b",{class:"num"},fmtDur(cur.min)),el("span",{},"court time")),
        el("div",{class:"kpi"},el("b",{class:"num"},fmtInt(cur.kcal)),el("span",{},"kcal burned"))),
      el("p",{class:"hint"},avgMin?`Your 4-week average is ${fmtDur(avgMin)} a week.`:"Averages appear once you have a few weeks of sessions."),
      weeklyChart(weeks)));
    const sec=el("div",{class:"plist"});
    list.slice(0,playShown).forEach(p=>sec.append(playCard(p,max)));
    m.append(sec);
    if(list.length>playShown)m.append(el("button",{type:"button",class:"btn",onclick:()=>{playShown+=8;renderPlay()}},`Show older sessions (${list.length-playShown})`));
    m.append(el("p",{class:"hint"},`Heart-rate zones use a max heart rate of ${max} bpm.`));
  }

  const last=list.reduce((a,p)=>p.updatedAt&&p.updatedAt>a?p.updatedAt:a,"");
  const inp=el("input",{type:"file",id:"play-file",accept:".json,application/json",hidden:true,onchange:e=>importHealthFile(e.target.files&&e.target.files[0])});
  m.append(el("section",{class:"panel"},el("h2",{},"Apple Health"),
    el("p",{class:"hint"},last?`Last update received ${new Date(last).toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}.`:"Nothing received from Health Auto Export yet."),
    el("div",{class:"row"},el("button",{type:"button",class:"btn",onclick:()=>inp.click()},"Import export file"),inp,el("span",{class:"hint",id:"play-msg","aria-live":"polite"},playMsgText))));
}

let playMsgText="";
const msg={set textContent(t){playMsgText=t;const e=$("#play-msg");if(e)e.textContent=t}};
async function importHealthFile(file){
  if(!file)return;
  msg.textContent="Reading…";
  let data;try{data=JSON.parse(await file.text())}catch(e){msg.textContent="That file isn't a Health Auto Export JSON file.";return}
  const all=(data&&data.data&&data.data.workouts)||(data&&data.workouts)||[];
  const keep=["id","name","start","end","duration","activeEnergyBurned","totalEnergy","avgHeartRate","maxHeartRate","heartRate","heartRateData","distance","stepCount","temperature","humidity","activities"];
  const tennis=all.filter(w=>w&&(/tennis/i.test(w.name||"")||(w.activities||[]).some(a=>/tennis/i.test((a&&a.activityType)||""))))
    .map(w=>{const o={};keep.forEach(k=>{if(w[k]!==undefined)o[k]=w[k]});if(Array.isArray(o.activities))o.activities=o.activities.map(a=>({activityType:a.activityType}));return o});
  const span=list=>{const d=list.map(w=>String(w.start||"").slice(0,10)).filter(Boolean).sort();return d.length?`${fmtShort(d[0])} – ${fmtShort(d[d.length-1])}`:""};
  const found=`Found ${all.length} workout${all.length===1?"":"s"}${all.length?" ("+span(all)+")":""}`;
  if(!tennis.length){msg.textContent=all.length?`${found}, but none were tennis.`:"No workouts in that file. Include Workouts when exporting.";return}
  let saved=0,created=0;
  try{
    for(let i=0;i<tennis.length;i+=10){
      msg.textContent=`Importing ${Math.min(i+10,tennis.length)} of ${tennis.length}…`;
      const r=await api("POST","/ingest",{data:{workouts:tennis.slice(i,i+10)}});saved+=r.tennis||0;created+=r.created||0;
    }
    const n=tennis.length,skipped=n-saved;
    msg.textContent=`${found}. ${n} tennis: ${created} new, ${saved-created} already here`+(skipped?`, ${skipped} unreadable`:"")+".";
    await refresh();
  }catch(e){
    msg.textContent=e.kind==="signin"?"Sign in again, then retry the import.":e.kind==="offline"?"You're offline. Try again with a connection.":"Import failed. Try a smaller date range.";
    if(e.kind==="signin")setState("signin");
  }
  $("#play-file")&&($("#play-file").value="");
}

/* ---------- tabs (also reachable as /log/#train, #play, #progress, #body) ---------- */
const HASH_TAB={train:"log",play:"play",progress:"progress",body:"body"},TAB_HASH={log:"train",play:"play",progress:"progress",body:"body"};
function setTab(t){S.tab=t;try{localStorage.setItem("tab",t)}catch(e){}
  try{history.replaceState(null,"","#"+TAB_HASH[t])}catch(e){}
  if(t==="log")loadDraft();render();window.scrollTo(0,0)}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
try{const t=localStorage.getItem("tab");if(t&&TAB_HASH[t])S.tab=t}catch(e){}
{const h=location.hash.slice(1);if(HASH_TAB[h])S.tab=HASH_TAB[h]}
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(HASH_TAB[h]&&HASH_TAB[h]!==S.tab)setTab(HASH_TAB[h])});
if(location.search){try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}}

/* ---------- keep the screen on while training ---------- */
let wakeLock=null,wakeBusy=false;
async function syncWake(){
  if(!("wakeLock" in navigator)||wakeBusy)return;
  const want=S.tab==="log"&&document.visibilityState==="visible";
  wakeBusy=true;
  try{
    if(want&&!wakeLock){wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>{wakeLock=null})}
    else if(!want&&wakeLock){const w=wakeLock;wakeLock=null;await w.release()}
  }catch(e){wakeLock=null}
  wakeBusy=false;
}
document.addEventListener("pointerdown",syncWake,{passive:true});

/* ---------- export ---------- */
const csvCell=v=>{if(v==null)return "";const t=String(v);return /[",\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
const csv=rows=>rows.map(r=>r.map(csvCell).join(",")).join("\n")+"\n";
function exportFile(kind){
  const today=iso(new Date());let name,text,type;
  if(kind==="lifts"){
    const rows=[["date","session","exercise","set","kg","reps","done"]];
    sessionsSorted().forEach(s=>{
      const p=PLAN[s.day];const ids=[...(p?p.ex.map(e=>e.id):[]),...Object.keys(s.entries||{}).filter(id=>!(p&&p.ex.some(e=>e.id===id)))];
      ids.forEach(id=>(s.entries[id]||[]).forEach((set,i)=>{if(!set)return;if(set.kg==null&&set.reps==null&&!set.done)return;
        rows.push([s.date,p?p.name:s.day,EX[id]?EX[id].n:id,i+1,set.kg,set.reps,set.done?"yes":"no"])}));
    });
    name=`tennis-fitness-lifts-${today}.csv`;text=csv(rows);type="text/csv";
  }else if(kind==="play"){
    const rows=[["date","start","end","minutes","active_kcal","avg_hr","max_hr","distance_km","steps","temp_c","humidity_pct"]];
    playSorted().slice().reverse().forEach(p=>rows.push([p.date,p.startTime,p.endTime,p.durationMin,p.activeKcal,p.avgHr,p.maxHr,p.distanceKm,p.steps,p.tempC,p.humidity]));
    name=`tennis-fitness-play-${today}.csv`;text=csv(rows);type="text/csv";
  }else if(kind==="body"){
    const rows=[["date","weight_kg","arm_cm","chest_cm","waist_cm","photo"]];
    Object.values(S.body).sort((a,b)=>a.date<b.date?-1:1).forEach(r=>rows.push([r.date,r.weight,r.arm,r.chest,r.waist,r.photo?"yes":""]));
    name=`tennis-fitness-body-${today}.csv`;text=csv(rows);type="text/csv";
  }else{
    name=`tennis-fitness-backup-${today}.json`;type="application/json";
    text=JSON.stringify({app:"Tennis Fitness Tracker",exportedAt:new Date().toISOString(),sessions:S.sessions,body:S.body,play:S.play},null,2);
  }
  const blob=new Blob([text],{type});
  try{
    const file=new File([blob],name,{type});
    if(matchMedia("(pointer: coarse)").matches&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(()=>{});return}
  }catch(e){}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}

/* ---------- offline-first sync ----------
   Every change is saved on the phone first (localStorage), queued, and sent to
   /api/log/batch when there's a connection. The view is the last server copy
   with the queue applied on top, so unsynced changes always show. */
const LS_DATA="tft:data",LS_QUEUE="tft:queue",LS_REJECTED="tft:rejected";
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const Sync={server:lsGet(LS_DATA,{sessions:{},body:{}}),queue:lsGet(LS_QUEUE,[]),inflight:new Set(),
  state:"loading",loaded:false,chain:Promise.resolve(),flushQueued:false,flushT:null,retryT:null,retryMs:5000,subs:[]};
Sync.server.sessions=Sync.server.sessions||{};Sync.server.body=Sync.server.body||{};Sync.server.play=Sync.server.play||{};

function viewData(){
  const v={sessions:{...Sync.server.sessions},body:{...Sync.server.body},play:{...Sync.server.play}};
  for(const o of Sync.queue){if(!v[o.col])continue;if(o.op==="put")v[o.col][o.id]=o.body;else delete v[o.col][o.id]}
  return v;
}
function publish(){const v=viewData();S.sessions=v.sessions;S.body=v.body;S.play=v.play;Sync.subs.forEach(f=>f())}

function showSync(){
  const n=Sync.queue.length,st=Sync.state;
  const txt=st==="loading"?"Loading…":st==="signin"?"Sign in needed":st==="offline"?(n?"Offline · "+n+" to sync":"Offline")
    :st==="error"?"Sync problem":n?"Syncing…":"Synced";
  setStatus(S.dirty?"Saving…":txt,st==="synced"&&!n&&!S.dirty);
  $("#banner").hidden=st!=="signin";
}
function setState(st){Sync.state=st;showSync()}

function serial(fn){Sync.chain=Sync.chain.then(fn,fn);return Sync.chain}

async function api(method,path,body){
  let r;
  try{r=await fetch("/api/log"+path,{method,credentials:"same-origin",redirect:"manual",cache:"no-store",
    keepalive:!!body&&JSON.stringify(body).length<60000,
    headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined})}
  catch(e){throw {kind:"offline"}}
  if(r.type==="opaqueredirect"||r.status===401||r.status===403)throw {kind:"signin"};
  if(!r.ok)throw {kind:r.status>=500||r.status===429?"offline":"bad",status:r.status};
  return r.json();
}

function scheduleRetry(){clearTimeout(Sync.retryT);Sync.retryT=setTimeout(kick,Sync.retryMs);Sync.retryMs=Math.min(Sync.retryMs*2,60000)}
function kick(){if(!Sync.loaded)refresh();else flush()}

function enqueue(op){
  op.qid=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  // a newer change to the same document replaces an older one that hasn't been sent yet
  Sync.queue=Sync.queue.filter(o=>!(o.col===op.col&&o.id===op.id&&!Sync.inflight.has(o.qid)));
  Sync.queue.push(op);lsSet(LS_QUEUE,Sync.queue);
  publish();showSync();flushSoon(1200);
}
function flushSoon(ms){clearTimeout(Sync.flushT);Sync.flushT=setTimeout(flush,ms)}

function flush(){
  if(Sync.flushQueued)return Sync.chain;
  Sync.flushQueued=true;
  return serial(async()=>{
    Sync.flushQueued=false;
    if(!Sync.queue.length||Sync.state==="signin")return;
    // send at most ~200 KB per request so a long offline stretch can't exceed the server's limit
    const batch=[];let bytes=0;
    for(const o of Sync.queue){const b=JSON.stringify(o).length;if(batch.length&&(bytes+b>200000||batch.length>=100))break;batch.push(o);bytes+=b}
    batch.forEach(o=>Sync.inflight.add(o.qid));
    try{
      await api("POST","/batch",{ops:batch.map(({op,col,id,body})=>({op,col,id,body}))});
      const done=new Set(batch.map(o=>o.qid));
      for(const o of batch){if(o.op==="put")Sync.server[o.col][o.id]=o.body;else delete Sync.server[o.col][o.id]}
      Sync.queue=Sync.queue.filter(o=>!done.has(o.qid));
      lsSet(LS_QUEUE,Sync.queue);lsSet(LS_DATA,Sync.server);
      Sync.retryMs=5000;clearTimeout(Sync.retryT);setState("synced");
      if(Sync.queue.length)flushSoon(0);
    }catch(e){
      if(e.kind==="signin")setState("signin");
      else if(e.kind==="bad"){ // the server can never accept these; keep them aside rather than block the queue
        lsSet(LS_REJECTED,[...lsGet(LS_REJECTED,[]),...batch]);
        const drop=new Set(batch.map(o=>o.qid));Sync.queue=Sync.queue.filter(o=>!drop.has(o.qid));lsSet(LS_QUEUE,Sync.queue);
        setState("error");
      }else{setState("offline");scheduleRetry()}
    }finally{batch.forEach(o=>Sync.inflight.delete(o.qid))}
  });
}

function refresh(){
  return serial(async()=>{
    try{
      const d=await api("GET","");
      Sync.server={sessions:d.sessions||{},body:d.body||{},play:d.play||{}};lsSet(LS_DATA,Sync.server);
      Sync.loaded=true;Sync.retryMs=5000;clearTimeout(Sync.retryT);
      setState("synced");publish();
      if(Sync.queue.length)flushSoon(0);
    }catch(e){
      if(e.kind==="signin")setState("signin");else{setState("offline");scheduleRetry()}
    }
  });
}

// the page's storage interface; writes return as soon as the change is safe on the phone
S.db={collection(c){return{doc(id){return{
  set:async b=>enqueue({op:"put",col:c,id,body:JSON.parse(JSON.stringify(b))}),
  delete:async()=>enqueue({op:"delete",col:c,id})}}}}};

let firstData=true;
Sync.subs.push(()=>{
  const a=document.activeElement;const typing=!!a&&a.tagName==="INPUT"&&a.type!=="date"&&a.type!=="checkbox";
  const canReload=!S.dirty&&!(S.tab==="log"&&typing);
  if(firstData||canReload){
    loadDraft();
    if(S.tab==="log"){const y=window.scrollY;renderLog();window.scrollTo(0,y)}
    else if(S.tab==="progress")renderProgress();
    else if(S.tab==="play")renderPlay();
    else if(!typing)renderBodyLists();
  }
  firstData=false;
});

$("#banner-btn").onclick=()=>{
  // a full page load (bypassing the offline copy) lets Cloudflare show the sign-in screen
  location.href="/log/?signin="+Date.now()+location.hash;
};
window.addEventListener("online",()=>{if(Sync.state!=="signin")kick()});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){saveNow();flush()}
  else{
    // the app can sit in memory for days; move to today's session unless a date was picked by hand
    const today=iso(new Date());
    if(S.autoDate&&S.date!==today){saveNow();S.date=today;S.day=defaultDay();loadDraft();render()}
    refresh();
  }
  syncWake();
});
window.addEventListener("pagehide",saveNow);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("/log/sw.js",{scope:"/log/"}).catch(()=>{})});
}

publish();showSync();render();refresh();
