// Strength maths. Pure functions of the plan's exercise objects and logged sessions.
export function doneSets(entry){return (entry||[]).filter(s=>s&&s.done)}
export function readyToProgress(e,sess){
  if(e.hi==null)return null;
  const sets=doneSets(sess.entries[e.id]);
  if(sets.length<e.sets)return false;
  return sets.slice(0,e.sets).every(s=>(s.reps??0)>=e.hi);
}
/* ---------- strength maths ----------
   Estimated one-rep max (Epley): weight × (1 + reps ÷ 30). It rises when you add
   weight OR reps, which matters here because shared-weight stations progress by reps. */
export const e1rm=s=>s&&s.kg!=null&&s.reps?s.kg*(1+s.reps/30):null;
export function sessionScore(e,sess){
  const sets=doneSets(sess.entries&&sess.entries[e.id]);if(!sets.length)return null;
  if(e.load==="kg"){const v=sets.map(e1rm).filter(v=>v!=null);return v.length?Math.max(...v):null}
  const r=sets.map(s=>s.reps).filter(v=>v!=null);return r.length?Math.max(...r):null;
}
export function bestSet(e,sess){
  const sets=doneSets(sess.entries&&sess.entries[e.id]);if(!sets.length)return null;
  return sets.reduce((a,s)=>(e.load==="kg"?(e1rm(s)||0)>(e1rm(a)||0):(s.reps||0)>(a.reps||0))?s:a,sets[0]);
}
// average % change of every lift against its own first session, after each training day
export function strengthSeries(sessions,exercises){
  const base={},latest={},out=[];
  sessions.forEach(sess=>{
    let touched=false;
    exercises.forEach(e=>{const v=sessionScore(e,sess);if(v==null)return;if(base[e.id]==null)base[e.id]=v;latest[e.id]=v;touched=true});
    if(!touched)return;
    const ids=Object.keys(base);const pct=ids.reduce((a,id)=>a+(latest[id]/base[id]-1),0)/ids.length*100;
    const prev=out[out.length-1];if(prev&&prev.t===sess.date)prev.v=pct;else out.push({t:sess.date,v:pct});
  });
  return out;
}
// kg × reps over completed sets; "per hand" exercises count both dumbbells
export function volume(sess,exercises,only){
  let v=0;
  exercises.filter(e=>e.load==="kg"&&(!only||only.has(e.id))).forEach(e=>
    doneSets(sess.entries&&sess.entries[e.id]).forEach(s=>{if(s.kg!=null&&s.reps)v+=s.kg*s.reps*(e.unit==="per hand"?2:1)}));
  return v;
}
