"use strict";
/* ---------- helpers ---------- */
const $ = s=>document.querySelector(s);
// el("div",{class:"x",onclick:fn},children…): build an element; null/false attributes and children are skipped
const el = (tag,attrs={},...kids)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")n.className=v;else if(k.startsWith("on"))n.addEventListener(k.slice(2),v);else if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;n.append(c.nodeType?c:document.createTextNode(c))}return n};
const svgEl=(t,a={})=>{const e=document.createElementNS("http://www.w3.org/2000/svg",t);for(const k in a)e.setAttribute(k,a[k]);return e};
// dates are "YYYY-MM-DD" in local time; noon avoids daylight-saving edge cases
const iso = d=>{const z=new Date(d);z.setMinutes(z.getMinutes()-z.getTimezoneOffset());return z.toISOString().slice(0,10)};
const dayT=d=>Date.parse(d+"T12:00:00");
const weekStart=d=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
const fmtDate = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"});
const fmtShort = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short"});
const shortDM=d=>{const x=new Date(d+"T12:00:00");return x.getDate()+"/"+(x.getMonth()+1)};
const num = v=>{if(v===""||v==null)return null;const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
const fmtKg = n=>n==null?"–":(Math.round(n*10)/10).toString();
const fmtInt=n=>n==null?"–":Math.round(n).toLocaleString("en-AU");
const fmtDur=min=>{if(min==null)return "–";const h=Math.floor(min/60),m=Math.round(min%60);return h?h+"h "+String(m).padStart(2,"0")+"m":m+"m"};
const fmtClock=hhmm=>{if(!hhmm)return "";const[h,m]=hhmm.split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+(h<12?"am":"pm")};
const signed=(v,d=1,u="")=>(v>0?"+":v<0?"−":"±")+Math.abs(v).toFixed(d).replace(/\.0+$/,"")+u;
const kpi=(val,lbl,sub)=>el("div",{class:"kpi"},el("b",{class:"num"},val),el("span",{},lbl),sub?el("small",{},sub):null);

/* Each day is ordered into weight "stations": exercises in a station use the same
   dumbbell setup, so you only reload between stations. kg = default per-dumbbell
   weight (assuming a 2 kg handle) until you've logged the station's first exercise. */
const PLAN = {
  push:{name:"Push + arms",sub:"Tuesday",dow:2,mins:45,
   stations:{
    A:{kit:"one",kg:2,label:"One bare handle",note:"Warm-up for the shoulder."},
    B:{kit:"pair",kg:12,label:"Both dumbbells heavy",note:"Floor press, then use one of them for the triceps extension."},
    C:{kit:"pair",kg:7,label:"Both dumbbells medium",note:"Press and curls share this weight."},
    D:{kit:"pair",kg:4.5,label:"Both dumbbells light"}},
   ex:[
    {id:"ext-rot",st:"A",n:"Side-lying external rotation",sets:2,lo:15,hi:15,start:"Bare handle",unit:"per arm",rest:45,load:"kg"},
    {id:"floor-press",st:"B",n:"Dumbbell floor press",sets:4,lo:6,hi:8,start:"10–14 kg",unit:"per hand",rest:150,load:"kg"},
    {id:"oh-tri",st:"B",n:"Overhead tricep extension",sets:3,lo:8,hi:12,start:"One floor-press dumbbell",unit:"held in both hands",rest:75,load:"kg"},
    {id:"ohp",st:"C",pair:"zottman",n:"Standing overhead press",sets:3,lo:8,hi:12,start:"6–10 kg",unit:"per hand",rest:90,load:"kg"},
    {id:"zottman",st:"C",n:"Zottman curls",sets:3,lo:8,hi:12,start:"Same as the press",unit:"per hand",rest:75,load:"kg"},
    {id:"lateral",st:"D",n:"Lateral raises",sets:3,lo:12,hi:15,start:"3–5 kg",unit:"per hand",rest:60,load:"kg"}
  ]},
  pull:{name:"Pull + arms",sub:"Thursday",dow:4,mins:50,
   stations:{
    A:{kit:"pair",kg:4.5,label:"Both dumbbells light",note:"Warm-up for the upper back."},
    B:{kit:"pair",kg:12,label:"Both dumbbells heavy",note:"Rows, close-grip press and pullovers all use this weight."},
    C:{kit:"pair",kg:7,label:"Both dumbbells medium"},
    D:{kit:"one",kg:4.5,label:"Take one dumbbell down to light",note:"Keep the other at curl weight for palm-up wrist curls."}},
   ex:[
    {id:"rear-fly",st:"A",n:"Rear-delt flyes",sets:3,lo:12,hi:15,start:"3–5 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"bo-row",st:"B",pair:"cg-press",n:"Bent-over row",sets:4,lo:6,hi:10,start:"10–14 kg",unit:"per hand",rest:120,load:"kg"},
    {id:"cg-press",st:"B",n:"Close-grip floor press",sets:3,lo:8,hi:12,start:"Same as the row",unit:"per hand",rest:90,load:"kg"},
    {id:"pullup",st:"B",n:"Pull-ups or pullovers",sets:3,lo:null,hi:null,start:"Bodyweight / one row dumbbell",unit:"as many as possible",rest:120,load:"bw"},
    {id:"curl",st:"C",n:"Bicep curls",sets:3,lo:8,hi:12,start:"7–10 kg",unit:"per hand",rest:75,load:"kg"},
    {id:"wrist",st:"D",n:"Wrist curls + reverse",sets:2,lo:15,hi:15,start:"Curl dumbbell / light dumbbell",unit:"palm up / palm down",rest:45,load:"kg"}
  ]},
  upper:{name:"Arms + legs",sub:"Saturday",dow:6,mins:55,
   stations:{
    A:{kit:"none",label:"No weights",note:"Load the dumbbells for hammer curls while you rest."},
    B:{kit:"pair",kg:7,label:"Both dumbbells medium",note:"Hammer curls, then one of them for concentration curls."},
    C:{kit:"pair",kg:4.5,label:"Both dumbbells light",note:"Skull crushers, then one of them for woodchops."},
    D:{kit:"pair",kg:14.5,label:"Both dumbbells heavy",note:"Deadlifts, split squats and calf raises."}},
   ex:[
    {id:"diamond",st:"A",n:"Close-grip push-ups",sets:3,lo:null,hi:null,start:"Bodyweight",unit:"as many as possible",rest:90,load:"bw"},
    {id:"hammer",st:"B",n:"Hammer curls",sets:3,lo:8,hi:12,start:"8–10 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"conc-curl",st:"B",n:"Concentration curls",sets:2,lo:8,hi:12,start:"One hammer-curl dumbbell",unit:"per arm",rest:45,load:"kg"},
    {id:"skull",st:"C",pair:"woodchop",n:"Floor skull crushers",sets:3,lo:10,hi:15,start:"5–8 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"woodchop",st:"C",n:"Dumbbell woodchop",sets:2,lo:10,hi:12,start:"One skull-crusher dumbbell",unit:"per side",rest:45,load:"kg"},
    {id:"rdl",st:"D",n:"Romanian deadlift",sets:3,lo:8,hi:10,start:"12–16 kg",unit:"per hand",rest:120,load:"kg"},
    {id:"split",st:"D",n:"Rear-foot-elevated split squat",sets:2,lo:10,hi:10,start:"Bodyweight, then the deadlift dumbbells",unit:"per leg",rest:75,load:"kg"},
    {id:"calf",st:"D",n:"Single-leg calf raises",sets:2,lo:15,hi:15,start:"Bodyweight, then one deadlift dumbbell",unit:"per leg",rest:45,load:"kg"}
  ]}
};
/* ---------- exercise instructions (shown under "How to do it") ----------
   steps: in order; an item {h:"…"} starts a new group (e.g. an alternative version)
   feel: where you should feel it working; avoid: the common form mistakes */
const HOW={
  "floor-press":{steps:[
    "Sit on the floor with a dumbbell standing on each thigh. Lie back with knees bent and feet flat, bringing the dumbbells to your chest as you go.",
    "Press both dumbbells straight up over your chest, palms facing your feet. This is the start position.",
    "Lower slowly (about 2 seconds) with your elbows at roughly 45° from your body: an arrow shape, not a T.",
    "Let the backs of your upper arms rest on the floor for one second. Keep your shoulder blades squeezed together.",
    "Press back up until your arms are straight, finishing with the dumbbells over your chest, not your face.",
    "To finish, lower the dumbbells to your chest and roll them onto your thighs as you sit up."],
    feel:"Chest, front of the shoulders and triceps.",
    avoid:["Elbows flared straight out to the sides, which strains the shoulders.","Bouncing your elbows off the floor.","Lifting your hips or arching your lower back off the floor."]},
  "ohp":{steps:[
    "Stand with feet hip-width apart, dumbbells at shoulder height, palms facing forward, elbows slightly in front of your body.",
    "Squeeze your glutes and brace your abs as if someone's about to poke your stomach. Keep your ribs pulled down.",
    "Press straight up until your arms are straight and your biceps are beside your ears.",
    "Lower slowly (2 seconds) back to shoulder height."],
    feel:"Shoulders and triceps.",
    avoid:["Leaning back or arching your lower back to get the weight up. Go lighter if you need to.","Using your legs to bounce the weight up.","Stopping halfway: go all the way up and all the way down."]},
  "lateral":{steps:[
    "Stand tall with soft knees, dumbbells by your sides, palms facing in. Lean forward very slightly.",
    "Bend your elbows a little and keep them fixed at that angle for the whole set.",
    "Raise your arms out to the sides until your hands reach shoulder height and no higher. Think of pushing your hands out to the walls, not up to the ceiling.",
    "Pause for a moment, then lower over 2–3 seconds."],
    feel:"The sides of your shoulders.",
    avoid:["Swinging your body to get the weights up. If you need to swing, they're too heavy.","Shrugging your shoulders up towards your ears.","Lifting above shoulder height."]},
  "oh-tri":{steps:[
    "Stand or sit tall. Hold one dumbbell vertically with both hands, palms cupping the underside of the top plate.",
    "Press it straight overhead with your upper arms close to your ears.",
    "Keep your upper arms still and elbows pointing forward. Bend only at the elbows to lower the dumbbell behind your head until you feel a deep stretch in the backs of your arms.",
    "Straighten your arms to lift it back up. Only your forearms move."],
    feel:"The backs of your upper arms (triceps), with a strong stretch at the bottom.",
    avoid:["Elbows flaring out wide.","Arching your lower back. Brace your abs, or sit on a chair with a back.","Dropping the weight quickly behind your head."]},
  "zottman":{steps:[
    "Stand tall, dumbbells by your sides, palms facing forward. Pin your elbows to your sides.",
    "Curl both dumbbells up to shoulder height, moving only at the elbows.",
    "At the top, turn your wrists so your palms face down.",
    "Lower slowly over 3 seconds with palms down. At the bottom, turn your palms forward again for the next rep."],
    feel:"Biceps on the way up, the top of your forearms on the way down.",
    avoid:["Elbows drifting forward as you curl.","Swinging your body.","Going too heavy. The palms-down lowering is the hard part, so pick a weight you can lower slowly."]},
  "ext-rot":{steps:[
    "Lie on your side with knees bent, head resting on your lower arm or a pillow.",
    "Hold a light dumbbell in your top hand. Bend that elbow to 90° and pin it to your side. A rolled-up towel between your elbow and ribs helps.",
    "Start with the forearm resting across your stomach. Rotate it up towards the ceiling as far as is comfortable, keeping the elbow glued to your side.",
    "Pause, then lower over 3 seconds. Do all reps, then roll over and do the other arm."],
    feel:"The back of your shoulder. It's a small muscle, so a mild burn is normal.",
    avoid:["Your elbow lifting off your ribs.","Rolling your body backwards to help.","Going heavy: 1–3 kg is plenty. This is about control."]},
  "bo-row":{steps:[
    "Stand with feet hip-width apart, a dumbbell in each hand, knees slightly bent.",
    "Push your hips back until your torso is at about 45°. Keep your back flat and look at the floor about a metre ahead. Let the dumbbells hang below your shoulders, palms facing each other.",
    "Brace your abs, then pull the dumbbells towards your lower ribs with your elbows going back at about 45° from your body. Squeeze your shoulder blades together at the top.",
    "Lower until your arms are straight. Keep your torso at the same angle the whole time."],
    feel:"Upper and middle back, the backs of your shoulders and your lats.",
    avoid:["Rounding your lower back. This is the big one: go lighter if it rounds.","Standing up more as you pull.","Jerking the weight or shrugging."]},
  "pullup":{steps:[
    {h:"With a bar: pull-ups"},
    "Grip the bar slightly wider than your shoulders, palms facing away (or towards you for chin-ups, which are a little easier).",
    "Hang with straight arms. Before bending your arms, pull your shoulders down away from your ears.",
    "Pull until your chin is over the bar, driving your elbows down towards your hips.",
    "Lower all the way to straight arms over 2–3 seconds.",
    {h:"No bar: floor pullovers"},
    "Lie on the floor with knees bent. Hold one dumbbell with both hands cupping the top plate, arms straight up above your chest.",
    "With a slight bend in your elbows, lower the dumbbell in an arc behind your head until you feel a stretch along your sides.",
    "Pull it back over your chest along the same arc. Keep your lower back on the floor."],
    feel:"Lats (the wide muscles down your sides and back) and biceps.",
    avoid:["Swinging or kicking to get up.","Half reps: straight arms at the bottom every time.","On pullovers, arching your lower back off the floor."]},
  "curl":{steps:[
    "Stand tall, dumbbells by your sides, palms facing forward, shoulders back. Pin your elbows to your sides.",
    "Curl the dumbbells up, bending only at the elbows, until your forearms are vertical.",
    "Squeeze your biceps hard for one second at the top.",
    "Lower over 3 seconds all the way to straight arms. The slow lowering does as much as the lift."],
    feel:"Biceps.",
    avoid:["Leaning back or swinging your hips.","Elbows drifting forward at the top, which shifts the work to your shoulders.","Stopping short of straight arms at the bottom."]},
  "cg-press":{steps:[
    "Lie on the floor with knees bent. Press both dumbbells up above your chest and touch them together, palms facing each other.",
    "Keep the dumbbells squeezed together for the whole set.",
    "Lower slowly with your elbows tucked tight to your sides until your upper arms touch the floor. The dumbbells end up above your lower chest.",
    "Press straight back up, concentrating on straightening your elbows."],
    feel:"Triceps first, then the inner chest.",
    avoid:["Elbows flaring out to the sides.","The dumbbells drifting towards your face.","Bouncing your elbows off the floor."]},
  "rear-fly":{steps:[
    "Stand with feet hip-width apart and soft knees. Hinge forward at the hips until your chest is nearly parallel to the floor, back flat. (Or sit on the edge of a chair and lean your chest towards your thighs.)",
    "Let the dumbbells hang under your chest, palms facing each other, elbows slightly bent.",
    "Raise your arms out to the sides in a wide arc until they're level with your body, like a T.",
    "Pause, then lower over 2–3 seconds."],
    feel:"The backs of your shoulders and between your shoulder blades.",
    avoid:["Too much weight, which turns it into a row (elbows bending more and more).","Swinging your torso up and down.","Shrugging your shoulders."]},
  "wrist":{steps:[
    "Sit on a chair and rest your forearm along your thigh, wrist just past your knee, holding a dumbbell palm up.",
    "Let the dumbbell roll down towards your fingertips, then curl it back into your palm and lift your wrist as high as it goes. Your forearm stays on your thigh.",
    "Lower slowly. Do 15 reps, then switch arms.",
    "Reverse curls: same position, palm facing down, lighter dumbbell. Lift the back of your hand towards the ceiling, then lower slowly."],
    feel:"Forearms, the front on palm-up and the top on palm-down.",
    avoid:["Lifting your forearm off your thigh.","Bouncing the weight.","Going heavy on the palm-down version, which can strain the wrist."]},
  "diamond":{steps:[
    "Place your hands on the floor under your chest, a little narrower than shoulder-width.",
    "Get into a straight line from head to heels: squeeze your glutes and brace your abs.",
    "Lower your chest towards your hands, with your elbows brushing your ribs and pointing back towards your feet, until your chest is a fist's height from the floor.",
    "Push back up to straight arms. When you can't do full reps, drop to your knees and keep going."],
    feel:"Triceps and chest.",
    avoid:["Hips sagging or sticking up.","Elbows flaring out to the sides.","Letting your head drop towards the floor."]},
  "hammer":{steps:[
    "Stand tall, dumbbells by your sides, palms facing your thighs (thumbs pointing forward). Pin your elbows.",
    "Curl the dumbbells up with palms still facing each other, like holding two hammers, until your forearms are vertical.",
    "Squeeze for a moment at the top.",
    "Lower over 3 seconds to straight arms."],
    feel:"The outer part of your upper arm and your forearm.",
    avoid:["Swinging your body.","Elbows drifting forward.","Twisting your wrists: palms stay facing in throughout."]},
  "skull":{steps:[
    "Lie on the floor with knees bent, dumbbells pressed up above your chest, palms facing each other.",
    "Tilt your arms back slightly so the dumbbells are above your forehead. This keeps the tension on your triceps.",
    "Keep your upper arms still and bend only at the elbows to lower the dumbbells slowly beside your head, until they nearly touch the floor.",
    "Straighten your elbows to return to the slightly tilted start position."],
    feel:"The backs of your upper arms (triceps).",
    avoid:["Elbows flaring out.","Moving your upper arms, which turns it into a press.","Lowering quickly near your face."]},
  "conc-curl":{steps:[
    "Sit on a chair with your feet wide. Hold a dumbbell and lean forward, bracing the back of your upper arm against the inside of the same-side thigh. Let the arm hang straight down.",
    "Curl the dumbbell up towards your shoulder, keeping your upper arm pressed against your thigh.",
    "Squeeze hard for one second at the top.",
    "Lower slowly to a fully straight arm. Do all reps on one arm, then switch."],
    feel:"Biceps, with a strong squeeze at the top.",
    avoid:["Lifting your elbow off your thigh.","Using your body or leg to help.","Stopping short of a straight arm."]},
  "woodchop":{steps:[
    "Stand with feet wider than your shoulders, holding one dumbbell by its ends with both hands.",
    "Start with the dumbbell up beside your right shoulder, torso turned slightly to the right.",
    "Rotate your torso and pivot your back foot to bring the dumbbell diagonally down across your body to the outside of your left knee, bending your knees as you go. Arms stay fairly straight: the power comes from your hips and torso.",
    "Return under control to the start. Do all reps on one side, then switch."],
    feel:"The sides of your waist (obliques) and your core. This is the rotation behind your groundstrokes.",
    avoid:["Rounding your lower back at the bottom.","Doing it with your arms only.","Going faster than you can control."]},
  "rdl":{steps:[
    "Stand with feet hip-width apart, dumbbells in front of your thighs, palms facing you. Unlock your knees slightly and keep that small bend fixed.",
    "Push your hips straight back, sliding the dumbbells down the front of your legs and keeping them close.",
    "Keep your back flat and chest up. Stop when you feel a strong stretch in your hamstrings, usually just below the knees to mid-shin. Don't chase the floor.",
    "Drive your hips forward to stand tall, squeezing your glutes at the top. Don't lean back."],
    feel:"Hamstrings (backs of the thighs) and glutes. Not your lower back.",
    avoid:["Rounding your back. Stop higher if it starts to round.","Bending your knees into a squat.","The dumbbells drifting away from your legs."]},
  "split":{steps:[
    "Stand a long stride in front of a low step, chair or couch, facing away from it. Rest the top of your back foot on it, laces down.",
    "Hold a wall or doorframe for balance until you're confident.",
    "Keeping your torso upright (a slight forward lean is fine), lower straight down by bending your front knee until your front thigh is about level with the floor and your back knee is close to it.",
    "Push through your whole front foot, especially the heel, to stand back up. Do all reps on one leg, then switch. If your front heel lifts, move your front foot further forward."],
    feel:"Front of the front thigh and the front-leg glute.",
    avoid:["Your front knee caving inwards.","Pushing off with the back foot.","Bouncing at the bottom."]},
  "calf":{steps:[
    "Stand on one foot on the edge of a step, ball of the foot on the step and heel hanging off. Hold a rail or wall lightly for balance, with a dumbbell in the same-side hand once bodyweight gets easy.",
    "Lower your heel slowly (2 seconds) as far as is comfortable, to stretch the calf.",
    "Rise as high as you can onto the ball of your foot and hold the top for one second.",
    "Keep the knee straight but not locked."],
    feel:"Calf and Achilles, which protects them for tennis.",
    avoid:["Bouncing at the bottom.","Rushing the reps.","Pulling yourself up with the rail."]}
};
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

/* ---------- dumbbell plates ----------
   Kit: two spin-lock handles, 8 × 2.5 kg and 8 × 1.25 kg plates. Plates go on in
   matching pairs (same on each side). Loading both dumbbells the same means each
   dumbbell can take at most 2 of each plate per side; one dumbbell can take 4. */
const PLATES={big:2.5,small:1.25,count:8};
function handleKg(){try{const v=parseFloat(localStorage.getItem("tft:handle"));return v>0&&v<10?v:2}catch(e){return 2}}
function setHandleKg(v){try{localStorage.setItem("tft:handle",String(v))}catch(e){}}
const perSideMax=kit=>kit==="one"?PLATES.count/2:PLATES.count/4;
function loadKg(l){return handleKg()+2*(l.big*PLATES.big+l.small*PLATES.small)}
// best loading for a target weight per dumbbell: closest, then fewest plates
function bestLoad(target,kit){
  const m=perSideMax(kit);let best=null;
  for(let b=0;b<=m;b++)for(let s=0;s<=m;s++){
    const l={big:b,small:s},kg=loadKg(l),d=Math.abs(kg-target),n=b+s;
    if(!best||d<best.d-1e-9||(Math.abs(d-best.d)<1e-9&&n<best.n))best={...l,kg,d,n};
  }
  return {big:best.big,small:best.small};
}
function reachable(kit){
  const m=perSideMax(kit),set=new Set();
  for(let b=0;b<=m;b++)for(let s=0;s<=m;s++)set.add(Math.round(loadKg({big:b,small:s})*100)/100);
  return [...set].sort((a,b)=>a-b);
}
const sideText=l=>{const p=[];for(let i=0;i<l.big;i++)p.push("2.5");for(let i=0;i<l.small;i++)p.push("1.25");return p.length?p.join(" + ")+" each side":"no plates"};

function dumbbellSVG(l){
  const W=320,H=96,cx=W/2,mk=svgEl;
  const s=mk("svg",{viewBox:`0 0 ${W} ${H}`,class:"dbsvg",role:"img","aria-label":`Dumbbell loaded with ${sideText(l)}`});
  const grip=64,bigW=14,smallW=10,gap=2;
  s.append(mk("rect",{x:20,y:H/2-4,width:W-40,height:8,rx:3,class:"db-bar"}));
  s.append(mk("rect",{x:cx-grip/2,y:H/2-6,width:grip,height:12,rx:4,class:"db-grip"}));
  [-1,1].forEach(dir=>{
    let x=cx+dir*(grip/2+6);
    s.append(mk("rect",{x:dir<0?x-4:x,y:H/2-11,width:4,height:22,rx:1,class:"db-collar"}));x+=dir*6;
    const plates=[...Array(l.big).fill("big"),...Array(l.small).fill("small")];
    plates.forEach(p=>{const w=p==="big"?bigW:smallW,h=p==="big"?80:60;
      s.append(mk("rect",{x:dir<0?x-w:x,y:(H-h)/2,width:w,height:h,rx:3,class:"db-plate "+p}));x+=dir*(w+gap)});
    s.append(mk("rect",{x:dir<0?x-6:x,y:H/2-9,width:6,height:18,rx:2,class:"db-nut"}));
  });
  return s;
}

/* the calculator sheet: one loading, edited either by target weight or plate by plate */
const Calc={kit:"pair",l:{big:0,small:0}};
function openCalc(kg,kit){
  Calc.kit=kit==="one"?"one":"pair";
  Calc.l=kg!=null?bestLoad(kg,Calc.kit):{big:0,small:0};
  renderCalc();const d=$("#calc");if(!d.open){try{d.showModal()}catch(e){d.setAttribute("open","")}}
}
function renderCalc(){
  const box=$("#calc-body");box.replaceChildren();
  const m=perSideMax(Calc.kit);Calc.l.big=Math.min(Calc.l.big,m);Calc.l.small=Math.min(Calc.l.small,m);
  const kg=loadKg(Calc.l),opts=reachable(Calc.kit);
  const step=dir=>{const i=opts.findIndex(v=>v>=kg-1e-9);const j=Math.max(0,Math.min(opts.length-1,i+dir));Calc.l=bestLoad(opts[j],Calc.kit);renderCalc()};
  const counter=(key,label)=>el("div",{class:"pc-row"},
    el("span",{class:"pc-lbl"},el("i",{class:"pc-swatch "+key}),label),
    el("button",{type:"button",class:"pc-btn","aria-label":"Remove a "+label+" plate from each side",disabled:Calc.l[key]===0||null,onclick:()=>{Calc.l[key]--;renderCalc()}},"−"),
    el("b",{class:"num pc-n"},String(Calc.l[key])),
    el("button",{type:"button",class:"pc-btn","aria-label":"Add a "+label+" plate to each side",disabled:Calc.l[key]>=m||null,onclick:()=>{Calc.l[key]++;renderCalc()}},"+"));
  const used=k=>Calc.l[k]*2*(Calc.kit==="pair"?2:1);
  box.append(
    el("div",{class:"seg",role:"group","aria-label":"Dumbbells"},
      ["pair","one"].map(k=>el("button",{type:"button","aria-pressed":String(Calc.kit===k),onclick:()=>{Calc.kit=k;Calc.l=bestLoad(kg,k);renderCalc()}},k==="pair"?"Both dumbbells":"One dumbbell"))),
    el("div",{class:"pc-target"},
      el("button",{type:"button",class:"pc-big","aria-label":"Lighter",disabled:kg<=opts[0]+1e-9||null,onclick:()=>step(-1)},"−"),
      el("div",{class:"pc-kg"},el("b",{class:"num"},fmtKg(kg)),el("span",{}," kg per dumbbell")),
      el("button",{type:"button",class:"pc-big","aria-label":"Heavier",disabled:kg>=opts[opts.length-1]-1e-9||null,onclick:()=>step(1)},"+")),
    dumbbellSVG(Calc.l),
    el("p",{class:"pc-recipe"},el("b",{},"Load: "),sideText(Calc.l)+(Calc.kit==="pair"?", on both dumbbells":"")),
    el("div",{class:"pc-counters"},counter("big","2.5 kg"),counter("small","1.25 kg")),
    el("p",{class:"hint"},`Using ${used("big")} of 8 × 2.5 kg and ${used("small")} of 8 × 1.25 kg plates.`+(Calc.kit==="pair"?` Pair total ${fmtKg(kg*2)} kg.`:"")),
    el("label",{class:"pc-handle",for:"calc-handle"},"Handle weight",
      el("div",{class:"field"},el("input",{type:"number",id:"calc-handle",inputmode:"decimal",step:"0.05",min:"0.5",max:"9",value:handleKg(),
        onchange:e=>{const v=parseFloat(e.target.value);if(v>0&&v<10){setHandleKg(v);e.target.blur();requestAnimationFrame(()=>{renderCalc();if(S.tab==="log")renderLog()})}}}),el("i",{},"kg"))));
}
function stationKg(day,stId){
  // the weight you last used for the station's first weighted exercise, else the plan default
  const st=PLAN[day].stations[stId];if(!st||st.kit==="none")return null;
  const lead=PLAN[day].ex.find(e=>e.st===stId&&e.load==="kg");
  const last=lead&&lastFor(lead.id,S.date,sid());
  const kgs=last?doneSets(last.entries[lead.id]).map(s=>s.kg).filter(v=>v!=null):[];
  const target=kgs.length?Math.max(...kgs):st.kg;
  return loadKg(bestLoad(target,st.kit==="one"?"one":"pair"));
}
function stationHeader(day,stId,first){
  const st=PLAN[day].stations[stId];
  if(st.kit==="none")return el("div",{class:"station"},el("span",{class:"st-tag"},first?"Start":"Change"),el("div",{class:"st-main"},el("b",{},st.label),st.note?el("span",{},st.note):null));
  const kg=stationKg(day,stId),kit=st.kit==="one"?"one":"pair",l=bestLoad(kg,kit);
  return el("div",{class:"station"},
    el("span",{class:"st-tag"},first?"Start":"Change"),
    el("div",{class:"st-main"},el("b",{},`${st.label} · ${fmtKg(kg)} kg`),el("span",{},(s=>s[0].toUpperCase()+s.slice(1))(sideText(l))+"."+(st.note?" "+st.note:""))),
    el("button",{type:"button",class:"btn st-btn",onclick:()=>openCalc(kg,kit)},"Plates"));
}

const ORDER = ["push","pull","upper"];
const EX = {}; ORDER.forEach(d=>PLAN[d].ex.forEach(e=>EX[e.id]={...e,day:d}));


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
  m.append(el("div",{class:"daybar"},ORDER.map(k=>el("button",{type:"button","aria-pressed":String(S.day===k),onclick:()=>{saveNow();S.day=k;loadDraft();renderLog()}},el("b",{},PLAN[k].name),el("span",{},PLAN[k].sub+" · ~"+PLAN[k].mins+" min")))));
  const p=PLAN[S.day];
  m.append(el("div",{class:"daterow"},
    el("label",{for:"sess-date"},"Session date ",el("input",{type:"date",id:"sess-date",value:S.date,max:iso(new Date()),onchange:e=>{if(e.target.value){saveNow();S.date=e.target.value;S.autoDate=S.date===iso(new Date());loadDraft();renderLog()}}})),
    el("span",{},S.sessions[sid()]?"Logged · edits save automatically":"Ticks save automatically"),
    el("button",{type:"button",class:"btn quiet",onclick:()=>openCalc(null,"pair")},"Plate calculator")
  ));
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
      ready===true?(atPlateLimit(e,last,S.day)?el("span",{class:"chip warn",title:"No heavier loading possible with your plates"},"At plate limit: add reps"):el("span",{class:"chip up"},e.load==="kg"?"Add 2.5 kg":"Make it harder")):ready===false?el("span",{class:"chip hold"},"Same again"):null)
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
    const kgPh=prev&&prev.kg!=null?fmtKg(prev.kg):(e.load==="kg"?(stKg!=null?fmtKg(stKg):""):"–");
    const repPh=prev&&prev.reps!=null?String(prev.reps):(e.hi==null?"":String(e.hi));
    const row=el("div",{class:"set"+(cur.done?" done":"")});
    const kgIn=el("input",{type:"number",inputmode:"decimal",step:"0.5",min:"0",id:`kg-${e.id}-${i}`,"aria-label":`${e.n} set ${i+1} kilograms`,placeholder:kgPh,value:cur.kg??""});
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

function sparkSVG(vals,w,h,pad){
  const s=svgEl("svg",{viewBox:`0 0 ${w} ${h}`,class:"spark","aria-hidden":"true"});
  const lo=Math.min(...vals),hi=Math.max(...vals),r=hi-lo||1;
  const pts=vals.map((v,i)=>[pad+(vals.length===1?0:i*(w-2*pad)/(vals.length-1)),h-pad-((v-lo)/r)*(h-2*pad)]);
  const L=pts[pts.length-1];
  s.append(svgEl("polyline",{points:pts.map(p=>p.join(",")).join(" "),class:"ln s1"}),svgEl("circle",{cx:L[0],cy:L[1],r:2.8,class:"dot s1"}));
  return s;
}

/* ---------- charts ----------
   Charts are drawn at the real width of the screen (1 SVG unit = 1 CSS pixel), so
   their labels stay at a readable size on a phone and don't balloon on a desktop. */
function chartW(){
  const m=$("#main");if(!m)return 340;
  const cs=getComputedStyle(m);
  return Math.round(Math.max(260,Math.min(620,m.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-30)));
}
function niceStep(raw){const p=10**Math.floor(Math.log10(raw||1));for(const m of [1,2,2.5,5,10])if(m*p>=raw)return m*p;return 10*p}
// series: [{name, cls:"s1"|"s2"|"s3", pts:[{t:"YYYY-MM-DD", v}]}]; band: {name, lo:[pts], hi:[pts]}
function lineChart({series,band,fmt=(v,dec)=>v.toFixed(dec),zero=false,H=190,label}){
  const W=chartW(),P={l:42,r:12,t:12,b:24};
  const pts=[...series.flatMap(s=>s.pts),...(band?[...band.lo,...band.hi]:[])];
  const ts=pts.map(p=>dayT(p.t)),t0=Math.min(...ts),t1=Math.max(...ts),tr=t1-t0||864e5;
  let lo=Math.min(...pts.map(p=>p.v),...(zero?[0]:[])),hi=Math.max(...pts.map(p=>p.v),...(zero?[0]:[]));
  if(hi-lo<1e-9){hi+=1;lo-=1}
  const step=niceStep((hi-lo)/4);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
  const X=t=>P.l+(dayT(t)-t0)/tr*(W-P.l-P.r),Y=v=>P.t+(hi-v)/(hi-lo)*(H-P.t-P.b);
  const s=svgEl("svg",{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:"chart",role:"img","aria-label":label||""});
  for(let v=lo;v<=hi+step/2;v+=step){
    s.append(svgEl("line",{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),class:Math.abs(v)<1e-9&&zero?"grid zero":"grid"}));
    const dec=step>=1?0:Math.abs(step*10-Math.round(step*10))<1e-9?1:2;
    const t=svgEl("text",{x:P.l-6,y:Y(v)+4,"text-anchor":"end"});t.textContent=fmt(Math.round(v*100)/100,dec);s.append(t);
  }
  const firstT=pts.reduce((a,p)=>dayT(p.t)<dayT(a)?p.t:a,pts[0].t),lastT=pts.reduce((a,p)=>dayT(p.t)>dayT(a)?p.t:a,pts[0].t);
  [[firstT,"start"],[lastT,"end"]].forEach(([t,anchor])=>{const x=svgEl("text",{x:anchor==="start"?P.l:W-P.r,y:H-6,"text-anchor":anchor});x.textContent=fmtShort(t);s.append(x)});
  if(band){
    const d="M"+band.lo.map(p=>X(p.t)+","+Y(p.v)).join("L")+"L"+band.hi.slice().reverse().map(p=>X(p.t)+","+Y(p.v)).join("L")+"Z";
    s.append(svgEl("path",{d,class:"goalband"}));
  }
  series.forEach(se=>{
    if(!se.pts.length)return;
    const sorted=se.pts.slice().sort((a,b)=>dayT(a.t)-dayT(b.t));
    if(sorted.length>1)s.append(svgEl("polyline",{points:sorted.map(p=>X(p.t)+","+Y(p.v)).join(" "),class:"ln "+se.cls}));
    sorted.forEach((p,i)=>s.append(svgEl("circle",{cx:X(p.t),cy:Y(p.v),r:i===sorted.length-1?4.5:2.5,class:"dot "+se.cls})));
  });
  const wrap=el("div",{class:"chartwrap"},s);
  const legend=[...series.map(se=>[se.cls,se.name]),...(band?[["band",band.name]]:[])].filter(x=>x[1]);
  if(legend.length>1||band)wrap.append(el("div",{class:"legend"},legend.map(([c,n])=>el("span",{},el("i",{class:"key "+c}),n))));
  return wrap;
}

/* ---------- strength maths ----------
   Estimated one-rep max (Epley): weight × (1 + reps ÷ 30). It rises when you add
   weight OR reps, which matters here because shared-weight stations progress by reps. */
const e1rm=s=>s&&s.kg!=null&&s.reps?s.kg*(1+s.reps/30):null;
function sessionScore(e,sess){
  const sets=doneSets(sess.entries&&sess.entries[e.id]);if(!sets.length)return null;
  if(e.load==="kg"){const v=sets.map(e1rm).filter(v=>v!=null);return v.length?Math.max(...v):null}
  const r=sets.map(s=>s.reps).filter(v=>v!=null);return r.length?Math.max(...r):null;
}
function bestSet(e,sess){
  const sets=doneSets(sess.entries&&sess.entries[e.id]);if(!sets.length)return null;
  return sets.reduce((a,s)=>(e.load==="kg"?(e1rm(s)||0)>(e1rm(a)||0):(s.reps||0)>(a.reps||0))?s:a,sets[0]);
}
function allExercises(){return ORDER.flatMap(d=>PLAN[d].ex)}
function strengthSeries(){
  // average % change of every lift against its own first session, after each training day
  const base={},latest={},out=[];
  sessionsSorted().forEach(sess=>{
    let touched=false;
    allExercises().forEach(e=>{const v=sessionScore(e,sess);if(v==null)return;if(base[e.id]==null)base[e.id]=v;latest[e.id]=v;touched=true});
    if(!touched)return;
    const ids=Object.keys(base);const pct=ids.reduce((a,id)=>a+(latest[id]/base[id]-1),0)/ids.length*100;
    const prev=out[out.length-1];if(prev&&prev.t===sess.date)prev.v=pct;else out.push({t:sess.date,v:pct});
  });
  return out;
}
const plateMax=kit=>loadKg({big:perSideMax(kit),small:perSideMax(kit)});
function atPlateLimit(e,sess,day){
  if(e.load!=="kg"||!sess)return false;
  const st=PLAN[day]&&PLAN[day].stations[e.st];const kit=st&&st.kit==="one"?"one":"pair";
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
// kg × reps over completed sets; "per hand" exercises count both dumbbells
function sessionVolume(sess,day,only){
  let v=0;
  PLAN[day].ex.filter(e=>e.load==="kg"&&(!only||only.has(e.id))).forEach(e=>
    doneSets(sess.entries&&sess.entries[e.id]).forEach(s=>{if(s.kg!=null&&s.reps)v+=s.kg*s.reps*(e.unit==="per hand"?2:1)}));
  return v;
}
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
    if(readyToProgress(e,cur)===true)(atPlateLimit(e,cur,S.day)?limits:ready).push(e.n);
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
  if(ready.length)items.push(el("li",{},el("b",{},"Add 2.5 kg next time: "),ready.join(", ")));
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
  m.append(el("section",{class:"panel"},el("h2",{},"Log measurements"),el("p",{class:"hint"},"Weigh in weekly, same time of day. Measure arms and chest monthly."),form));
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
    const t=mk("text",{x:x+wd/2,y:H-6,"text-anchor":"middle"});t.textContent=i===weeks.length-1?"Now":shortDM(w.start);s.append(t)});
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
   The plan is uploaded with the subscription so the reminder knows each day's lifts. */
const planSnapshot=()=>({days:ORDER.map(k=>({dow:PLAN[k].dow,key:k,name:PLAN[k].name,mins:PLAN[k].mins,
  ex:PLAN[k].ex.map(e=>({id:e.id,n:e.n,sets:e.sets,hi:e.hi,load:e.load}))}))});
const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const gymDays=()=>{const d=ORDER.map(k=>PLAN[k].dow).sort().map(i=>DAY_NAMES[i]);return d.slice(0,-1).join(", ")+" and "+d[d.length-1]};
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const b64uBytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0));
const Remind={state:"checking",msg:""}; // checking | unsupported | install | denied | off | on

async function remindCheck(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
    Remind.state=/iPhone|iPad/.test(navigator.userAgent)&&!isStandalone()?"install":"unsupported";return drawRemind();
  }
  if(Notification.permission==="denied"){Remind.state="denied";return drawRemind()}
  try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();Remind.state=sub?"on":"off"}
  catch(e){Remind.state="off"}
  drawRemind();
  if(Remind.state==="on")syncPlan();
}
async function syncPlan(){
  // re-upload the plan only when it has changed since the last upload
  const json=JSON.stringify(planSnapshot());
  if(lsGet("tft:plan-sent","")===json)return;
  try{await api("POST","/push/plan",{plan:JSON.parse(json)});lsSet("tft:plan-sent",json)}catch(e){}
}
async function remindOn(){
  // ask first, straight from the tap: iPhone only allows the prompt from a direct user action
  const perm=await Notification.requestPermission();
  if(perm!=="granted"){Remind.state=perm==="denied"?"denied":"off";Remind.msg=perm==="denied"?"":"Notifications weren't allowed.";return drawRemind()}
  Remind.msg="Turning on…";drawRemind();
  try{
    const reg=await navigator.serviceWorker.ready;
    const {publicKey}=await api("GET","/push");
    const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uBytes(publicKey)});
    const plan=planSnapshot();
    await api("POST","/push/subscribe",{subscription:sub.toJSON(),plan});
    lsSet("tft:plan-sent",JSON.stringify(plan));
    Remind.state="on";Remind.msg="On. Use “Send a test” to check it arrives.";
  }catch(e){Remind.msg=e&&e.kind==="signin"?"Sign in again, then try once more.":e&&e.kind==="offline"?"You're offline. Try again with a connection.":"Couldn't turn reminders on. Try again in a moment."}
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
async function remindTest(){
  Remind.msg="Sending…";drawRemind();
  try{const r=await api("POST","/push/test",{});Remind.msg=r.sent?"Sent. It should arrive within a few seconds.":"Nothing was sent: "+(r.reason||"no device is subscribed")+"."}
  catch(e){Remind.msg="Couldn't send a test. Try again in a moment."}
  drawRemind();
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
  else box.append(line(`On: 8am on ${gymDays()}.`),
    el("div",{class:"row"},el("button",{type:"button",class:"btn",onclick:remindTest},"Send a test"),el("button",{type:"button",class:"btn quiet",onclick:remindOff},"Turn off")));
  if(Remind.msg)box.append(el("p",{class:"hint","aria-live":"polite"},Remind.msg));
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
let resizeT=null,lastW=window.innerWidth;
window.addEventListener("resize",()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{if(Math.abs(window.innerWidth-lastW)<40)return;lastW=window.innerWidth;if(S.tab!=="log")render()},250)});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("/log/sw.js",{scope:"/log/"}).catch(()=>{})});
}

publish();showSync();render();refresh();remindCheck();
