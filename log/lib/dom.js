// Small DOM helpers.
export const $ = s=>document.querySelector(s);
// el("div",{class:"x",onclick:fn},children…): build an element; null/false attributes and children are skipped
export const el = (tag,attrs={},...kids)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")n.className=v;else if(k.startsWith("on"))n.addEventListener(k.slice(2),v);else if(v!==null&&v!==undefined&&v!==false)n.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;n.append(c.nodeType?c:document.createTextNode(c))}return n};
export const svgEl=(t,a={})=>{const e=document.createElementNS("http://www.w3.org/2000/svg",t);for(const k in a)e.setAttribute(k,a[k]);return e};
