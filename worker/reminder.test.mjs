import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminder } from "./reminder.js";

const plan = { days: [
  { dow: 2, key: "push", name: "Push + arms", mins: 45, ex: [{ id: "floor-press", n: "Dumbbell floor press", sets: 2, hi: 8, load: "kg" }] },
  { dow: 4, key: "pull", name: "Pull + arms", mins: 50, ex: [{ id: "curl", n: "Bicep curls", sets: 2, hi: 12, load: "kg" }] },
] };
// 8am Brisbane on Tuesday 3 Nov 2026 = 22:00 UTC Monday 2 Nov
const tue8am = Date.UTC(2026, 10, 2, 22, 0);
const set = (kg, reps) => ({ kg, reps, done: true });

test("reminds on a training day, with lifts ready to go up", () => {
  const data = { sessions: { "2026-10-27_push": { date: "2026-10-27", day: "push", entries: { "floor-press": [set(12, 8), set(12, 8)] } } } };
  const m = buildReminder(data, plan, tue8am);
  assert.equal(m.title, "Push + arms today");
  assert.match(m.body, /About 45 min\. Ready to go up: Dumbbell floor press\./);
});

test("stays quiet on rest days, and once today's session is logged", () => {
  assert.equal(buildReminder({}, plan, tue8am + 864e5), null); // Wednesday
  const done = { sessions: { "2026-11-03_push": { date: "2026-11-03", day: "push", entries: { "floor-press": [set(12, 6)] } } } };
  assert.equal(buildReminder(done, plan, tue8am), null);
});

test("mentions last night's tennis", () => {
  const data = { play: { a: { end: "2026-11-02 21:30:00 +1000", durationMin: 125 } } };
  assert.match(buildReminder(data, plan, tue8am).body, /Tennis last night \(2h 05m\)/);
});

test("a test on a rest day previews the next training day", () => {
  const m = buildReminder({}, plan, tue8am + 864e5, { force: true });
  assert.equal(m.title, "Pull + arms tomorrow");
});
