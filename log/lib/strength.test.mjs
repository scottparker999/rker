import { test } from "node:test";
import assert from "node:assert/strict";
import { e1rm, sessionScore, bestSet, readyToProgress, strengthSeries, volume } from "./strength.js";

const press = { id: "press", sets: 3, lo: 6, hi: 8, load: "kg", unit: "per hand" };
const pushup = { id: "pushup", sets: 2, lo: null, hi: null, load: "bw", unit: "as many as possible" };
const set = (kg, reps, done = true) => ({ kg, reps, done });
const sess = (date, entries) => ({ date, day: "push", entries });

test("estimated one-rep max rises with weight or reps", () => {
  assert.equal(e1rm(set(10, 30)), 20);
  assert.ok(e1rm(set(10, 9)) > e1rm(set(10, 8)));
  assert.equal(e1rm(set(null, 8)), null);
});

test("ready to go up only when every planned set reaches the top of the range", () => {
  assert.equal(readyToProgress(press, sess("d", { press: [set(10, 8), set(10, 8), set(10, 8)] })), true);
  assert.equal(readyToProgress(press, sess("d", { press: [set(10, 8), set(10, 8), set(10, 7)] })), false);
  assert.equal(readyToProgress(press, sess("d", { press: [set(10, 8), set(10, 8)] })), false);
  assert.equal(readyToProgress(press, sess("d", { press: [set(10, 8), set(10, 8), set(10, 8, false)] })), false);
  assert.equal(readyToProgress(pushup, sess("d", { pushup: [set(null, 20)] })), null);
});

test("best set and score ignore unticked sets; bodyweight lifts score by reps", () => {
  const s = sess("d", { press: [set(10, 8), set(12, 6), set(14, 8, false)], pushup: [set(null, 15), set(null, 18)] });
  assert.deepEqual(bestSet(press, s), set(12, 6));
  assert.equal(sessionScore(pushup, s), 18);
  assert.equal(sessionScore(press, sess("d", {})), null);
});

test("strength trend is the average change of each lift from its own first session", () => {
  const out = strengthSeries([
    sess("2026-10-01", { press: [set(10, 6)], pushup: [set(null, 10)] }),
    sess("2026-10-08", { press: [set(10, 6)], pushup: [set(null, 12)] }),
  ], [press, pushup]);
  assert.deepEqual(out.map((p) => p.t), ["2026-10-01", "2026-10-08"]);
  assert.equal(out[0].v, 0);
  assert.ok(Math.abs(out[1].v - 10) < 1e-9); // (0% + 20%) / 2
});

test("volume counts both dumbbells for per-hand lifts and can be limited to some exercises", () => {
  const s = sess("d", { press: [set(10, 8), set(10, 8, false)] });
  assert.equal(volume(s, [press, pushup]), 160);
  assert.equal(volume(s, [press], new Set(["other"])), 0);
});
