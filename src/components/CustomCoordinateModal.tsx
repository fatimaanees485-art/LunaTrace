import React, { useState } from 'react';
import { LunarLandingSite } from '../types/lunar';
import { MapPin, X, Plus, Compass } from 'lucide-react';

interface CustomCoordinateModalProps {
  onAddCustomSite: (site: LunarLandingSite) => void;
  onClose: () => void;
}

export const CustomCoordinateModal: React.FC<CustomCoordinateModalProps> = ({
  onAddCustomSite,
  onClose
}) => {
  const [name, setName] = useState('Custom Polar Site Alpha');
  const [subName, setSubName] = useState('User Defined Landing Target');
  const [latitude, setLatitude] = useState(-88.20);
  const [longitude, setLongitude] = useState(45.00);
  const [elevationMeters, setElevationMeters] = useState(1650);
  const [meanSlopeDeg, setMeanSlopeDeg] = useState(5.2);

  const presets = [
    { label: 'Connecting Ridge High Point', lat: -89.44, lon: 222.50, el: 1850, slope: 6.5 },
    { label: 'Haworth West Plateau', lat: -87.10, lon: 340.20, el: 1200, slope: 4.8 },
    { label: 'Amundsen-Ganswindt Basin', lat: -82.40, lon: 115.00, el: 2100, slope: 5.8 },
    { label: 'Aristarchus Plateau (Equatorial)', lat: 23.70, lon: -47.40, el: -800, slope: 3.2 }
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setName(p.label);
    setLatitude(p.lat);
    setLongitude(p.lon);
    setElevationMeters(p.el);
    setMeanSlopeDeg(p.slope);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Estimate solar illumination & earth visibility based on latitude and elevation
    const isPolar = Math.abs(latitude) > 80;
    const polarFactor = Math.max(0, (Math.abs(latitude) - 80) / 10);
    const elevBonus = Math.min(10, Math.max(0, elevationMeters / 500));

    const estIllumination = isPolar 
      ? Math.min(92, Math.round(70 + polarFactor * 15 + elevBonus))
      : 50;

    const estEarthVisibility = isPolar
      ? Math.min(98, Math.round(75 + polarFactor * 16 + elevBonus * 1.2))
      : (Math.abs(longitude) < 80 ? 100 : 20);

    const distToPsr = isPolar ? Math.max(0.5, Number((8.0 - polarFactor * 6.5).toFixed(1))) : 800;

    // Generate procedural horizon profile based on coordinates
    const horizonProfile = [];
    for (let az = 0; az < 360; az += 20) {
      const azRad = az * (Math.PI / 180);
      const simulatedRidge = Math.sin(azRad * 2) * 1.8 + Math.cos(azRad * 3) * 0.9;
      horizonProfile.push({
        azimuth: az,
        elevation: Number((simulatedRidge - elevationMeters / 2500).toFixed(2)),
        terrainFeature: `Topographic Horizon ${az}°`
      });
    }

    const newSite: LunarLandingSite = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Custom Landing Target',
      subName: subName.trim() || 'Custom Coordinate Site',
      category: 'custom',
      latitude: Number(latitude),
      longitude: Number(longitude),
      elevationMeters: Number(elevationMeters),
      meanSlopeDeg: Number(meanSlopeDeg),
      maxSlopeDeg: Number((meanSlopeDeg * 2.2).toFixed(1)),
      annualIlluminationPct: estIllumination,
      earthVisibilityPct: estEarthVisibility,
      distanceToPsrKm: distToPsr,
      temperatureRangeK: isPolar ? [95, 220] : [100, 390],
      targetType: 'Custom User Landing Zone',
      description: `User-defined lunar coordinates at ${latitude}° Lat, ${longitude}° Lon. Synthesized LOLA elevation and local horizon profile.`,
      strategicSignificance: 'Custom research target for user mission trade-off evaluation.',
      primaryScienceGoals: [
        'Custom robotic or human exploration trajectory',
        'Verify local solar grazing angles and direct-to-Earth communication limits'
      ],
      horizonProfile
    };

    onAddCustomSite(newSite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Input Custom Lunar Coordinates
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-slate-400">Quick Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Site Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Subtitle / Role</label>
              <input
                type="text"
                value={subName}
                onChange={e => setSubName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <label className="text-slate-400">Latitude (-90° to +90°)</label>
                <span className="font-mono text-cyan-400">{latitude}°</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="-90"
                max="90"
                value={latitude}
                onChange={e => setLatitude(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <label className="text-slate-400">Longitude (-180° to +180°)</label>
                <span className="font-mono text-cyan-400">{longitude}°</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="-180"
                max="180"
                value={longitude}
                onChange={e => setLongitude(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">LOLA Elevation (meters)</label>
              <input
                type="number"
                step="50"
                value={elevationMeters}
                onChange={e => setElevationMeters(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Estimated Landing Slope (°)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={meanSlopeDeg}
                onChange={e => setMeanSlopeDeg(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Synthesize & Add Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
