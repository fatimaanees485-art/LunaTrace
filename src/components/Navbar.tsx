import React from 'react';
import { Compass, Download, CheckCircle2, HardDrive } from 'lucide-react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

interface NavbarProps {
  activeTab: 'explorer' | 'horizon' | 'comparison' | 'traverse';
  setActiveTab: (tab: 'explorer' | 'horizon' | 'comparison' | 'traverse') => void;
  onOpenReport: () => void;
  onOpenChallengeModal: () => void;
  onOpenCustomSite: () => void;
  onOpenDriveModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenReport,
  onOpenChallengeModal,
  onOpenCustomSite,
  onOpenDriveModal
}) => {
  const { user } = useGoogleAuth();

  return (
    <header className="flex items-center justify-between gap-6 px-5 py-3 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm shadow-sm shadow-cyan-950">
          LT
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            LunaTrace
          </span>
          <span className="text-[10px] font-mono text-cyan-400/80 tracking-wide">
            LUNAR LANDING SITE NAVIGATOR
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
            activeTab === 'explorer'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          3D Lunar & Polar Explorer
        </button>
        <button
          onClick={() => setActiveTab('horizon')}
          className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
            activeTab === 'horizon'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Local Horizon & Sky Dome
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
            activeTab === 'comparison'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Site Trade-Off Analysis
        </button>
        <button
          onClick={() => setActiveTab('traverse')}
          className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
            activeTab === 'traverse'
              ? 'text-cyan-400 border-cyan-400 font-semibold'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Rover Traverse Planner
        </button>
        <button
          onClick={onOpenChallengeModal}
          className="transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 border-transparent text-amber-400/90 hover:text-amber-300 flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Challenge Criteria
        </button>
      </nav>

      {/* Zone 3: Actions + Google Drive button */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Google Drive Workspace Button */}
        <button
          onClick={onOpenDriveModal}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
            user
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/50'
              : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Open Google Drive Lunar Mission Workspace"
        >
          <HardDrive className={`w-3.5 h-3.5 ${user ? 'text-blue-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Google Drive</span>
          {user ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500" title="Connected"></span>
          ) : (
            <span className="text-[10px] text-slate-500 hidden md:inline">Connect</span>
          )}
        </button>

        <button
          onClick={onOpenCustomSite}
          className="hidden md:inline-flex px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-md hover:bg-slate-800 hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer"
        >
          Custom Coordinates
        </button>

        <button
          onClick={onOpenReport}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap shadow-sm shadow-cyan-950 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Plan</span>
        </button>
      </div>
    </header>
  );
};
