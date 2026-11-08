import { EphemerisPoint, HorizonObstructionPoint, LunarLandingSite, MissionWindowSummary, CriteriaWeights } from '../types/lunar';

// Physical and astronomical constants
export const LUNAR_RADIUS_KM = 1737.4;
export const LUNAR_AXIAL_TILT_DEG = 1.5427; // Degrees relative to ecliptic normal
export const LUNAR_SYNODIC_PERIOD_DAYS = 29.530589; // Solar day/night cycle
export const LUNAR_DRACONIC_PERIOD_DAYS = 27.212220; // Libration in latitude
export const LUNAR_ANOMALISTIC_PERIOD_DAYS = 27.554551; // Libration in longitude
export const SOLAR_CONSTANT_WM2 = 1361.0; // Solar irradiance at 1 AU

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Reference epoch: 2026-01-01T00:00:00Z
const REF_EPOCH_MS = new Date('2026-01-01T00:00:00Z').getTime();

/**
 * Calculates the subsolar point (latitude and longitude on the Moon) for a given timestamp.
 */
export function getSubsolarPoint(timestampMs: number): { latDeg: number; lonDeg: number } {
  const daysSinceRef = (timestampMs - REF_EPOCH_MS) / (86400 * 1000);
  
  // Seasonal subsolar latitude variation (lunar year ~ 365.25 days)
  // Subsolar latitude reaches -1.54° during southern summer (favorable for South Pole illumination)
  const seasonPhase = (2 * Math.PI * (daysSinceRef + 45)) / 365.25;
  const latDeg = -LUNAR_AXIAL_TILT_DEG * Math.cos(seasonPhase);
  
  // Subsolar longitude sweeps westward (decreases) by 360° every synodic month (29.53 days)
  const synodicCycles = daysSinceRef / LUNAR_SYNODIC_PERIOD_DAYS;
  let lonDeg = (180 - (synodicCycles * 360)) % 360;
  if (lonDeg > 180) lonDeg -= 360;
  if (lonDeg < -180) lonDeg += 360;

  return { latDeg, lonDeg };
}

/**
 * Calculates the sub-Earth point on the Moon (accounting for lunar libration)
 */
export function getSubEarthPoint(timestampMs: number): { latDeg: number; lonDeg: number } {
  const daysSinceRef = (timestampMs - REF_EPOCH_MS) / (86400 * 1000);
  
  // Optical libration in latitude: amplitude ~6.68°, period 27.212 days
  const latPhase = (2 * Math.PI * (daysSinceRef + 12)) / LUNAR_DRACONIC_PERIOD_DAYS;
  const latDeg = 6.68 * Math.sin(latPhase);

  // Optical libration in longitude: amplitude ~7.92°, period 27.555 days
  const lonPhase = (2 * Math.PI * (daysSinceRef + 5)) / LUNAR_ANOMALISTIC_PERIOD_DAYS;
  const lonDeg = 7.92 * Math.sin(lonPhase);

  return { latDeg, lonDeg };
}

/**
 * Calculates current lunar phase and illuminated disk percentage as seen from Earth
 */
export function getLunarPhase(timestampMs: number): {
  illuminationPct: number;
  phaseName: string;
  phaseAngleDeg: number;
} {
  const subsolar = getSubsolarPoint(timestampMs);
  const subearth = getSubEarthPoint(timestampMs);

  let phaseAngle = (subsolar.lonDeg - subearth.lonDeg + 360) % 360;
  // Phase angle: 0° = New Moon (Sun on far side), 180° = Full Moon (Sun on near side)
  const rad = phaseAngle * DEG2RAD;
  // Fraction illuminated from Earth: (1 - cos(phaseAngle)) / 2
  const illuminationPct = Math.round(((1 - Math.cos(rad)) / 2) * 100);

  let phaseName = 'Full Moon';
  if (phaseAngle < 22.5 || phaseAngle >= 337.5) phaseName = 'New Moon';
  else if (phaseAngle < 67.5) phaseName = 'Waxing Crescent';
  else if (phaseAngle < 112.5) phaseName = 'First Quarter';
  else if (phaseAngle < 157.5) phaseName = 'Waxing Gibbous';
  else if (phaseAngle < 202.5) phaseName = 'Full Moon';
  else if (phaseAngle < 247.5) phaseName = 'Waning Gibbous';
  else if (phaseAngle < 292.5) phaseName = 'Third Quarter';
  else phaseName = 'Waning Crescent';

  return {
    illuminationPct,
    phaseName,
    phaseAngleDeg: Math.round(phaseAngle)
  };
}

/**
 * Returns the local topographic horizon elevation obstruction at a given azimuth (0-360°).
 */
export function getHorizonObstructionAtAzimuth(
  azimuthDeg: number,
  horizonProfile: HorizonObstructionPoint[],
  elevationMeters: number
): number {
  // Geometric dip of horizon due to elevation above lunar sphere
  // dip ≈ sqrt(2 * h / R) radians
  const elevationKm = Math.max(0, elevationMeters) / 1000;
  const geometricDipDeg = -(Math.sqrt((2 * elevationKm) / LUNAR_RADIUS_KM) * RAD2DEG);

  if (!horizonProfile || horizonProfile.length === 0) {
    return geometricDipDeg;
  }

  // Normalize azimuth to 0..360
  const normalizedAz = ((azimuthDeg % 360) + 360) % 360;

  // Find surrounding obstruction points
  let prevPoint = horizonProfile[horizonProfile.length - 1];
  let nextPoint = horizonProfile[0];

  for (let i = 0; i < horizonProfile.length; i++) {
    if (horizonProfile[i].azimuth >= normalizedAz) {
      nextPoint = horizonProfile[i];
      prevPoint = horizonProfile[(i - 1 + horizonProfile.length) % horizonProfile.length];
      break;
    }
  }

  // Interpolate between prev and next
  let azDiff = nextPoint.azimuth - prevPoint.azimuth;
  if (azDiff < 0) azDiff += 360;

  let currentDiff = normalizedAz - prevPoint.azimuth;
  if (currentDiff < 0) currentDiff += 360;

  const t = azDiff === 0 ? 0 : currentDiff / azDiff;
  const terrainObstructionDeg = prevPoint.elevation + t * (nextPoint.elevation - prevPoint.elevation);

  return Math.max(geometricDipDeg, terrainObstructionDeg);
}

/**
 * Calculates local horizontal coordinates (elevation and azimuth) of a celestial body (Sun or Earth)
 * given its sub-body coordinates on the Moon.
 */
export function getLocalCoordinates(
  siteLatDeg: number,
  siteLonDeg: number,
  targetLatDeg: number,
  targetLonDeg: number
): { elevationDeg: number; azimuthDeg: number } {
  const phi = siteLatDeg * DEG2RAD;
  const lambda = siteLonDeg * DEG2RAD;
  const delta = targetLatDeg * DEG2RAD;
  const lambdaTarget = targetLonDeg * DEG2RAD;

  const hourAngle = lambda - lambdaTarget;

  // Calculate elevation angle h
  const sinH = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const clampedSinH = Math.max(-1, Math.min(1, sinH));
  const elevationDeg = Math.asin(clampedSinH) * RAD2DEG;

  // Calculate azimuth angle A
  const cosH = Math.cos(elevationDeg * DEG2RAD);
  let azimuthDeg = 0;

  if (Math.abs(cosH) > 1e-6) {
    const cosA = (Math.sin(delta) - Math.sin(phi) * sinH) / (Math.cos(phi) * cosH);
    const clampedCosA = Math.max(-1, Math.min(1, cosA));
    const rawA = Math.acos(clampedCosA) * RAD2DEG;

    // Resolve quadrant
    if (Math.sin(hourAngle) > 0) {
      azimuthDeg = 360 - rawA;
    } else {
      azimuthDeg = rawA;
    }
  }

  return { elevationDeg, azimuthDeg: (azimuthDeg + 360) % 360 };
}

/**
 * Computes an instantaneous ephemeris point for a landing site.
 */
export function computeEphemerisPoint(
  site: LunarLandingSite,
  timestampMs: number
): EphemerisPoint {
  const subsolar = getSubsolarPoint(timestampMs);
  const subearth = getSubEarthPoint(timestampMs);

  const sunCoords = getLocalCoordinates(site.latitude, site.longitude, subsolar.latDeg, subsolar.lonDeg);
  const earthCoords = getLocalCoordinates(site.latitude, site.longitude, subearth.latDeg, subearth.lonDeg);

  const sunHorizonObstruction = getHorizonObstructionAtAzimuth(
    sunCoords.azimuthDeg,
    site.horizonProfile,
    site.elevationMeters
  );

  const earthHorizonObstruction = getHorizonObstructionAtAzimuth(
    earthCoords.azimuthDeg,
    site.horizonProfile,
    site.elevationMeters
  );

  const isSunlit = sunCoords.elevationDeg >= sunHorizonObstruction;
  const isEarthVisible = earthCoords.elevationDeg >= earthHorizonObstruction;

  // Solar flux calculation (accounting for graze angle on solar arrays)
  let solarFluxWm2 = 0;
  let powerPotentialPct = 0;

  if (isSunlit) {
    // Near lunar south pole, solar arrays are typically vertical cylinders or tracking panels
    // that face the low-elevation grazing Sun directly!
    // Minimum array incidence angle is close to normal for vertical tracking panels
    const effectiveIncidentAngleRad = Math.max(0, (90 - Math.abs(sunCoords.elevationDeg))) * DEG2RAD;
    const arrayOrientationBonus = Math.min(1.0, 0.4 + 0.6 * Math.sin(effectiveIncidentAngleRad));
    solarFluxWm2 = SOLAR_CONSTANT_WM2 * arrayOrientationBonus;
    powerPotentialPct = Math.round((solarFluxWm2 / SOLAR_CONSTANT_WM2) * 100);
  }

  // Communication link margin (dB)
  let commSignalMarginDb = -20;
  if (isEarthVisible) {
    // 3 dB to 14 dB depending on elevation angle above crater rim
    const clearanceDeg = earthCoords.elevationDeg - earthHorizonObstruction;
    commSignalMarginDb = Math.min(14.5, Math.max(3.0, 3.0 + clearanceDeg * 1.8));
  }

  return {
    timestamp: timestampMs,
    dateIso: new Date(timestampMs).toISOString(),
    sunElevationDeg: Number(sunCoords.elevationDeg.toFixed(2)),
    sunAzimuthDeg: Number(sunCoords.azimuthDeg.toFixed(1)),
    earthElevationDeg: Number(earthCoords.elevationDeg.toFixed(2)),
    earthAzimuthDeg: Number(earthCoords.azimuthDeg.toFixed(1)),
    isSunlit,
    isEarthVisible,
    solarFluxWm2: Math.round(solarFluxWm2),
    powerPotentialPct,
    commSignalMarginDb: Number(commSignalMarginDb.toFixed(1))
  };
}

/**
 * Generates an ephemeris timeline for a site over a mission duration.
 */
export function generateEphemerisTimeline(
  site: LunarLandingSite,
  startDateMs: number,
  durationDays: number,
  stepHours: number = 2
): EphemerisPoint[] {
  const points: EphemerisPoint[] = [];
  const totalHours = durationDays * 24;
  const totalSteps = Math.floor(totalHours / stepHours);

  for (let i = 0; i <= totalSteps; i++) {
    const currentMs = startDateMs + i * stepHours * 3600 * 1000;
    points.push(computeEphemerisPoint(site, currentMs));
  }

  return points;
}

/**
 * Summarizes operational illumination & communication windows from a generated timeline.
 */
export function summarizeMissionWindows(
  timeline: EphemerisPoint[],
  currentTimestampMs: number
): MissionWindowSummary {
  if (timeline.length === 0) {
    return {
      totalHours: 0,
      sunlitHours: 0,
      sunlitPct: 0,
      earthVisibleHours: 0,
      earthVisiblePct: 0,
      concurrentHours: 0,
      concurrentPct: 0,
      maxContinuousDarkHours: 0,
      nextSunsetHours: 0,
      nextSunriseHours: 0,
      nextEarthsetHours: 0,
      nextEarthriseHours: 0
    };
  }

  const stepMs = timeline.length > 1 ? timeline[1].timestamp - timeline[0].timestamp : 3600 * 1000;
  const stepHours = stepMs / (3600 * 1000);
  const totalHours = (timeline.length - 1) * stepHours;

  let sunlitCount = 0;
  let earthVisibleCount = 0;
  let concurrentCount = 0;

  let maxDarkStreak = 0;
  let currentDarkStreak = 0;

  for (const p of timeline) {
    if (p.isSunlit) {
      sunlitCount++;
      if (currentDarkStreak > maxDarkStreak) {
        maxDarkStreak = currentDarkStreak;
      }
      currentDarkStreak = 0;
    } else {
      currentDarkStreak++;
    }

    if (p.isEarthVisible) earthVisibleCount++;
    if (p.isSunlit && p.isEarthVisible) concurrentCount++;
  }
  if (currentDarkStreak > maxDarkStreak) {
    maxDarkStreak = currentDarkStreak;
  }

  // Calculate next events relative to current timestamp
  let nextSunsetHours = 0;
  let nextSunriseHours = 0;
  let nextEarthsetHours = 0;
  let nextEarthriseHours = 0;

  const currentIndex = timeline.findIndex(p => p.timestamp >= currentTimestampMs);
  const startIdx = currentIndex >= 0 ? currentIndex : 0;
  const currentPt = timeline[startIdx];

  // Look ahead for sunset/sunrise
  let foundSunEvent = false;
  for (let i = startIdx + 1; i < timeline.length; i++) {
    const pt = timeline[i];
    const hoursAhead = (pt.timestamp - currentPt.timestamp) / (3600 * 1000);

    if (currentPt.isSunlit && !pt.isSunlit && !foundSunEvent) {
      nextSunsetHours = Math.round(hoursAhead);
      foundSunEvent = true;
    } else if (!currentPt.isSunlit && pt.isSunlit && !foundSunEvent) {
      nextSunriseHours = Math.round(hoursAhead);
      foundSunEvent = true;
    }
  }

  // Look ahead for earthset/earthrise
  let foundEarthEvent = false;
  for (let i = startIdx + 1; i < timeline.length; i++) {
    const pt = timeline[i];
    const hoursAhead = (pt.timestamp - currentPt.timestamp) / (3600 * 1000);

    if (currentPt.isEarthVisible && !pt.isEarthVisible && !foundEarthEvent) {
      nextEarthsetHours = Math.round(hoursAhead);
      foundEarthEvent = true;
    } else if (!currentPt.isEarthVisible && pt.isEarthVisible && !foundEarthEvent) {
      nextEarthriseHours = Math.round(hoursAhead);
      foundEarthEvent = true;
    }
  }

  return {
    totalHours: Math.round(totalHours),
    sunlitHours: Math.round(sunlitCount * stepHours),
    sunlitPct: Math.round((sunlitCount / timeline.length) * 100),
    earthVisibleHours: Math.round(earthVisibleCount * stepHours),
    earthVisiblePct: Math.round((earthVisibleCount / timeline.length) * 100),
    concurrentHours: Math.round(concurrentCount * stepHours),
    concurrentPct: Math.round((concurrentCount / timeline.length) * 100),
    maxContinuousDarkHours: Math.round(maxDarkStreak * stepHours),
    nextSunsetHours,
    nextSunriseHours,
    nextEarthsetHours,
    nextEarthriseHours
  };
}

/**
 * Computes a standardized NASA multi-criteria suitability score (0-100)
 */
export function calculateSiteSuitabilityScore(
  site: LunarLandingSite,
  weights: CriteriaWeights = { power: 25, comms: 25, slopeSafety: 20, waterIceAccess: 15, thermalStability: 15 }
): {
  overallScore: number;
  breakdown: {
    powerScore: number;
    commsScore: number;
    slopeScore: number;
    waterIceScore: number;
    thermalScore: number;
  }
} {
  // 1. Power score based on annual illumination
  const powerScore = Math.min(100, Math.max(0, site.annualIlluminationPct));

  // 2. Comms score based on earth line-of-sight
  const commsScore = Math.min(100, Math.max(0, site.earthVisibilityPct));

  // 3. Slope score: NASA criteria <=10° is nominal, >15° hazardous
  let slopeScore = 0;
  if (site.meanSlopeDeg <= 5) slopeScore = 100;
  else if (site.meanSlopeDeg <= 10) slopeScore = 100 - (site.meanSlopeDeg - 5) * 6; // 70 to 100
  else if (site.meanSlopeDeg <= 15) slopeScore = 70 - (site.meanSlopeDeg - 10) * 8; // 30 to 70
  else slopeScore = Math.max(0, 30 - (site.meanSlopeDeg - 15) * 4);

  // 4. Water ice proximity score: closer to PSR is higher scientific return
  // <= 1km: 100, 5km: 75, 15km: 40, >30km: 15
  let waterIceScore = 0;
  if (site.distanceToPsrKm <= 1.0) waterIceScore = 100;
  else if (site.distanceToPsrKm <= 5.0) waterIceScore = 100 - (site.distanceToPsrKm - 1) * 6.25;
  else if (site.distanceToPsrKm <= 20.0) waterIceScore = 75 - (site.distanceToPsrKm - 5) * 2.5;
  else waterIceScore = Math.max(10, 37.5 - (site.distanceToPsrKm - 20) * 0.8);

  // 5. Thermal stability score: lower temperature swing is easier on rover & lander subsystems
  const tempDelta = Math.abs(site.temperatureRangeK[1] - site.temperatureRangeK[0]);
  // Near south pole, temp swings are ~100K-220K (120K delta). Equator is 100K to 390K (290K delta).
  const thermalScore = Math.min(100, Math.max(20, 100 - ((tempDelta - 80) / 220) * 80));

  const totalWeight = weights.power + weights.comms + weights.slopeSafety + weights.waterIceAccess + weights.thermalStability;
  const normalizedTotalWeight = totalWeight > 0 ? totalWeight : 100;

  const weightedSum = (
    powerScore * weights.power +
    commsScore * weights.comms +
    slopeScore * weights.slopeSafety +
    waterIceScore * weights.waterIceAccess +
    thermalScore * weights.thermalStability
  );

  const overallScore = Math.round(weightedSum / normalizedTotalWeight);

  return {
    overallScore,
    breakdown: {
      powerScore: Math.round(powerScore),
      commsScore: Math.round(commsScore),
      slopeScore: Math.round(slopeScore),
      waterIceScore: Math.round(waterIceScore),
      thermalScore: Math.round(thermalScore)
    }
  };
}
