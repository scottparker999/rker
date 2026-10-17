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

const S = {tab:"log",day:defaultDay(),date:iso(new Date()),sessions:{},body:{},db:null,draft:null,dirty:false,saving:false,again:false,timer:null,confirmClear:false,loaded:false};

/* ---------- storage ---------- */
function setStatus(t,ok){const s=$("#status");s.textContent=t;s.classList.toggle("ok",!!ok)}
const sid = ()=>S.date+"_"+S.day;
function loadDraft(){
  const ex=S.sessions[sid()];
  S.draft = ex?JSON.parse(JSON.stringify(ex)):{date:S.date,day:S.day,entries:{}};
  S.dirty=false; S.confirmClear=false;
}
let saveT=null;
function scheduleSave(){S.dirty=true;setStatus("Unsaved…");clearTimeout(saveT);saveT=setTimeout(saveNow,2000)}
async function saveNow(){
  if(!S.db){setStatus("Not saving in this view");return}
  if(S.saving){S.again=true;return}
  S.saving=true;setStatus("Saving…");
  const body={...JSON.parse(JSON.stringify(S.draft)),updatedAt:new Date().toISOString()};
  const id=body.date+"_"+body.day;
  try{await S.db.collection("sessions").doc(id).set(body);S.dirty=false;setStatus("Saved",true)}
  catch(e){setStatus(e&&e.code==="quota_exceeded"?"Storage full":"Couldn't save, retrying");if(e&&e.code==="unavailable")setTimeout(saveNow,1500+Math.random()*1000)}
  S.saving=false;
  if(S.again){S.again=false;saveNow()}
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
  if(!S.db&&S.loaded)m.append(el("div",{class:"notice"},"Saving isn't available right now. Reload the page."));
  m.append(el("div",{class:"daybar"},ORDER.map(k=>el("button",{type:"button","aria-pressed":String(S.day===k),onclick:()=>{S.day=k;loadDraft();renderLog()}},el("b",{},PLAN[k].name),el("span",{},PLAN[k].sub+" · ~"+PLAN[k].mins+" min")))));
  const p=PLAN[S.day];
  m.append(el("div",{class:"daterow"},
    el("label",{for:"sess-date"},"Session date ",el("input",{type:"date",id:"sess-date",value:S.date,max:iso(new Date()),onchange:e=>{if(e.target.value){S.date=e.target.value;loadDraft();renderLog()}}})),
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
  m.append(el("p",{class:"hint"},"Warm up 5–10 minutes first. Finish each set with 1–2 reps in the tank. Grey numbers are last session's; tick a set to accept them."));
}
async function clearSession(){
  const id=sid();
  try{await S.db.collection("sessions").doc(id).delete();delete S.sessions[id];setStatus("Deleted",true)}catch(e){setStatus("Couldn't delete")}
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
    if(!S.db){$("#b-msg").textContent="Saving isn't available in this view.";return}
    $("#b-msg").textContent="Saving…";
    try{await S.db.collection("body").doc(d).set(rec);S.body[d]=rec;$("#b-msg").textContent="Saved for "+fmtDate(d)+".";renderBodyLists()}
    catch(e){$("#b-msg").textContent="Couldn't save. Try again in a moment."}
  }},
    el("label",{for:"b-date",class:"full"},"Date",el("div",{class:"field"},el("input",{type:"date",id:"b-date",value:today,max:today,onchange:e=>{const r=S.body[e.target.value]||{};$("#b-weight").value=r.weight??"";$("#b-arm").value=r.arm??"";$("#b-chest").value=r.chest??"";$("#b-waist").value=r.waist??"";$("#b-photo").checked=!!r.photo}}))),
    f("b-weight","Bodyweight","kg",cur.weight),f("b-arm","Arm (flexed)","cm",cur.arm),f("b-chest","Chest","cm",cur.chest),f("b-waist","Waist","cm",cur.waist),
    el("label",{class:"check full",for:"b-photo"},el("input",{type:"checkbox",id:"b-photo",checked:!!cur.photo}),"Progress photo taken (every 4 weeks)"),
    el("div",{class:"row full"},el("button",{type:"submit",class:"btn primary"},"Save entry"),el("span",{class:"hint",id:"b-msg","aria-live":"polite"}))
  );
  m.append(el("section",{class:"panel"},el("h2",{},"Log measurements"),el("p",{class:"hint"},"Weigh in weekly, same time of day. Measure arms and chest monthly."),form));
  m.append(el("div",{id:"body-lists",style:"display:grid;gap:14px"}));
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
  ({log:renderLog,progress:renderProgress,body:renderBody})[S.tab]();
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;try{localStorage.setItem("tab",S.tab)}catch(e){};render();window.scrollTo(0,0)});
try{const t=localStorage.getItem("tab");if(t&&["log","progress","body"].includes(t))S.tab=t}catch(e){}

loadDraft();render();

/* ---------- rker.me API adapter (same shape the page used in Claude) ---------- */
function makeApiDb(){
  const cache={sessions:{},body:{}},subs={sessions:[],body:[]};
  const emit=c=>{const docs=Object.entries(cache[c]).map(([id,v])=>({id,exists:true,data:()=>v}));
    subs[c].forEach(s=>s.next({docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false,hasPendingWrites:false}}))};
  async function call(method,path,body){
    let r;
    try{r=await fetch("/api/log"+path,{method,credentials:"same-origin",headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined})}
    catch(e){throw {code:"unavailable",message:"Network or sign-in problem"}}
    if(r.status===401||r.status===403)throw {code:"revoked",message:"Signed out"};
    if(!r.ok)throw {code:r.status>=500?"unavailable":"invalid_argument",message:"HTTP "+r.status};
    return r.status===204?null:r.json();
  }
  async function refresh(){const d=await call("GET","");cache.sessions=d.sessions||{};cache.body=d.body||{};emit("sessions");emit("body")}
  let started=false;
  const start=()=>{if(started)return;started=true;
    refresh().catch(e=>[...subs.sessions,...subs.body].forEach(s=>s.err&&s.err(e)));
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&!S.dirty&&!S.saving)refresh().catch(()=>{})});
  };
  return {collection(c){return {
    doc(id){return {
      set:async b=>{await call("PUT","/"+c+"/"+encodeURIComponent(id),b);cache[c][id]=b;emit(c)},
      delete:async()=>{await call("DELETE","/"+c+"/"+encodeURIComponent(id));delete cache[c][id];emit(c)}}},
    onSnapshot(next,err){subs[c].push({next,err});queueMicrotask(start);return ()=>{}}
  }}};
}

/* ---------- connect ---------- */
(()=>{
  const db=makeApiDb();
  S.loaded=true;S.db=db;setStatus("Loading…");
  let first=true;
  db.collection("sessions").onSnapshot(snap=>{
    const next={};snap.docs.forEach(d=>{if(d.exists)next[d.id]=d.data()});S.sessions=next;
    const active=document.activeElement;const typing=active&&active.tagName==="INPUT"&&active.type!=="date";
    if(first||(!S.dirty&&!S.saving&&!(S.tab==="log"&&typing))){
      const y=window.scrollY;loadDraft();render();window.scrollTo(0,y)}
    if(first){first=false;setStatus("Synced",true)}
  },()=>setStatus("Sign-in expired. Reload the page."));
  db.collection("body").onSnapshot(snap=>{
    const next={};snap.docs.forEach(d=>{if(d.exists)next[d.id]=d.data()});S.body=next;
    if(S.tab==="body")renderBodyLists();else if(S.tab==="progress")renderProgress();
  },()=>{});
})();
