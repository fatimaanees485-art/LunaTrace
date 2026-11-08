/**
 * Standard Lunar Lander Safety Tolerances & Slope Analysis
 * Based on NASA Artemis HLS Requirements, Apollo Flight Evaluations, and CLPS Payload User Guides.
 */

export interface LanderSafetyProfile {
  id: string;
  name: string;
  subTitle: string;
  maxSafeSlopeDeg: number; // Nominal touchdown limit (green)
  cautionSlopeDeg: number; // Intermediate limit requiring HDA hazard avoidance (amber)
  nonTraversableSlopeDeg: number; // Hard abort / tip-over hazard threshold (red)
  maxSurfaceRoughnessCm: number;
  description: string;
}

export const STANDARD_LANDER_PROFILES: LanderSafetyProfile[] = [
  {
    id: 'artemis-hls',
    name: 'Artemis HLS (Starship / Blue Moon)',
    subTitle: 'Human Landing System Standard',
    maxSafeSlopeDeg: 8.0,
    cautionSlopeDeg: 12.0,
    nonTraversableSlopeDeg: 12.0,
    maxSurfaceRoughnessCm: 30,
    description: 'Human-rated landing gear with dynamic crushable honeycomb attenuators. Requires slope ≤8° for nominal crew stability; slopes >12° risk center-of-mass tip-over.'
  },
  {
    id: 'apollo-lm',
    name: 'Apollo LM Standard (Historic)',
    subTitle: 'Apollo Lunar Module Baseline',
    maxSafeSlopeDeg: 6.0,
    cautionSlopeDeg: 10.0,
    nonTraversableSlopeDeg: 10.0,
    maxSurfaceRoughnessCm: 25,
    description: 'Four-legged landing gear with crushable aluminum cartridge struts. Rated for ≤6° slopes; Apollo 15 touched down on an ~11° local slope at the edge of a depression.'
  },
  {
    id: 'clps-robotic',
    name: 'CLPS Robotic / VIPER Rover',
    subTitle: 'Commercial Lunar Payload Services',
    maxSafeSlopeDeg: 10.0,
    cautionSlopeDeg: 15.0,
    nonTraversableSlopeDeg: 15.0,
    maxSurfaceRoughnessCm: 40,
    description: 'Autonomous small-to-medium robotic landers and rovers. Slopes ≤10° are ideal for touchdown and ramp egress. Slopes >15° cause rover wheel slippage and roll hazards.'
  },
  {
    id: 'steep-terrain-scout',
    name: 'Extreme Terrain Anchoring Scout',
    subTitle: 'Tethered / Micro-Cold Trap Probes',
    maxSafeSlopeDeg: 15.0,
    cautionSlopeDeg: 22.0,
    nonTraversableSlopeDeg: 22.0,
    maxSurfaceRoughnessCm: 60,
    description: 'Specialized rappelling or tethered micro-rovers engineered for crater wall descents and cold-trap sampling up to 22° gradients.'
  }
];

export type SlopeVisualizationMode = 'safety_bands' | 'continuous_intensity';

/**
 * Classifies a local slope angle into lander safety status
 */
export function classifySlope(
  slopeDeg: number,
  profile: LanderSafetyProfile
): {
  status: 'safe' | 'caution' | 'hazardous';
  label: string;
  colorHex: string;
  tipOverRiskPct: number;
} {
  if (slopeDeg <= profile.maxSafeSlopeDeg) {
    const risk = Math.min(15, Math.round((slopeDeg / profile.maxSafeSlopeDeg) * 15));
    return {
      status: 'safe',
      label: 'TRAVERSABLE (SAFE TOUCHDOWN)',
      colorHex: '#10b981', // Emerald 500
      tipOverRiskPct: risk
    };
  } else if (slopeDeg <= profile.cautionSlopeDeg) {
    const range = profile.cautionSlopeDeg - profile.maxSafeSlopeDeg;
    const norm = (slopeDeg - profile.maxSafeSlopeDeg) / Math.max(0.1, range);
    const risk = Math.round(15 + norm * 45);
    return {
      status: 'caution',
      label: 'CAUTION (MARGINAL STABILITY)',
      colorHex: '#f59e0b', // Amber 500
      tipOverRiskPct: risk
    };
  } else {
    const excess = slopeDeg - profile.cautionSlopeDeg;
    const risk = Math.min(99, Math.round(60 + excess * 3));
    return {
      status: 'hazardous',
      label: 'NON-TRAVERSABLE (CRITICAL TIP-OVER HAZARD)',
      colorHex: '#ef4444', // Red 500
      tipOverRiskPct: risk
    };
  }
}
