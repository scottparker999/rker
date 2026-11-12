// Which workout is due. Shared by the app and the Worker's 8am reminder.
const hasDone=s=>Object.values((s&&s.entries)||{}).some(e=>Array.isArray(e)&&e.some(x=>x&&x.done));
const daysApart=(a,b)=>Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/864e5);

/**
 * days: the plan in rotation order, [{key, dow}]. sessions: logged sessions.
 * today: "YYYY-MM-DD"; dow: today's day of the week (0 = Sunday).
 *  - already training today: that workout
 *  - trained within the last 6 days: the next workout in the rotation, so a missed
 *    day is caught up rather than skipped
 *  - otherwise (new, or back after a break): whichever workout the calendar says
 */
export function dueDay(days,sessions,today,dow){
  const done=(sessions||[]).filter(s=>s&&s.date&&s.date<=today&&hasDone(s)&&days.some(d=>d.key===s.day))
    .sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const last=done[done.length-1];
  if(last&&last.date===today)return last.day;
  if(last&&daysApart(last.date,today)<=6)return days[(days.findIndex(d=>d.key===last.day)+1)%days.length].key;
  for(let i=0;i<7;i++){const hit=days.find(d=>d.dow===(dow+i)%7);if(hit)return hit.key}
  return days[0].key;
}
export const trainedOn=(sessions,date)=>(sessions||[]).some(s=>s&&s.date===date&&hasDone(s));
