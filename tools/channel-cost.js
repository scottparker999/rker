/* ==========================================================
   True cost of a booking, by channel.

   Channel cost gets quoted as the headline commission -- "Booking
   is 15%" -- when the real cost of sale is that commission plus
   the Genius or member discount taken off the rate, plus the
   Preferred Partner uplift, plus sponsored ads, plus the payment
   fee, plus the cancellations the channel produces.

   Two things here are easy to get wrong and are modelled
   explicitly:

   1. Payment is a settlement MIX, not a single rate. OTA bookings
      are largely settled by virtual card, and those VCCs are
      issued on foreign BINs as commercial cards -- so they reach
      the acquirer as cross-border commercial transactions at
      around 3-3.5%, against under 0.5% for a domestic guest card.
      Card rates belong to the merchant agreement (global); what
      changes per channel is which kind of card turns up.

   2. Advertising is SUNK. You paid for the click whether or not
      the booking survives. Commission, payment and platform fees
      are refunded on cancellation; ad spend is not.

   Pure functions, no DOM, no dependencies -- see
   channel-cost.test.mjs.
   ========================================================== */

const atLeastZero = (n) => (n > 0 ? n : 0);

const pct = (n) => (Number(n) || 0) / 100;

const num = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/** The settlement types a booking can arrive on, cheapest last. */
export const SETTLEMENT_TYPES = [
  { key: 'vcc', label: 'OTA virtual card', note: 'Foreign BIN, commercial rate' },
  { key: 'intlCard', label: 'Guest card, international' },
  { key: 'domesticCard', label: 'Guest card, domestic' },
  { key: 'transfer', label: 'Bank transfer / net remittance' },
];

/**
 * Blend the global card rates by this channel's settlement mix.
 *
 * This is the number that makes an OTA booking quietly more
 * expensive than its commission suggests.
 */
export function weightedPaymentPct(mix, rates) {
  const m = mix || {};
  const r = rates || {};
  return SETTLEMENT_TYPES.reduce((total, { key }) => total + pct(m[key]) * pct(r[key]), 0);
}

/** How far a channel's settlement mix is from adding up to 100%. */
export function mixTotal(mix) {
  const m = mix || {};
  return SETTLEMENT_TYPES.reduce((total, { key }) => total + num(m[key]), 0);
}

/**
 * One channel, one booking.
 *
 * Costs are split by whether they survive a cancellation, because
 * that split is what separates a channel's headline rate from what
 * it actually costs you.
 */
export function evaluateChannel(channel = {}, globals = {}) {
  const roomsPerBooking = Math.max(1, num(globals.roomsPerBooking) || 1);
  const nights = atLeastZero(num(channel.nights));
  const roomNights = nights * roomsPerBooking;

  const grossAdr = atLeastZero(num(channel.grossAdr));
  // Programme and campaign discounts stack on the rate, and commission
  // is then charged on what's left -- not on the rate you loaded.
  const effectiveAdr =
    grossAdr * (1 - pct(channel.programmeDiscountPct)) * (1 - pct(channel.promoDiscountPct));
  const grossRevenue = effectiveAdr * roomNights;

  const commissionPct = pct(channel.baseCommissionPct) + pct(channel.preferredUpliftPp);
  const paymentPct = weightedPaymentPct(channel.settlementMix, globals.cardRates);
  const platformPct = pct(channel.platformFeePct);
  const adPct = pct(channel.adCostPct);

  const commission = grossRevenue * commissionPct;
  const payment = grossRevenue * paymentPct + num(globals.paymentFeeFixed);
  const platform = grossRevenue * platformPct + num(channel.platformFeeFixed);
  const advertising = grossRevenue * adPct + num(channel.adCostPerBooking);
  const other = num(channel.otherCostPerBooking);

  // Refunded if the booking goes away.
  const refundableCosts = commission + payment + platform + other;
  // Spent regardless.
  const sunkCosts = advertising;

  const totalCost = refundableCosts + sunkCosts;
  const netIfRealised = grossRevenue - totalCost;

  // A cancellation is not automatically a lost room -- it may resell.
  // Resold revenue is assumed to carry the same channel's percentage
  // costs (documented on the page).
  const recoveryRevenue =
    pct(channel.resellRatePct) * roomNights * effectiveAdr * pct(channel.recoveryAdrPct);
  const recoveryNet = recoveryRevenue * (1 - commissionPct - paymentPct - platformPct);
  const netIfCancelled = recoveryNet - sunkCosts;

  const cancelRate = pct(channel.cancellationRatePct);
  const expectedNet = (1 - cancelRate) * netIfRealised + cancelRate * netIfCancelled;

  return {
    name: channel.name || 'Channel',
    roomNights,
    grossAdr,
    effectiveAdr,
    grossRevenue,
    discountGiven: grossAdr * roomNights - grossRevenue,
    commissionPct,
    paymentPct,
    commission,
    payment,
    platform,
    advertising,
    other,
    refundableCosts,
    sunkCosts,
    totalCost,
    netIfRealised,
    netIfCancelled,
    recoveryRevenue,
    expectedNet,
    // Headline metrics.
    netAdr: roomNights > 0 ? netIfRealised / roomNights : 0,
    expectedNetAdr: roomNights > 0 ? expectedNet / roomNights : 0,
    costOfSalePct: grossRevenue > 0 ? totalCost / grossRevenue : 0,
    // Total cost as a share of the rate you originally loaded -- the
    // honest comparison against a quoted commission percentage.
    costOfRackPct:
      grossAdr * roomNights > 0
        ? (grossAdr * roomNights - expectedNet) / (grossAdr * roomNights)
        : 0,
    mixTotal: mixTotal(channel.settlementMix),
  };
}

/**
 * The gross ADR at which a channel's expected net hits a target.
 *
 * expectedNet is linear in grossAdr -- every percentage cost scales
 * with it and the fixed costs don't -- so two evaluations define the
 * line exactly. Solving it this way rather than deriving the
 * coefficients by hand keeps it correct as cost lines are added.
 *
 * Returns null when the channel has no rate sensitivity to solve on.
 */
export function breakevenAdr(channel, globals, targetNet) {
  const at = (adr) => evaluateChannel({ ...channel, grossAdr: adr }, globals).expectedNet;
  const base = at(0);
  const slope = at(100) - base;
  if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) return null;
  const adr = ((num(targetNet) - base) / slope) * 100;
  return Number.isFinite(adr) ? adr : null;
}

/**
 * Compare every channel and work out what direct has to beat.
 */
export function compare(input = {}) {
  const globals = {
    roomsPerBooking: input.roomsPerBooking,
    paymentFeeFixed: input.paymentFeeFixed,
    cardRates: input.cardRates || {},
  };

  const channels = (input.channels || []).map((c) => evaluateChannel(c, globals));
  if (!channels.length) {
    return { channels, comparison: null, warnings: ['Add at least one channel to compare.'] };
  }

  const best = channels.reduce((a, b) => (b.expectedNet > a.expectedNet ? b : a));
  const worst = channels.reduce((a, b) => (b.expectedNet < a.expectedNet ? b : a));

  // The direct channel is whichever the caller flagged; fall back to a
  // name match so the tool still works if nothing is flagged.
  const directIndex = (input.channels || []).findIndex(
    (c) => c.isDirect || /direct/i.test(c.name || ''),
  );
  const direct = directIndex >= 0 ? channels[directIndex] : null;

  // What does direct have to beat? The best OTA, not the best channel --
  // comparing direct against itself is meaningless.
  const bestOther = channels
    .filter((_, i) => i !== directIndex)
    .reduce((a, b) => (a === null || b.expectedNet > a.expectedNet ? b : a), null);

  let breakeven = null;
  if (direct && bestOther && directIndex >= 0) {
    const adr = breakevenAdr(input.channels[directIndex], globals, bestOther.expectedNet);
    if (adr !== null) {
      breakeven = {
        against: bestOther.name,
        targetNet: bestOther.expectedNet,
        grossAdr: adr,
        // Positive = room to discount direct and still win.
        headroom: direct.grossAdr - adr,
        headroomPct: direct.grossAdr > 0 ? (direct.grossAdr - adr) / direct.grossAdr : 0,
      };
    }
  }

  return {
    channels,
    comparison: {
      best,
      worst,
      direct,
      bestOther,
      spread: best.expectedNet - worst.expectedNet,
      directAdvantage: direct && bestOther ? direct.expectedNet - bestOther.expectedNet : null,
      breakeven,
    },
    warnings: collectWarnings(channels, input),
  };
}

function collectWarnings(channels, input) {
  const warnings = [];

  const offMix = channels.filter((c) => Math.abs(c.mixTotal - 100) > 0.5);
  if (offMix.length) {
    warnings.push(
      `Settlement mix does not add up to 100% for ${offMix
        .map((c) => `${c.name} (${Math.round(c.mixTotal)}%)`)
        .join(', ')}. Payment cost is understated or overstated until it does.`,
    );
  }

  if (channels.some((c) => c.roomNights === 0)) {
    warnings.push('At least one channel has no room nights, so it cannot be compared.');
  }

  if (channels.some((c) => c.expectedNet < 0)) {
    warnings.push('At least one channel returns less than nothing once every cost is counted.');
  }

  const rates = input.cardRates || {};
  if (num(rates.vcc) > 0 && num(rates.vcc) <= num(rates.domesticCard)) {
    warnings.push(
      'The virtual card rate is not above the domestic card rate. OTA virtual cards are normally foreign-issued commercial cards and cost several times a domestic consumer card.',
    );
  }

  if (!channels.some((c) => c.sunkCosts > 0)) {
    warnings.push(
      'No advertising cost is entered anywhere, so neither channel is carrying its acquisition spend.',
    );
  }

  return warnings;
}

/** How decisively direct wins or loses, with a band so near-ties are not oversold. */
export function verdict(comparison, marginPct = 3) {
  if (!comparison || !comparison.direct || !comparison.bestOther) return 'incomplete';
  const base = Math.abs(comparison.bestOther.expectedNet) || 1;
  const band = base * (marginPct / 100);
  if (comparison.directAdvantage > band) return 'direct';
  if (comparison.directAdvantage < -band) return 'ota';
  return 'level';
}
