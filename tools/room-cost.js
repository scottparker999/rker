/* ==========================================================
   What a room costs, and what you can actually sell it for.

   Cost per occupied room is the number everyone quotes and it
   is close to useless for the decision it gets used for. It
   divides fixed cost by occupied rooms, so it FALLS as
   occupancy rises -- an arithmetic artefact, not a saving. Then
   somebody says "never sell below CPOR", which is wrong. You
   should never sell below MARGINAL cost, and the gap between
   the two is usually enormous.

   Two structural facts drive everything here:

   1. Linen, amenities and the departure clean are consumed per
      STAY, not per night. Energy, water and stayover servicing
      are consumed per NIGHT. So the cost per night of a stay
      depends on how long the stay is:

        cost per night = perNight + perStay / nights

      A one-nighter carries a whole changeover. A seven-night
      stay amortises it over seven. Which means the rate floor
      is not one number, it is a curve.

   2. There are two honest floors, over two horizons. Tonight,
      with the roster already published and paid, cleaning
      labour is sunk and the floor is just the consumables the
      room burns. Over a season the roster flexes with volume,
      so labour is genuinely variable and belongs in the floor.
      Both are reported, because they answer different
      questions and using one for the other's job is how rooms
      get sold at a loss.

   See housekeeping.js for the short-run side in detail -- the
   step behaviour of a rostered shift is modelled there.

   Pure functions, no DOM, no dependencies -- see
   room-cost.test.mjs.
   ========================================================== */

const atLeastZero = (n) => (n > 0 ? n : 0);

const pct = (n) => (Number(n) || 0) / 100;

const num = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/** How often stayovers get serviced, as a share of stayover nights. */
export const SERVICE_FREQUENCIES = [
  { key: 'daily', label: 'Every day', factor: 1 },
  { key: 'alternate', label: 'Every second day', factor: 0.5 },
  { key: 'third', label: 'Every third day', factor: 1 / 3 },
  { key: 'none', label: 'On request only', factor: 0 },
];

export function serviceFactor(key) {
  const found = SERVICE_FREQUENCIES.find((f) => f.key === key);
  return found ? found.factor : 1;
}

/**
 * What one linen changeover actually costs.
 *
 * Three parts, and most budgets only ever count the first:
 *
 *   laundry  -- washing it, in-house or sent out
 *   wear     -- linen has a finite number of washes in it, so
 *               every changeover consumes a slice of the set
 *   loss     -- stained, torn, taken home, never came back
 *
 * Getting this wrong is how a linen replacement budget ends up
 * being a surprise every year instead of a line item.
 */
export function linenPerChangeover(linen) {
  // Note: a default parameter catches undefined but not null, and null is
  // exactly what an empty form field deserialises to.
  const l = linen || {};
  const setCost = atLeastZero(num(l.setCost));
  const washes = atLeastZero(num(l.washesBeforeRetire));
  const laundry = atLeastZero(num(l.laundryPerSet));
  const lossPerWash = pct(l.lossPctPerWash);

  const wear = washes > 0 ? setCost / washes : 0;
  const loss = setCost * lossPerWash;

  return { laundry, wear, loss, total: laundry + wear + loss };
}

/**
 * Costs incurred once per stay, whatever its length.
 *
 * `includeLabour` is the horizon switch: false gives tonight's
 * position with the roster already paid for, true gives the
 * season view where staffing follows volume.
 */
export function perStayCost(input = {}, includeLabour = true) {
  const linen = linenPerChangeover(input.linen);
  const cleanMinutes = atLeastZero(num(input.departureCleanMinutes));
  const labour = includeLabour
    ? (cleanMinutes / 60) * atLeastZero(num(input.loadedHourlyRate))
    : 0;

  const amenities = atLeastZero(num(input.amenitiesPerStay)) * (1 + pct(input.amenityWastePct));
  const other = atLeastZero(num(input.otherPerStay));

  return {
    labour,
    linen: linen.total,
    amenities,
    other,
    total: labour + linen.total + amenities + other,
  };
}

/**
 * Costs incurred every night the room is occupied.
 */
export function perNightCost(input = {}, includeLabour = true) {
  const factor = serviceFactor(input.serviceFrequency);
  const serviced = factor * (1 - pct(input.optOutPct));
  const stayoverMinutes = atLeastZero(num(input.stayoverMinutes)) * serviced;
  const labour = includeLabour
    ? (stayoverMinutes / 60) * atLeastZero(num(input.loadedHourlyRate))
    : 0;

  // Mid-stay linen changes are usually towels rather than a full strip,
  // so they cost a fraction of a changeover and only every so often.
  const changeEvery = atLeastZero(num(input.linen && input.linen.changeEveryNights));
  const midStayLinen = changeEvery > 0
    ? (linenPerChangeover(input.linen).total * pct(input.linen.midStayFractionPct)) / changeEvery
    : 0;

  const energy = atLeastZero(num(input.marginalKwhPerNight))
    * atLeastZero(num(input.tariffPerKwh))
    * (num(input.seasonalMultiplier) || 1);

  const water = (atLeastZero(num(input.litresPerNight)) / 1000)
    * atLeastZero(num(input.costPerKilolitre));

  const amenities = atLeastZero(num(input.amenitiesPerNight)) * (1 + pct(input.amenityWastePct));
  const other = atLeastZero(num(input.otherPerNight));

  return {
    labour,
    linen: midStayLinen,
    energy,
    water,
    amenities,
    other,
    total: labour + midStayLinen + energy + water + amenities + other,
  };
}

/**
 * The rate floor for a stay of a given length.
 *
 *   perNight + perStay / nights
 *
 * Below this you are paying for the privilege of having the guest.
 */
export function floorForStay(input, nights, includeLabour = true) {
  const n = atLeastZero(num(nights));
  if (!(n > 0)) return null;
  const stay = perStayCost(input, includeLabour);
  const night = perNightCost(input, includeLabour);
  return {
    nights: n,
    perNight: night.total + stay.total / n,
    stayTotal: stay.total + night.total * n,
  };
}

/**
 * Cost per occupied room at a given occupancy -- the number people quote.
 *
 * Worth writing out, because the shape is the whole point:
 *
 *   CPOR = perNight + perStay / ALOS + fixed / occupiedRoomNights
 *
 * Only the last term moves with occupancy. That term is an allocation,
 * not a cost you avoid by selling fewer rooms, which is exactly why
 * CPOR makes a full house look cheap and an empty one look ruinous.
 */
export function cporAt(input, occupancyPct) {
  const rooms = atLeastZero(num(input.rooms));
  const days = atLeastZero(num(input.periodDays));
  const occupancy = Math.min(1, atLeastZero(pct(occupancyPct)));
  const alos = atLeastZero(num(input.averageLengthOfStay));

  const occupiedRoomNights = rooms * days * occupancy;
  if (!(occupiedRoomNights > 0) || !(alos > 0)) return null;

  const stay = perStayCost(input, true);
  const night = perNightCost(input, true);
  const stays = occupiedRoomNights / alos;

  const variableTotal = stays * stay.total + occupiedRoomNights * night.total;
  const fixedTotal = atLeastZero(num(input.fixedCostsPerPeriod));

  return {
    occupancyPct: occupancy * 100,
    occupiedRoomNights,
    stays,
    variablePerNight: variableTotal / occupiedRoomNights,
    fixedPerNight: fixedTotal / occupiedRoomNights,
    cpor: (variableTotal + fixedTotal) / occupiedRoomNights,
  };
}

const DEFAULT_STAY_LENGTHS = [1, 2, 3, 5, 7, 14];
const DEFAULT_OCCUPANCIES = [40, 50, 60, 70, 80, 90, 100];

export function analyse(input = {}) {
  const linen = linenPerChangeover(input.linen);

  const stayLong = perStayCost(input, true);
  const nightLong = perNightCost(input, true);
  const stayShort = perStayCost(input, false);
  const nightShort = perNightCost(input, false);

  const lengths = (input.stayLengths && input.stayLengths.length)
    ? input.stayLengths.map(num).filter((n) => n > 0)
    : DEFAULT_STAY_LENGTHS;

  const floors = lengths.map((n) => ({
    nights: n,
    longRun: nightLong.total + stayLong.total / n,
    shortRun: nightShort.total + stayShort.total / n,
  }));

  const cpor = cporAt(input, input.occupancyPct);
  const cporCurve = DEFAULT_OCCUPANCIES
    .map((o) => cporAt(input, o))
    .filter(Boolean);

  // Annual linen consequences, which is the figure that actually lands
  // in a budget conversation.
  const rooms = atLeastZero(num(input.rooms));
  const days = atLeastZero(num(input.periodDays));
  const alos = atLeastZero(num(input.averageLengthOfStay));
  const occupied = rooms * days * Math.min(1, atLeastZero(pct(input.occupancyPct)));
  const changeovers = alos > 0 ? occupied / alos : 0;
  const washes = atLeastZero(num(input.linen && input.linen.washesBeforeRetire));
  const setCost = atLeastZero(num(input.linen && input.linen.setCost));
  const par = atLeastZero(num(input.linen && input.linen.parLevel));

  return {
    linen,
    perStay: { long: stayLong, short: stayShort },
    perNight: { long: nightLong, short: nightShort },
    floors,
    cpor,
    cporCurve,
    linenProgramme: {
      changeovers,
      replacementCost: washes > 0 ? (changeovers / washes) * setCost : 0,
      lossCost: changeovers * linen.loss,
      capitalInPar: par * rooms * setCost,
    },
    // The gap that the whole tool exists to show.
    gap: cpor
      ? {
        cpor: cpor.cpor,
        marginalAtAlos: nightLong.total + (alos > 0 ? stayLong.total / alos : 0),
        overstatement: cpor.cpor - (nightLong.total + (alos > 0 ? stayLong.total / alos : 0)),
      }
      : null,
    warnings: collectWarnings(input, { stayLong, nightLong, cpor, linen }),
  };
}

function collectWarnings(input, { stayLong, nightLong, cpor, linen }) {
  const warnings = [];

  if (!num(input.loadedHourlyRate)) {
    warnings.push(
      'No loaded hourly rate entered, so cleaning labour is costing nothing and both floors are understated.',
    );
  }

  if (!num(input.linen && input.linen.washesBeforeRetire)) {
    warnings.push(
      'Washes before retirement is zero, so linen wear is not being counted — only the laundry bill is, which is roughly half the real cost.',
    );
  }

  if (!num(input.fixedCostsPerPeriod)) {
    warnings.push(
      'No fixed costs entered, so cost per occupied room equals marginal cost and the comparison this tool is built around disappears.',
    );
  }

  const alos = num(input.averageLengthOfStay);
  if (alos > 0 && alos < 1) {
    warnings.push('Average length of stay is below one night, which cannot happen.');
  }

  if (cpor && cpor.occupancyPct >= 100) {
    warnings.push('Occupancy is at 100%, which no property sustains — the fixed allocation here is the most flattering it can be.');
  }

  if (linen.total > 0 && linen.wear === 0 && linen.loss === 0) {
    warnings.push('Linen is costing only its laundry. Wear and loss are real and recurring, and leaving them out understates every floor.');
  }

  return warnings;
}

/** How much a low rate is really costing, against the right floor. */
export function assessRate(rate, floors, nights, horizon = 'longRun') {
  const target = floors.find((f) => f.nights === num(nights)) || floors[0];
  if (!target) return null;
  const floor = target[horizon];
  const r = num(rate);
  return {
    rate: r,
    floor,
    margin: r - floor,
    coversFloor: r >= floor,
    // Where this rate does become viable, if it doesn't at this length.
    viableFromNights: floors.find((f) => r >= f[horizon])?.nights ?? null,
  };
}
