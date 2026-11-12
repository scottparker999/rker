import { test } from "node:test";
import assert from "node:assert/strict";
import { reachable, bestLoad, loadKg, nextLoadKg, snapKg, plateMax, sideText, legacyKg, PLATE_TYPES } from "./plates.js";

test("a matching pair can be loaded to these weights with 8×2.5, 4×1.25, 4×0.5 and 1.6 kg handles", () => {
  assert.deepEqual(reachable("pair"), [1.6, 2.6, 4.1, 5.1, 6.6, 7.6, 9.1, 10.1, 11.6, 12.6, 14.1, 15.1]);
  assert.equal(plateMax("pair"), 15.1);
  assert.equal(plateMax("one"), 28.6);
});

test("no loading uses more plates than exist", () => {
  for (const kit of ["pair", "one"]) for (const kg of reachable(kit)) {
    const l = bestLoad(kg, kit);
    assert.ok(Math.abs(loadKg(l) - kg) < 1e-9);
    for (const t of PLATE_TYPES) assert.ok(l[t.key] * 2 * (kit === "pair" ? 2 : 1) <= t.count, `${kg} kg ${kit}`);
  }
});

test("targets snap to the nearest loadable weight, preferring fewer plates", () => {
  assert.equal(snapKg(14.5, "pair"), 14.1);
  assert.equal(snapKg(12, "pair"), 11.6);
  assert.equal(snapKg(0.5, "pair"), 1.6);
  assert.equal(sideText(bestLoad(11.6, "pair")), "2.5 + 2.5 each side");
});

test("the next weight up, and none at the limit", () => {
  assert.equal(nextLoadKg(11.6, "pair"), 12.6);
  assert.equal(nextLoadKg(12, "pair"), 12.6); // an old-style value still steps to a real one
  assert.equal(nextLoadKg(15.1, "pair"), null);
});

test("weights logged under the old 2 kg handle assumption are corrected by 0.4 kg", () => {
  assert.equal(legacyKg(12), 11.6);
  assert.equal(legacyKg(2), 1.6);
  assert.equal(legacyKg(14.5), 14.1);
  assert.equal(legacyKg(11.6), null); // already right
  assert.equal(legacyKg(10), null);   // never a weight the old calculator offered
  assert.equal(legacyKg(0), null);
  assert.equal(legacyKg(null), null);
});
