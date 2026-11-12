import {$,el,svgEl} from "./dom.js";
import {dayT,fmtShort} from "./format.js";

export function sparkSVG(vals,w,h,pad){
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
export function chartW(){
  const m=$("#main");if(!m)return 340;
  const cs=getComputedStyle(m);
  return Math.round(Math.max(260,Math.min(620,m.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-30)));
}
export function niceStep(raw){const p=10**Math.floor(Math.log10(raw||1));for(const m of [1,2,2.5,5,10])if(m*p>=raw)return m*p;return 10*p}
// series: [{name, cls:"s1"|"s2"|"s3", pts:[{t:"YYYY-MM-DD", v}]}]; band: {name, lo:[pts], hi:[pts]}
export function lineChart({series,band,fmt=(v,dec)=>v.toFixed(dec),zero=false,H=190,label}){
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
