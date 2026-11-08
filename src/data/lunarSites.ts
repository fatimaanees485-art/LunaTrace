import { LunarLandingSite, HorizonObstructionPoint } from '../types/lunar';

/**
 * Procedural helper to generate realistic 360° horizon obstruction profiles
 * based on crater rim heights and local massifs.
 */
function createHorizonProfile(
  rimFeatures: { az: number; el: number; name: string }[],
  baseDip: number = -0.5
): HorizonObstructionPoint[] {
  const points: HorizonObstructionPoint[] = [];
  const step = 15; // Every 15 degrees

  for (let az = 0; az < 360; az += step) {
    // Find closest feature influence
    let peakEl = baseDip;
    let featureName = 'Local Horizon';

    for (const feat of rimFeatures) {
      let diff = Math.abs(az - feat.az);
      if (diff > 180) diff = 360 - diff;
      if (diff < 35) {
        // Gaussian bump
        const influence = Math.exp(-Math.pow(diff / 15, 2));
        const candidateEl = baseDip + (feat.el - baseDip) * influence;
        if (candidateEl > peakEl) {
          peakEl = candidateEl;
          featureName = feat.name;
        }
      }
    }

    points.push({
      azimuth: az,
      elevation: Number(peakEl.toFixed(2)),
      terrainFeature: featureName
    });
  }

  return points;
}

export const LUNAR_LANDING_SITES: LunarLandingSite[] = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim',
    subName: 'Connecting Ridge / Artemis Primary',
    category: 'artemis',
    latitude: -89.90,
    longitude: 0.00,
    elevationMeters: 1220,
    meanSlopeDeg: 5.8,
    maxSlopeDeg: 14.2,
    annualIlluminationPct: 86.4,
    earthVisibilityPct: 91.2,
    distanceToPsrKm: 0.8,
    temperatureRangeK: [110, 225],
    targetType: 'Crater Rim Ridge',
    description: 'Located at the exact South Pole of the Moon. High elevation crest offering near-continuous solar illumination while standing directly adjacent to Shackleton\'s 4.2 km deep permanently shadowed interior.',
    strategicSignificance: 'Premier Artemis candidate site for continuous solar power and uninterrupted direct-to-Earth communication links.',
    primaryScienceGoals: [
      'Direct in-situ sampling of cold-trapped water ice inside Shackleton PSR',
      'Deploy long-term south polar cryogenic science and astronomical observatory',
      'Test solar array tracking in grazing polar illumination'
    ],
    horizonProfile: createHorizonProfile([
      { az: 180, el: 2.8, name: 'South Pole Connecting Ridge Crest' },
      { az: 240, el: 3.5, name: 'Shackleton Peak West' },
      { az: 45, el: 1.2, name: 'Faustini Distant Massif' }
    ], -1.8)
  },
  {
    id: 'malapert-mountain',
    name: 'Malapert Mountain',
    subName: 'Malapert Massif Peak',
    category: 'artemis',
    latitude: -86.04,
    longitude: 2.72,
    elevationMeters: 5050,
    meanSlopeDeg: 4.2,
    maxSlopeDeg: 11.5,
    annualIlluminationPct: 89.1,
    earthVisibilityPct: 98.7,
    distanceToPsrKm: 14.5,
    temperatureRangeK: [120, 230],
    targetType: 'Elevated Highland Massif',
    description: 'Rising over 5,000 meters above surrounding terrain, this colossal massif is the most prominent topographic landmark near the lunar south pole, granting nearly permanent line-of-sight to Earth.',
    strategicSignificance: 'Ideal communications relay anchor and high-power generation hub for polar exploration infrastructure.',
    primaryScienceGoals: [
      'Establish permanent Earth-Moon broadband optical & S-band comm relay',
      'Sample pre-Nectarian impact basin melt sheet materials',
      'Characterize polar cosmic ray flux at high elevation'
    ],
    horizonProfile: createHorizonProfile([
      { az: 0, el: -2.4, name: 'Northern Plains Dropoff' },
      { az: 120, el: 0.8, name: 'Malapert Ridge Shoulder' },
      { az: 200, el: 1.5, name: 'Southern Massif Peak' }
    ], -3.5)
  },
  {
    id: 'nobile-rim',
    name: 'Nobile Rim 1 & 2',
    subName: 'VIPER Exploration Zone',
    category: 'artemis',
    latitude: -85.22,
    longitude: 53.50,
    elevationMeters: 3150,
    meanSlopeDeg: 4.8,
    maxSlopeDeg: 9.8,
    annualIlluminationPct: 81.6,
    earthVisibilityPct: 88.5,
    distanceToPsrKm: 2.1,
    temperatureRangeK: [95, 215],
    targetType: 'Terraced Crater Rim',
    description: 'Primary landing site selected for NASA\'s VIPER volatile-prospecting rover. Features traversable slopes leading directly into several distinct micro-cold traps containing volatile hydrogen signatures.',
    strategicSignificance: 'Accessible terrain for rover surface mobility and subsurface drilling down to 1 meter.',
    primaryScienceGoals: [
      'Subsurface neutron spectrometer hydrogen mapping with TRIDENT drill',
      'Map physical origin and distribution of lunar polar volatile reserves',
      'Analyze geotechnical regolith bearing strength across shadowed boundaries'
    ],
    horizonProfile: createHorizonProfile([
      { az: 70, el: 2.9, name: 'Nobile Eastern Rim Wall' },
      { az: 210, el: 2.2, name: 'Shoemaker Ridge High Point' },
      { az: 330, el: -1.0, name: 'Amundsen Corridor' }
    ], -2.2)
  },
  {
    id: 'faustini-rim',
    name: 'Faustini Rim A',
    subName: 'Artemis Science Zone',
    category: 'artemis',
    latitude: -87.35,
    longitude: 84.30,
    elevationMeters: 2100,
    meanSlopeDeg: 6.2,
    maxSlopeDeg: 13.0,
    annualIlluminationPct: 78.5,
    earthVisibilityPct: 84.0,
    distanceToPsrKm: 1.2,
    temperatureRangeK: [90, 210],
    targetType: 'Crater Rim Plateau',
    description: 'A stable plateau along Faustini crater’s northern rim with exceptional access to permanently shadowed terrain and ancient south-polar volatile deposits.',
    strategicSignificance: 'Close scientific proximity to cryogenic PSR ice with good operational sunlight along the rim ridge.',
    primaryScienceGoals: [
      'Collect pristine cryogenic ice core samples preserved under 40 Kelvin',
      'Examine solar-wind implanted volatiles on elevated slopes',
      'Monitor exospheric dust levitation at polar terminator'
    ],
    horizonProfile: createHorizonProfile([
      { az: 90, el: 3.8, name: 'Faustini Interior Rim Wall' },
      { az: 270, el: 1.1, name: 'Amundsen Outer Rampart' }
    ], -1.9)
  },
  {
    id: 'haworth-rim',
    name: 'Haworth Crater Rim',
    subName: 'Extreme Volatile Reservoir',
    category: 'artemis',
    latitude: -87.50,
    longitude: 355.00,
    elevationMeters: 1480,
    meanSlopeDeg: 7.1,
    maxSlopeDeg: 15.6,
    annualIlluminationPct: 72.3,
    earthVisibilityPct: 79.5,
    distanceToPsrKm: 0.5,
    temperatureRangeK: [85, 205],
    targetType: 'Impact Rim Edge',
    description: 'Haworth crater hosts some of the coldest measured locations in the solar system (< 35 Kelvin). The rim landing zone provides immediate ingress to suspected surface volatile frost.',
    strategicSignificance: 'Premier ground-truth location for detecting surface water ice frost and organic cometary volatiles.',
    primaryScienceGoals: [
      'Direct sensor confirmation of surface water ice reflectance peaks',
      'Determine concentration of cometary volatile delivery products',
      'Test cryogenic rover mechanisms at ultra-low ambient temperatures'
    ],
    horizonProfile: createHorizonProfile([
      { az: 160, el: 4.2, name: 'Haworth Central Peak Block' },
      { az: 310, el: 2.8, name: 'de Gerlache Northern Rim' }
    ], -1.4)
  },
  {
    id: 'de-gerlache-rim',
    name: 'de Gerlache Rim 1',
    subName: 'Strategic Earth-View Ridge',
    category: 'artemis',
    latitude: -88.50,
    longitude: 271.00,
    elevationMeters: 1850,
    meanSlopeDeg: 5.5,
    maxSlopeDeg: 12.8,
    annualIlluminationPct: 82.4,
    earthVisibilityPct: 86.1,
    distanceToPsrKm: 1.5,
    temperatureRangeK: [100, 220],
    targetType: 'Connecting Ridge',
    description: 'Narrow, elevated crest dividing de Gerlache crater and Shackleton, offering strong line-of-sight to Earth and consistent solar exposure during southern summer.',
    strategicSignificance: 'Dual access to multiple permanently shadowed basins within short rover traverse range.',
    primaryScienceGoals: [
      'Comparative analysis of volatile compositions across adjacent craters',
      'Characterize impact breccias from South Pole-Aitken Basin event'
    ],
    horizonProfile: createHorizonProfile([
      { az: 45, el: 2.5, name: 'Shackleton West Rim' },
      { az: 220, el: 3.1, name: 'de Gerlache Crater Floor Scarp' }
    ], -1.7)
  },
  {
    id: 'amundsen-rim',
    name: 'Amundsen Rim',
    subName: 'Deep South Polar Basin',
    category: 'artemis',
    latitude: -84.50,
    longitude: 85.60,
    elevationMeters: 2600,
    meanSlopeDeg: 6.8,
    maxSlopeDeg: 14.1,
    annualIlluminationPct: 75.2,
    earthVisibilityPct: 82.3,
    distanceToPsrKm: 3.2,
    temperatureRangeK: [95, 218],
    targetType: 'Ancient Impact Basin Rim',
    description: 'Amundsen is a large 105 km impact crater. The south-western rim features broad sunlit terraces overlooking vast permanently shadowed cold traps.',
    strategicSignificance: 'Geological context for regional crater chronology and central peak uplifts.',
    primaryScienceGoals: [
      'Sample deep lunar crustal material brought up by central peak uplift',
      'Survey ice stability in micro-cold traps on moderate slopes'
    ],
    horizonProfile: createHorizonProfile([
      { az: 110, el: 3.6, name: 'Amundsen Central Peak' },
      { az: 280, el: 1.8, name: 'Hedervari Massif' }
    ], -2.0)
  },
  {
    id: 'leibnitz-beta',
    name: 'Leibnitz Beta Plateau',
    subName: 'High Elevation Southern Highlands',
    category: 'clps',
    latitude: -85.80,
    longitude: 30.50,
    elevationMeters: 3800,
    meanSlopeDeg: 3.8,
    maxSlopeDeg: 8.5,
    annualIlluminationPct: 84.8,
    earthVisibilityPct: 93.1,
    distanceToPsrKm: 8.4,
    temperatureRangeK: [115, 225],
    targetType: 'Smooth Highland Terrace',
    description: 'An expansive, gently sloping elevated terrace south of Malapert. Offers remarkably benign landing terrain and high communication availability.',
    strategicSignificance: 'High-payload commercial lander target with minimal terrain hazard and broad landing ellipse.',
    primaryScienceGoals: [
      'Commercial resource prospecting and automated payload delivery',
      'Long-baseline radio astronomy antenna array deployment'
    ],
    horizonProfile: createHorizonProfile([
      { az: 350, el: 2.1, name: 'Malapert South Slope' },
      { az: 180, el: -1.5, name: 'Polar Highland Plain' }
    ], -2.8)
  },
  {
    id: 'chandrayaan-3',
    name: 'Shiv Shakti Point',
    subName: 'Chandrayaan-3 Landing Site',
    category: 'historic',
    latitude: -69.37,
    longitude: 32.35,
    elevationMeters: -1300,
    meanSlopeDeg: 2.5,
    maxSlopeDeg: 6.0,
    annualIlluminationPct: 50.0,
    earthVisibilityPct: 100.0,
    distanceToPsrKm: 180.0,
    temperatureRangeK: [100, 380],
    targetType: 'Southern High-Latitude Plain',
    description: 'Historic site of ISRO\'s Chandrayaan-3 soft landing in August 2023. Located in high southern latitudes, demonstrating safe touchdown on smooth inter-crater plains.',
    strategicSignificance: 'Benchmark for robotic landing safety and in-situ thermophysical regolith measurements.',
    primaryScienceGoals: [
      'Benchmark regolith thermal conductivity in high southern latitudes',
      'Laser-induced breakdown spectroscopy of sulfur and iron elements'
    ],
    horizonProfile: createHorizonProfile([
      { az: 45, el: 0.6, name: 'Manzinus U Rim' },
      { az: 220, el: 0.8, name: 'Simpelius Distant Scarp' }
    ], -0.2)
  },
  {
    id: 'apollo-11',
    name: 'Tranquility Base',
    subName: 'Apollo 11 Historical Reference',
    category: 'historic',
    latitude: 0.67,
    longitude: 23.47,
    elevationMeters: -1520,
    meanSlopeDeg: 1.8,
    maxSlopeDeg: 5.2,
    annualIlluminationPct: 50.0,
    earthVisibilityPct: 100.0,
    distanceToPsrKm: 2200.0,
    temperatureRangeK: [100, 395],
    targetType: 'Mare Basalt Plain',
    description: 'Historical reference site where humans first landed on the Moon on July 20, 1969. Demonstrates classic equatorial lighting cycles: 14 Earth days of continuous sunlight followed by 14 days of lunar night.',
    strategicSignificance: 'Historical baseline for Apollo lunar module touchdown dynamics and mare basalt petrology.',
    primaryScienceGoals: [
      'Equatorial mare basalt chronology and titanium-rich ilmenite samples',
      'Passive seismic network and laser retroreflector positioning'
    ],
    horizonProfile: createHorizonProfile([
      { az: 90, el: 0.4, name: 'West Crater Rim' },
      { az: 270, el: 0.2, name: 'Cat\'s Paw Low Ridge' }
    ], -0.1)
  }
];

export const INITIAL_TRAVERSE_WAYPOINTS = [
  {
    id: 'wp-0',
    name: 'Touchdown Point (Alpha)',
    latitude: -89.90,
    longitude: 0.00,
    elevationMeters: 1220,
    type: 'landing_site' as const,
    distanceFromStartKm: 0.0,
    slopeDeg: 4.5,
    inShadow: false,
    earthLineOfSight: true
  },
  {
    id: 'wp-1',
    name: 'Connecting Ridge Station',
    latitude: -89.85,
    longitude: 2.10,
    elevationMeters: 1260,
    type: 'science_target' as const,
    distanceFromStartKm: 1.6,
    slopeDeg: 6.2,
    inShadow: false,
    earthLineOfSight: true
  },
  {
    id: 'wp-2',
    name: 'Shackleton Rim Viewpoint',
    latitude: -89.82,
    longitude: 5.40,
    elevationMeters: 1310,
    type: 'psr_rim' as const,
    distanceFromStartKm: 3.1,
    slopeDeg: 8.9,
    inShadow: false,
    earthLineOfSight: true
  },
  {
    id: 'wp-3',
    name: 'Micro-Cold Trap Ingress',
    latitude: -89.79,
    longitude: 8.20,
    elevationMeters: 1140,
    type: 'sampling_station' as const,
    distanceFromStartKm: 4.8,
    slopeDeg: 12.4,
    inShadow: true,
    earthLineOfSight: false
  }
];
