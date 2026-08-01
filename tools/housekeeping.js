/* ==========================================================
   Housekeeping labour, driven by departures.

   Rosters get built in front of an occupancy forecast, and
   occupancy is the wrong number. It says how many rooms are
   full. It says nothing about how many changed hands, and
   changing hands is the work: a checkout clean runs two to
   three times a stayover service.

   Two consequences fall out of that, and both are modelled
   here:

   1. Two days at identical occupancy can differ by half again
      in labour, purely on departure count.
   2. Average length of stay is a COST lever, not just a revenue
      metric. For fixed room nights, departures = roomNights /
      ALOS, so longer stays trade expensive checkout cleans for
      cheap stayover services.

   The second only holds while a departure clean costs more than
   the stayover servicing it replaces. Service daily and
   thoroughly with a quick turnover and it inverts -- longer
   stays cost more. alosThreshold() finds that line, and the
   tool says which side you are on rather than assuming.

   Pure functions, no DOM, no dependencies -- see
   housekeeping.test.mjs.
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
 * Blend clean times across unit types by their share of departures.
 *
 * A cabin and a powered site are not the same job. Shares are of
 * DEPARTURES rather than of stock, because departures are what
 * generates the work.
 */
export function blendedMinutes(unitTypes) {
  const types = Array.isArray(unitTypes) ? unitTypes : [];
  let departure = 0;
  let stayover = 0;
  let share = 0;
  for (const t of types) {
    const s = pct(t && t.sharePct);
    share += s;
    departure += s * atLeastZero(num(t && t.departureMinutes));
    stayover += s * atLeastZero(num(t && t.stayoverMinutes));
  }
  return { departureMinutes: departure, stayoverMinutes: stayover, shareTotal: share * 100 };
}

/**
 * Weekend and public holiday loading, taken from the date's weekday
 * unless the day carries an explicit override.
 */
export function penaltyMultiplier(day, globals) {
  if (day && day.penaltyOverride !== '' && day.penaltyOverride != null) {
    const override = num(day.penaltyOverride);
    if (override > 0) return override;
  }
  const date = day && day.date ? new Date(`${day.date}T00:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return 1;
  const weekday = date.getUTCDay(); // 0 Sun .. 6 Sat
  if (weekday === 6) return num(globals.saturdayMultiplier) || 1;
  if (weekday === 0) return num(globals.sundayMultiplier) || 1;
  return 1;
}

/**
 * One day of the roster.
 *
 * Stayovers are derived, never entered -- occupied tonight less
 * arrivals today is definitionally who stayed through.
 */
export function evaluateDay(day, globals, blended) {
  const occupied = atLeastZero(num(day.occupied));
  const arrivals = atLeastZero(num(day.arrivals));
  const departures = atLeastZero(num(day.departures));
  const stayovers = atLeastZero(occupied - arrivals);

  const factor = serviceFactor(globals.serviceFrequency);
  const servicedStayovers = stayovers * factor * (1 - pct(globals.optOutPct));

  const departureMinutes = departures * blended.departureMinutes;
  const stayoverMinutes = servicedStayovers * blended.stayoverMinutes;
  const fixedMinutes = atLeastZero(num(globals.fixedDailyMinutes));
  const totalMinutes = departureMinutes + stayoverMinutes + fixedMinutes;

  const productiveHours = totalMinutes / 60;
  // Breaks, briefing, walking between units -- nobody cleans for eight
  // straight hours, and rostering as though they do guarantees a shortfall.
  const productivity = Math.min(1, Math.max(0.05, pct(globals.productivityPct) || 1));
  const rosteredHours = productiveHours / productivity;

  const shiftLength = Math.max(0.5, num(globals.shiftHours) || 8);
  const staffOnShift = rosteredHours > 0 ? Math.ceil(rosteredHours / shiftLength) : 0;
  const paidHours = staffOnShift * shiftLength;
  const slackHours = atLeastZero(paidHours - rosteredHours);

  const multiplier = penaltyMultiplier(day, globals);
  const hourlyCost = num(globals.baseHourlyRate) * multiplier * (1 + pct(globals.oncostPct));
  const cost = paidHours * hourlyCost;

  return {
    date: day.date || '',
    occupied,
    arrivals,
    departures,
    stayovers,
    servicedStayovers,
    departureMinutes,
    stayoverMinutes,
    fixedMinutes,
    totalMinutes,
    productiveHours,
    rosteredHours,
    staffOnShift,
    paidHours,
    slackHours,
    penaltyMultiplier: multiplier,
    hourlyCost,
    cost,
    costPerOccupiedRoom: occupied > 0 ? cost / occupied : 0,
    // Share of the day's clean work created by rooms changing hands.
    departureShare: totalMinutes > 0 ? departureMinutes / totalMinutes : 0,
    // Occupancy on the previous night, implied by tonight's figures.
    impliedPriorOccupied: stayovers + departures,
  };
}

/**
 * The point at which length of stay stops being a cost lever.
 *
 * A longer stay removes one departure clean and adds stayover
 * servicing in its place. It only saves money while
 *
 *   departureMinutes > stayoverMinutes x serviceFactor x (1 - optOut)
 *
 * Returns the departure-clean minutes at which the two cancel, plus
 * which side of it the property currently sits.
 */
export function alosThreshold(globals, blended) {
  const factor = serviceFactor(globals.serviceFrequency);
  const perStayoverNight = blended.stayoverMinutes * factor * (1 - pct(globals.optOutPct));
  const margin = blended.departureMinutes - perStayoverNight;
  return {
    breakEvenDepartureMinutes: perStayoverNight,
    actualDepartureMinutes: blended.departureMinutes,
    marginPerAvoidedDeparture: margin,
    longerStaysSave: margin > 0,
  };
}

/**
 * What moving average length of stay is worth, holding room nights fixed.
 *
 * departures = roomNights / ALOS, so raising ALOS removes departure
 * cleans and adds stayover nights in their place.
 */
export function alosScenario(roomNights, currentAlos, targetAlos, globals, blended) {
  const nights = atLeastZero(num(roomNights));
  const from = num(currentAlos);
  const to = num(targetAlos);
  if (!(nights > 0) || !(from > 0) || !(to > 0)) return null;

  const factor = serviceFactor(globals.serviceFrequency);
  const optOut = 1 - pct(globals.optOutPct);
  const productivity = Math.min(1, Math.max(0.05, pct(globals.productivityPct) || 1));

  const minutesAt = (alos) => {
    const departures = nights / alos;
    const stayoverNights = atLeastZero(nights - departures);
    return departures * blended.departureMinutes
      + stayoverNights * factor * optOut * blended.stayoverMinutes;
  };

  const minutesFrom = minutesAt(from);
  const minutesTo = minutesAt(to);
  const hoursFrom = minutesFrom / 60 / productivity;
  const hoursTo = minutesTo / 60 / productivity;

  // Scenario cost uses the blended rate across the modelled period, so the
  // weekday/weekend mix already in the data carries through.
  const rate = num(globals.blendedHourlyCost);

  return {
    roomNights: nights,
    currentAlos: from,
    targetAlos: to,
    departuresFrom: nights / from,
    departuresTo: nights / to,
    departuresAvoided: nights / from - nights / to,
    hoursFrom,
    hoursTo,
    hoursSaved: hoursFrom - hoursTo,
    costSaved: (hoursFrom - hoursTo) * rate,
  };
}

/** Full analysis across the modelled period. */
export function analyse(input = {}) {
  const globals = {
    serviceFrequency: input.serviceFrequency || 'daily',
    optOutPct: input.optOutPct,
    fixedDailyMinutes: input.fixedDailyMinutes,
    productivityPct: input.productivityPct,
    shiftHours: input.shiftHours,
    baseHourlyRate: input.baseHourlyRate,
    oncostPct: input.oncostPct,
    saturdayMultiplier: input.saturdayMultiplier,
    sundayMultiplier: input.sundayMultiplier,
  };

  const blended = blendedMinutes(input.unitTypes);
  const days = (input.days || []).map((d) => evaluateDay(d, globals, blended));

  if (!days.length) {
    return { days, blended, totals: null, warnings: ['Add at least one day to model.'] };
  }

  const sum = (fn) => days.reduce((t, d) => t + fn(d), 0);

  const roomNights = sum((d) => d.occupied);
  const departures = sum((d) => d.departures);
  const cost = sum((d) => d.cost);
  const paidHours = sum((d) => d.paidHours);
  const rosteredHours = sum((d) => d.rosteredHours);
  const slackHours = sum((d) => d.slackHours);
  const departureMinutes = sum((d) => d.departureMinutes);
  const totalMinutes = sum((d) => d.totalMinutes);

  const staffCounts = days.map((d) => d.staffOnShift);
  const peakStaff = Math.max(...staffCounts);
  const averageStaff = staffCounts.reduce((a, b) => a + b, 0) / staffCounts.length;

  const alos = departures > 0 ? roomNights / departures : 0;
  const blendedHourlyCost = paidHours > 0 ? cost / paidHours : 0;

  // The argument, found in the user's own data: two days at (near) equal
  // occupancy with the widest gap in cost.
  const pair = widestMatchedPair(days);

  return {
    days,
    blended,
    totals: {
      roomNights,
      departures,
      arrivals: sum((d) => d.arrivals),
      stayovers: sum((d) => d.stayovers),
      cost,
      paidHours,
      rosteredHours,
      slackHours,
      slackCost: slackHours * blendedHourlyCost,
      costPerOccupiedRoom: roomNights > 0 ? cost / roomNights : 0,
      departureShare: totalMinutes > 0 ? departureMinutes / totalMinutes : 0,
      peakStaff,
      averageStaff,
      staffSpread: peakStaff - Math.min(...staffCounts),
      impliedAlos: alos,
      blendedHourlyCost,
    },
    matchedPair: pair,
    inversion: costOccupancyInversion(days),
    threshold: alosThreshold(globals, blended),
    warnings: collectWarnings(days, blended, input),
  };
}

/**
 * The busiest day and the dearest day, and whether they are the same day.
 *
 * When they are not, the argument makes itself: the day you rostered
 * heaviest for was not the day that cost the most.
 */
export function costOccupancyInversion(days) {
  const usable = days.filter((d) => d.occupied > 0);
  if (usable.length < 2) return null;
  const busiest = usable.reduce((a, b) => (b.occupied > a.occupied ? b : a));
  const dearest = usable.reduce((a, b) => (b.cost > a.cost ? b : a));
  const quietest = usable.reduce((a, b) => (b.occupied < a.occupied ? b : a));
  return {
    busiest,
    dearest,
    quietest,
    inverted: busiest !== dearest,
    // The sharpest form of it: the quietest day is also the dearest.
    quietestIsDearest: quietest === dearest,
  };
}

/**
 * Find two days at closely matched occupancy whose cost differs most.
 * This is the headline: the forecast said they were the same day.
 */
function widestMatchedPair(days, tolerance = 0.05) {
  let best = null;
  for (let i = 0; i < days.length; i += 1) {
    for (let j = i + 1; j < days.length; j += 1) {
      const a = days[i];
      const b = days[j];
      if (!(a.occupied > 0) || !(b.occupied > 0)) continue;
      const gap = Math.abs(a.occupied - b.occupied) / Math.max(a.occupied, b.occupied);
      if (gap > tolerance) continue;
      const diff = Math.abs(a.cost - b.cost);
      if (!best || diff > best.costDifference) {
        const [cheap, dear] = a.cost <= b.cost ? [a, b] : [b, a];
        best = {
          cheaper: cheap,
          dearer: dear,
          costDifference: diff,
          costRatio: cheap.cost > 0 ? dear.cost / cheap.cost : 0,
        };
      }
    }
  }
  return best;
}

function collectWarnings(days, blended, input) {
  const warnings = [];

  if (Math.abs(blended.shareTotal - 100) > 0.5) {
    warnings.push(
      `Unit type shares total ${Math.round(blended.shareTotal)}%, not 100%. Clean times are blended on those shares, so the workload is understated or overstated until they add up.`,
    );
  }

  const overArrived = days.filter((d) => d.arrivals > d.occupied);
  if (overArrived.length) {
    warnings.push(
      'Arrivals exceed rooms occupied on at least one day, which cannot happen — stayovers are derived as occupied less arrivals.',
    );
  }

  // Consecutive days should reconcile: last night's occupancy is this
  // morning's departures plus tonight's stayovers.
  for (let i = 1; i < days.length; i += 1) {
    const prior = days[i - 1];
    const today = days[i];
    if (prior.occupied > 0 && Math.abs(today.impliedPriorOccupied - prior.occupied) > 0.5) {
      warnings.push(
        `${today.date || 'A day'} implies ${Math.round(today.impliedPriorOccupied)} rooms occupied the night before, but the previous row says ${Math.round(prior.occupied)}. One of the two is wrong.`,
      );
      break;
    }
  }

  if (!num(input.baseHourlyRate)) {
    warnings.push('No hourly rate entered, so this reports hours only and every cost reads zero.');
  }

  if (blended.departureMinutes > 0 && blended.departureMinutes <= blended.stayoverMinutes) {
    warnings.push(
      'A departure clean is not longer than a stayover service here. That is unusual — check the minutes before trusting the length-of-stay figures.',
    );
  }

  return warnings;
}

/** Whether departures dominate the workload enough to roster on them. */
export function verdict(totals, threshold) {
  if (!totals) return 'incomplete';
  if (!threshold.longerStaysSave) return 'inverted';
  if (totals.departureShare > 0.6) return 'departure-driven';
  if (totals.departureShare > 0.35) return 'mixed';
  return 'stayover-driven';
}
