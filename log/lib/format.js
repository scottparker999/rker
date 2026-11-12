// Dates and number formatting. No DOM, so these run in tests too.
// dates are "YYYY-MM-DD" in local time; noon avoids daylight-saving edge cases
export const iso = d=>{const z=new Date(d);z.setMinutes(z.getMinutes()-z.getTimezoneOffset());return z.toISOString().slice(0,10)};
export const dayT=d=>Date.parse(d+"T12:00:00");
export const weekStart=d=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
export const fmtDate = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"});
export const fmtShort = s=>new Date(s+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short"});
export const shortDM=d=>{const x=new Date(d+"T12:00:00");return x.getDate()+"/"+(x.getMonth()+1)};
export const num = v=>{if(v===""||v==null)return null;const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
export const fmtKg = n=>n==null?"–":(Math.round(n*10)/10).toString();
export const fmtInt=n=>n==null?"–":Math.round(n).toLocaleString("en-AU");
export const fmtDur=min=>{if(min==null)return "–";const h=Math.floor(min/60),m=Math.round(min%60);return h?h+"h "+String(m).padStart(2,"0")+"m":m+"m"};
export const fmtClock=hhmm=>{if(!hhmm)return "";const[h,m]=hhmm.split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+(h<12?"am":"pm")};
export const signed=(v,d=1,u="")=>(v>0?"+":v<0?"−":"±")+Math.abs(v).toFixed(d).replace(/\.0+$/,"")+u;
