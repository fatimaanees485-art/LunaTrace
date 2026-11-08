import React, { useState } from 'react';
import { EphemerisPoint, LunarLandingSite, MissionWindowSummary } from '../types/lunar';
import { Download, FileText, CheckCircle2, X, HardDrive, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { uploadFileToDrive } from '../services/googleDriveService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface ReportExportModalProps {
  site: LunarLandingSite;
  summary: MissionWindowSummary;
  timeline: EphemerisPoint[];
  missionStartDateIso: string;
  missionDurationDays: number;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  site,
  summary,
  timeline,
  missionStartDateIso,
  missionDurationDays,
  onClose
}) => {
  const { user, accessToken, isLoggingIn, signIn } = useGoogleAuth();

  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<{ name: string; url?: string } | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);

  // Generate CSV text
  const generateCsvContent = () => {
    const headers = [
      'Timestamp_Epoch_Ms',
      'Date_UTC',
      'Sun_Elevation_Deg',
      'Sun_Azimuth_Deg',
      'Earth_Elevation_Deg',
      'Earth_Azimuth_Deg',
      'Is_Sunlit',
      'Is_Earth_Visible',
      'Solar_Flux_Wm2',
      'Power_Potential_Pct',
      'Comm_Link_Margin_Db'
    ];

    const rows = timeline.map(p => [
      p.timestamp,
      p.dateIso,
      p.sunElevationDeg,
      p.sunAzimuthDeg,
      p.earthElevationDeg,
      p.earthAzimuthDeg,
      p.isSunlit ? 1 : 0,
      p.isEarthVisible ? 1 : 0,
      p.solarFluxWm2,
      p.powerPotentialPct,
      p.commSignalMarginDb
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  // Generate JSON payload
  const generateJsonData = () => {
    return {
      project: 'LunaTrace - NASA Space Apps Challenge Lunar Landing Site Navigator',
      exportedAt: new Date().toISOString(),
      siteDetails: site,
      missionParameters: {
        launchDate: missionStartDateIso,
        durationDays: missionDurationDays
      },
      feasibilitySummary: summary,
      sampleEphemerisPoints: timeline.slice(0, 50)
    };
  };

  // Download local CSV ephemeris
  const handleDownloadCsv = () => {
    const csvContent = generateCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LunaTrace_Assessment_${site.id}_${missionStartDateIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download local JSON mission package
  const handleDownloadJson = () => {
    const data = generateJsonData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LunaTrace_Mission_Assessment_${site.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save JSON report directly to user's Google Drive
  const handleSaveJsonToDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveUploadError(null);
    setDriveUploadSuccess(null);
    try {
      const data = generateJsonData();
      const filename = `LunaTrace_Assessment_${site.id}_${missionStartDateIso}.json`;
      const uploaded = await uploadFileToDrive({
        filename,
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        description: `NASA Lunar Landing Assessment for ${site.name} (${missionStartDateIso})`
      });

      setDriveUploadSuccess({
        name: uploaded.name,
        url: uploaded.webViewLink
      });
    } catch (err: any) {
      console.error('Error uploading to Google Drive:', err);
      setDriveUploadError(err.message || 'Failed to upload report to Google Drive');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Save CSV ephemeris directly to Google Drive
  const handleSaveCsvToDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveUploadError(null);
    setDriveUploadSuccess(null);
    try {
      const csvContent = generateCsvContent();
      const filename = `LunaTrace_Ephemeris_${site.id}_${missionStartDateIso}.csv`;
      const uploaded = await uploadFileToDrive({
        filename,
        content: csvContent,
        mimeType: 'text/csv',
        description: `Ephemeris and illumination calculations for ${site.name}`
      });

      setDriveUploadSuccess({
        name: uploaded.name,
        url: uploaded.webViewLink
      });
    } catch (err: any) {
      console.error('Error uploading CSV to Google Drive:', err);
      setDriveUploadError(err.message || 'Failed to upload CSV to Google Drive');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              LunaTrace · NASA Lunar Landing Site Assessment Briefing
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs text-slate-300 font-sans">
          {/* Executive Overview Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-100">{site.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                {site.category.toUpperCase()} MISSION CANDIDATE
              </span>
            </div>
            <div className="text-slate-400 text-xs">
              {site.description}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Coordinates</span>
                <span className="text-slate-200">{site.latitude}° Lat, {site.longitude}° Lon</span>
              </div>
              <div>
                <span className="text-slate-500 block">Elevation</span>
                <span className="text-slate-200">+{site.elevationMeters} m</span>
              </div>
              <div>
                <span className="text-slate-500 block">Landing Slope</span>
                <span className="text-slate-200">{site.meanSlopeDeg}° mean (safe)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cold Trap PSR</span>
                <span className="text-cyan-400">{site.distanceToPsrKm} km proximity</span>
              </div>
            </div>
          </div>

          {/* Operational Feasibility Telemetry Table */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
              Lighting & Communication Feasibility Summary ({missionDurationDays} Days / {summary.totalHours} Hours)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-mono">Sunlight Availability</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{summary.sunlitPct}%</span>
                <span className="text-[10px] text-slate-400 block">{summary.sunlitHours} hours</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-mono">Earth Direct LOS</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">{summary.earthVisiblePct}%</span>
                <span className="text-[10px] text-slate-400 block">{summary.earthVisibleHours} hours</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-mono">Concurrent Operations</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{summary.concurrentPct}%</span>
                <span className="text-[10px] text-slate-400 block">{summary.concurrentHours} concurrent hrs</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-mono">Max Night Duration</span>
                <span className="text-lg font-bold text-slate-200 font-mono">{summary.maxContinuousDarkHours}h</span>
                <span className="text-[10px] text-slate-400 block">Battery storage limit</span>
              </div>
            </div>
          </div>

          {/* Google Drive Integration Panel */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200 text-xs">
                  Save Assessment Directly to Google Drive
                </span>
              </div>
              {user ? (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected ({user.email})
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  Sign in required
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upload this assessment directly into your Google Drive's <span className="text-blue-300 font-mono">LunaTrace Mission Data</span> directory with one click.
            </p>

            {driveUploadSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Saved <strong>{driveUploadSuccess.name}</strong> to Google Drive!</span>
                </div>
                {driveUploadSuccess.url && (
                  <a
                    href={driveUploadSuccess.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-300 hover:text-emerald-100 underline text-[11px]"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {driveUploadError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{driveUploadError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!user ? (
                <GoogleSignInButton
                  onClick={signIn}
                  isLoading={isLoggingIn}
                  size="sm"
                  label="Sign in to save to Google Drive"
                />
              ) : (
                <>
                  <button
                    onClick={handleSaveJsonToDrive}
                    disabled={isUploadingToDrive}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    {isUploadingToDrive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5" />
                    )}
                    <span>Save JSON Package to Drive</span>
                  </button>

                  <button
                    onClick={handleSaveCsvToDrive}
                    disabled={isUploadingToDrive}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isUploadingToDrive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5" />
                    )}
                    <span>Save Ephemeris CSV to Drive</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Primary Science Objectives */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
              Primary Science & Exploration Return
            </span>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-slate-300">
              {site.primaryScienceGoals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Generated with NASA LOLA & Ephemeris Engine
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Ephemeris CSV</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Package</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
