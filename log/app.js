import {$,el,svgEl} from "./lib/dom.js";
import {iso,dayT,weekStart,fmtDate,fmtShort,shortDM,num,fmtKg,fmtInt,fmtDur,fmtClock,signed} from "./lib/format.js";
import {PLAN,HOW,ORDER,EX,allExercises} from "./lib/plan.js";
import {PLATE_TYPES,handleKg,setHandleKg,perSideMax,emptyLoad,loadKg,bestLoad,reachable,nextLoadKg,sideText,plateMax,snapKg,legacyKg} from "./lib/plates.js";
import {doneSets,readyToProgress,sessionScore,bestSet,strengthSeries as strengthSeriesOf,volume} from "./lib/strength.js";
import {dueDay,trainedOn} from "./lib/rotation.js";
import {chartW,lineChart,sparkSVG} from "./lib/charts.js";

const kpi=(val,lbl,sub)=>el("div",{class:"kpi"},el("b",{class:"num"},val),el("span",{},lbl),sub?el("small",{},sub):null);

function howBlock(e){
  const h=HOW[e.id];const det=el("details",{class:"how"},el("summary",{},"How to do it"));
  if(!h)return det;
  let ol=el("ol");det.append(ol);
  h.steps.forEach(st=>{if(typeof st==="object"){det.append(el("p",{class:"how-sub"},st.h));ol=el("ol");det.append(ol)}else ol.append(el("li",{},st))});
  det.querySelectorAll("ol").forEach(o=>{if(!o.children.length)o.remove()});
  det.append(el("p",{class:"how-feel"},el("b",{},"Feel it in: "),h.feel),
    el("p",{class:"how-avoid"},el("b",{},"Avoid")),el("ul",{},h.avoid.map(a=>el("li",{},a))));
  return det;
}


function dumbbellSVG(l){
  const W=320,H=96,cx=W/2,mk=svgEl;
  const s=mk("svg",{viewBox:`0 0 ${W} ${H}`,class:"dbsvg",role:"img","aria-label":`Dumbbell loaded with ${sideText(l)}`});
  const grip=64,gap=2,size={big:[14,80],mid:[10,62],small:[7,46]};
  s.append(mk("rect",{x:20,y:H/2-4,width:W-40,height:8,rx:3,class:"db-bar"}));
  s.append(mk("rect",{x:cx-grip/2,y:H/2-6,width:grip,height:12,rx:4,class:"db-grip"}));
  [-1,1].forEach(dir=>{
    let x=cx+dir*(grip/2+6);
    s.append(mk("rect",{x:dir<0?x-4:x,y:H/2-11,width:4,height:22,rx:1,class:"db-collar"}));x+=dir*6;
    // heaviest plates go on first, nearest the grip
    PLATE_TYPES.forEach(t=>{for(let i=0;i<(l[t.key]||0);i++){const [w,h]=size[t.key];
      s.append(mk("rect",{x:dir<0?x-w:x,y:(H-h)/2,width:w,height:h,rx:3,class:"db-plate "+t.key}));x+=dir*(w+gap)}});
    s.append(mk("rect",{x:dir<0?x-6:x,y:H/2-9,width:6,height:18,rx:2,class:"db-nut"}));
  });
  return s;
}

/* the calculator sheet: one loading, edited either by target weight or plate by plate */
const Calc={kit:"pair",l:emptyLoad()};
function openCalc(kg,kit){
  Calc.kit=kit==="one"?"one":"pair";
  Calc.l=kg!=null?bestLoad(kg,Calc.kit):emptyLoad();
  renderCalc();const d=$("#calc");if(!d.open){try{d.showModal()}catch(e){d.setAttribute("open","")}}
}
function renderCalc(){
  const box=$("#calc-body");box.replaceChildren();
  PLATE_TYPES.forEach(t=>{Calc.l[t.key]=Math.min(Calc.l[t.key]||0,perSideMax(Calc.kit,t))});
  const kg=loadKg(Calc.l),opts=reachable(Calc.kit);
  const step=dir=>{const i=opts.findIndex(v=>v>=kg-1e-9);const j=Math.max(0,Math.min(opts.length-1,i+dir));Calc.l=bestLoad(opts[j],Calc.kit);renderCalc()};
  const counter=t=>{const key=t.key,label=t.kg+" kg";return el("div",{class:"pc-row"},
    el("span",{class:"pc-lbl"},el("i",{class:"pc-swatch "+key}),label),
    el("button",{type:"button",class:"pc-btn","aria-label":"Remove a "+label+" plate from each side",disabled:Calc.l[key]===0||null,onclick:()=>{Calc.l[key]--;renderCalc()}},"−"),
    el("b",{class:"num pc-n"},String(Calc.l[key])),
    el("button",{type:"button",class:"pc-btn","aria-label":"Add a "+label+" plate to each side",disabled:Calc.l[key]>=perSideMax(Calc.kit,t)||null,onclick:()=>{Calc.l[key]++;renderCalc()}},"+"))};
  const used=t=>`${Calc.l[t.key]*2*(Calc.kit==="pair"?2:1)} of ${t.count} × ${t.kg} kg`;
  box.append(
    el("div",{class:"seg",role:"group","aria-label":"Dumbbells"},
      ["pair","one"].map(k=>el("button",{type:"button","aria-pressed":String(Calc.kit===k),onclick:()=>{Calc.kit=k;Calc.l=bestLoad(kg,k);renderCalc()}},k==="pair"?"Both dumbbells":"One dumbbell"))),
    el("div",{class:"pc-target"},
      el("button",{type:"button",class:"pc-big","aria-label":"Lighter",disabled:kg<=opts[0]+1e-9||null,onclick:()=>step(-1)},"−"),
      el("div",{class:"pc-kg"},el("b",{class:"num"},fmtKg(kg)),el("span",{}," kg per dumbbell")),
      el("button",{type:"button",class:"pc-big","aria-label":"Heavier",disabled:kg>=opts[opts.length-1]-1e-9||null,onclick:()=>step(1)},"+")),
    dumbbellSVG(Calc.l),
    el("p",{class:"pc-recipe"},el("b",{},"Load: "),sideText(Calc.l)+(Calc.kit==="pair"?", on both dumbbells":"")),
    el("div",{class:"pc-counters"},PLATE_TYPES.map(counter)),
    el("p",{class:"hint"},`Using ${PLATE_TYPES.map(used).join(", ")} plates.`+(Calc.kit==="pair"?` Pair total ${fmtKg(kg*2)} kg.`:"")),
    el("label",{class:"pc-handle",for:"calc-handle"},"Handle weight",
      el("div",{class:"field"},el("input",{type:"number",id:"calc-handle",inputmode:"decimal",step:"0.05",min:"0.5",max:"9",value:handleKg(),
        onchange:e=>{const v=parseFloat(e.target.value);if(v>0&&v<10){setHandleKg(v);e.target.blur();requestAnimationFrame(()=>{renderCalc();if(S.tab==="log")renderLog()})}}}),el("i",{},"kg"))));
}
const kitOf=st=>st&&st.kit==="one"?"one":"pair";
// the next weight for an exercise, or null at the plates' limit or the exercise's own cap
const nextUp=(e,kg,kit)=>{const n=nextLoadKg(kg,kit);return n!=null&&(e.cap==null||n<=e.cap+0.01)?n:null};
function stationKg(day,stId){
  // the weight for the station's first weighted exercise: last time's, or the next one up
  // if every set hit the top of its range, else the plan default
  const st=PLAN[day].stations[stId];if(!st||st.kit==="none")return null;
  const kit=kitOf(st),lead=PLAN[day].ex.find(e=>e.st===stId&&e.load==="kg");
  const last=lead&&lastFor(lead.id,S.date,sid());
  const kgs=last?doneSets(last.entries[lead.id]).map(s=>s.kg).filter(v=>v!=null&&v>0):[];
  if(!kgs.length)return snapKg(st.kg,kit);
  const top=Math.max(...kgs);
  return (readyToProgress(lead,last)===true&&nextUp(lead,top,kit))||snapKg(top,kit);
}
function stationHeader(day,stId,first){
  const st=PLAN[day].stations[stId];
  if(st.kit==="none")return el("div",{class:"station"},el("span",{class:"st-tag"},first?"Start":"Change"),el("div",{class:"st-main"},el("b",{},st.label),st.note?el("span",{},st.note):null));
  const kg=stationKg(day,stId),kit=kitOf(st),l=bestLoad(kg,kit);
  return el("div",{class:"station"},
    el("span",{class:"st-tag"},first?"Start":"Change"),
    el("div",{class:"st-main"},el("b",{},st.label+" · ",el("span",{class:"nw"},fmtKg(kg)+" kg")),el("span",{},(s=>s[0].toUpperCase()+s.slice(1))(sideText(l))+"."+(st.note?" "+st.note:""))),
    el("button",{type:"button",class:"btn st-btn",onclick:()=>openCalc(kg,kit)},"Plates"));
}



const ROTATION=ORDER.map(k=>({key:k,dow:PLAN[k].dow}));
const todayIso=()=>iso(new Date());
// the workout that's due: the next in the rotation, so a missed day is caught up (see lib/rotation.js)
function defaultDay(sessions){return dueDay(ROTATION,Object.values(sessions||{}),todayIso(),new Date().getDay())}

const S = {tab:"log",day:defaultDay(),date:iso(new Date()),autoDate:true,autoDay:true,sessions:{},body:{},play:{},db:null,draft:null,dirty:false,timer:null,confirmClear:false};

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
function lastFor(exId,beforeDate,excludeId){
  const list=sessionsSorted().filter(s=>(s.date+"_"+s.day)!==excludeId&&s.date<=beforeDate&&doneSets(s.entries&&s.entries[exId]).length);
  return list.length?list[list.length-1]:null;
}

/* ---------- rest timer ---------- */
let audio=null;
function beep(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=880;g.gain.setValueAtTime(.001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.25,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.5);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.55)}catch(e){}}
// a silent phone gives no beep, so the whole screen pulses when the rest is up
function flash(){const f=$("#flash");if(!f)return;f.classList.remove("go");void f.offsetWidth;f.classList.add("go")}
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
  if(left<=0&&!t.beeped){t.beeped=true;beep();flash()}
  if(left<-300){stopTimer();return}
  clearTimeout(t.h);t.h=setTimeout(tick,250);
}
$("#calc-close").onclick=()=>$("#calc").close();
$("#calc").addEventListener("click",e=>{if(e.target===$("#calc"))$("#calc").close()});
$("#timer-add").onclick=()=>{if(S.timer){S.timer.end+=15000;S.timer.total+=15;S.timer.beeped=false;tick()}};
function stopTimer(){if(S.timer)clearTimeout(S.timer.h);S.timer=null;$("#timer").hidden=true}
$("#timer-skip").onclick=stopTimer;

/* ---------- views ---------- */
const tickIcon=()=>{const s=svgEl("svg",{viewBox:"0 0 24 24","aria-hidden":"true"});s.append(svgEl("path",{d:"M5 12.5l4.5 4.5L19 7.5",fill:"none","stroke-width":"2.6","stroke-linecap":"round","stroke-linejoin":"round"}));return s};

function renderLog(){
  const m=$("#main");m.replaceChildren();
  const rt=recentTennis();
  if(rt)m.append(el("div",{class:"notice"},el("b",{},(rt.date===iso(new Date())?"Tennis today: ":"Tennis last night: ")+fmtDur(rt.durationMin)+", "+fmtInt(rt.activeKcal)+" kcal. "),
    "Eat a little extra today to stay in surplus"+(S.day==="upper"?", and go easy on the legs block if they're heavy.":". Grip may be tired, so stop sets when form slips.")));
  m.append(el("div",{class:"daybar"},ORDER.map(k=>el("button",{type:"button","aria-pressed":String(S.day===k),onclick:()=>{saveNow();S.day=k;S.autoDay=false;loadDraft();renderLog()}},el("b",{},PLAN[k].name),el("span",{},PLAN[k].sub.slice(0,3)+" · "+PLAN[k].mins+" min")))));
  const p=PLAN[S.day];
  m.append(el("div",{class:"daterow"},
    el("label",{for:"sess-date"},el("span",{class:"sr"},"Session date"),el("input",{type:"date",id:"sess-date",value:S.date,max:todayIso(),onchange:e=>{if(e.target.value){saveNow();S.date=e.target.value;S.autoDate=S.date===todayIso();loadDraft();renderLog()}}})),
    el("button",{type:"button",class:"btn quiet",onclick:()=>openCalc(null,"pair")},"Plate calculator")
  ));
  const legacy=legacySessions();
  if(legacy.length&&!lsGet("tft:legacy-dismissed",false))m.append(el("div",{class:"notice"},
    el("b",{},"Earlier weights read high. "),`${legacy.length} session${legacy.length===1?" was":"s were"} logged when the app assumed 2 kg handles, so ${legacy.length===1?"its":"their"} weights are ${fmtKg(2-handleKg())} kg too high per dumbbell. Correcting them keeps your charts and “last time” numbers true.`,
    el("div",{class:"row"},el("button",{type:"button",class:"btn primary",onclick:fixLegacy},"Correct them"),
      el("button",{type:"button",class:"btn quiet",onclick:()=>{lsSet("tft:legacy-dismissed",true);renderLog()}},"Leave as is"))));
  m.append(el("div",{class:"sessbar",id:"sessbar","aria-live":"polite"}));
  p.ex.forEach((e,idx)=>{if(!idx||p.ex[idx-1].st!==e.st)m.append(stationHeader(S.day,e.st,!idx));m.append(exCard(e,p.ex[idx+1]))});
  m.append(el("section",{class:"panel sess-sum",id:"sess-sum",hidden:true}));
  // footer actions
  const exists=!!S.sessions[sid()];
  if(exists){
    m.append(el("div",{class:"row"},
      S.confirmClear
        ? [el("span",{class:"hint"},"Delete this session's log?"),el("button",{type:"button",class:"btn danger",onclick:clearSession},"Delete"),el("button",{type:"button",class:"btn quiet",onclick:()=>{S.confirmClear=false;renderLog()}},"Keep")]
        : el("button",{type:"button",class:"btn quiet",onclick:()=>{S.confirmClear=true;renderLog()}},"Delete this session")
    ));
  }
  updateSession();
  m.append(el("p",{class:"hint"},"Warm up 5–10 minutes first. Finish each set with 1–2 reps in the tank. Grey numbers are your target, based on last session; tick a set to accept them. Everything saves automatically."+("wakeLock" in navigator?" The screen stays on while this tab is open.":"")));
}
// sessions holding weights logged under the old 2 kg handle assumption (see legacyKg)
const legacySets=en=>Array.isArray(en)&&en.some(x=>x&&legacyKg(x.kg)!=null);
function legacySessions(){return Object.entries(S.sessions).filter(([,s])=>s&&Object.values(s.entries||{}).some(legacySets))}
function fixLegacy(){
  saveNow();
  const now=new Date().toISOString();
  legacySessions().forEach(([id,s])=>{
    const body=JSON.parse(JSON.stringify(s));
    Object.values(body.entries).forEach(en=>{if(Array.isArray(en))en.forEach(x=>{const k=x&&legacyKg(x.kg);if(k!=null)x.kg=k})});
    body.updatedAt=now;S.db.collection("sessions").doc(id).set(body);
  });
  loadDraft();renderLog();
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
  const st=PLAN[S.day].stations[e.st],kit=kitOf(st),loadable=e.load==="kg"&&st&&st.kit!=="none";
  const limit=ready===true&&atPlateLimit(e,last,S.day);
  // ready to go up: the target becomes the next weight the plates allow, starting at the low end of the rep range
  const upKg=ready===true&&loadable&&!limit?nextUp(e,Math.max(...lastSets.map(s=>s.kg??0)),kit):null;
  const capped=ready===true&&loadable&&!limit&&upKg==null&&e.cap!=null;
  const entries=S.draft.entries[e.id]=S.draft.entries[e.id]||[];
  const target=e.hi==null?e.sets+" × max":e.sets+" × "+(e.lo===e.hi?e.hi:e.lo+"–"+e.hi);
  const lastTxt=last?(e.load==="kg"?lastSets.map(s=>fmtKg(s.kg)+"×"+(s.reps??"–")).join(", "):lastSets.map(s=>(s.kg?"+"+fmtKg(s.kg)+"kg×":"")+(s.reps??"–")).join(", ")):null;
  const card=el("section",{class:"ex","aria-label":e.n},
    el("div",{class:"ex-top"},el("h2",{},e.n),el("span",{class:"target"},target)),
    el("div",{class:"specs"},el("span",{},"Start ",el("b",{},e.start)," ",e.unit),el("span",{},"Rest ",el("b",{},e.rest>=120?Math.floor(e.rest/60)+(e.rest%60?":"+String(e.rest%60).padStart(2,"0"):"")+" min":e.rest+" s"))),
    last?el("div",{class:"last"},el("span",{class:"num"},fmtShort(last.date)+": "+lastTxt),
      ready===true?(limit?el("span",{class:"chip warn",title:"No heavier loading possible with your plates"},"At plate limit: add reps")
        :capped?el("span",{class:"chip hold"},"Heavy enough: keep it controlled")
        :el("span",{class:"chip up"},upKg!=null?`Up to ${fmtKg(upKg)} kg`:e.load==="kg"?"Go up a step":"Make it harder")):ready===false?el("span",{class:"chip hold"},"Same again"):null)
      :el("div",{class:"last"},"First time. Start at the low end and find your weight."),
  );
  if(e.pair&&EX[e.pair]){
    // optional time-saver: alternate with an exercise that uses different muscles at the same weight
    card.append(el("details",{class:"tip"},el("summary",{},"Short on time?"),
      el("p",{},`Alternate this with ${EX[e.pair].n.replace(/^(?!Zottman)./,c=>c.toLowerCase())}: one set of each, resting about 60 seconds between them, at the same weight. It saves 5–10 minutes and builds about the same muscle. When you have time, straight sets with full rest are still slightly better.`)));
  }
  const sets=el("div",{class:"sets"});
  for(let i=0;i<e.sets;i++){
    const cur=entries[i]||{kg:null,reps:null,done:false};
    const prev=lastSets[i]||lastSets[lastSets.length-1]||null;
    const stKg=e.load==="kg"&&e.st?stationKg(S.day,e.st):null;
    // targets are always weights the plates can make
    const prevKg=prev&&prev.kg!=null?(loadable&&prev.kg>0?snapKg(prev.kg,kit):prev.kg):null;
    const kgPh=upKg!=null?fmtKg(upKg):prevKg!=null?fmtKg(prevKg):(e.load==="kg"?(stKg!=null?fmtKg(stKg):""):"–");
    const repPh=upKg!=null&&e.lo!=null?String(e.lo):prev&&prev.reps!=null?String(prev.reps):(e.hi==null?"":String(e.hi));
    const row=el("div",{class:"set"+(cur.done?" done":"")});
    const kgIn=el("input",{type:"number",inputmode:"decimal",step:"0.1",min:"0",id:`kg-${e.id}-${i}`,"aria-label":`${e.n} set ${i+1} kilograms`,placeholder:kgPh,value:cur.kg??""});
    const rIn=el("input",{type:"number",inputmode:"numeric",step:"1",min:"0",id:`reps-${e.id}-${i}`,"aria-label":`${e.n} set ${i+1} reps`,placeholder:repPh,value:cur.reps??""});
    const write=()=>{entries[i]={kg:num(kgIn.value),reps:num(rIn.value),done:row.classList.contains("done")};scheduleSave();updateSession()};
    kgIn.addEventListener("input",write);rIn.addEventListener("input",write);
    const btn=el("button",{type:"button",class:"tick","aria-label":`Mark set ${i+1} done`,"aria-pressed":String(!!cur.done),onclick:()=>{
      const on=!row.classList.contains("done");
      if(on){if(kgIn.value===""&&kgPh!==""&&kgPh!=="–")kgIn.value=kgPh;if(rIn.value===""&&repPh!=="")rIn.value=repPh}
      row.classList.toggle("done",on);btn.setAttribute("aria-pressed",String(on));write();
      if(on){const lastSet=i===e.sets-1;startTimer(lastSet?Math.max(e.rest,90):e.rest,lastSet?(next?next.n:"session done"):e.n+" set "+(i+2))}
    }},tickIcon());
    row.append(el("span",{class:"n"},String(i+1)),
      el("div",{class:"field"},kgIn,el("i",{},e.load==="bw"?"+kg":"kg")),
      el("div",{class:"field"},rIn,el("i",{},"reps")),btn);
    sets.append(row);
  }
  card.append(sets,howBlock(e));
  return card;
}


const strengthSeries=()=>strengthSeriesOf(sessionsSorted(),allExercises());
function atPlateLimit(e,sess,day){
  if(e.load!=="kg"||!sess)return false;
  const kit=kitOf(PLAN[day]&&PLAN[day].stations[e.st]);
  const kgs=doneSets(sess.entries[e.id]).map(s=>s.kg).filter(v=>v!=null);
  return kgs.length>0&&Math.max(...kgs)>=plateMax(kit)-0.01;
}

function renderProgress(){
  const m=$("#main");m.replaceChildren();
  const sessions=sessionsSorted().filter(s=>Object.values(s.entries||{}).some(x=>doneSets(x).length));
  const bodies=Object.values(S.body).sort((a,b)=>a.date<b.date?-1:1);
  const wts=bodies.filter(b=>b.weight!=null).map(b=>({t:b.date,v:b.weight}));
  const meas=k=>{const r=bodies.filter(b=>b[k]!=null);return r.length?r.map(b=>({t:b.date,v:b[k]-r[0][k]})):[]};
  const arm=meas("arm"),chest=meas("chest"),waist=meas("waist");
  const str=strengthSeries();
  const weekAgo=iso(new Date(Date.now()-6*864e5));

  // headline
  m.append(el("section",{class:"panel"},el("h2",{},"Your progress"),
    el("div",{class:"kpis"},
      kpi(wts.length>1?signed(wts[wts.length-1].v-wts[0].v,1," kg"):"–","bodyweight",wts.length>1?"since "+fmtShort(wts[0].t):"log weekly"),
      kpi(arm.length>1?signed(arm[arm.length-1].v,1," cm"):"–","arm",arm.length>1?"since "+fmtShort(arm[0].t):"measure monthly"),
      kpi(str.length>1?signed(str[str.length-1].v,0,"%"):"–","strength",str.length>1?"since "+fmtShort(str[0].t):"after 2 sessions")),
    el("p",{class:"hint"},`${sessions.length} session${sessions.length===1?"":"s"} logged · ${sessions.filter(s=>s.date>=weekAgo).length} of 3 in the last 7 days.`)));

  // weight gain
  const bw=el("section",{class:"panel"},el("h2",{},"Bodyweight"));
  if(wts.length>=2){
    const w0=wts[0],wl=wts[wts.length-1],days=(dayT(wl.t)-dayT(w0.t))/864e5,perMonth=days>0?(wl.v-w0.v)/days*30.4:0;
    const verdict=days<21?"Keep logging: the trend needs about three weeks.":perMonth<0.25?"Below target. Eat a little more.":perMonth>0.75?"Faster than needed, so some of it may be fat.":"On target for lean gain.";
    const mon=d=>(dayT(d)-dayT(w0.t))/864e5/30.4;
    bw.append(el("p",{class:"hint"},el("b",{class:"num"},signed(perMonth,2," kg")+" a month")," · target +0.25 to +0.5. ",verdict),
      lineChart({series:[{name:"Your weight",cls:"s1",pts:wts}],band:{name:"Target pace",lo:[{t:w0.t,v:w0.v},{t:wl.t,v:w0.v+0.25*mon(wl.t)}],hi:[{t:w0.t,v:w0.v},{t:wl.t,v:w0.v+0.5*mon(wl.t)}]},fmt:(v,dec)=>v.toFixed(dec),label:`Bodyweight from ${w0.v} to ${wl.v} kg`}));
  }else bw.append(el("p",{class:"empty"},wts.length?"One weigh-in so far. The chart starts with your second.":"No weigh-ins yet. Log one on the Body tab, weekly at the same time of day."));
  m.append(bw);

  // muscle growth
  const mu=el("section",{class:"panel"},el("h2",{},"Muscle"));
  const muSeries=[{name:"Arm",cls:"s1",pts:arm},{name:"Chest",cls:"s2",pts:chest},{name:"Waist",cls:"s3",pts:waist}].filter(s=>s.pts.length>1);
  if(muSeries.length){
    mu.append(el("p",{class:"hint"},"Change in centimetres since your first measurement. Arm and chest should climb. If your waist grows faster than your arm, ease off the extra food a little."),
      lineChart({series:muSeries,zero:true,fmt:(v,dec)=>(v>0?"+":"")+v.toFixed(dec),label:"Change in arm, chest and waist measurements"}));
  }else mu.append(el("p",{class:"empty"},"Measure your flexed arm, chest and waist once a month on the Body tab. The chart starts with your second set of measurements."));
  m.append(mu);

  // strength
  const sp=el("section",{class:"panel"},el("h2",{},"Strength"));
  if(str.length>=2){
    sp.append(el("p",{class:"hint"},"Average change across all your lifts, estimated from weight and reps, so more reps at the same weight counts as progress."),
      lineChart({series:[{name:"Strength",cls:"s1",pts:str}],zero:true,fmt:(v,dec)=>(v>0?"+":"")+v.toFixed(dec)+"%",label:"Average strength change across all lifts"}));
  }else sp.append(el("p",{class:"empty"},"Your strength trend appears after two training sessions."));
  m.append(sp);

  // each lift
  ORDER.forEach(d=>{
    const p=PLAN[d];const panel=el("section",{class:"panel"},el("h2",{},p.name));
    p.ex.forEach(e=>{
      const hist=sessions.filter(s=>doneSets(s.entries[e.id]).length);
      const row=el("div",{class:"trend"});
      if(!hist.length){row.append(el("div",{class:"nm"},e.n,el("small",{},"Not logged yet")),el("span",{}),el("div",{class:"v"},"–"));panel.append(row);return}
      const first=hist[0],last=hist[hist.length-1],bs=bestSet(e,last);
      const scores=hist.map(s=>sessionScore(e,s)).filter(v=>v!=null);
      const pct=scores.length>1?(scores[scores.length-1]/scores[0]-1)*100:null;
      const limit=atPlateLimit(e,last,d);
      row.append(el("div",{class:"nm"},e.n,el("small",{},`${hist.length} session${hist.length>1?"s":""}`),limit?el("span",{class:"chip warn"},"At plate limit"):null),
        scores.length>=2?sparkSVG(scores,92,28,3):el("span",{}),
        el("div",{class:"v"},e.load==="kg"&&bs&&bs.kg!=null?`${fmtKg(bs.kg)} kg × ${bs.reps??"–"}`:`${bs&&bs.reps!=null?bs.reps:"–"} reps`,
          pct!=null?el("span",{class:"d "+(pct>0.5?"pos":pct<-0.5?"neg":"flat")},signed(pct,0,"%")+" since "+fmtShort(first.date)):null));
      panel.append(row);
    });
    m.append(panel);
  });
  if(allExercises().some(e=>{const h=sessions.filter(s=>doneSets(s.entries[e.id]).length);return h.length&&atPlateLimit(e,h[h.length-1],EX[e.id].day)}))
    m.append(el("p",{class:"notice"},el("b",{},"Some lifts are at your plates' limit. "),"Keep progressing them with extra reps or a slower 3–4 second lowering, and consider more 2.5 kg plates so the weight can keep rising."));

  m.append(el("section",{class:"panel",id:"reminders"}));drawRemind();
  m.append(el("section",{class:"panel"},el("h2",{},"Your data"),
    el("p",{class:"hint"},"Download a copy for your records or a spreadsheet."),
    el("div",{class:"row"},
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("lifts")},"Lifts (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("play")},"Tennis (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("body")},"Body (CSV)"),
      el("button",{type:"button",class:"btn",onclick:()=>exportFile("backup")},"Full backup (JSON)"))));
}

/* ---------- this session: live progress and summary ---------- */
function sessionStats(){
  const p=PLAN[S.day],entries=(S.draft&&S.draft.entries)||{};
  let total=0,done=0,exDone=0;
  p.ex.forEach(e=>{const d=doneSets(entries[e.id]).length;total+=e.sets;done+=Math.min(d,e.sets);if(d>=e.sets)exDone++});
  return {total,done,exDone,exTotal:p.ex.length,vol:sessionVolume({entries},S.day)};
}
const sessionVolume=(sess,day,only)=>volume(sess,PLAN[day].ex,only);
function updateSession(){
  const bar=$("#sessbar"),sum=$("#sess-sum");if(!bar||!sum)return;
  const st=sessionStats();
  bar.replaceChildren(
    el("div",{class:"sb-txt"},el("b",{class:"num"},`${st.done} of ${st.total} sets`),el("span",{},`${st.exDone} of ${st.exTotal} exercises done`)),
    (()=>{const t=el("div",{class:"sb-track"}),f=el("div",{class:"sb-fill"});f.style.width=(st.total?st.done/st.total*100:0)+"%";t.append(f);return t})());
  sum.replaceChildren();sum.hidden=!st.done;if(!st.done)return;
  const cur={entries:S.draft.entries},p=PLAN[S.day];
  const prevSame=sessionsSorted().filter(s=>s.day===S.day&&(s.date+"_"+s.day)!==sid()&&s.date<=S.date&&Object.values(s.entries||{}).some(x=>doneSets(x).length)).pop();
  const history=sessionsSorted().filter(s=>(s.date+"_"+s.day)!==sid()&&s.date<=S.date);
  const bests=[],ready=[],limits=[];
  p.ex.forEach(e=>{
    const v=sessionScore(e,cur);if(v==null)return;
    const before=history.map(s=>sessionScore(e,s)).filter(x=>x!=null);
    if(before.length&&v>Math.max(...before)+1e-9){const b=bestSet(e,cur);bests.push(e.load==="kg"?`${e.n} (${fmtKg(b.kg)} × ${b.reps})`:`${e.n} (${b.reps} reps)`)}
    if(readyToProgress(e,cur)===true&&e.cap==null)(atPlateLimit(e,cur,S.day)?limits:ready).push(e.n);
  });
  const items=[];
  if(st.vol)items.push(el("li",{},el("b",{},"Total lifted: "),`${fmtInt(st.vol)} kg`+(prevSame?(()=>{
    // compare only the exercises done so far, so a half-finished session isn't measured against a full one
    const doneIds=new Set(p.ex.filter(e=>doneSets(S.draft.entries[e.id]).length).map(e=>e.id));
    const pv=sessionVolume(prevSame,S.day,doneIds);
    if(!pv)return "";const pc=Math.round((st.vol/pv-1)*100);
    return pc?`, ${signed(pc,0,"%")} vs the same exercises on ${fmtShort(prevSame.date)}`:`, level with the same exercises on ${fmtShort(prevSame.date)}`;
  })():"")));
  if(bests.length)items.push(el("li",{},el("b",{},"New bests: "),bests.join(", ")));
  if(ready.length)items.push(el("li",{},el("b",{},"Go up a weight next time: "),ready.join(", ")));
  if(limits.length)items.push(el("li",{},el("b",{},"At your plates' limit: "),limits.join(", ")+". Add reps or slow the lowering instead."));
  sum.append(el("h2",{},st.done>=st.total?"Session complete":"So far this session"),
    items.length?el("ul",{},items):el("p",{class:"hint"},"Tick sets as you go and your summary builds here."));
}

function renderBody(){
  const m=$("#main");m.replaceChildren();
  const today=iso(new Date());const cur=S.body[today]||{};
  const f=(id,label,unit,val)=>el("label",{for:id},label,el("div",{class:"field"},el("input",{type:"number",inputmode:"decimal",step:"0.1",min:"0",id,value:val??""}),el("i",{},unit)));
  const form=el("form",{class:"form",onsubmit:ev=>{
    ev.preventDefault();
    const d=$("#b-date").value||today;
    const rec={date:d,weight:num($("#b-weight").value),arm:num($("#b-arm").value),chest:num($("#b-chest").value),waist:num($("#b-waist").value),photo:$("#b-photo").checked,updatedAt:new Date().toISOString()};
    if([rec.weight,rec.arm,rec.chest,rec.waist].every(v=>v==null)&&!rec.photo){$("#b-msg").textContent="Enter at least one measurement.";return}
    $("#b-msg").textContent="Saving…";
    try{S.db.collection("body").doc(d).set(rec);$("#b-msg").textContent="Saved for "+fmtDate(d)+(Sync.state==="offline"?". It will sync when you're back online.":".");renderBodyLists()}
    catch(e){$("#b-msg").textContent="Couldn't save. Try again in a moment."}
  }},
    el("label",{for:"b-date",class:"full"},"Date",el("div",{class:"field"},el("input",{type:"date",id:"b-date",value:today,max:today,onchange:e=>{const r=S.body[e.target.value]||{};$("#b-weight").value=r.weight??"";$("#b-arm").value=r.arm??"";$("#b-chest").value=r.chest??"";$("#b-waist").value=r.waist??"";$("#b-photo").checked=!!r.photo}}))),
    f("b-weight","Bodyweight","kg",cur.weight),f("b-arm","Arm (flexed)","cm",cur.arm),f("b-chest","Chest","cm",cur.chest),f("b-waist","Waist","cm",cur.waist),
    el("label",{class:"check full",for:"b-photo"},el("input",{type:"checkbox",id:"b-photo",checked:!!cur.photo}),"Progress photo taken (every 4 weeks)"),
    el("div",{class:"row full"},el("button",{type:"submit",class:"btn primary"},"Save entry"),el("span",{class:"hint",id:"b-msg","aria-live":"polite"}))
  );
  m.append(el("section",{class:"panel"},el("h2",{},"Log measurements"),el("p",{class:"hint"},"Weigh in weekly, same time of day. Measure arms and chest monthly. Weigh-ins saved in Apple Health arrive here on their own if Health Auto Export is set to send Weight."),form));
  m.append(el("div",{id:"body-lists",class:"stack"}));
  renderBodyLists();
}
function renderBodyLists(){
  const box=$("#body-lists");if(!box)return;box.replaceChildren();
  const rows=Object.values(S.body).sort((a,b)=>a.date<b.date?-1:1);
  box.append(el("div",{class:"row"},el("span",{class:"hint"},"Your bodyweight and measurement charts are on the Progress tab."),
    el("button",{type:"button",class:"btn",onclick:()=>setTab("progress")},"See charts")));
  if(rows.length){
    const tb=el("tbody");rows.slice().reverse().forEach(r=>tb.append(el("tr",{},el("td",{},fmtShort(r.date)),el("td",{},fmtKg(r.weight)),el("td",{},fmtKg(r.arm)),el("td",{},fmtKg(r.chest)),el("td",{},fmtKg(r.waist)),el("td",{},r.photo?"✓":""))));
    box.append(el("section",{class:"panel"},el("h2",{},"History"),el("div",{class:"tablewrap"},el("table",{class:"hist"},el("thead",{},el("tr",{},["Date","kg","Arm","Chest","Waist","Photo"].map(h=>el("th",{},h)))),tb))));
  }
}

function render(){
  const hdr=document.querySelector("header");if(hdr)document.documentElement.style.setProperty("--hdr",hdr.offsetHeight+"px");
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
function zoneMinutes(p,max){
  const z=[0,0,0,0,0];if(!Array.isArray(p.hr))return null;
  for(const v of p.hr){if(v==null)continue;const r=v/max;const i=ZONES.findIndex(Z=>r>=Z.lo&&r<Z.hi);z[i<0?4:i]++}
  return z.some(Boolean)?z:null;
}

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
  const W=chartW(),H=150,P={l:34,r:10,t:8,b:22},mk=svgEl;
  const pts=p.hr.map((v,i)=>v==null?null:[i,v]).filter(Boolean);if(pts.length<2)return null;
  const lo=Math.max(40,Math.floor(Math.min(...pts.map(q=>q[1]))/20)*20),hi=Math.ceil(Math.max(...pts.map(q=>q[1]),max*.9)/20)*20;
  const n=p.hr.length-1||1;const X=i=>P.l+i/n*(W-P.l-P.r),Y=v=>P.t+(hi-v)/(hi-lo)*(H-P.t-P.b);
  const s=mk("svg",{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:"chart",role:"img","aria-label":`Heart rate during the session, average ${p.avgHr}, max ${p.maxHr} bpm`});
  // zone bands
  ZONES.forEach((Z,i)=>{const top=Math.min(hi,Z.hi*max),bot=Math.max(lo,Z.lo*max);if(top<=bot)return;
    s.append(mk("rect",{x:P.l,y:Y(top),width:W-P.l-P.r,height:Y(bot)-Y(top),class:"band z"+(i+1)}))});
  for(let v=lo;v<=hi;v+=20){s.append(mk("line",{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),class:"grid"}));const t=mk("text",{x:P.l-6,y:Y(v)+4,"text-anchor":"end"});t.textContent=v;s.append(t)}
  let d="";let pen=false;p.hr.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1);pen=true});
  s.append(mk("path",{d,class:"ln hr"}));
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
  const W=chartW(),H=170,P={l:30,r:8,t:14,b:24},mk=svgEl;
  const maxH=Math.max(4,Math.ceil(Math.max(...weeks.map(w=>w.min/60))));
  const s=mk("svg",{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:"chart",role:"img","aria-label":"Hours of tennis per week, last 8 weeks"});
  const bw=(W-P.l-P.r)/weeks.length,Y=v=>P.t+(maxH-v)/maxH*(H-P.t-P.b);
  const step=maxH>8?2:1;
  for(let v=0;v<=maxH;v+=step){s.append(mk("line",{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),class:"grid"}));const t=mk("text",{x:P.l-6,y:Y(v)+4,"text-anchor":"end"});t.textContent=v+"h";s.append(t)}
  weeks.forEach((w,i)=>{const h=w.min/60,x=P.l+i*bw+bw*.18,wd=bw*.64;
    if(h>0)s.append(mk("rect",{x,y:Y(h),width:wd,height:Y(0)-Y(h),rx:3,class:i===weeks.length-1?"wbar now":"wbar"}));
    if(w.n){const t=mk("text",{x:x+wd/2,y:Y(h)-5,"text-anchor":"middle"});t.textContent=w.n+"×";s.append(t)}
    if(bw>=46||(weeks.length-1-i)%2===0){const t=mk("text",{x:x+wd/2,y:H-6,"text-anchor":"middle"});t.textContent=i===weeks.length-1?"Now":shortDM(w.start);s.append(t)}});
  return s;
}

let playShown=8;
function renderPlay(){
  const m=$("#main");m.replaceChildren();
  const list=playSorted(),max=MAX_HR;
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
        kpi(String(cur.n),cur.n===1?"session":"sessions"),kpi(fmtDur(cur.min),"court time"),kpi(fmtInt(cur.kcal),"kcal burned")),
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

// the import message survives the Play tab re-rendering when new data arrives
let playMsgText="";
const setPlayMsg=t=>{playMsgText=t;const e=$("#play-msg");if(e)e.textContent=t};
async function importHealthFile(file){
  if(!file)return;
  setPlayMsg("Reading…");
  let data;try{data=JSON.parse(await file.text())}catch(e){setPlayMsg("That file isn't a Health Auto Export JSON file.");return}
  const all=(data&&data.data&&data.data.workouts)||(data&&data.workouts)||[];
  const keep=["id","name","start","end","duration","activeEnergyBurned","totalEnergy","avgHeartRate","maxHeartRate","heartRate","heartRateData","distance","stepCount","temperature","humidity","activities"];
  const tennis=all.filter(w=>w&&(/tennis/i.test(w.name||"")||(w.activities||[]).some(a=>/tennis/i.test((a&&a.activityType)||""))))
    .map(w=>{const o={};keep.forEach(k=>{if(w[k]!==undefined)o[k]=w[k]});if(Array.isArray(o.activities))o.activities=o.activities.map(a=>({activityType:a.activityType}));return o});
  const span=list=>{const d=list.map(w=>String(w.start||"").slice(0,10)).filter(Boolean).sort();return d.length?`${fmtShort(d[0])} – ${fmtShort(d[d.length-1])}`:""};
  const found=`Found ${all.length} workout${all.length===1?"":"s"}${all.length?" ("+span(all)+")":""}`;
  if(!tennis.length){setPlayMsg(all.length?`${found}, but none were tennis.`:"No workouts in that file. Include Workouts when exporting.");return}
  let saved=0,created=0;
  try{
    for(let i=0;i<tennis.length;i+=10){
      setPlayMsg(`Importing ${Math.min(i+10,tennis.length)} of ${tennis.length}…`);
      const r=await api("POST","/ingest",{data:{workouts:tennis.slice(i,i+10)}});saved+=r.tennis||0;created+=r.created||0;
    }
    const n=tennis.length,skipped=n-saved;
    setPlayMsg(`${found}. ${n} tennis: ${created} new, ${saved-created} already here`+(skipped?`, ${skipped} unreadable`:"")+".");
    await refresh();
  }catch(e){
    setPlayMsg(e.kind==="signin"?"Sign in again, then retry the import.":e.kind==="offline"?"You're offline. Try again with a connection.":"Import failed. Try a smaller date range.");
    if(e.kind==="signin")setState("signin");
  }
  const f=$("#play-file");if(f)f.value="";
}

/* ---------- gym-day reminders (Web Push) ----------
   The phone subscribes once; the Worker sends the 8am reminder on training days.
   The subscription and plan are re-sent on each launch, so the server always has this
   phone's current address and the reminder knows each day's lifts. */
const planSnapshot=()=>({days:ORDER.map(k=>({dow:PLAN[k].dow,key:k,name:PLAN[k].name,mins:PLAN[k].mins,
  ex:PLAN[k].ex.map(e=>({id:e.id,n:e.n,sets:e.sets,hi:e.hi,load:e.load,...(e.cap!=null?{cap:e.cap}:{})}))}))});
const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const gymDays=()=>{const d=ORDER.map(k=>PLAN[k].dow).sort().map(i=>DAY_NAMES[i]);return d.slice(0,-1).join(", ")+" and "+d[d.length-1]};
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const b64uBytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0));
const Remind={state:"checking",msg:"",key:null,devices:null,last:null}; // checking | unsupported | install | denied | off | on

// the server's side of the story: its public key, how many devices it holds, and how the last send went
async function remindServer(){
  try{const r=await api("GET","/push");Remind.key=r.publicKey;Remind.devices=r.devices;Remind.last=r.last||null;return true}catch(e){return false}
}
async function remindCheck(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
    Remind.state=/iPhone|iPad/.test(navigator.userAgent)&&!isStandalone()?"install":"unsupported";return drawRemind();
  }
  if(Notification.permission==="denied"){Remind.state="denied";return drawRemind()}
  let sub=null;
  try{const reg=await navigator.serviceWorker.ready;sub=await reg.pushManager.getSubscription()}catch(e){}
  Remind.state=sub?"on":"off";
  drawRemind();
  // fetched now so "Turn on" can subscribe straight from the tap (iPhone insists on that)
  await remindServer();
  // re-register on every launch: heals a subscription the server has lost or the phone has renewed
  if(sub){try{await registerSub(sub);await remindServer()}catch(e){}}
  drawRemind();
}
async function registerSub(sub){
  const plan=planSnapshot();
  await api("POST","/push/subscribe",{subscription:sub.toJSON(),plan});
}
async function remindOn(){
  // ask first, straight from the tap: iPhone only allows the prompt from a direct user action
  let step="permission";
  try{
    const perm=await Notification.requestPermission();
    if(perm!=="granted"){Remind.state=perm==="denied"?"denied":"off";Remind.msg=perm==="denied"?"":"Notifications weren't allowed.";return drawRemind()}
    Remind.msg="Turning on…";drawRemind();
    step="service worker";const reg=await navigator.serviceWorker.ready;
    step="server key";if(!Remind.key&&!(await remindServer()))throw {kind:Sync.state==="signin"?"signin":"offline"};
    step="subscribe";const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uBytes(Remind.key)});
    step="register";await registerSub(sub);
    Remind.state="on";Remind.msg="On. Use “Send a test” to check it arrives.";
    remindServer().then(drawRemind);
  }catch(e){
    Remind.msg=e&&e.kind==="signin"?"Sign in again, then try once more.":e&&e.kind==="offline"?"You're offline. Try again with a connection."
      :`Couldn't turn reminders on (${step}: ${(e&&(e.name||e.status||e.kind))||"error"}). Try again in a moment.`;
  }
  drawRemind();
}
async function remindOff(){
  Remind.msg="Turning off…";drawRemind();
  try{
    const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
    if(sub){await api("POST","/push/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe()}
    Remind.state="off";Remind.msg="Reminders are off.";
  }catch(e){Remind.msg="Couldn't turn reminders off. Try again in a moment."}
  drawRemind();
}
const pushFailText=f=>`${f.host.includes("apple")?"Apple":f.host.includes("google")?"Google":"The push service"} refused it (${f.status||"no response"}${f.reason?": "+f.reason:""})`;
async function remindTest(){
  Remind.msg="Sending…";drawRemind();
  try{
    const r=await api("POST","/push/test",{});
    Remind.msg=r.sent?"Sent. It should arrive within a few seconds. If it doesn't, check iPhone Settings → Notifications → Tennis Fitness, and that a Focus mode isn't hiding it."
      :r.failed&&r.failed.length?"Not delivered. "+r.failed.map(pushFailText).join("; ")+"."
      :"Nothing was sent: "+(r.reason||"no device is subscribed")+".";
    await remindServer();
  }catch(e){Remind.msg=e&&e.kind==="signin"?"Sign in again, then try once more.":"Couldn't send a test. Try again in a moment."}
  drawRemind();
}
function remindLastText(){
  const l=Remind.last;if(!l||!l.at)return null;
  const when=new Date(l.at).toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
  const what=l.test?"test":"reminder";
  if(l.sent)return `Last ${what} sent ${when}.`;
  return `Last ${what} (${when}) wasn't delivered`+(l.failed&&l.failed[0]?": "+pushFailText(l.failed[0]):"")+".";
}
function drawRemind(){
  const box=$("#reminders");if(!box)return;box.replaceChildren(el("h2",{},"Gym-day reminders"));
  const st=Remind.state,line=t=>el("p",{class:"hint"},t);
  if(st==="checking")box.append(line("Checking…"));
  else if(st==="install")box.append(line("To get reminders on iPhone, add this app to your Home Screen (Share → Add to Home Screen) and open it from there."));
  else if(st==="unsupported")box.append(line("This browser can't show notifications. Open the app from your Home Screen instead."));
  else if(st==="denied")box.append(line(/iPhone|iPad/.test(navigator.userAgent)?"Notifications are blocked for this app. Turn them on in iPhone Settings → Notifications → Tennis Fitness, then come back here.":"Notifications are blocked for this site. Allow them in your browser's site settings, then reload."));
  else if(st==="off")box.append(line(`A notification at 8am on ${gymDays()}, with that day's workout and which lifts are ready to go up.`),
    el("div",{class:"row"},el("button",{type:"button",class:"btn primary",onclick:remindOn},"Turn on reminders")));
  else box.append(...[line(`On: 8am on ${gymDays()}.`),remindLastText()?line(remindLastText()):null,
    Remind.devices===0?line("This phone isn't registered with the server yet. Turn reminders off and on again."):null,
    el("div",{class:"row"},el("button",{type:"button",class:"btn",onclick:remindTest},"Send a test"),el("button",{type:"button",class:"btn quiet",onclick:remindOff},"Turn off"))].filter(Boolean));
  if(Remind.msg)box.append(el("p",{class:"hint","aria-live":"polite"},Remind.msg));
}

/* ---------- tabs (also reachable as /log/#train, #play, #progress, #body) ---------- */
const HASH_TAB={train:"log",play:"play",progress:"progress",body:"body"},TAB_HASH={log:"train",play:"play",progress:"progress",body:"body"};
function setTab(t){S.tab=t;try{localStorage.setItem("tab",t)}catch(e){}
  try{history.replaceState(null,"","#"+TAB_HASH[t])}catch(e){}
  const draw=()=>{if(t==="log")loadDraft();render();window.scrollTo(0,0)};
  if(document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.startViewTransition(draw);else draw()}
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
    const rejected=lsGet(LS_REJECTED,[]);
    text=JSON.stringify({app:"Tennis Fitness Tracker",exportedAt:new Date().toISOString(),sessions:S.sessions,body:S.body,play:S.play,...(rejected.length?{unsyncedRejected:rejected}:{})},null,2);
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
const asData=d=>({sessions:(d&&d.sessions)||{},body:(d&&d.body)||{},play:(d&&d.play)||{}});
const Sync={server:asData(lsGet(LS_DATA,null)),queue:lsGet(LS_QUEUE,[]),inflight:new Set(),
  state:"loading",loaded:false,chain:Promise.resolve(),flushQueued:false,flushT:null,retryT:null,retryMs:5000,subs:[]};

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
  const json=body?JSON.stringify(body):undefined;
  let r;
  try{r=await fetch("/api/log"+path,{method,credentials:"same-origin",redirect:"manual",cache:"no-store",
    keepalive:!!json&&json.length<60000, // lets a save finish if the app is closed mid-request
    headers:json?{"content-type":"application/json"}:{},body:json})}
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
      Sync.server=asData(d);lsSet(LS_DATA,Sync.server);
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
    if(S.autoDay&&S.autoDate)S.day=defaultDay(S.sessions);
    loadDraft();
    if(S.tab==="log"){const y=window.scrollY;renderLog();window.scrollTo(0,y)}
    else if(S.tab==="progress")renderProgress();
    else if(S.tab==="play")renderPlay();
    else if(!typing)renderBodyLists();
  }
  firstData=false;
  updateBadge();
});

/* A dot on the Home Screen icon on a gym day until a set is logged (iPhone needs
   notifications allowed for this; elsewhere it's simply skipped). */
function updateBadge(){
  if(!("setAppBadge" in navigator))return;
  const gymDay=ROTATION.some(d=>d.dow===new Date().getDay());
  try{(gymDay&&!trainedOn(Object.values(S.sessions),todayIso())?navigator.setAppBadge(1):navigator.clearAppBadge()).catch(()=>{})}catch(e){}
}

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
    if(S.autoDate&&S.date!==today){saveNow();S.date=today;S.autoDay=true;S.day=defaultDay(S.sessions);loadDraft();render()}
    updateBadge();
    refresh();
  }
  syncWake();
});
window.addEventListener("pagehide",saveNow);
let resizeT=null,lastW=window.innerWidth;
window.addEventListener("resize",()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{if(Math.abs(window.innerWidth-lastW)<40)return;lastW=window.innerWidth;if(S.tab!=="log")render()},250)});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("/log/sw.js",{scope:"/log/"}).catch(()=>{})});
}

publish();showSync();render();refresh();remindCheck();
