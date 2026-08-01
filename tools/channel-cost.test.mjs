/* Tests for the channel cost arithmetic.
   Run with:  node --test tools/channel-cost.test.mjs
   Needs node 22+ (module syntax detection). No dependencies,
   nothing to install, and nothing here ships to the site. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  breakevenAdr,
  compare,
  evaluateChannel,
  mixTotal,
  verdict,
  weightedPaymentPct,
} from './channel-cost.js';

const cardRates = { vcc: 3.5, intlCard: 2.9, domesticCard: 0.45, transfer: 0 };
const globals = { roomsPerBooking: 1, paymentFeeFixed: 0, cardRates };

const allDomestic = { vcc: 0, intlCard: 0, domesticCard: 100, transfer: 0 };
const allVcc = { vcc: 100, intlCard: 0, domesticCard: 0, transfer: 0 };

const channel = (over = {}) => ({
  name: 'Test',
  grossAdr: 240,
  nights: 2,
  programmeDiscountPct: 0,
  promoDiscountPct: 0,
  baseCommissionPct: 15,
  preferredUpliftPp: 0,
  platformFeePct: 0,
  platformFeeFixed: 0,
  adCostPct: 0,
  adCostPerBooking: 0,
  otherCostPerBooking: 0,
  settlementMix: allDomestic,
  cancellationRatePct: 0,
  resellRatePct: 0,
  recoveryAdrPct: 100,
  ...over,
});

/* ---------- payment settlement mix ---------- */

const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) < tol, `${a} !~= ${b}`);

test('a single settlement type reduces to that type rate', () => {
  close(weightedPaymentPct(allVcc, cardRates), 0.035);
  close(weightedPaymentPct(allDomestic, cardRates), 0.0045);
});

test('a mixed settlement blends the global card rates', () => {
  const mix = { vcc: 70, intlCard: 20, domesticCard: 10, transfer: 0 };
  // 0.7(3.5) + 0.2(2.9) + 0.1(0.45) = 2.45 + 0.58 + 0.045 = 3.075%
  assert.ok(Math.abs(weightedPaymentPct(mix, cardRates) - 0.03075) < 1e-12);
});

test('the virtual card premium is real money on identical commission', () => {
  const vcc = evaluateChannel(channel({ settlementMix: allVcc }), globals);
  const dom = evaluateChannel(channel({ settlementMix: allDomestic }), globals);
  assert.equal(vcc.commission, dom.commission); // same commission
  // 480 gross x (3.5% - 0.45%) = 14.64 of pure payment cost difference
  assert.ok(Math.abs(vcc.payment - dom.payment - 480 * 0.0305) < 1e-9);
  assert.ok(vcc.expectedNet < dom.expectedNet);
});

test('a settlement mix that does not total 100 is flagged, not normalised', () => {
  const result = compare({
    ...globals,
    channels: [channel({ settlementMix: { vcc: 50, intlCard: 0, domesticCard: 0, transfer: 0 } })],
  });
  assert.ok(result.warnings.some((w) => w.includes('does not add up to 100%')));
  // and the understated cost is left as entered, not silently fixed
  assert.equal(mixTotal({ vcc: 50, intlCard: 0, domesticCard: 0, transfer: 0 }), 50);
});

test('a suspiciously cheap virtual card rate is questioned', () => {
  const result = compare({
    ...globals,
    cardRates: { ...cardRates, vcc: 0.3 },
    channels: [channel({ settlementMix: allVcc })],
  });
  assert.ok(result.warnings.some((w) => w.includes('virtual card rate is not above')));
});

/* ---------- rate, discounts and commission ---------- */

test('discounts stack multiplicatively and commission follows the discounted rate', () => {
  const r = evaluateChannel(
    channel({ programmeDiscountPct: 10, promoDiscountPct: 5 }),
    globals,
  );
  // 240 x 0.9 x 0.95 = 205.20
  assert.ok(Math.abs(r.effectiveAdr - 205.2) < 1e-9);
  assert.ok(Math.abs(r.grossRevenue - 410.4) < 1e-9);
  // commission charged on what's left, not the loaded rate
  assert.ok(Math.abs(r.commission - 410.4 * 0.15) < 1e-9);
  assert.ok(Math.abs(r.discountGiven - (480 - 410.4)) < 1e-9);
});

test('the preferred partner uplift raises cost of sale', () => {
  const plain = evaluateChannel(channel(), globals);
  const preferred = evaluateChannel(channel({ preferredUpliftPp: 3 }), globals);
  assert.ok(Math.abs(preferred.commissionPct - 0.18) < 1e-12);
  assert.ok(preferred.costOfSalePct > plain.costOfSalePct);
  assert.ok(Math.abs(preferred.commission - plain.commission - 480 * 0.03) < 1e-9);
});

test('net ADR and cost of sale hold on a hand-worked case', () => {
  const r = evaluateChannel(channel(), globals);
  // 480 gross, 15% commission = 72, payment 480 x 0.45% = 2.16
  assert.ok(Math.abs(r.grossRevenue - 480) < 1e-9);
  assert.ok(Math.abs(r.totalCost - (72 + 2.16)) < 1e-9);
  assert.ok(Math.abs(r.netIfRealised - (480 - 74.16)) < 1e-9);
  assert.ok(Math.abs(r.netAdr - 202.92) < 1e-9);
  assert.ok(Math.abs(r.costOfSalePct - 74.16 / 480) < 1e-12);
});

/* ---------- cancellation, sunk cost and resale ---------- */

test('advertising is sunk but commission is refunded on cancellation', () => {
  const r = evaluateChannel(
    channel({ adCostPerBooking: 20, cancellationRatePct: 100, resellRatePct: 0 }),
    globals,
  );
  // Fully cancelled: no commission, no payment fee, but the ad spend is gone.
  assert.equal(r.netIfCancelled, -20);
  assert.equal(r.expectedNet, -20);
});

test('resale recovers part of a cancellation', () => {
  const noResale = evaluateChannel(
    channel({ cancellationRatePct: 40, resellRatePct: 0 }),
    globals,
  );
  const withResale = evaluateChannel(
    channel({ cancellationRatePct: 40, resellRatePct: 75, recoveryAdrPct: 90 }),
    globals,
  );
  assert.ok(withResale.expectedNet > noResale.expectedNet);
});

test('a high-cancellation channel is worth less than a stable one', () => {
  const stable = evaluateChannel(channel({ cancellationRatePct: 10 }), globals);
  const churny = evaluateChannel(channel({ cancellationRatePct: 45 }), globals);
  assert.ok(churny.expectedNet < stable.expectedNet);
});

/* ---------- the point of the whole tool ---------- */

test('a lower headline commission can still be the worse channel', () => {
  const cheapLooking = channel({
    name: 'Looks cheap',
    baseCommissionPct: 12,
    programmeDiscountPct: 10, // Genius
    preferredUpliftPp: 3, // Preferred Partner
    adCostPerBooking: 12, // sponsored ads
    settlementMix: allVcc, // virtual card
    cancellationRatePct: 35,
    resellRatePct: 50,
    recoveryAdrPct: 85,
  });
  const dearLooking = channel({
    name: 'Looks dear',
    baseCommissionPct: 18,
    settlementMix: allDomestic,
    cancellationRatePct: 12,
    resellRatePct: 60,
    recoveryAdrPct: 95,
  });

  const cheap = evaluateChannel(cheapLooking, globals);
  const dear = evaluateChannel(dearLooking, globals);

  assert.ok(cheap.commissionPct < dear.commissionPct, 'headline commission is lower');
  assert.ok(cheap.expectedNet < dear.expectedNet, 'but it nets less');
  assert.ok(cheap.costOfRackPct > dear.costOfRackPct, 'and truly costs more');
});

/* ---------- breakeven ---------- */

test('the breakeven ADR really does hit the target net', () => {
  const direct = channel({ name: 'Direct', baseCommissionPct: 0, adCostPerBooking: 9 });
  const target = 350;
  const adr = breakevenAdr(direct, globals, target);
  const solved = evaluateChannel({ ...direct, grossAdr: adr }, globals);
  assert.ok(Math.abs(solved.expectedNet - target) < 1e-9);
});

test('breakeven holds with discounts, cancellation, resale and fixed costs in play', () => {
  const direct = channel({
    name: 'Direct',
    baseCommissionPct: 0,
    programmeDiscountPct: 5,
    promoDiscountPct: 3,
    platformFeePct: 2.5,
    platformFeeFixed: 1.2,
    adCostPct: 1.5,
    adCostPerBooking: 8,
    otherCostPerBooking: 2,
    settlementMix: { vcc: 0, intlCard: 30, domesticCard: 70, transfer: 0 },
    cancellationRatePct: 18,
    resellRatePct: 65,
    recoveryAdrPct: 92,
  });
  const g = { ...globals, paymentFeeFixed: 0.3 };
  const adr = breakevenAdr(direct, g, 275);
  const solved = evaluateChannel({ ...direct, grossAdr: adr }, g);
  assert.ok(Math.abs(solved.expectedNet - 275) < 1e-9);
});

test('breakeven is null when the rate cannot move the outcome', () => {
  const stuck = channel({ nights: 0 });
  assert.equal(breakevenAdr(stuck, globals, 100), null);
});

test('comparison reports the discount headroom direct can afford', () => {
  const result = compare({
    ...globals,
    channels: [
      channel({ name: 'Booking.com', settlementMix: allVcc, cancellationRatePct: 30, resellRatePct: 50 }),
      channel({ name: 'Direct', baseCommissionPct: 0, adCostPerBooking: 10, cancellationRatePct: 12, resellRatePct: 60 }),
    ],
  });
  const { breakeven, direct, bestOther } = result.comparison;
  assert.equal(bestOther.name, 'Booking.com');
  assert.equal(direct.name, 'Direct');
  // direct wins here, so there is room to discount and still win
  assert.ok(breakeven.headroom > 0);
  // and dropping to exactly that rate lands on the OTA's net
  assert.ok(Math.abs(breakeven.targetNet - bestOther.expectedNet) < 1e-9);
});

test('direct is not compared against itself', () => {
  const result = compare({
    ...globals,
    channels: [
      channel({ name: 'Direct', baseCommissionPct: 0 }),
      channel({ name: 'Expedia', baseCommissionPct: 18 }),
    ],
  });
  assert.equal(result.comparison.bestOther.name, 'Expedia');
  assert.equal(verdict(result.comparison), 'direct');
});

test('an explicit isDirect flag wins over name matching', () => {
  const result = compare({
    ...globals,
    channels: [
      channel({ name: 'Booking.com', baseCommissionPct: 15 }),
      channel({ name: 'Our own site', isDirect: true, baseCommissionPct: 0 }),
    ],
  });
  assert.equal(result.comparison.direct.name, 'Our own site');
  assert.equal(result.comparison.bestOther.name, 'Booking.com');
});

test('near-ties report level rather than a confident winner', () => {
  assert.equal(
    verdict({ direct: {}, bestOther: { expectedNet: 400 }, directAdvantage: 2 }),
    'level',
  );
  assert.equal(
    verdict({ direct: {}, bestOther: { expectedNet: 400 }, directAdvantage: -2 }),
    'level',
  );
});

test('a missing direct channel is reported rather than guessed at', () => {
  const result = compare({
    ...globals,
    channels: [channel({ name: 'Booking.com' }), channel({ name: 'Expedia' })],
  });
  assert.equal(result.comparison.direct, null);
  assert.equal(result.comparison.breakeven, null);
  assert.equal(verdict(result.comparison), 'incomplete');
});

/* ---------- robustness ---------- */

test('junk input does not throw or produce NaN', () => {
  const result = compare({
    roomsPerBooking: 'x',
    paymentFeeFixed: null,
    cardRates: { vcc: 'abc' },
    channels: [{ name: 'Broken', grossAdr: -50, nights: undefined, settlementMix: null }],
  });
  const c = result.channels[0];
  const numbers = Object.values(c).filter((v) => typeof v === 'number');
  assert.ok(numbers.every(Number.isFinite), 'every channel figure should be finite');
  assert.equal(c.expectedNet, 0);
});

test('no channels is handled', () => {
  const result = compare({ ...globals, channels: [] });
  assert.equal(result.comparison, null);
  assert.ok(result.warnings.some((w) => w.includes('at least one channel')));
});

test('a channel that costs more than it earns is surfaced', () => {
  const result = compare({
    ...globals,
    channels: [channel({ baseCommissionPct: 90, adCostPerBooking: 200 })],
  });
  assert.ok(result.warnings.some((w) => w.includes('less than nothing')));
});
