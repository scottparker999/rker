/* ==========================================================
   Group displacement analysis.

   Answers the question a revenue manager actually asks when a
   group request lands: does this group contribute more than the
   transient business it pushes out?

   The unit of comparison is CONTRIBUTION, not revenue. Rooms
   revenue that arrives with a 15% channel commission and $25 of
   housekeeping attached is not comparable to rooms revenue that
   doesn't, and comparing top-line rates is the most common way
   these decisions get made wrong.

   Displacement is evaluated per night. A Friday-to-Sunday group
   might displace nothing on Friday and everything on Saturday,
   and an aggregate view hides that completely.

   Pure functions, no DOM, no dependencies -- so the arithmetic
   can be tested on its own (see displacement.test.mjs).
   ========================================================== */

/** Clamp to zero: negative rooms and negative money are never meaningful here. */
const atLeastZero = (n) => (n > 0 ? n : 0);

const pct = (n) => (Number(n) || 0) / 100;

const num = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Contribution per occupied room, after distribution cost and the
 * variable cost of putting a guest in the room.
 */
export function contributionPerRoom(rate, commissionPct, variableCost) {
  return num(rate) * (1 - pct(commissionPct)) - num(variableCost);
}

/**
 * One night of the stay.
 *
 * Displacement is the difference between the transient rooms you
 * could have sold without the group and the transient rooms you can
 * still sell with it. Crucially that is NOT "group rooms minus spare
 * capacity" -- if forecast demand is soft, a group can occupy empty
 * rooms and displace nobody.
 */
export function evaluateNight(night, settings) {
  const capacity = atLeastZero(num(night.capacity));
  const onTheBooks = atLeastZero(num(night.onTheBooks));
  const transientDemand = atLeastZero(num(night.transientDemand));
  const transientAdr = atLeastZero(num(night.transientAdr));
  const groupRooms = atLeastZero(num(night.groupRooms));
  const groupRate = atLeastZero(num(night.groupRate));

  // Rooms physically sellable once existing commitments are honoured.
  const available = atLeastZero(capacity - onTheBooks);

  // Groups rarely pick up the full block. Work in expected rooms.
  const materialised = groupRooms * (1 - pct(settings.washPct));

  const transientWithout = Math.min(transientDemand, available);
  const transientWith = Math.min(transientDemand, atLeastZero(available - materialised));
  const displacedRooms = atLeastZero(transientWithout - transientWith);

  const transientUnit = contributionPerRoom(
    transientAdr,
    settings.transientCommissionPct,
    settings.variableCostPerRoom,
  );
  const groupUnit = contributionPerRoom(
    groupRate,
    settings.groupCommissionPct,
    settings.variableCostPerRoom,
  );

  return {
    date: night.date || '',
    capacity,
    onTheBooks,
    available,
    transientDemand,
    transientAdr,
    groupRooms,
    groupRate,
    groupRoomsMaterialised: materialised,
    transientWithout,
    transientWith,
    displacedRooms,
    // Does the block physically fit at all?
    fits: materialised <= available,
    shortfall: atLeastZero(materialised - available),
    groupRoomsRevenue: materialised * groupRate,
    groupRoomsContribution: materialised * groupUnit,
    lostTransientRevenue: displacedRooms * transientAdr,
    lostTransientContribution: displacedRooms * transientUnit,
  };
}

/**
 * Ancillary contribution. Meeting space and F&B are the reason many
 * groups are worth taking at a room rate that looks unattractive on
 * its own, so leaving them out biases every answer toward decline.
 */
export function ancillaryContribution(ancillary = {}) {
  const fb = num(ancillary.foodBeverageRevenue) * pct(ancillary.foodBeverageMarginPct);
  const meeting = num(ancillary.meetingSpaceRevenue) * pct(ancillary.meetingSpaceMarginPct);
  const other = num(ancillary.otherRevenue) * pct(ancillary.otherMarginPct);

  const revenue =
    num(ancillary.foodBeverageRevenue) +
    num(ancillary.meetingSpaceRevenue) +
    num(ancillary.otherRevenue);

  return { revenue, contribution: fb + meeting + other };
}

/**
 * Full analysis across every night of the stay.
 */
export function analyse(input = {}) {
  const settings = {
    variableCostPerRoom: num(input.variableCostPerRoom),
    transientCommissionPct: num(input.transientCommissionPct),
    groupCommissionPct: num(input.groupCommissionPct),
    washPct: num(input.washPct),
  };

  const nights = (input.nights || []).map((n) => evaluateNight(n, settings));
  const ancillary = ancillaryContribution(input.ancillary);

  const sum = (fn) => nights.reduce((total, n) => total + fn(n), 0);

  const groupRoomNights = sum((n) => n.groupRoomsMaterialised);
  const displacedRoomNights = sum((n) => n.displacedRooms);
  const groupRoomsRevenue = sum((n) => n.groupRoomsRevenue);
  const groupRoomsContribution = sum((n) => n.groupRoomsContribution);
  const lostTransientRevenue = sum((n) => n.lostTransientRevenue);
  const lostTransientContribution = sum((n) => n.lostTransientContribution);

  const totalGroupRevenue = groupRoomsRevenue + ancillary.revenue;
  const totalGroupContribution = groupRoomsContribution + ancillary.contribution;
  const netBenefit = totalGroupContribution - lostTransientContribution;

  return {
    nights,
    totals: {
      groupRoomNights,
      displacedRoomNights,
      groupRoomsRevenue,
      ancillaryRevenue: ancillary.revenue,
      totalGroupRevenue,
      groupRoomsContribution,
      ancillaryContribution: ancillary.contribution,
      totalGroupContribution,
      lostTransientRevenue,
      lostTransientContribution,
      netBenefit,
      groupAdr: groupRoomNights > 0 ? groupRoomsRevenue / groupRoomNights : 0,
      displacedAdr: displacedRoomNights > 0 ? lostTransientRevenue / displacedRoomNights : 0,
      breakevenGroupRate: breakevenRate({
        lostTransientContribution,
        ancillaryContribution: ancillary.contribution,
        groupRoomNights,
        settings,
      }),
    },
    warnings: collectWarnings(nights, input),
  };
}

/**
 * The lowest flat room rate at which the group still breaks even
 * against the business it displaces.
 *
 * Solves netBenefit = 0 for the rate:
 *   roomNights x (rate x (1 - groupCommission) - variableCost)
 *     + ancillaryContribution - lostTransientContribution = 0
 *
 * Returns null when there are no group rooms to price, or when the
 * commission is 100% and the rate cancels out of the equation.
 */
export function breakevenRate({
  lostTransientContribution,
  ancillaryContribution: ancillary,
  groupRoomNights,
  settings,
}) {
  if (!(groupRoomNights > 0)) return null;

  const keepRate = 1 - pct(settings.groupCommissionPct);
  if (keepRate <= 0) return null;

  const required =
    lostTransientContribution - ancillary + settings.variableCostPerRoom * groupRoomNights;

  // A group whose ancillary spend already covers the displacement can be
  // taken at any rate; report zero rather than a negative rate.
  return atLeastZero(required / (keepRate * groupRoomNights));
}

function collectWarnings(nights, input) {
  const warnings = [];

  const overCapacity = nights.filter((n) => !n.fits);
  if (overCapacity.length) {
    warnings.push(
      `The block exceeds available rooms on ${overCapacity.length} night${
        overCapacity.length > 1 ? 's' : ''
      }. Those nights need a smaller block, a released allocation or an overbooking decision.`,
    );
  }

  if (nights.some((n) => n.onTheBooks > n.capacity)) {
    warnings.push('Rooms on the books exceed capacity on at least one night. Check the inputs.');
  }

  if (nights.some((n) => n.transientAdr > 0 && n.groupRate > n.transientAdr)) {
    warnings.push(
      'The group rate is above forecast transient ADR on at least one night, which is unusual — worth confirming the transient forecast is right.',
    );
  }

  if (!num(input.variableCostPerRoom)) {
    warnings.push(
      'Variable cost per occupied room is zero, so this compares revenue rather than contribution and will flatter the group.',
    );
  }

  if (!nights.length) warnings.push('Add at least one night to analyse.');

  return warnings;
}

/** Accept / marginal / decline, with a band around zero so near-ties are not oversold. */
export function verdict(totals, marginPct = 5) {
  const base = Math.abs(totals.lostTransientContribution) || Math.abs(totals.totalGroupContribution);
  const band = base * (marginPct / 100);
  if (totals.netBenefit > band) return 'accept';
  if (totals.netBenefit < -band) return 'decline';
  return 'marginal';
}
