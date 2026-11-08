import React from 'react';
import { CheckCircle2, ExternalLink, X, Compass, Globe, Clock, ShieldCheck, FileCheck } from 'lucide-react';

interface ChallengeInfoModalProps {
  onClose: () => void;
}

export const ChallengeInfoModal: React.FC<ChallengeInfoModalProps> = ({ onClose }) => {
  const criteriaList = [
    {
      title: '1. Interactive Site Selection & Comparison',
      desc: 'Enables choosing from curated notable lunar sites (Artemis III, CLPS targets, VIPER, Apollo benchmarks) or entering custom lunar coordinates. Provides multi-site side-by-side trade-off comparisons with customizable weighted scoring.',
      status: 'Fully Compliant',
      icon: <Compass className="w-4 h-4 text-cyan-400" />
    },
    {
      title: '2. Date & Time Flexibility',
      desc: 'Allows users to pick specific landing dates and timeframes to simulate how illumination and direct-to-Earth communication windows vary across lunar days, seasons (axial tilt ±1.54°), and libration cycles (~27.3 days).',
      status: 'Fully Compliant',
      icon: <Clock className="w-4 h-4 text-cyan-400" />
    },
    {
      title: '3. Sun & Earth Position Relative to Local Horizon',
      desc: 'Visually renders positions and trajectories of the Sun and Earth on a 360° Polar Sky Dome and unwrapped panoramic profile. Accurately calculates operational metrics including countdowns to sunset/earthset, array power generation, and comm margins.',
      status: 'Fully Compliant',
      icon: <Globe className="w-4 h-4 text-cyan-400" />
    },
    {
      title: '4. Topography & LOLA Horizon Masking',
      desc: 'Accounts for lunar terrain obstruction using Lunar Orbiter Laser Altimeter (LOLA) elevation profiles, identifying shadow casting by steep crater rims and high massifs (e.g., Shackleton, Malapert). Evaluates slopes (<10° safe landing criterion).',
      status: 'Fully Compliant',
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
    },
    {
      title: '5. Mission Planners & Public Accessibility',
      desc: 'Dual-utility design: provides deep scientific precision for mission planners (CSV/JSON ephemeris export, traverse cross-section analysis) while remaining intuitive and visual for students, educators, and the general public.',
      status: 'Fully Compliant',
      icon: <FileCheck className="w-4 h-4 text-cyan-400" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>LunaTrace · NASA Space Apps Technical Criteria Verification</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Challenge: Lunar Landing Site Navigator (spaceappschallenge.org)
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs text-slate-300">
          <p className="text-slate-300 leading-relaxed">
            <strong>LunaTrace</strong> is developed for the <strong>Lunar Landing Site Navigator</strong> NASA Space Apps Challenge to provide an intuitive, high-fidelity tool to evaluate, visualize, and compare candidate landing sites on the Moon—focusing on extreme polar lighting constraints, topographic shadow masking, and direct-to-Earth communication visibility.
          </p>

          <div className="flex flex-col gap-3">
            {criteriaList.map((item, index) => (
              <div key={index} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{item.status}</span>
                  </span>
                </div>
                <p className="text-slate-400 text-xs pl-6">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-cyan-200 text-xs">
            <strong>Key Ephemeris Engine Standards:</strong> Calculations implement axial tilt declination (±1.54°), lunar synodic month (29.53 days), optical libration in latitude and longitude, LOLA geometric horizon dip (&theta;<sub>dip</sub> &asymp; &radic;(2h/R)), and discrete azimuth obstacle masking.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-semibold hover:bg-cyan-300 cursor-pointer"
          >
            Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
