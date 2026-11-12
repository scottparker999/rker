/* ---------- dumbbell plates ----------
   Kit: two spin-lock handles (1.6 kg each with collars) and the plates below. Plates go
   on in matching pairs (same on each side), so loading both dumbbells the same allows
   a quarter of each plate size per side; a single dumbbell can take half. */
export const PLATE_TYPES=[{key:"big",kg:2.5,count:8},{key:"mid",kg:1.25,count:4},{key:"small",kg:0.5,count:4}];
export const DEFAULT_HANDLE_KG=1.6;
export function handleKg(){try{const v=parseFloat(localStorage.getItem("tft:handle-kg"));return v>0&&v<10?v:DEFAULT_HANDLE_KG}catch(e){return DEFAULT_HANDLE_KG}}
export function setHandleKg(v){try{localStorage.setItem("tft:handle-kg",String(v))}catch(e){}}
export const perSideMax=(kit,t)=>Math.floor(t.count/(kit==="one"?2:4));
export const emptyLoad=()=>Object.fromEntries(PLATE_TYPES.map(t=>[t.key,0]));
export function loadKg(l){return handleKg()+2*PLATE_TYPES.reduce((a,t)=>a+(l[t.key]||0)*t.kg,0)}
// every way to load one dumbbell for this kit (pair or single)
export function allLoads(kit){
  let out=[emptyLoad()];
  for(const t of PLATE_TYPES){const m=perSideMax(kit,t),next=[];for(const l of out)for(let n=0;n<=m;n++)next.push({...l,[t.key]:n});out=next}
  return out;
}
// best loading for a target weight per dumbbell: closest, then fewest plates
export function bestLoad(target,kit){
  let best=null;
  for(const l of allLoads(kit)){
    const d=Math.abs(loadKg(l)-target),n=PLATE_TYPES.reduce((a,t)=>a+l[t.key],0);
    if(!best||d<best.d-1e-9||(Math.abs(d-best.d)<1e-9&&n<best.n))best={l,d,n};
  }
  return best.l;
}
export function reachable(kit){return [...new Set(allLoads(kit).map(l=>Math.round(loadKg(l)*100)/100))].sort((a,b)=>a-b)}
// the next heavier weight your plates allow, or null at the limit
export const nextLoadKg=(kg,kit)=>reachable(kit).find(v=>v>kg+0.05)??null;
export const sideText=l=>{const p=PLATE_TYPES.flatMap(t=>Array(l[t.key]||0).fill(String(t.kg)));return p.length?p.join(" + ")+" each side":"no plates"};
export const plateMax=kit=>Math.max(...reachable(kit));
// the nearest weight the plates can actually make
export const snapKg=(kg,kit)=>loadKg(bestLoad(kg,kit));

/* Weights logged before the handle weight was corrected assumed 2 kg handles, so they
   read high by the difference. Returns the corrected weight for such a value, or null
   if the value needs no correction. */
const OLD_HANDLE_KG=2;
export function legacyKg(kg){
  const off=OLD_HANDLE_KG-handleKg();
  if(kg==null||kg<OLD_HANDLE_KG||Math.abs(off)<0.01)return null;
  const steps=(kg-OLD_HANDLE_KG)/2.5;
  if(Math.abs(steps-Math.round(steps))>1e-6)return null;
  const all=reachable("one"),has=v=>all.some(x=>Math.abs(x-v)<0.01),fixed=Math.round((kg-off)*100)/100;
  return !has(kg)&&has(fixed)?fixed:null;
}
