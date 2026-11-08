import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  HardDrive,
  FileText,
  Trash2,
  ExternalLink,
  RefreshCw,
  FolderPlus,
  AlertTriangle,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Clock,
  Eye,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  listDriveFiles,
  deleteDriveFile,
  downloadDriveFileContent,
  uploadFileToDrive,
  DriveFileItem
} from '../services/googleDriveService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LunarLandingSite, MissionWindowSummary, EphemerisPoint } from '../types/lunar';

interface GoogleDriveModalProps {
  currentSite?: LunarLandingSite;
  currentSummary?: MissionWindowSummary;
  timeline?: EphemerisPoint[];
  missionStartDateIso?: string;
  missionDurationDays?: number;
  onClose: () => void;
  onLoadSiteData?: (site: LunarLandingSite) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  currentSite,
  currentSummary,
  timeline,
  missionStartDateIso = '2026-11-15',
  missionDurationDays = 14,
  onClose,
  onLoadSiteData
}) => {
  const { user, accessToken, isLoggingIn, error: authError, signIn, signOut } = useGoogleAuth();

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filterLunaTraceOnly, setFilterLunaTraceOnly] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // File to delete state for explicit confirmation dialog
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File preview state
  const [previewFile, setPreviewFile] = useState<{ item: DriveFileItem; content: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Quick save state
  const [isSavingMission, setIsSavingMission] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    setActionError(null);
    try {
      const items = await listDriveFiles(filterLunaTraceOnly);
      setFiles(items);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
      setActionError(err.message || 'Unable to retrieve files from Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [accessToken, filterLunaTraceOnly]);

  useEffect(() => {
    if (accessToken) {
      fetchFiles();
    }
  }, [accessToken, fetchFiles]);

  // Handle destructive delete file with explicit confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteDriveFile(fileToDelete.id);
      setActionSuccess(`Deleted "${fileToDelete.name}" from Google Drive.`);
      setFileToDelete(null);
      if (previewFile?.item.id === fileToDelete.id) {
        setPreviewFile(null);
      }
      await fetchFiles();
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      setActionError(err.message || 'Failed to delete file.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview file content
  const handlePreviewFile = async (item: DriveFileItem) => {
    setIsLoadingPreview(true);
    setActionError(null);
    try {
      const content = await downloadDriveFileContent(item.id);
      setPreviewFile({ item, content });
    } catch (err: any) {
      console.error('Failed to preview file:', err);
      setActionError(`Could not read file "${item.name}": ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Quick save current active mission assessment package
  const handleSaveActiveMission = async () => {
    if (!currentSite || !currentSummary) return;
    setIsSavingMission(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const missionPayload = {
        application: 'LunaTrace - NASA Space Apps Lunar Navigator',
        exportedAt: new Date().toISOString(),
        site: currentSite,
        missionParameters: {
          startDate: missionStartDateIso,
          durationDays: missionDurationDays
        },
        feasibilitySummary: currentSummary,
        ephemerisSnippet: (timeline || []).slice(0, 48)
      };

      const filename = `LunaTrace_${currentSite.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Assessment.json`;
      const uploaded = await uploadFileToDrive({
        filename,
        content: JSON.stringify(missionPayload, null, 2),
        mimeType: 'application/json',
        description: `Comprehensive feasibility study and illumination telemetry for ${currentSite.name}`
      });

      setActionSuccess(`Successfully saved "${uploaded.name}" to Google Drive folder "LunaTrace Mission Data"!`);
      await fetchFiles();
    } catch (err: any) {
      console.error('Error saving mission to drive:', err);
      setActionError(err.message || 'Failed to save mission file to Google Drive.');
    } finally {
      setIsSavingMission(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '--';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string, mimeType: string) => {
    if (mimeType.includes('csv') || name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (mimeType.includes('json') || name.endsWith('.json')) {
      return <FileCode className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Google Drive · Lunar Mission Workspace
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/80">
                  Cloud Sync Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Store, archive, and retrieve landing site feasibility dossiers & rover traverses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={signOut}
                title="Sign out of Google"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="px-6 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full border border-slate-700"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center font-mono">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-slate-200 font-medium">
                {user.displayName || user.email}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                ({user.email})
              </span>
            </div>
          ) : (
            <span className="text-slate-400">
              Not connected to Google Drive. Sign in to sync and back up mission files.
            </span>
          )}

          {user && currentSite && currentSummary && (
            <button
              onClick={handleSaveActiveMission}
              disabled={isSavingMission}
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSavingMission ? 'Saving...' : `Save ${currentSite.name} to Drive`}</span>
            </button>
          )}
        </div>

        {/* Notification alerts */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {!user ? (
            /* Auth Promotion State */
            <div className="my-auto py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-950/40">
                <HardDrive className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Connect Google Drive for Lunar Mission Archiving
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Seamlessly save Artemis landing site evaluations, direct ephemeris timelines, and rover traverse itineraries directly to your Google Drive in a dedicated <code className="text-blue-300 font-mono">LunaTrace Mission Data</code> folder.
              </p>

              <GoogleSignInButton
                onClick={signIn}
                isLoading={isLoggingIn}
                size="lg"
                label="Sign in with Google to Connect Drive"
              />

              {authError && (
                <p className="mt-3 text-xs text-rose-400">{authError}</p>
              )}

              <div className="mt-8 grid grid-cols-3 gap-3 w-full text-left">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-200 block mb-0.5">Automated Folder</span>
                  <span className="text-slate-400 text-[10px]">Organizes files in dedicated Google Drive directory</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-200 block mb-0.5">Mission Dossiers</span>
                  <span className="text-slate-400 text-[10px]">Save JSON packages and CSV ephemeris tables</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-200 block mb-0.5">Secure OAuth</span>
                  <span className="text-slate-400 text-[10px]">Google Workspace verified tokens in memory</span>
                </div>
              </div>
            </div>
          ) : (
            /* Connected Files Management State */
            <div className="flex flex-col gap-4">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterLunaTraceOnly(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      filterLunaTraceOnly
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    LunaTrace Files
                  </button>
                  <button
                    onClick={() => setFilterLunaTraceOnly(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      !filterLunaTraceOnly
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Drive Files
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchFiles}
                    disabled={isLoadingFiles}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Refresh Drive files list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    <span className="text-[11px]">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Files Table / List */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <span className="col-span-6">File Name</span>
                  <span className="col-span-2">Modified</span>
                  <span className="col-span-2">Size</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>

                {isLoadingFiles ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                    <span className="text-xs">Querying Google Drive API...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3 text-center px-4">
                    <HardDrive className="w-8 h-8 text-slate-600" />
                    <div>
                      <p className="text-xs font-medium text-slate-300">No mission files found in Google Drive</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Click "Save to Drive" above or export a mission plan to create your first cloud archive.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                    {files.map(item => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 items-center px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors font-sans"
                      >
                        {/* File Name & Icon */}
                        <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="shrink-0">{getFileIcon(item.name, item.mimeType)}</div>
                          <span className="truncate font-medium text-slate-200" title={item.name}>
                            {item.name}
                          </span>
                        </div>

                        {/* Modified Time */}
                        <div className="col-span-2 text-slate-400 text-[11px] font-mono truncate">
                          {item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : '--'}
                        </div>

                        {/* File Size */}
                        <div className="col-span-2 text-slate-400 text-[11px] font-mono">
                          {formatFileSize(item.size)}
                        </div>

                        {/* Action buttons */}
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePreviewFile(item)}
                            title="Preview file content"
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {item.webViewLink && (
                            <a
                              href={item.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in Google Drive"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setFileToDelete(item)}
                            title="Delete file from Google Drive"
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview modal/box */}
              {previewFile && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        Preview: {previewFile.item.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono"
                    >
                      Close Preview
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                    {previewFile.content}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Google Drive API v3 · Secured with OAuth 2.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* MANDATORY EXPLICIT CONFIRMATION MODAL FOR DESTRUCTIVE ACTION (DELETE) */}
        {fileToDelete && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Confirm File Deletion
                  </h3>
                  <span className="text-xs text-rose-300 font-medium">
                    This action permanently deletes user data
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1.5 font-sans">
                <p>
                  Are you sure you want to delete <span className="font-semibold text-slate-100 font-mono">"{fileToDelete.name}"</span> from Google Drive?
                </p>
                <p className="text-[11px] text-slate-400">
                  This action cannot be undone and will permanently remove this file from your Google Drive account.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-rose-950"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
