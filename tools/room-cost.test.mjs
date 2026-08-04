/* Tests for the room cost and rate floor arithmetic.
   Run with:  node --test tools/room-cost.test.mjs
   Needs node 22+ (module syntax detection). No dependencies,
   nothing to install, and nothing here ships to the site. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyse,
  assessRate,
  cporAt,
  floorForStay,
  linenPerChangeover,
  perNightCost,
  perStayCost,
  serviceFactor,
} from './room-cost.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~= ${b}`);

const base = {
  rooms: 120,
  periodDays: 365,
  occupancyPct: 72,
  averageLengthOfStay: 2.6,

  departureCleanMinutes: 45,
  stayoverMinutes: 15,
  serviceFrequency: 'daily',
  optOutPct: 0,
  loadedHourlyRate: 40,

  linen: {
    setCost: 120,
    washesBeforeRetire: 75,
    lossPctPerWash: 0.4,
    laundryPerSet: 3.1,
    changeEveryNights: 0,
    midStayFractionPct: 40,
    parLevel: 3,
  },

  amenitiesPerStay: 4.2,
  amenitiesPerNight: 0.9,
  amenityWastePct: 0,

  marginalKwhPerNight: 9.8,
  tariffPerKwh: 0.31,
  seasonalMultiplier: 1,
  litresPerNight: 180,
  costPerKilolitre: 3.4,

  otherPerStay: 0,
  otherPerNight: 0,
  fixedCostsPerPeriod: 1_650_000,
};

/* ---------- linen ---------- */

test('a changeover costs laundry plus wear plus loss, not just laundry', () => {
  const l = linenPerChangeover(base.linen);
  close(l.laundry, 3.1);
  close(l.wear, 120 / 75); // 1.60
  close(l.loss, 120 * 0.004); // 0.48
  close(l.total, 3.1 + 1.6 + 0.48);
  // the part everyone forgets is a third of the bill
  assert.ok(l.wear + l.loss > l.laundry * 0.6);
});

test('linen with no retirement life counts only the wash', () => {
  const l = linenPerChangeover({ setCost: 120, laundryPerSet: 3.1, washesBeforeRetire: 0 });
  close(l.wear, 0);
  close(l.total, 3.1);
});

test('longer-lasting linen is cheaper per changeover even if it costs more', () => {
  const cheap = linenPerChangeover({ setCost: 80, washesBeforeRetire: 40, laundryPerSet: 3.1, lossPctPerWash: 0.4 });
  const good = linenPerChangeover({ setCost: 140, washesBeforeRetire: 120, laundryPerSet: 3.1, lossPctPerWash: 0.4 });
  assert.ok(good.total < cheap.total, 'the dearer set wins on cost per use');
});

/* ---------- per stay and per night ---------- */

test('per-stay costs carry the departure clean, the changeover and turn amenities', () => {
  const s = perStayCost(base);
  close(s.labour, (45 / 60) * 40); // 30
  close(s.linen, 3.1 + 1.6 + 0.48);
  close(s.amenities, 4.2);
  close(s.total, 30 + 5.18 + 4.2);
});

test('per-night costs carry servicing, energy, water and nightly consumables', () => {
  const n = perNightCost(base);
  close(n.labour, (15 / 60) * 40); // 10
  close(n.energy, 9.8 * 0.31); // 3.038
  close(n.water, 0.18 * 3.4); // 0.612
  close(n.amenities, 0.9);
  close(n.linen, 0); // no mid-stay change configured
  close(n.total, 10 + 3.038 + 0.612 + 0.9);
});

test('amenity waste inflates what the amenity actually costs', () => {
  const clean = perStayCost({ ...base, amenityWastePct: 0 });
  const wasteful = perStayCost({ ...base, amenityWastePct: 50 });
  close(wasteful.amenities, clean.amenities * 1.5);
});

test('mid-stay linen changes land per night, at a fraction of a full changeover', () => {
  const n = perNightCost({
    ...base,
    linen: { ...base.linen, changeEveryNights: 3, midStayFractionPct: 40 },
  });
  const full = linenPerChangeover(base.linen).total;
  close(n.linen, (full * 0.4) / 3);
});

test('service frequency and opt-out reduce the nightly labour', () => {
  const daily = perNightCost(base);
  const alternate = perNightCost({ ...base, serviceFrequency: 'alternate' });
  const optOut = perNightCost({ ...base, optOutPct: 40 });
  close(alternate.labour, daily.labour * 0.5);
  close(optOut.labour, daily.labour * 0.6);
  close(serviceFactor('third'), 1 / 3);
});

/* ---------- the floor curve, which is the point ---------- */

test('the floor falls with length of stay because the changeover amortises', () => {
  const one = floorForStay(base, 1);
  const seven = floorForStay(base, 7);
  const stay = perStayCost(base).total;
  const night = perNightCost(base).total;

  close(one.perNight, night + stay); // a one-nighter carries the whole turn
  close(seven.perNight, night + stay / 7);
  assert.ok(seven.perNight < one.perNight);
});

test('the floor curve is monotonically falling', () => {
  const { floors } = analyse(base);
  for (let i = 1; i < floors.length; i += 1) {
    assert.ok(floors[i].longRun < floors[i - 1].longRun, 'each longer stay is cheaper per night');
  }
});

test('a very long stay approaches the per-night cost but never reaches it', () => {
  const night = perNightCost(base).total;
  const long = floorForStay(base, 365);
  assert.ok(long.perNight > night);
  assert.ok(long.perNight - night < 0.2);
});

test('a stay length of zero or nonsense returns null rather than infinity', () => {
  assert.equal(floorForStay(base, 0), null);
  assert.equal(floorForStay(base, 'x'), null);
});

/* ---------- the two horizons ---------- */

test('tonight and this season are different floors, and both are reported', () => {
  const { floors } = analyse(base);
  const oneNight = floors.find((f) => f.nights === 1);
  // with the roster already paid, labour drops out of both components
  assert.ok(oneNight.shortRun < oneNight.longRun);
  close(oneNight.longRun - oneNight.shortRun, 30 + 10); // departure clean + one service
});

test('with no labour in it, the short-run floor is just what the room burns', () => {
  const short = perNightCost(base, false);
  close(short.labour, 0);
  close(short.total, 3.038 + 0.612 + 0.9);
});

/* ---------- CPOR, and why it misleads ---------- */

test('CPOR is the marginal cost plus a fixed allocation', () => {
  const c = cporAt(base, 72);
  const stay = perStayCost(base).total;
  const night = perNightCost(base).total;
  close(c.variablePerNight, night + stay / 2.6);
  close(c.cpor, c.variablePerNight + c.fixedPerNight);
});

test('CPOR falls as occupancy rises while marginal cost does not move at all', () => {
  const low = cporAt(base, 50);
  const high = cporAt(base, 90);
  assert.ok(high.cpor < low.cpor, 'the quoted number drops');
  close(low.variablePerNight, high.variablePerNight); // nothing real changed
  assert.ok(low.fixedPerNight > high.fixedPerNight); // only the allocation moved
});

test('the overstatement of CPOR against marginal cost is reported', () => {
  const { gap } = analyse(base);
  assert.ok(gap.cpor > gap.marginalAtAlos);
  close(gap.overstatement, gap.cpor - gap.marginalAtAlos);
  // on a property with real fixed costs this is not a rounding difference
  assert.ok(gap.overstatement > 10);
});

test('CPOR is null rather than infinite at zero occupancy', () => {
  assert.equal(cporAt(base, 0), null);
  assert.equal(cporAt({ ...base, averageLengthOfStay: 0 }, 72), null);
});

/* ---------- linen programme ---------- */

test('annual linen replacement and capital tied up are derived', () => {
  const { linenProgramme } = analyse(base);
  const occupied = 120 * 365 * 0.72;
  close(linenProgramme.changeovers, occupied / 2.6);
  close(linenProgramme.replacementCost, (occupied / 2.6 / 75) * 120);
  close(linenProgramme.capitalInPar, 3 * 120 * 120); // par x rooms x set
});

/* ---------- rate assessment ---------- */

test('a rate can fail on one night and clear on a longer stay', () => {
  const { floors } = analyse(base);
  const oneNight = floors.find((f) => f.nights === 1);
  const rate = (oneNight.longRun + floors[floors.length - 1].longRun) / 2;

  const atOne = assessRate(rate, floors, 1);
  assert.equal(atOne.coversFloor, false);
  assert.ok(atOne.margin < 0);
  assert.ok(atOne.viableFromNights > 1, 'it works from some longer stay');
});

test('a healthy rate clears the floor and reports the margin', () => {
  const { floors } = analyse(base);
  const a = assessRate(500, floors, 1);
  assert.equal(a.coversFloor, true);
  close(a.margin, 500 - floors.find((f) => f.nights === 1).longRun);
});

test('a rate is judged against the horizon asked for', () => {
  const { floors } = analyse(base);
  // between the two one-night floors: no good as a standing rate, fine
  // tonight for a room that would otherwise go out empty
  const long = assessRate(30, floors, 1, 'longRun');
  const short = assessRate(30, floors, 1, 'shortRun');
  assert.ok(short.floor < long.floor);
  // a distressed room tonight can be worth selling at a rate that would be
  // a bad standing rate
  assert.equal(short.coversFloor, true);
  assert.equal(long.coversFloor, false);
});

/* ---------- warnings and robustness ---------- */

test('missing linen life is called out, since it hides half the cost', () => {
  const r = analyse({ ...base, linen: { ...base.linen, washesBeforeRetire: 0, lossPctPerWash: 0 } });
  assert.ok(r.warnings.some((w) => w.includes('Washes before retirement')));
  assert.ok(r.warnings.some((w) => w.includes('only its laundry')));
});

test('no fixed costs removes the comparison and says so', () => {
  const r = analyse({ ...base, fixedCostsPerPeriod: 0 });
  assert.ok(r.warnings.some((w) => w.includes('No fixed costs')));
  close(r.cpor.cpor, r.cpor.variablePerNight);
});

test('an impossible length of stay is flagged', () => {
  const r = analyse({ ...base, averageLengthOfStay: 0.5 });
  assert.ok(r.warnings.some((w) => w.includes('below one night')));
});

test('junk input produces no NaN anywhere', () => {
  const r = analyse({
    rooms: 'x', periodDays: null, occupancyPct: undefined, averageLengthOfStay: 'abc',
    linen: null, loadedHourlyRate: {},
  });
  const flat = [
    ...Object.values(r.perStay.long), ...Object.values(r.perNight.long),
    ...Object.values(r.linen), ...Object.values(r.linenProgramme),
  ].filter((v) => typeof v === 'number');
  assert.ok(flat.every(Number.isFinite), 'every figure should be finite');
  assert.equal(r.cpor, null);
  assert.equal(r.gap, null);
});
