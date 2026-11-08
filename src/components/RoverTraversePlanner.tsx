import React, { useState, useMemo } from 'react';
import { TraverseWaypoint, LunarLandingSite } from '../types/lunar';
import { INITIAL_TRAVERSE_WAYPOINTS } from '../data/lunarSites';
import { Route, Plus, Trash2, ShieldAlert, CheckCircle, Navigation, Radio, Sun, HardDrive, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { uploadFileToDrive } from '../services/googleDriveService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface RoverTraversePlannerProps {
  selectedSite: LunarLandingSite;
}

export const RoverTraversePlanner: React.FC<RoverTraversePlannerProps> = ({ selectedSite }) => {
  const [waypoints, setWaypoints] = useState<TraverseWaypoint[]>(INITIAL_TRAVERSE_WAYPOINTS);
  const [newWaypointName, setNewWaypointName] = useState('');
  const [newWaypointSlope, setNewWaypointSlope] = useState(6.0);
  const [newWaypointInShadow, setNewWaypointInShadow] = useState(false);

  // Google Drive integration
  const { user, signIn, isLoggingIn } = useGoogleAuth();
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSaveSuccess, setDriveSaveSuccess] = useState<{ name: string; url?: string } | null>(null);
  const [driveSaveError, setDriveSaveError] = useState<string | null>(null);

  const handleSaveTraverseToDrive = async () => {
    setIsSavingToDrive(true);
    setDriveSaveError(null);
    setDriveSaveSuccess(null);
    try {
      const payload = {
        application: 'LunaTrace Rover Traverse Planner',
        savedAt: new Date().toISOString(),
        site: selectedSite,
        metrics: {
          totalDistanceKm,
          maxSlopeDeg: maxSlope,
          shadowedStations: shadowedWaypointsCount,
          directEarthWaypoints: waypoints.length - commLossWaypointsCount,
          totalWaypoints: waypoints.length
        },
        waypoints
      };

      const filename = `LunaTrace_${selectedSite.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Traverse_Plan.json`;
      const uploaded = await uploadFileToDrive({
        filename,
        content: JSON.stringify(payload, null, 2),
        mimeType: 'application/json',
        description: `Rover traverse waypoint route and slope profile for ${selectedSite.name}`
      });

      setDriveSaveSuccess({
        name: uploaded.name,
        url: uploaded.webViewLink
      });
    } catch (err: any) {
      console.error('Error saving traverse to drive:', err);
      setDriveSaveError(err.message || 'Failed to save traverse to Google Drive');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Compute total route metrics
  const totalDistanceKm = waypoints.length > 0 ? waypoints[waypoints.length - 1].distanceFromStartKm : 0;
  const maxSlope = useMemo(() => {
    return Math.max(...waypoints.map(w => w.slopeDeg), 0);
  }, [waypoints]);

  const shadowedWaypointsCount = waypoints.filter(w => w.inShadow).length;
  const commLossWaypointsCount = waypoints.filter(w => !w.earthLineOfSight).length;

  const handleAddWaypoint = () => {
    if (!newWaypointName.trim()) return;
    const lastWp = waypoints[waypoints.length - 1];
    const newDistance = Number((lastWp ? lastWp.distanceFromStartKm + 1.2 : 1.0).toFixed(1));
    const newElev = lastWp ? lastWp.elevationMeters - 60 : 1200;

    const newWp: TraverseWaypoint = {
      id: `wp-${Date.now()}`,
      name: newWaypointName.trim(),
      latitude: Number((selectedSite.latitude + 0.05 * waypoints.length).toFixed(2)),
      longitude: Number((selectedSite.longitude + 0.1 * waypoints.length).toFixed(2)),
      elevationMeters: newElev,
      type: newWaypointInShadow ? 'sampling_station' : 'science_target',
      distanceFromStartKm: newDistance,
      slopeDeg: newWaypointSlope,
      inShadow: newWaypointInShadow,
      earthLineOfSight: !newWaypointInShadow
    };

    setWaypoints([...waypoints, newWp]);
    setNewWaypointName('');
  };

  const handleRemoveWaypoint = (id: string) => {
    if (waypoints.length <= 2) return; // Keep at least start and end
    setWaypoints(waypoints.filter(w => w.id !== id));
  };

  // SVG Elevation Profile Chart
  const svgWidth = 600;
  const svgHeight = 160;

  const minElev = Math.min(...waypoints.map(w => w.elevationMeters), 1000) - 100;
  const maxElev = Math.max(...waypoints.map(w => w.elevationMeters), 1300) + 100;

  const elevToSvg = (elev: number) => {
    return (1 - (elev - minElev) / (maxElev - minElev)) * (svgHeight - 40) + 20;
  };

  const distToSvg = (dist: number) => {
    return totalDistanceKm > 0 ? (dist / totalDistanceKm) * (svgWidth - 60) + 30 : 30;
  };

  const profilePathStr = waypoints.map((w, idx) => {
    const x = distToSvg(w.distanceFromStartKm);
    const y = elevToSvg(w.elevationMeters);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-950 text-slate-100 min-h-full">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Route className="w-3.5 h-3.5" />
            <span>Lunar Surface Traverse Planner</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-semibold">{selectedSite.name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Evaluate rover mobility corridors between the landing touchdown zone and high-priority scientific targets.
            Monitor slope steepness against rover tilt limits (15° max) and verify battery endurance during shadow ingress.
          </p>
        </div>

        {/* Rover Readiness Indicators */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            maxSlope <= 15
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          }`}>
            {maxSlope <= 15 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
            <span>Max Slope: {maxSlope}° {maxSlope <= 15 ? '(Traversable)' : '(Excessive Tilt)'}</span>
          </div>
        </div>
      </div>

      {/* Route Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Traverse Distance</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">{totalDistanceKm} km</div>
          <span className="text-[10px] text-slate-500">{waypoints.length} waypoints planned</span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Max Route Gradient</span>
          <div className={`text-xl font-bold font-mono mt-0.5 ${maxSlope > 12 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {maxSlope}°
          </div>
          <span className="text-[10px] text-slate-500">Rover safety ceiling 15°</span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Shadow Ingress</span>
          <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">{shadowedWaypointsCount} Stations</div>
          <span className="text-[10px] text-slate-500">Cryo cold trap zone</span>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Direct Earth LOS</span>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
            {commLossWaypointsCount === 0 ? '100% Direct' : `${waypoints.length - commLossWaypointsCount}/${waypoints.length} Direct`}
          </div>
          <span className="text-[10px] text-slate-500">Relay needed in shadowed craters</span>
        </div>
      </div>

      {/* Elevation Cross-Section Profile SVG */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Traverse Topographic Elevation Cross-Section
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Elevation: {minElev}m to {maxElev}m | Distance: 0 to {totalDistanceKm} km
          </span>
        </div>

        <div className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[500px] h-40 select-none"
            preserveAspectRatio="none"
          >
            {/* Grid Lines */}
            {[minElev + 50, (minElev + maxElev) / 2, maxElev - 50].map(el => {
              const y = elevToSvg(el);
              return (
                <g key={el}>
                  <line x1="30" y1={y} x2={svgWidth - 30} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="5" y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">{Math.round(el)}m</text>
                </g>
              );
            })}

            {/* Profile Path Line */}
            {profilePathStr && (
              <path
                d={profilePathStr}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
              />
            )}

            {/* Waypoint nodes on profile */}
            {waypoints.map((w, idx) => {
              const x = distToSvg(w.distanceFromStartKm);
              const y = elevToSvg(w.elevationMeters);
              const isShadow = w.inShadow;

              return (
                <g key={w.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={isShadow ? '#a855f7' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    fill={isShadow ? '#c084fc' : '#94a3b8'}
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    WP{idx}: {w.name}
                  </text>
                  <text
                    x={x}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {w.distanceFromStartKm}km
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Waypoint Manager List & Add Station Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waypoints List */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Traverse Stations & Waypoints Sequence
          </span>

          <div className="flex flex-col gap-2">
            {waypoints.map((wp, idx) => (
              <div
                key={wp.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-slate-800 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold">
                    {idx}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>{wp.name}</span>
                      {wp.inShadow && (
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                          PSR Cold Trap
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
                      <span>Dist: {wp.distanceFromStartKm} km</span>
                      <span>Elev: {wp.elevationMeters}m</span>
                      <span>Slope: {wp.slopeDeg}°</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
                    {wp.inShadow ? (
                      <span className="text-purple-400 flex items-center gap-1"><Sun className="w-3 h-3" /> In Shadow</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><Sun className="w-3 h-3" /> Sunlit</span>
                    )}
                    <span className="text-slate-600">|</span>
                    {wp.earthLineOfSight ? (
                      <span className="text-cyan-400 flex items-center gap-1"><Radio className="w-3 h-3" /> Direct LOS</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><Radio className="w-3 h-3" /> Occulted</span>
                    )}
                  </div>

                  {waypoints.length > 2 && idx > 0 && (
                    <button
                      onClick={() => handleRemoveWaypoint(wp.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Waypoint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Add Waypoint Form & Google Drive Archive Box */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Add Traverse Station
            </span>

          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400">Station Name / Objective</label>
            <input
              type="text"
              placeholder="e.g. Cold Trap Core Sample Station"
              value={newWaypointName}
              onChange={e => setNewWaypointName(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Local Slope Gradient</span>
              <span className="font-mono text-cyan-400">{newWaypointSlope}°</span>
            </div>
            <input
              type="range"
              min="1"
              max="22"
              step="0.5"
              value={newWaypointSlope}
              onChange={e => setNewWaypointSlope(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-slate-300">
            <input
              type="checkbox"
              id="shadowCheck"
              checked={newWaypointInShadow}
              onChange={e => setNewWaypointInShadow(e.target.checked)}
              className="rounded accent-purple-500 cursor-pointer"
            />
            <label htmlFor="shadowCheck" className="cursor-pointer text-slate-300">
              Station is in Permanently Shadowed Region (PSR)
            </label>
          </div>

          <button
            onClick={handleAddWaypoint}
            disabled={!newWaypointName.trim()}
            className="mt-2 w-full py-2 bg-cyan-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Waypoint to Route</span>
          </button>
        </div>

        {/* Google Drive Traverse Archive Box */}
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">
              Save Traverse to Google Drive
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Archive this multi-station lunar route and slope profile to your Google Drive folder for team planning.
          </p>

          {driveSaveSuccess && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] flex items-center justify-between">
              <span className="truncate">Saved <strong>{driveSaveSuccess.name}</strong></span>
              {driveSaveSuccess.url && (
                <a
                  href={driveSaveSuccess.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-100 flex items-center gap-1 shrink-0 ml-2 underline"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {driveSaveError && (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{driveSaveError}</span>
            </div>
          )}

          {!user ? (
            <GoogleSignInButton
              onClick={signIn}
              isLoading={isLoggingIn}
              size="sm"
              label="Sign in to save route"
            />
          ) : (
            <button
              onClick={handleSaveTraverseToDrive}
              disabled={isSavingToDrive}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              {isSavingToDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              <span>{isSavingToDrive ? 'Archiving...' : 'Save Traverse to Drive'}</span>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
