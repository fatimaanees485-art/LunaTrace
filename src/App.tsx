import React, { useState, useMemo } from 'react';
import { DatasetLayer, LunarLandingSite } from './types/lunar';
import { LUNAR_LANDING_SITES } from './data/lunarSites';
import { computeEphemerisPoint, generateEphemerisTimeline, summarizeMissionWindows } from './utils/lunarMath';
import { Navbar } from './components/Navbar';
import { LunarGlobe } from './components/LunarGlobe';
import { LocalHorizonView } from './components/LocalHorizonView';
import { TimelineController } from './components/TimelineController';
import { SiteComparisonModal } from './components/SiteComparisonModal';
import { RoverTraversePlanner } from './components/RoverTraversePlanner';
import { CustomCoordinateModal } from './components/CustomCoordinateModal';
import { ReportExportModal } from './components/ReportExportModal';
import { ChallengeInfoModal } from './components/ChallengeInfoModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { GoogleAuthProviderContext } from './context/GoogleAuthContext';

export default function App() {
  const [sites, setSites] = useState<LunarLandingSite[]>(LUNAR_LANDING_SITES);
  const [selectedSite, setSelectedSite] = useState<LunarLandingSite>(LUNAR_LANDING_SITES[0]);
  const [activeLayer, setActiveLayer] = useState<DatasetLayer>('elevation');
  const [activeTab, setActiveTab] = useState<'explorer' | 'horizon' | 'comparison' | 'traverse'>('explorer');

  // Mission Timeline Parameters
  const [missionStartDateIso, setMissionStartDateIso] = useState('2026-11-15');
  const [missionDurationDays, setMissionDurationDays] = useState(14);

  const startTimestampMs = useMemo(() => {
    return new Date(`${missionStartDateIso}T00:00:00Z`).getTime();
  }, [missionStartDateIso]);

  const [currentTimestampMs, setCurrentTimestampMs] = useState<number>(startTimestampMs);

  // When start date changes, sync current timestamp if out of bounds
  React.useEffect(() => {
    setCurrentTimestampMs(startTimestampMs);
  }, [startTimestampMs]);

  // Compute ephemeris timeline for current site & timeframe
  const timeline = useMemo(() => {
    return generateEphemerisTimeline(selectedSite, startTimestampMs, missionDurationDays, 2);
  }, [selectedSite, startTimestampMs, missionDurationDays]);

  // Current instantaneous ephemeris point
  const currentEphemeris = useMemo(() => {
    return computeEphemerisPoint(selectedSite, currentTimestampMs);
  }, [selectedSite, currentTimestampMs]);

  // Mission feasibility window summary
  const missionSummary = useMemo(() => {
    return summarizeMissionWindows(timeline, currentTimestampMs);
  }, [timeline, currentTimestampMs]);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showCustomSiteModal, setShowCustomSiteModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);

  const handleAddCustomSite = (newSite: LunarLandingSite) => {
    setSites(prev => [newSite, ...prev]);
    setSelectedSite(newSite);
  };

  return (
    <GoogleAuthProviderContext>
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
        {/* Top Bar Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'comparison') {
              setShowComparisonModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
          onOpenReport={() => setShowReportModal(true)}
          onOpenChallengeModal={() => setShowChallengeModal(true)}
          onOpenCustomSite={() => setShowCustomSiteModal(true)}
          onOpenDriveModal={() => setShowDriveModal(true)}
        />

        {/* Main Content Stage */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'explorer' && (
            <LunarGlobe
              sites={sites}
              selectedSite={selectedSite}
              onSelectSite={setSelectedSite}
              activeLayer={activeLayer}
              setActiveLayer={setActiveLayer}
              currentTimestampMs={currentTimestampMs}
            />
          )}

          {activeTab === 'horizon' && (
            <div className="flex-1 overflow-y-auto">
              <LocalHorizonView
                site={selectedSite}
                currentEphemeris={currentEphemeris}
                missionSummary={missionSummary}
                timeline={timeline}
                currentTimestampMs={currentTimestampMs}
              />
            </div>
          )}

          {activeTab === 'traverse' && (
            <div className="flex-1 overflow-y-auto">
              <RoverTraversePlanner selectedSite={selectedSite} />
            </div>
          )}
        </main>

        {/* Bottom Mission Timeline Scrubber */}
        <TimelineController
          timeline={timeline}
          currentTimestampMs={currentTimestampMs}
          setCurrentTimestampMs={setCurrentTimestampMs}
          missionStartDateIso={missionStartDateIso}
          setMissionStartDateIso={setMissionStartDateIso}
          missionDurationDays={missionDurationDays}
          setMissionDurationDays={setMissionDurationDays}
        />

        {/* Modals */}
        {showComparisonModal && (
          <SiteComparisonModal
            sites={sites}
            selectedSite={selectedSite}
            onSelectSite={(s) => {
              setSelectedSite(s);
              setShowComparisonModal(false);
            }}
            onClose={() => setShowComparisonModal(false)}
          />
        )}

        {showCustomSiteModal && (
          <CustomCoordinateModal
            onAddCustomSite={handleAddCustomSite}
            onClose={() => setShowCustomSiteModal(false)}
          />
        )}

        {showReportModal && (
          <ReportExportModal
            site={selectedSite}
            summary={missionSummary}
            timeline={timeline}
            missionStartDateIso={missionStartDateIso}
            missionDurationDays={missionDurationDays}
            onClose={() => setShowReportModal(false)}
          />
        )}

        {showChallengeModal && (
          <ChallengeInfoModal onClose={() => setShowChallengeModal(false)} />
        )}

        {showDriveModal && (
          <GoogleDriveModal
            currentSite={selectedSite}
            currentSummary={missionSummary}
            timeline={timeline}
            missionStartDateIso={missionStartDateIso}
            missionDurationDays={missionDurationDays}
            onClose={() => setShowDriveModal(false)}
          />
        )}
      </div>
    </GoogleAuthProviderContext>
  );
}
