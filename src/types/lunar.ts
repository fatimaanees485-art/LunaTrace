export type DatasetLayer = 
  | 'albedo' 
  | 'elevation' 
  | 'slope' 
  | 'illumination' 
  | 'psr' 
  | 'comms';

export interface HorizonObstructionPoint {
  azimuth: number; // 0 to 360 degrees (0 = North, 90 = East, 180 = South, 270 = West)
  elevation: number; // Degrees above/below local horizontal plane (e.g. +2.5° due to crater rim)
  terrainFeature?: string;
}

export interface LunarLandingSite {
  id: string;
  name: string;
  subName: string;
  category: 'artemis' | 'clps' | 'historic' | 'custom';
  latitude: number; // Decimal degrees (-90 to +90)
  longitude: number; // Decimal degrees (-180 to +180)
  elevationMeters: number; // Topographic elevation relative to mean lunar radius (1737.4 km)
  meanSlopeDeg: number; // Average slope in 100m landing ellipse
  maxSlopeDeg: number; // Maximum localized slope
  annualIlluminationPct: number; // Percentage of annual sunlight
  earthVisibilityPct: number; // Percentage of direct-to-Earth line of sight
  distanceToPsrKm: number; // Distance to nearest Permanently Shadowed Region (water ice trap)
  temperatureRangeK: [number, number]; // [Min, Max] surface temperature in Kelvin
  targetType: string;
  description: string;
  strategicSignificance: string;
  primaryScienceGoals: string[];
  horizonProfile: HorizonObstructionPoint[];
}

export interface EphemerisPoint {
  timestamp: number; // Epoch ms
  dateIso: string;
  sunElevationDeg: number; // Elevation of Sun relative to local horizon
  sunAzimuthDeg: number; // Azimuth of Sun (0-360°)
  earthElevationDeg: number; // Elevation of Earth relative to local horizon
  earthAzimuthDeg: number; // Azimuth of Earth (0-360°)
  isSunlit: boolean; // Sun above local horizon obstruction
  isEarthVisible: boolean; // Earth above local horizon obstruction
  solarFluxWm2: number; // Instantaneous solar flux (W/m²), normal ~1361 W/m² * cos(incident)
  powerPotentialPct: number; // Estimated array generation capacity %
  commSignalMarginDb: number; // Communication link margin (dB)
}

export interface MissionWindowSummary {
  totalHours: number;
  sunlitHours: number;
  sunlitPct: number;
  earthVisibleHours: number;
  earthVisiblePct: number;
  concurrentHours: number; // Both sunlit and direct Earth communication available
  concurrentPct: number;
  maxContinuousDarkHours: number; // Maximum battery discharge endurance required
  nextSunsetHours: number; // Hours until Sun dips below horizon
  nextSunriseHours: number; // Hours until next sunrise (if in darkness)
  nextEarthsetHours: number; // Hours until Earth loses LOS
  nextEarthriseHours: number; // Hours until Earth regains LOS
}

export interface CriteriaWeights {
  power: number; // Weight 0 to 100
  comms: number; // Weight 0 to 100
  slopeSafety: number; // Weight 0 to 100
  waterIceAccess: number; // Weight 0 to 100
  thermalStability: number; // Weight 0 to 100
}

export interface TraverseWaypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  type: 'landing_site' | 'science_target' | 'psr_rim' | 'sampling_station';
  distanceFromStartKm: number;
  slopeDeg: number;
  inShadow: boolean;
  earthLineOfSight: boolean;
}
