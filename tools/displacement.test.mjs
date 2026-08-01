/* Tests for the group displacement arithmetic.
   Run with:  node --test tools/displacement.test.mjs
   Needs node 22+ (module syntax detection). No dependencies,
   nothing to install, and nothing here ships to the site. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { analyse, breakevenRate, contributionPerRoom, evaluateNight, verdict } from './displacement.js';

const settings = {
  variableCostPerRoom: 25,
  transientCommissionPct: 15,
  groupCommissionPct: 0,
  washPct: 0,
};

const night = (over = {}) => ({
  date: '2026-03-06',
  capacity: 100,
  onTheBooks: 40,
  transientDemand: 50,
  transientAdr: 200,
  groupRooms: 30,
  groupRate: 150,
  ...over,
});

test('contribution nets off commission and variable cost', () => {
  // 200 less 15% channel cost, less 25 to service the room
  assert.equal(contributionPerRoom(200, 15, 25), 145);
  assert.equal(contributionPerRoom(150, 0, 25), 125);
});

test('a group displaces nothing when transient demand is soft', () => {
  // 60 rooms free, only 20 transient wanted, group takes 30 -> everyone fits
  const r = evaluateNight(night({ transientDemand: 20 }), settings);
  assert.equal(r.displacedRooms, 0);
  assert.equal(r.lostTransientContribution, 0);
  assert.ok(r.fits);
});

test('displacement is demand-limited, not simply group size', () => {
  const r = evaluateNight(night(), settings);
  // 50 transient wanted, only 30 can still be taken once 30 group rooms go
  assert.equal(r.transientWithout, 50);
  assert.equal(r.transientWith, 30);
  assert.equal(r.displacedRooms, 20);
  assert.equal(r.lostTransientContribution, 20 * 145);
});

test('demand above capacity displaces the full block', () => {
  const r = evaluateNight(night({ transientDemand: 500 }), settings);
  assert.equal(r.displacedRooms, 30);
});

test('a block larger than the house is flagged, not silently accepted', () => {
  const r = evaluateNight(night({ groupRooms: 90 }), settings);
  assert.equal(r.fits, false);
  assert.equal(r.shortfall, 30); // 90 requested against 60 available
});

test('wash reduces the rooms actually analysed', () => {
  const r = evaluateNight(night(), { ...settings, washPct: 10 });
  assert.equal(r.groupRoomsMaterialised, 27);
  assert.equal(r.groupRoomsRevenue, 27 * 150);
});

test('nights are evaluated independently', () => {
  const result = analyse({
    ...settings,
    nights: [
      night({ date: 'soft', transientDemand: 10 }), // no displacement
      night({ date: 'peak', transientDemand: 60 }), // displaces
    ],
  });
  assert.equal(result.nights[0].displacedRooms, 0);
  assert.equal(result.nights[1].displacedRooms, 30);
  assert.equal(result.totals.displacedRoomNights, 30);
});

test('totals compare contribution, and the worked example holds', () => {
  const result = analyse({ ...settings, nights: [night()] });
  const t = result.totals;
  assert.equal(t.groupRoomsContribution, 30 * 125); // 3750
  assert.equal(t.lostTransientContribution, 20 * 145); // 2900
  assert.equal(t.netBenefit, 850);
  assert.equal(verdict(t), 'accept');
});

test('ancillary contribution is margin, not revenue', () => {
  const result = analyse({
    ...settings,
    nights: [night()],
    ancillary: {
      foodBeverageRevenue: 4000,
      foodBeverageMarginPct: 30,
      meetingSpaceRevenue: 1000,
      meetingSpaceMarginPct: 90,
      otherRevenue: 0,
      otherMarginPct: 0,
    },
  });
  assert.equal(result.totals.ancillaryRevenue, 5000);
  assert.equal(result.totals.ancillaryContribution, 4000 * 0.3 + 1000 * 0.9); // 2100
  assert.equal(result.totals.netBenefit, 850 + 2100);
});

test('a low room rate can still be worth taking on ancillary spend', () => {
  const result = analyse({
    ...settings,
    nights: [night({ groupRate: 90 })],
    ancillary: { foodBeverageRevenue: 20000, foodBeverageMarginPct: 35 },
  });
  assert.ok(result.totals.groupRoomsContribution < result.totals.lostTransientContribution);
  assert.equal(verdict(result.totals), 'accept');
});

test('breakeven rate really does break even', () => {
  const base = { ...settings, nights: [night()] };
  const rate = analyse(base).totals.breakevenGroupRate;

  const atBreakeven = analyse({
    ...base,
    nights: [night({ groupRate: rate })],
  });
  assert.ok(Math.abs(atBreakeven.totals.netBenefit) < 1e-9);
  assert.equal(verdict(atBreakeven.totals), 'marginal');
});

test('breakeven holds with commission, wash and ancillary in play', () => {
  const base = {
    variableCostPerRoom: 32,
    transientCommissionPct: 18,
    groupCommissionPct: 10,
    washPct: 12,
    ancillary: { foodBeverageRevenue: 6000, foodBeverageMarginPct: 28 },
    nights: [
      night({ transientDemand: 70, transientAdr: 245, groupRooms: 25 }),
      night({ transientDemand: 55, transientAdr: 190, groupRooms: 25 }),
    ],
  };
  const rate = analyse(base).totals.breakevenGroupRate;
  const atBreakeven = analyse({
    ...base,
    nights: base.nights.map((n) => ({ ...n, groupRate: rate })),
  });
  assert.ok(Math.abs(atBreakeven.totals.netBenefit) < 1e-9);
});

test('breakeven is zero when ancillary alone covers the displacement', () => {
  const rate = breakevenRate({
    lostTransientContribution: 1000,
    ancillaryContribution: 99999,
    groupRoomNights: 10,
    settings: { groupCommissionPct: 0, variableCostPerRoom: 0 },
  });
  assert.equal(rate, 0);
});

test('breakeven is undefined without group rooms', () => {
  assert.equal(
    breakevenRate({
      lostTransientContribution: 100,
      ancillaryContribution: 0,
      groupRoomNights: 0,
      settings: { groupCommissionPct: 0, variableCostPerRoom: 0 },
    }),
    null,
  );
});

test('a clearly bad group is declined', () => {
  const result = analyse({
    ...settings,
    nights: [night({ groupRate: 60, transientDemand: 200 })],
  });
  assert.equal(verdict(result.totals), 'decline');
  assert.ok(result.totals.netBenefit < 0);
});

test('near-ties report as marginal rather than a confident yes', () => {
  assert.equal(verdict({ netBenefit: 1, lostTransientContribution: 5000 }), 'marginal');
  assert.equal(verdict({ netBenefit: -1, lostTransientContribution: 5000 }), 'marginal');
});

test('zero variable cost is warned about', () => {
  const result = analyse({ ...settings, variableCostPerRoom: 0, nights: [night()] });
  assert.ok(result.warnings.some((w) => w.includes('Variable cost')));
});

test('junk input does not throw or produce NaN', () => {
  const result = analyse({
    variableCostPerRoom: 'abc',
    nights: [{ capacity: -5, onTheBooks: null, transientDemand: undefined, groupRooms: 'x' }],
  });
  const values = Object.values(result.totals).filter((v) => typeof v === 'number');
  assert.ok(values.every(Number.isFinite), 'totals should all be finite');
  assert.equal(result.totals.netBenefit, 0);
});

test('capacity already oversold is surfaced', () => {
  const result = analyse({ ...settings, nights: [night({ onTheBooks: 120 })] });
  assert.ok(result.warnings.some((w) => w.includes('exceed capacity')));
});
