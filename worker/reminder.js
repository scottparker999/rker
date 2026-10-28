// The 8am gym-day reminder. Pure function of your data and the plan snapshot the
// app uploads (so the training plan stays defined in one place: log/app.js).

export const TZ_OFFSET_MIN = 600; // Brisbane is UTC+10 all year (no daylight saving)
const DAY_MS = 864e5;

const localDate = (ms) => new Date(ms + TZ_OFFSET_MIN * 60e3); // read with getUTC* methods
const isoDay = (d) => d.toISOString().slice(0, 10);
const doneSets = (entry) => (Array.isArray(entry) ? entry.filter((s) => s && s.done) : []);
const fmtDur = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`; };
const parseHae = (s) => (typeof s === "string" ? Date.parse(s.replace(" ", "T").replace(/ ([+-]\d\d)(\d\d)$/, "$1:$2")) : NaN);

/**
 * Builds today's reminder, or null when today isn't a gym day or it's already done.
 * With `force`, always returns a message (for "Send a test"), using the next gym day.
 */
export function buildReminder(data, plan, nowMs, { force = false } = {}) {
  if (!plan || !Array.isArray(plan.days) || !plan.days.length) return null;
  const local = localDate(nowMs);
  const today = isoDay(local);
  let day = plan.days.find((d) => d.dow === local.getUTCDay());
  let when = "today";
  if (!day) {
    if (!force) return null;
    for (let i = 1; i <= 7 && !day; i++) {
      const d = new Date(local.getTime() + i * DAY_MS);
      day = plan.days.find((x) => x.dow === d.getUTCDay());
      if (day) when = i === 1 ? "tomorrow" : "on " + d.toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
    }
  }
  if (!day) return null;

  const sessions = Object.values((data && data.sessions) || {}).filter((s) => s && s.date).sort((a, b) => (a.date < b.date ? -1 : 1));
  const todays = sessions.find((s) => s.date === today && s.day === day.key);
  if (!force && todays && Object.values(todays.entries || {}).some((e) => doneSets(e).length)) return null;

  // lifts that hit the top of their rep range on every set last time
  const ready = [];
  for (const e of day.ex || []) {
    if (e.hi == null) continue;
    const last = sessions.filter((s) => s.date < today && doneSets(s.entries && s.entries[e.id]).length).pop();
    if (!last) continue;
    const sets = doneSets(last.entries[e.id]);
    if (sets.length >= e.sets && sets.slice(0, e.sets).every((s) => (s.reps ?? 0) >= e.hi)) ready.push(e.n);
  }

  const parts = [`About ${day.mins} min.`];
  if (ready.length) parts.push(`Ready to go up: ${ready.slice(0, 3).join(", ")}${ready.length > 3 ? ` and ${ready.length - 3} more` : ""}.`);
  else parts.push("Aim to beat last session's reps.");

  const tennis = Object.values((data && data.play) || {}).find((p) => {
    const t = parseHae(p && (p.end || p.start));
    return Number.isFinite(t) && nowMs - t >= 0 && nowMs - t < 20 * 3600e3;
  });
  if (tennis) parts.push(`Tennis last night (${fmtDur(tennis.durationMin || 0)}): eat a little extra today.`);

  return {
    title: `${day.name} ${when}`,
    body: parts.join(" "),
    url: "/log/#train",
    tag: "gym-day",
  };
}
