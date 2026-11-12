import { test } from "node:test";
import assert from "node:assert/strict";
import { dueDay, trainedOn } from "./rotation.js";

const days = [{ key: "push", dow: 2 }, { key: "pull", dow: 4 }, { key: "upper", dow: 6 }];
const s = (date, day, done = true) => ({ date, day, entries: { x: [{ kg: 5, reps: 8, done }] } });

test("with no history, the calendar decides", () => {
  assert.equal(dueDay(days, [], "2026-11-03", 2), "push");  // Tuesday
  assert.equal(dueDay(days, [], "2026-11-04", 3), "pull");  // Wednesday: next is Thursday's
  assert.equal(dueDay(days, [], "2026-11-08", 0), "push");  // Sunday
});

test("a missed day is caught up, not skipped", () => {
  const hist = [s("2026-10-31", "upper")];                    // Saturday done, Tuesday missed
  assert.equal(dueDay(days, hist, "2026-11-04", 3), "push"); // Wednesday
  assert.equal(dueDay(days, hist, "2026-11-05", 4), "push"); // Thursday: still push, not pull
});

test("the rotation follows the last workout done, and wraps", () => {
  assert.equal(dueDay(days, [s("2026-11-03", "push")], "2026-11-05", 4), "pull");
  assert.equal(dueDay(days, [s("2026-11-03", "push"), s("2026-11-05", "pull")], "2026-11-06", 5), "upper");
  assert.equal(dueDay(days, [s("2026-11-07", "upper")], "2026-11-10", 2), "push");
});

test("today's workout stays selected once started; unticked sessions don't count", () => {
  assert.equal(dueDay(days, [s("2026-11-03", "push")], "2026-11-03", 2), "push");
  assert.equal(dueDay(days, [s("2026-11-03", "push", false)], "2026-11-05", 4), "pull"); // calendar
  assert.equal(trainedOn([s("2026-11-03", "push", false)], "2026-11-03"), false);
  assert.equal(trainedOn([s("2026-11-03", "push")], "2026-11-03"), true);
});

test("after more than six days off, the calendar decides again", () => {
  assert.equal(dueDay(days, [s("2026-10-20", "push")], "2026-11-07", 6), "upper");
});
