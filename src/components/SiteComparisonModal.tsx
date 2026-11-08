import React, { useState, useMemo } from 'react';
import { CriteriaWeights, LunarLandingSite } from '../types/lunar';
import { calculateSiteSuitabilityScore } from '../utils/lunarMath';
import { Sliders, Check, ShieldCheck, Sun, Radio, Compass, Thermometer, X } from 'lucide-react';

interface SiteComparisonModalProps {
  sites: LunarLandingSite[];
  selectedSite: LunarLandingSite;
  onSelectSite: (site: LunarLandingSite) => void;
  onClose: () => void;
}

export const SiteComparisonModal: React.FC<SiteComparisonModalProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  onClose
}) => {
  // Let user pick 2 or 3 sites to compare
  const [comparedSiteIds, setComparedSiteIds] = useState<string[]>([
    selectedSite.id,
    sites.find(s => s.id !== selectedSite.id)?.id || sites[1]?.id || sites[0].id
  ]);

  // Criteria weightings
  const [weights, setWeights] = useState<CriteriaWeights>({
    power: 25,
    comms: 25,
    slopeSafety: 20,
    waterIceAccess: 15,
    thermalStability: 15
  });

  const toggleSiteInComparison = (siteId: string) => {
    if (comparedSiteIds.includes(siteId)) {
      if (comparedSiteIds.length > 1) {
        setComparedSiteIds(comparedSiteIds.filter(id => id !== siteId));
      }
    } else {
      if (comparedSiteIds.length < 3) {
        setComparedSiteIds([...comparedSiteIds, siteId]);
      } else {
        // Replace last
        setComparedSiteIds([comparedSiteIds[0], comparedSiteIds[1], siteId]);
      }
    }
  };

  const comparedSites = useMemo(() => {
    return comparedSiteIds.map(id => sites.find(s => s.id === id)!).filter(Boolean);
  }, [comparedSiteIds, sites]);

  const scores = useMemo(() => {
    return comparedSites.map(site => calculateSiteSuitabilityScore(site, weights));
  }, [comparedSites, weights]);

  // SVG Radar / Spider Chart calculation
  const radarSize = 260;
  const radarCenter = radarSize / 2;
  const radarRadius = 100;
  const axes = [
    { label: 'Power', key: 'powerScore' as const },
    { label: 'Comms', key: 'commsScore' as const },
    { label: 'Slope Safety', key: 'slopeScore' as const },
    { label: 'Water Ice Access', key: 'waterIceScore' as const },
    { label: 'Thermal Stability', key: 'thermalScore' as const }
  ];

  const getRadarPoint = (axisIndex: number, score: number) => {
    const angle = (axisIndex / axes.length) * 2 * Math.PI - Math.PI / 2;
    const r = (score / 100) * radarRadius;
    const x = radarCenter + r * Math.cos(angle);
    const y = radarCenter + r * Math.sin(angle);
    return { x, y };
  };

  const siteColors = ['#22d3ee', '#f59e0b', '#a855f7'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Multi-Criteria Lunar Landing Site Trade-Off Analysis</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side engineering evaluation. Adjust mission priority weights to compute dynamic suitability scores.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Site Selector Badges */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Select 2 or 3 Sites to Compare:
            </span>
            <div className="flex flex-wrap gap-2">
              {sites.map(site => {
                const isSelected = comparedSiteIds.includes(site.id);
                return (
                  <button
                    key={site.id}
                    onClick={() => toggleSiteInComparison(site.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{site.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upper Split: Radar Spider Chart + Dynamic Weight Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 items-center">
            {/* Radar Spider Chart */}
            <div className="md:col-span-5 flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Multi-Criteria Spider Profile
              </span>
              <svg width={radarSize} height={radarSize} className="select-none overflow-visible">
                {/* Concentric Polygons: 25%, 50%, 75%, 100% */}
                {[25, 50, 75, 100].map(level => {
                  const pts = axes.map((_, i) => {
                    const p = getRadarPoint(i, level);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  }).join(' ');
                  return (
                    <polygon
                      key={level}
                      points={pts}
                      fill="none"
                      stroke="#334155"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {/* Axis Spokes & Labels */}
                {axes.map((axis, i) => {
                  const end = getRadarPoint(i, 100);
                  const labelPos = getRadarPoint(i, 118);
                  return (
                    <g key={axis.key}>
                      <line
                        x1={radarCenter}
                        y1={radarCenter}
                        x2={end.x}
                        y2={end.y}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 3}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {axis.label}
                      </text>
                    </g>
                  );
                })}

                {/* Polygons for each compared site */}
                {comparedSites.map((site, sIdx) => {
                  const siteScore = scores[sIdx];
                  const pts = axes.map((axis, aIdx) => {
                    const val = siteScore.breakdown[axis.key];
                    const p = getRadarPoint(aIdx, val);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  }).join(' ');

                  const color = siteColors[sIdx % siteColors.length];

                  return (
                    <g key={site.id}>
                      <polygon
                        points={pts}
                        fill={color}
                        fillOpacity="0.15"
                        stroke={color}
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Radar Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[11px] font-mono">
                {comparedSites.map((s, idx) => (
                  <span key={s.id} className="flex items-center gap-1.5" style={{ color: siteColors[idx] }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: siteColors[idx] }} />
                    <span className="truncate max-w-[120px]">{s.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Criteria Weight Sliders */}
            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Mission Priority Calibration
                </span>
                <button
                  onClick={() => setWeights({ power: 25, comms: 25, slopeSafety: 20, waterIceAccess: 15, thermalStability: 15 })}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Reset Weights
                </button>
              </div>

              {/* Slider list */}
              <div className="flex flex-col gap-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-400" /> Solar Power Availability</span>
                    <span className="font-mono font-semibold text-slate-200">{weights.power}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights.power}
                    onChange={e => setWeights({ ...weights, power: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-cyan-400" /> Direct-to-Earth Communication</span>
                    <span className="font-mono font-semibold text-slate-200">{weights.comms}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights.comms}
                    onChange={e => setWeights({ ...weights, comms: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Slope Landing Safety</span>
                    <span className="font-mono font-semibold text-slate-200">{weights.slopeSafety}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights.slopeSafety}
                    onChange={e => setWeights({ ...weights, slopeSafety: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-purple-400" /> Science & Water Ice Proximity</span>
                    <span className="font-mono font-semibold text-slate-200">{weights.waterIceAccess}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights.waterIceAccess}
                    onChange={e => setWeights({ ...weights, waterIceAccess: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-rose-400" /> Thermal Environment Stability</span>
                    <span className="font-mono font-semibold text-slate-200">{weights.thermalStability}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights.thermalStability}
                    onChange={e => setWeights({ ...weights, thermalStability: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Direct Comparison Matrix Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <th className="p-3 w-48">METRIC / CRITERION</th>
                  {comparedSites.map((site, i) => (
                    <th key={site.id} className="p-3 font-semibold text-slate-200" style={{ borderTop: `3px solid ${siteColors[i]}` }}>
                      {site.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {/* Overall Score */}
                <tr className="bg-slate-900/40">
                  <td className="p-3 font-bold text-cyan-400">Overall Suitability Score</td>
                  {scores.map((s, i) => (
                    <td key={i} className="p-3 text-lg font-bold tabular-nums" style={{ color: siteColors[i] }}>
                      {s.overallScore} / 100
                    </td>
                  ))}
                </tr>

                {/* Coordinates */}
                <tr>
                  <td className="p-3 text-slate-400">Lunar Coordinates</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-slate-300">
                      {s.latitude.toFixed(2)}° Lat, {s.longitude.toFixed(2)}° Lon
                    </td>
                  ))}
                </tr>

                {/* Elevation */}
                <tr>
                  <td className="p-3 text-slate-400">LOLA Elevation</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-slate-300">
                      {s.elevationMeters > 0 ? `+${s.elevationMeters}` : s.elevationMeters} m
                    </td>
                  ))}
                </tr>

                {/* Annual Sunlight */}
                <tr>
                  <td className="p-3 text-slate-400">Annual Sunlight Fraction</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-amber-400 font-semibold">
                      {s.annualIlluminationPct}%
                    </td>
                  ))}
                </tr>

                {/* Earth Line of Sight */}
                <tr>
                  <td className="p-3 text-slate-400">Earth Direct LOS</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-cyan-400 font-semibold">
                      {s.earthVisibilityPct}%
                    </td>
                  ))}
                </tr>

                {/* Slopes */}
                <tr>
                  <td className="p-3 text-slate-400">Mean / Max Slope</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-slate-300">
                      {s.meanSlopeDeg}° / {s.maxSlopeDeg}° ({s.meanSlopeDeg <= 6 ? 'Nominal Safe' : 'Caution'})
                    </td>
                  ))}
                </tr>

                {/* Water Ice PSR Distance */}
                <tr>
                  <td className="p-3 text-slate-400">Distance to Cold Trap PSR</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-purple-400">
                      {s.distanceToPsrKm} km
                    </td>
                  ))}
                </tr>

                {/* Thermal Range */}
                <tr>
                  <td className="p-3 text-slate-400">Surface Temp Range</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-slate-300">
                      {s.temperatureRangeK[0]} K to {s.temperatureRangeK[1]} K
                    </td>
                  ))}
                </tr>

                {/* Strategic summary */}
                <tr className="font-sans text-xs">
                  <td className="p-3 text-slate-400 font-mono">Strategic Role</td>
                  {comparedSites.map(s => (
                    <td key={s.id} className="p-3 text-slate-300">
                      {s.strategicSignificance}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            NASA Artemis Multi-Criteria Decision Framework
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
