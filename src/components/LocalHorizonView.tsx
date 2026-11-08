import React, { useMemo } from 'react';
import { EphemerisPoint, LunarLandingSite, MissionWindowSummary } from '../types/lunar';
import { Sun, Radio, Compass, Mountain, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

interface LocalHorizonViewProps {
  site: LunarLandingSite;
  currentEphemeris: EphemerisPoint;
  missionSummary: MissionWindowSummary;
  timeline: EphemerisPoint[];
  currentTimestampMs: number;
}

export const LocalHorizonView: React.FC<LocalHorizonViewProps> = ({
  site,
  currentEphemeris,
  missionSummary,
  timeline,
  currentTimestampMs
}) => {
  // SVG Canvas dimensions for Polar Sky Dome
  const polarSize = 340;
  const polarCenter = polarSize / 2;
  const maxPolarRadius = 145; // Represents -5° elevation at outer rim, +90° zenith at center

  // Convert (Azimuth, Elevation) to Polar SVG coordinates (X, Y)
  // Elevation -5° at radius R, +90° at radius 0
  const polarToSvg = (azDeg: number, elDeg: number) => {
    const clampedEl = Math.max(-5, Math.min(90, elDeg));
    const normalizedRadius = (1 - (clampedEl - (-5)) / (90 - (-5))) * maxPolarRadius;
    const rad = (azDeg - 90) * (Math.PI / 180); // 0° North points UP (-Y)
    const x = polarCenter + normalizedRadius * Math.cos(rad);
    const y = polarCenter + normalizedRadius * Math.sin(rad);
    return { x, y, r: normalizedRadius };
  };

  // Build SVG path for topographic crater horizon obstacle
  const horizonPathData = useMemo(() => {
    if (!site.horizonProfile || site.horizonProfile.length === 0) return '';
    const points = site.horizonProfile.map(p => {
      const { x, y } = polarToSvg(p.azimuth, p.elevation);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')} Z`;
  }, [site.horizonProfile]);

  // Sun and Earth positions on polar dome
  const sunPolarPos = polarToSvg(currentEphemeris.sunAzimuthDeg, currentEphemeris.sunElevationDeg);
  const earthPolarPos = polarToSvg(currentEphemeris.earthAzimuthDeg, currentEphemeris.earthElevationDeg);

  // Generate Sun trajectory trail from timeline points
  const sunTrailPath = useMemo(() => {
    if (timeline.length < 2) return '';
    return timeline.map((pt, idx) => {
      const { x, y } = polarToSvg(pt.sunAzimuthDeg, pt.sunElevationDeg);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [timeline]);

  // Generate Earth libration trail from timeline points
  const earthTrailPath = useMemo(() => {
    if (timeline.length < 2) return '';
    return timeline.map((pt, idx) => {
      const { x, y } = polarToSvg(pt.earthAzimuthDeg, pt.earthElevationDeg);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [timeline]);

  // Panoramic 360° unwrapped horizon strip coordinates
  // Width 100%, Height 160px. X: 0 to 360°, Y: +12° (top) to -4° (bottom)
  const panWidth = 600;
  const panHeight = 160;
  const elMin = -4;
  const elMax = 10;

  const panToSvg = (azDeg: number, elDeg: number) => {
    const normX = ((azDeg % 360) / 360) * panWidth;
    const normY = (1 - (elDeg - elMin) / (elMax - elMin)) * panHeight;
    return { x: normX, y: normY };
  };

  const panoramicHorizonPath = useMemo(() => {
    if (!site.horizonProfile || site.horizonProfile.length === 0) return '';
    const sorted = [...site.horizonProfile].sort((a, b) => a.azimuth - b.azimuth);
    const pts: string[] = [];

    // Left edge
    pts.push(`M 0,${panHeight}`);
    pts.push(`L 0,${panToSvg(0, sorted[0].elevation).y.toFixed(1)}`);

    sorted.forEach(p => {
      const { x, y } = panToSvg(p.azimuth, p.elevation);
      pts.push(`L ${x.toFixed(1)},${y.toFixed(1)}`);
    });

    // Right edge
    pts.push(`L ${panWidth},${panToSvg(360, sorted[0].elevation).y.toFixed(1)}`);
    pts.push(`L ${panWidth},${panHeight} Z`);

    return pts.join(' ');
  }, [site.horizonProfile]);

  const sunPanPos = panToSvg(currentEphemeris.sunAzimuthDeg, currentEphemeris.sunElevationDeg);
  const earthPanPos = panToSvg(currentEphemeris.earthAzimuthDeg, currentEphemeris.earthElevationDeg);
  const zeroElevationY = panToSvg(0, 0).y;

  return (
    <div className="flex flex-col gap-5 p-6 bg-slate-950 text-slate-100 min-h-full">
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Horizon Sky Dome & Obstruction Telemetry</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-semibold">{site.name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulating astronomical positions of the Sun and Earth relative to local LOLA lunar topography.
            Account for crater rims, mountain massifs, and lunar libration to prevent unexpected power loss or loss-of-signal.
          </p>
        </div>

        {/* Operational Indicators */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            currentEphemeris.isSunlit
              ? 'bg-amber-950/40 text-amber-300 border-amber-600/40'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>{currentEphemeris.isSunlit ? 'SUNLIGHT ACTIVE' : 'SHADOWED BY TERRAIN'}</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            currentEphemeris.isEarthVisible
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-600/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          }`}>
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>{currentEphemeris.isEarthVisible ? 'EARTH LOS NOMINAL' : 'EARTH OCCULTED'}</span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Polar Sky Dome Radar + Telemetry Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 360° Polar Azimuth-Elevation Radar */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                360° Polar Sky Dome
              </span>
              <span className="text-[11px] font-mono text-slate-500">(Azimuth / Elevation)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Sun
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Earth
              </span>
            </div>
          </div>

          {/* SVG Radar */}
          <div className="relative flex items-center justify-center">
            <svg
              width={polarSize}
              height={polarSize}
              className="overflow-visible select-none"
            >
              <defs>
                <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0c1322" />
                  <stop offset="70%" stopColor="#070a12" />
                  <stop offset="100%" stopColor="#030508" />
                </radialGradient>
                <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Background circular sky dome */}
              <circle cx={polarCenter} cy={polarCenter} r={maxPolarRadius} fill="url(#skyGrad)" stroke="#1e293b" strokeWidth="1.5" />

              {/* Elevation grid circles: 0°, 15°, 30°, 60° */}
              {[-5, 0, 10, 30, 60].map(el => {
                const normR = (1 - (el - (-5)) / 95) * maxPolarRadius;
                return (
                  <g key={el}>
                    <circle
                      cx={polarCenter}
                      cy={polarCenter}
                      r={normR}
                      fill="none"
                      stroke={el === 0 ? '#38bdf8' : '#334155'}
                      strokeWidth={el === 0 ? '1.5' : '0.75'}
                      strokeDasharray={el === 0 ? 'none' : '3 3'}
                      opacity={el === 0 ? 0.7 : 0.4}
                    />
                    <text
                      x={polarCenter + 3}
                      y={polarCenter - normR + 10}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {el}°
                    </text>
                  </g>
                );
              })}

              {/* Azimuth spokes (0°, 90°, 180°, 270°) */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(az => {
                const rad = (az - 90) * (Math.PI / 180);
                const x2 = polarCenter + maxPolarRadius * Math.cos(rad);
                const y2 = polarCenter + maxPolarRadius * Math.sin(rad);
                return (
                  <line
                    key={az}
                    x1={polarCenter}
                    y1={polarCenter}
                    x2={x2}
                    y2={y2}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* Cardinal Labels */}
              <text x={polarCenter} y={polarCenter - maxPolarRadius - 6} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">N (0°)</text>
              <text x={polarCenter + maxPolarRadius + 14} y={polarCenter + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">E (90°)</text>
              <text x={polarCenter} y={polarCenter + maxPolarRadius + 16} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">S (180°)</text>
              <text x={polarCenter - maxPolarRadius - 14} y={polarCenter + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">W (270°)</text>

              {/* Shaded Topographic Obstruction Polygon */}
              {horizonPathData && (
                <path
                  d={horizonPathData}
                  fill="url(#terrainGrad)"
                  stroke="#475569"
                  strokeWidth="1.2"
                />
              )}

              {/* Sun trajectory trail */}
              {sunTrailPath && (
                <path
                  d={sunTrailPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                  opacity="0.45"
                />
              )}

              {/* Earth libration trail */}
              {earthTrailPath && (
                <path
                  d={earthTrailPath}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />
              )}

              {/* Earth current marker */}
              <g transform={`translate(${earthPolarPos.x}, ${earthPolarPos.y})`}>
                <circle r="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <circle r="3" fill="#bae6fd" />
                <text x="10" y="3" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  Earth ({currentEphemeris.earthElevationDeg}°)
                </text>
              </g>

              {/* Sun current marker */}
              <g transform={`translate(${sunPolarPos.x}, ${sunPolarPos.y})`}>
                <circle r="8" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
                <circle r="4" fill="#ffffff" />
                <text x="12" y="3" fill="#fef08a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  Sun ({currentEphemeris.sunElevationDeg}°)
                </text>
              </g>

              {/* Center Zenith marker */}
              <circle cx={polarCenter} cy={polarCenter} r="2.5" fill="#475569" />
              <text x={polarCenter + 4} y={polarCenter - 4} fill="#64748b" fontSize="8" fontFamily="monospace">Zenith</text>
            </svg>
          </div>

          <div className="text-[11px] text-slate-500 mt-2 text-center">
            Blue ring indicates 0° geometric horizon. Shaded polygon indicates local crater rim topography.
          </div>
        </div>

        {/* Right Column: Operational Telemetry & Countdown HUD */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Key Operational Countdown Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Solar Status Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono uppercase tracking-wider">Solar Illumination</span>
                  <Sun className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
                  {currentEphemeris.sunElevationDeg > 0 ? `+${currentEphemeris.sunElevationDeg}°` : `${currentEphemeris.sunElevationDeg}°`}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Azimuth: {currentEphemeris.sunAzimuthDeg}°
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-3 text-xs">
                {currentEphemeris.isSunlit ? (
                  <div className="text-amber-400 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sunset in {missionSummary.nextSunsetHours} hrs</span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sunrise in {missionSummary.nextSunriseHours} hrs</span>
                  </div>
                )}
              </div>
            </div>

            {/* Earth Link Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono uppercase tracking-wider">Direct Earth LOS</span>
                  <Radio className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
                  {currentEphemeris.earthElevationDeg > 0 ? `+${currentEphemeris.earthElevationDeg}°` : `${currentEphemeris.earthElevationDeg}°`}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Azimuth: {currentEphemeris.earthAzimuthDeg}°
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-3 text-xs">
                {currentEphemeris.isEarthVisible ? (
                  <div className="text-cyan-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {missionSummary.nextEarthsetHours > 0 
                        ? `LOS stable for ${missionSummary.nextEarthsetHours} hrs`
                        : 'Continuous High LOS'}
                    </span>
                  </div>
                ) : (
                  <div className="text-rose-400 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>LOS regained in {missionSummary.nextEarthriseHours} hrs</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Power Generation & Telemetry Rates */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Instantaneous Array Generation</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {currentEphemeris.solarFluxWm2} W/m² ({currentEphemeris.powerPotentialPct}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                style={{ width: `${currentEphemeris.powerPotentialPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500">Comms Link Margin</div>
                <div className="text-sm font-semibold text-cyan-300 tabular-nums">
                  {currentEphemeris.commSignalMarginDb > 0 ? `+${currentEphemeris.commSignalMarginDb} dB` : `${currentEphemeris.commSignalMarginDb} dB`}
                </div>
                <div className="text-[10px] text-slate-400">Delay: ~1.28 sec (1-way)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60">
                <div className="text-[10px] uppercase text-slate-500">Max Dark Period</div>
                <div className="text-sm font-semibold text-slate-200 tabular-nums">
                  {missionSummary.maxContinuousDarkHours} hours
                </div>
                <div className="text-[10px] text-slate-400">Battery sizing requirement</div>
              </div>
            </div>
          </div>

          {/* Mission Window Concurrency Summary */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2 text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Selected Mission Window Feasibility
            </span>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800/70">
                <div className="text-[10px] text-slate-400">Total Sunlight</div>
                <div className="text-base font-bold text-amber-400 tabular-nums">{missionSummary.sunlitPct}%</div>
                <div className="text-[10px] text-slate-500">{missionSummary.sunlitHours}h / {missionSummary.totalHours}h</div>
              </div>

              <div className="p-2 bg-slate-950/60 rounded border border-slate-800/70">
                <div className="text-[10px] text-slate-400">Earth LOS</div>
                <div className="text-base font-bold text-cyan-400 tabular-nums">{missionSummary.earthVisiblePct}%</div>
                <div className="text-[10px] text-slate-500">{missionSummary.earthVisibleHours}h / {missionSummary.totalHours}h</div>
              </div>

              <div className="p-2 bg-slate-950/60 rounded border border-slate-800/70">
                <div className="text-[10px] text-slate-400">Power & Comms</div>
                <div className="text-base font-bold text-emerald-400 tabular-nums">{missionSummary.concurrentPct}%</div>
                <div className="text-[10px] text-slate-500">{missionSummary.concurrentHours}h concurrent</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 360° Panoramic Horizon Unwrapped Profile Strip */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              360° Unwrapped Panoramic Horizon Profile
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Azimuth 0° (North) to 360° | Elevation Range -4° to +10°
          </span>
        </div>

        <div className="relative w-full overflow-x-auto bg-slate-950 rounded-lg p-2 border border-slate-800/70">
          <svg
            viewBox={`0 0 ${panWidth} ${panHeight}`}
            className="w-full min-w-[540px] h-36 select-none"
            preserveAspectRatio="none"
          >
            {/* Zero degree reference line */}
            <line
              x1="0"
              y1={zeroElevationY}
              x2={panWidth}
              y2={zeroElevationY}
              stroke="#0284c7"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            <text x="6" y={zeroElevationY - 4} fill="#38bdf8" fontSize="9" fontFamily="monospace">
              0° Local Horizon
            </text>

            {/* Azimuth tick marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315, 360].map(az => {
              const x = (az / 360) * panWidth;
              return (
                <g key={az}>
                  <line x1={x} y1="0" x2={x} y2={panHeight} stroke="#1e293b" strokeWidth="0.8" />
                  <text x={x + 3} y={panHeight - 6} fill="#64748b" fontSize="9" fontFamily="monospace">
                    {az}°
                  </text>
                </g>
              );
            })}

            {/* Panoramic topography silhouette */}
            {panoramicHorizonPath && (
              <path
                d={panoramicHorizonPath}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
                opacity="0.9"
              />
            )}

            {/* Earth position on panorama */}
            <circle cx={earthPanPos.x} cy={earthPanPos.y} r="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <text x={earthPanPos.x + 8} y={earthPanPos.y + 3} fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Earth
            </text>

            {/* Sun position on panorama */}
            <circle cx={sunPanPos.x} cy={sunPanPos.y} r="7" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.8" />
            <text x={sunPanPos.x + 9} y={sunPanPos.y + 3} fill="#fef08a" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Sun
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
