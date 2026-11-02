/* Tests for the housekeeping labour arithmetic.
   Run with:  node --test tools/housekeeping.test.mjs
   Needs node 22+ (module syntax detection). No dependencies,
   nothing to install, and nothing here ships to the site. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  alosScenario,
  alosThreshold,
  analyse,
  blendedMinutes,
  costOccupancyInversion,
  evaluateDay,
  lateCheckoutVerdict,
  parseTime,
  penaltyMultiplier,
  serviceFactor,
  verdict,
} from './housekeeping.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~= ${b}`);

const oneType = [{ sharePct: 100, departureMinutes: 45, stayoverMinutes: 15 }];

const globals = {
  serviceFrequency: 'daily',
  optOutPct: 0,
  fixedDailyMinutes: 0,
  productivityPct: 100,
  shiftHours: 8,
  baseHourlyRate: 30,
  oncostPct: 0,
  saturdayMultiplier: 1.25,
  sundayMultiplier: 1.5,
};

const blended = blendedMinutes(oneType);

/* ---------- unit mix ---------- */

test('a single unit type reduces to that type minutes', () => {
  close(blended.departureMinutes, 45);
  close(blended.stayoverMinutes, 15);
  close(blended.shareTotal, 100);
});

test('unit types blend on their share of departures', () => {
  // A park: 40% cabins at 45/15, 60% powered sites at 10/0
  const b = blendedMinutes([
    { sharePct: 40, departureMinutes: 45, stayoverMinutes: 15 },
    { sharePct: 60, departureMinutes: 10, stayoverMinutes: 0 },
  ]);
  close(b.departureMinutes, 0.4 * 45 + 0.6 * 10); // 24
  close(b.stayoverMinutes, 0.4 * 15); // 6
});

test('a mix that does not total 100 is flagged, not normalised', () => {
  const result = analyse({
    ...globals,
    unitTypes: [{ sharePct: 60, departureMinutes: 45, stayoverMinutes: 15 }],
    days: [{ date: '2026-03-03', occupied: 50, arrivals: 10, departures: 10 }],
  });
  assert.ok(result.warnings.some((w) => w.includes('not 100%')));
  close(result.blended.shareTotal, 60);
});

/* ---------- the headline argument ---------- */

test('identical occupancy with different departures costs materially more', () => {
  const quiet = evaluateDay(
    { date: '2026-03-03', occupied: 100, arrivals: 12, departures: 12 },
    globals,
    blended,
  );
  const churn = evaluateDay(
    { date: '2026-03-04', occupied: 100, arrivals: 44, departures: 44 },
    globals,
    blended,
  );

  assert.equal(quiet.occupied, churn.occupied); // same occupancy
  // 12 x 45 + 88 x 15 = 540 + 1320 = 1860 min
  close(quiet.totalMinutes, 1860);
  // 44 x 45 + 56 x 15 = 1980 + 840 = 2820 min
  close(churn.totalMinutes, 2820);
  assert.ok(churn.cost > quiet.cost, 'the churny day costs more at equal occupancy');
  assert.ok(churn.staffOnShift > quiet.staffOnShift);
});

test('the matched pair finds the argument in the data', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 12, departures: 12 },
      { date: '2026-03-04', occupied: 100, arrivals: 44, departures: 12 },
    ],
  });
  const pair = result.matchedPair;
  assert.ok(pair, 'a matched pair should be found at equal occupancy');
  assert.equal(pair.cheaper.occupied, pair.dearer.occupied);
  assert.ok(pair.costDifference >= 0);
});

test('the busiest day is not necessarily the dearest, and that is reported', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      // busiest by occupancy, barely anyone leaves
      { date: '2026-03-05', occupied: 110, arrivals: 38, departures: 12 },
      // quietest by occupancy, almost everyone leaves
      { date: '2026-03-06', occupied: 70, arrivals: 12, departures: 58 },
    ],
  });
  const inv = result.inversion;
  assert.equal(inv.busiest.date, '2026-03-05');
  assert.equal(inv.dearest.date, '2026-03-06');
  assert.equal(inv.inverted, true);
  assert.equal(inv.quietestIsDearest, true, 'the quietest day is also the most expensive');
  assert.ok(inv.dearest.cost > inv.busiest.cost);
  assert.ok(inv.dearest.occupied < inv.busiest.occupied);
});

test('no inversion is reported when the busiest day is also the dearest', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-05', occupied: 40, arrivals: 10, departures: 10 },
      { date: '2026-03-06', occupied: 100, arrivals: 40, departures: 40 },
    ],
  });
  assert.equal(result.inversion.inverted, false);
});

test('inversion needs at least two usable days', () => {
  assert.equal(costOccupancyInversion([]), null);
  assert.equal(costOccupancyInversion([{ occupied: 10, cost: 5 }]), null);
});

/* ---------- derivation and validation ---------- */

test('stayovers are derived, not entered', () => {
  const d = evaluateDay({ occupied: 90, arrivals: 30, departures: 25 }, globals, blended);
  assert.equal(d.stayovers, 60);
  assert.equal(d.impliedPriorOccupied, 85); // 60 stayed + 25 left
});

test('a previous night that does not reconcile is flagged', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 20, departures: 20 },
      // implies 70 + 20 = 90 last night, but the row above says 100
      { date: '2026-03-04', occupied: 90, arrivals: 20, departures: 20 },
    ],
  });
  assert.ok(result.warnings.some((w) => w.includes('the night before')));
});

test('arrivals above occupancy are impossible and flagged', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [{ date: '2026-03-03', occupied: 40, arrivals: 60, departures: 10 }],
  });
  assert.ok(result.warnings.some((w) => w.includes('Arrivals exceed')));
});

/* ---------- roster mechanics ---------- */

test('integer staffing rounds up and reports the slack', () => {
  // 1860 productive minutes = 31 hours -> 4 staff on 8s = 32 paid
  const d = evaluateDay({ occupied: 100, arrivals: 12, departures: 12 }, globals, blended);
  close(d.rosteredHours, 31);
  assert.equal(d.staffOnShift, 4);
  close(d.paidHours, 32);
  close(d.slackHours, 1);
});

test('productivity allowance inflates rostered hours above productive hours', () => {
  const d = evaluateDay(
    { occupied: 100, arrivals: 12, departures: 12 },
    { ...globals, productivityPct: 85 },
    blended,
  );
  close(d.productiveHours, 31);
  close(d.rosteredHours, 31 / 0.85);
});

test('service frequency and opt-out reduce stayover work', () => {
  const daily = evaluateDay({ occupied: 100, arrivals: 10, departures: 10 }, globals, blended);
  const alternate = evaluateDay(
    { occupied: 100, arrivals: 10, departures: 10 },
    { ...globals, serviceFrequency: 'alternate' },
    blended,
  );
  const optOut = evaluateDay(
    { occupied: 100, arrivals: 10, departures: 10 },
    { ...globals, optOutPct: 40 },
    blended,
  );
  assert.ok(alternate.totalMinutes < daily.totalMinutes);
  assert.ok(optOut.totalMinutes < daily.totalMinutes);
  close(serviceFactor('alternate'), 0.5);
  close(serviceFactor('none'), 0);
});

/* ---------- penalty rates ---------- */

test('weekend loading comes from the date', () => {
  assert.equal(penaltyMultiplier({ date: '2026-03-07' }, globals), 1.25); // Saturday
  assert.equal(penaltyMultiplier({ date: '2026-03-08' }, globals), 1.5); // Sunday
  assert.equal(penaltyMultiplier({ date: '2026-03-04' }, globals), 1); // Wednesday
});

test('a per-day override beats the weekday default', () => {
  assert.equal(penaltyMultiplier({ date: '2026-03-04', penaltyOverride: 2.5 }, globals), 2.5);
  // blank override falls back rather than zeroing the rate
  assert.equal(penaltyMultiplier({ date: '2026-03-07', penaltyOverride: '' }, globals), 1.25);
});

test('oncosts and penalties both reach the hourly cost', () => {
  const d = evaluateDay(
    { date: '2026-03-07', occupied: 100, arrivals: 12, departures: 12 },
    { ...globals, oncostPct: 20 },
    blended,
  );
  close(d.hourlyCost, 30 * 1.25 * 1.2); // 45
  close(d.cost, d.paidHours * 45);
});

/* ---------- length of stay as a cost lever ---------- */

test('longer stays save while a departure costs more than the servicing it replaces', () => {
  const t = alosThreshold(globals, blended);
  close(t.breakEvenDepartureMinutes, 15); // daily service, no opt-out
  close(t.marginPerAvoidedDeparture, 30);
  assert.equal(t.longerStaysSave, true);
});

test('the lever inverts with daily servicing and a quick turnover', () => {
  // 20 minute checkout, 25 minute daily stayover service
  const b = blendedMinutes([{ sharePct: 100, departureMinutes: 20, stayoverMinutes: 25 }]);
  const t = alosThreshold(globals, b);
  assert.equal(t.longerStaysSave, false, 'longer stays cost more here');
  assert.ok(t.marginPerAvoidedDeparture < 0);

  const scenario = alosScenario(1000, 2, 3, { ...globals, blendedHourlyCost: 40 }, b);
  assert.ok(scenario.hoursSaved < 0, 'raising ALOS adds hours in the inverted case');
});

test('the tool reports the inverted case rather than assuming', () => {
  const result = analyse({
    ...globals,
    unitTypes: [{ sharePct: 100, departureMinutes: 20, stayoverMinutes: 25 }],
    days: [{ date: '2026-03-03', occupied: 100, arrivals: 20, departures: 20 }],
  });
  assert.equal(verdict(result.totals, result.threshold), 'inverted');
  assert.ok(result.warnings.some((w) => w.includes('not longer than a stayover')));
});

test('at the indifference point, moving ALOS changes nothing', () => {
  // departure minutes exactly equal to the stayover night it replaces
  const b = blendedMinutes([{ sharePct: 100, departureMinutes: 15, stayoverMinutes: 15 }]);
  const s = alosScenario(1000, 2, 4, { ...globals, blendedHourlyCost: 40 }, b);
  close(s.hoursSaved, 0);
  close(s.costSaved, 0);
});

test('raising ALOS removes departures in proportion', () => {
  const s = alosScenario(1200, 2, 3, { ...globals, blendedHourlyCost: 40 }, blended);
  close(s.departuresFrom, 600);
  close(s.departuresTo, 400);
  close(s.departuresAvoided, 200);
  assert.ok(s.hoursSaved > 0);
  close(s.costSaved, s.hoursSaved * 40);
});

test('an ALOS scenario without usable inputs returns null rather than nonsense', () => {
  assert.equal(alosScenario(0, 2, 3, globals, blended), null);
  assert.equal(alosScenario(100, 0, 3, globals, blended), null);
});

/* ---------- totals ---------- */

test('totals report the departure share and the implied ALOS', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 25, departures: 25 },
      { date: '2026-03-04', occupied: 100, arrivals: 25, departures: 25 },
    ],
  });
  const t = result.totals;
  close(t.roomNights, 200);
  close(t.departures, 50);
  close(t.impliedAlos, 4);
  assert.ok(t.departureShare > 0 && t.departureShare < 1);
  assert.ok(t.costPerOccupiedRoom > 0);
  assert.ok(t.slackHours >= 0);
});

test('peak staffing is reported against the average, since that is what forces casuals', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 8, departures: 8 },
      { date: '2026-03-04', occupied: 100, arrivals: 60, departures: 60 },
    ],
  });
  assert.ok(result.totals.peakStaff > result.totals.averageStaff);
  assert.ok(result.totals.staffSpread > 0);
});

test('a departure-dominated week is identified as such', () => {
  const result = analyse({
    ...globals,
    unitTypes: oneType,
    days: [{ date: '2026-03-03', occupied: 100, arrivals: 80, departures: 80 }],
  });
  assert.equal(verdict(result.totals, result.threshold), 'departure-driven');
});

/* ---------- fixed and variable ---------- */

test('fixed work is separated from the work rooms create', () => {
  const d = evaluateDay(
    { occupied: 100, arrivals: 12, departures: 12 },
    { ...globals, fixedDailyMinutes: 120 },
    blended,
  );
  // 12 x 45 + 88 x 15 = 1860 room work, plus 120 fixed
  close(d.fixedMinutes, 120);
  close(d.totalMinutes, 1980);
  close(d.fixedShare, 120 / 1980);
  close(d.variableShare, 1860 / 1980);
});

test('spare capacity inside a rostered shift is reported', () => {
  // 31 productive hours -> 4 staff on 8s = 32 paid, 1 hour spare
  const d = evaluateDay({ occupied: 100, arrivals: 12, departures: 12 }, globals, blended);
  close(d.spareProductiveMinutes, 60); // 1 slack hour at 100% productivity
  assert.equal(d.absorbsAnotherClean, true, '45 minutes of clean fits in 60 spare');
});

/* ---------- late checkout ---------- */

const lateGlobals = {
  ...globals,
  shiftStart: '08:00',
  shiftHours: 8,
  lateCheckoutTime: '14:00',
  overtimeMultiplier: 1.5,
  lateCheckoutPrice: 0,
  ancillaryPerLateCheckout: 28,
};

test('times parse, and rubbish does not', () => {
  close(parseTime('14:30'), 14.5);
  close(parseTime('08:00'), 8);
  assert.equal(parseTime('25:00'), null);
  assert.equal(parseTime('nonsense'), null);
  assert.equal(parseTime(null), null);
});

test('a late checkout inside capacity costs nothing extra', () => {
  const d = evaluateDay(
    { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 2 },
    lateGlobals,
    blended,
  );
  const l = d.lateCheckout;
  assert.ok(l.absorbable >= 2, 'the day can absorb them');
  assert.equal(l.beyondCapacity, 0);
  assert.equal(l.overtimeCost, 0);
  // pure upside: whatever the guest spends, with no labour against it
  close(l.netValue, 2 * 28);
});

test('past capacity a late checkout runs into overtime', () => {
  const d = evaluateDay(
    { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 40 },
    lateGlobals,
    blended,
  );
  const l = d.lateCheckout;
  assert.ok(l.beyondCapacity > 0, 'more granted than the window can take');
  assert.ok(l.overtimeCost > 0);
  // 28 of spend against a 45 minute clean at time and a half is a losing trade
  assert.equal(l.worthwhileBeyondCapacity, false);
  assert.ok(l.netValue < l.grossValue);
});

test('the marginal cost of a late checkout rises with penalty rates', () => {
  const midweek = evaluateDay(
    { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 1 },
    lateGlobals,
    blended,
  );
  const sunday = evaluateDay(
    { date: '2026-03-08', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 1 },
    lateGlobals,
    blended,
  );
  close(sunday.lateCheckout.marginalCostPerLate, midweek.lateCheckout.marginalCostPerLate * 1.5);
});

test('charging for it flips the days that were not worth giving away', () => {
  const day = { date: '2026-03-08', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 40 };
  const free = evaluateDay(day, lateGlobals, blended);
  const charged = evaluateDay(day, { ...lateGlobals, lateCheckoutPrice: 60 }, blended);

  assert.equal(free.lateCheckout.worthwhileBeyondCapacity, false);
  assert.equal(charged.lateCheckout.worthwhileBeyondCapacity, true);
  // and the free version caps the give-away, the charged one does not
  assert.equal(free.lateCheckout.grantUpTo, free.lateCheckout.absorbable);
  assert.equal(charged.lateCheckout.grantUpTo, null);
});

test('a later checkout time leaves less room to absorb it', () => {
  // A light day, so the normal work finishes before the late window and the
  // window itself is what binds.
  const day = { date: '2026-03-04', occupied: 30, arrivals: 3, departures: 3, lateCheckouts: 0 };
  const two = evaluateDay(day, lateGlobals, blended);
  const halfFour = evaluateDay(day, { ...lateGlobals, lateCheckoutTime: '15:30' }, blended);
  assert.ok(halfFour.lateCheckout.lateWindowHours < two.lateCheckout.lateWindowHours);
  assert.ok(halfFour.lateCheckout.absorbable < two.lateCheckout.absorbable);
});

test('once normal work overruns, total spare capacity binds rather than the window', () => {
  // A heavy day cannot finish before the late window, so everything left is
  // at the back of the shift anyway and moving the checkout time changes
  // nothing. Worth pinning down: it is the behaviour, not an oversight.
  const day = { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 0 };
  const two = evaluateDay(day, lateGlobals, blended);
  const halfFour = evaluateDay(day, { ...lateGlobals, lateCheckoutTime: '15:30' }, blended);
  assert.equal(two.lateCheckout.absorbable, halfFour.lateCheckout.absorbable);
  // and that shared figure is the day's total spare productive capacity
  close(two.lateCheckout.availableForLate, two.spareProductiveMinutes);
});

test('a checkout time past the end of the shift absorbs nothing', () => {
  const d = evaluateDay(
    { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 2 },
    { ...lateGlobals, lateCheckoutTime: '18:00' },
    blended,
  );
  close(d.lateCheckout.lateWindowHours, 0);
  assert.equal(d.lateCheckout.absorbable, 0);
  assert.equal(d.lateCheckout.beyondCapacity, 2);
});

test('unsold capacity across the period is surfaced', () => {
  const result = analyse({
    ...lateGlobals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 0 },
      { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 0 },
    ],
  });
  assert.ok(result.totals.lateAbsorbable > 0);
  assert.equal(result.totals.lateGranted, 0);
  assert.equal(result.totals.lateUnusedCapacity, result.totals.lateAbsorbable);
  assert.equal(lateCheckoutVerdict(result.totals), 'giving-nothing');
});

test('granting past capacity at a loss is called out', () => {
  const result = analyse({
    ...lateGlobals,
    unitTypes: oneType,
    days: [{ date: '2026-03-08', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 60 }],
  });
  assert.ok(result.totals.lateBeyondCapacity > 0);
  assert.ok(result.totals.lateNetValue < 0);
  assert.equal(lateCheckoutVerdict(result.totals), 'overcommitted');
});

test('late checkout totals aggregate across the period', () => {
  const result = analyse({
    ...lateGlobals,
    unitTypes: oneType,
    days: [
      { date: '2026-03-03', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 3 },
      { date: '2026-03-04', occupied: 100, arrivals: 12, departures: 12, lateCheckouts: 2 },
    ],
  });
  assert.equal(result.totals.lateGranted, 5);
  close(result.totals.lateGrossValue, 5 * 28);
  close(result.totals.lateNetValue, 5 * 28); // all inside capacity
  assert.equal(lateCheckoutVerdict(result.totals), 'underused');
});

test('late checkout figures stay finite on junk input', () => {
  const d = evaluateDay(
    { date: 'x', occupied: 'a', arrivals: null, departures: undefined, lateCheckouts: 'zzz' },
    { ...lateGlobals, shiftStart: 'nope', lateCheckoutTime: '' },
    blended,
  );
  const nums = Object.values(d.lateCheckout).filter((v) => typeof v === 'number');
  assert.ok(nums.every(Number.isFinite), 'every late checkout figure should be finite');
});

/* ---------- robustness ---------- */

test('junk and null input produce no NaN', () => {
  const result = analyse({
    baseHourlyRate: 'abc',
    productivityPct: null,
    shiftHours: 0,
    unitTypes: null,
    days: [{ date: 'nonsense', occupied: -10, arrivals: undefined, departures: 'x' }],
  });
  const day = result.days[0];
  const numbers = Object.values(day).filter((v) => typeof v === 'number');
  assert.ok(numbers.every(Number.isFinite), 'every day figure should be finite');
  const totals = Object.values(result.totals).filter((v) => typeof v === 'number');
  assert.ok(totals.every(Number.isFinite), 'every total should be finite');
});

test('no days is handled', () => {
  const result = analyse({ ...globals, unitTypes: oneType, days: [] });
  assert.equal(result.totals, null);
  assert.ok(result.warnings.some((w) => w.includes('at least one day')));
});

test('a missing hourly rate is called out rather than silently costing nothing', () => {
  const result = analyse({
    ...globals,
    baseHourlyRate: 0,
    unitTypes: oneType,
    days: [{ date: '2026-03-03', occupied: 50, arrivals: 10, departures: 10 }],
  });
  assert.ok(result.warnings.some((w) => w.includes('No hourly rate')));
});
