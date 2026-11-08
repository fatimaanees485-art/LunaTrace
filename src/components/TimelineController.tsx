import React, { useState, useEffect, useRef } from 'react';
import { EphemerisPoint } from '../types/lunar';
import { Play, Pause, RotateCcw, Calendar, Sun, Radio, Clock, ChevronRight } from 'lucide-react';

interface TimelineControllerProps {
  timeline: EphemerisPoint[];
  currentTimestampMs: number;
  setCurrentTimestampMs: React.Dispatch<React.SetStateAction<number>>;
  missionStartDateIso: string;
  setMissionStartDateIso: (dateIso: string) => void;
  missionDurationDays: number;
  setMissionDurationDays: (days: number) => void;
}

export const TimelineController: React.FC<TimelineControllerProps> = ({
  timeline,
  currentTimestampMs,
  setCurrentTimestampMs,
  missionStartDateIso,
  setMissionStartDateIso,
  missionDurationDays,
  setMissionDurationDays
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(24);
  const trackRef = useRef<HTMLDivElement>(null);

  const minTimestamp = timeline.length > 0 ? timeline[0].timestamp : 0;
  const maxTimestamp = timeline.length > 0 ? timeline[timeline.length - 1].timestamp : 0;
  const totalDurationMs = maxTimestamp - minTimestamp;

  // Play animation loop
  useEffect(() => {
    if (!isPlaying || totalDurationMs <= 0) return;

    const interval = setInterval(() => {
      setCurrentTimestampMs(prev => {
        const stepMs = (3600 * 1000 * speedMultiplier) / 10;
        const next = prev + stepMs;
        if (next >= maxTimestamp) {
          setIsPlaying(false);
          return maxTimestamp;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, maxTimestamp, totalDurationMs, setCurrentTimestampMs]);

  const progressFraction = totalDurationMs > 0 ? Math.max(0, Math.min(1, (currentTimestampMs - minTimestamp) / totalDurationMs)) : 0;

  // Direct track seek / scrub handler
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current || totalDurationMs <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();

    const updateTimeFromX = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const fraction = x / rect.width;
      const ts = minTimestamp + fraction * totalDurationMs;
      setCurrentTimestampMs(ts);
    };

    updateTimeFromX(e.clientX);

    const onPointerMove = (moveEv: PointerEvent) => {
      updateTimeFromX(moveEv.clientX);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // SVG Waveform dimension
  const graphWidth = 900;
  const graphHeight = 26;

  // Map timeline points to SVG coordinates
  // Solar elevation: range -6° to +6°
  const solarPointsStr = timeline.map((pt, i) => {
    const x = (i / Math.max(1, timeline.length - 1)) * graphWidth;
    const clampedEl = Math.max(-6, Math.min(6, pt.sunElevationDeg));
    const y = ((6 - clampedEl) / 12) * (graphHeight - 6) + 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Earth elevation: range -8° to +12°
  const earthPointsStr = timeline.map((pt, i) => {
    const x = (i / Math.max(1, timeline.length - 1)) * graphWidth;
    const clampedEl = Math.max(-8, Math.min(12, pt.earthElevationDeg));
    const y = ((12 - clampedEl) / 20) * (graphHeight - 6) + 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const currentCursorX = progressFraction * graphWidth;

  // Current values
  const currentPt = timeline.find(p => p.timestamp >= currentTimestampMs) || timeline[0];
  const currentDateObj = new Date(currentTimestampMs);
  const formattedTime = currentDateObj.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  // Mission Elapsed Days / Hours
  const elapsedHours = totalDurationMs > 0 ? Math.floor((currentTimestampMs - minTimestamp) / (3600 * 1000)) : 0;
  const elapsedDays = Math.floor(elapsedHours / 24);
  const remHours = elapsedHours % 24;

  return (
    <footer className="bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-4 py-2 shrink-0 z-30 flex flex-col gap-1.5 shadow-2xl">
      {/* Row 1: Unified Streamlined Controls & Telemetry Readout */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        {/* Left: Playback & Scrub Engine */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
              isPlaying
                ? 'bg-amber-400 text-slate-950'
                : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="font-mono text-[11px]">{isPlaying ? 'PAUSE' : 'SIMULATE'}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimestampMs(minTimestamp);
            }}
            className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            title="Reset to Mission Start (T+0)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Multiplier Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-[10px] font-mono">
            {[1, 24, 100, 500].map(spd => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  speedMultiplier === spd
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Inline Launch Date Input */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-md px-2 py-0.5 text-[11px]">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Epoch:</span>
            <input
              type="date"
              value={missionStartDateIso}
              onChange={(e) => setMissionStartDateIso(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] font-mono focus:outline-none cursor-pointer"
            />
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-md p-0.5 text-[10px] font-mono">
            <span className="text-[10px] text-slate-500 px-1 hidden md:inline">SPAN:</span>
            {[14, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setMissionDurationDays(days)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  missionDurationDays === days
                    ? 'bg-slate-800 text-slate-100 font-bold text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Right: Live Real-Time Telemetry Metrics */}
        <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
          {/* Mission Elapsed Time */}
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/80">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 font-bold">
              T+{elapsedDays}d {remHours}h
            </span>
            <span className="text-slate-500 hidden lg:inline">({formattedTime})</span>
          </div>

          {/* Real-Time Sun Angle */}
          <div className="flex items-center gap-1 text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40 font-bold">
            <Sun className="w-3 h-3" />
            <span className="text-slate-400 font-normal">SUN:</span>
            <span className="tabular-nums">
              {currentPt && currentPt.sunElevationDeg > 0 ? `+${currentPt.sunElevationDeg}°` : `${currentPt?.sunElevationDeg || 0}°`}
            </span>
          </div>

          {/* Real-Time Earth Angle */}
          <div className="flex items-center gap-1 text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
            <Radio className="w-3 h-3" />
            <span className="text-slate-400 font-normal">LOS:</span>
            <span className="tabular-nums">
              {currentPt && currentPt.earthElevationDeg > 0 ? `+${currentPt.earthElevationDeg}°` : `${currentPt?.earthElevationDeg || 0}°`}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Streamlined Interactive Waveform Ribbon Track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative w-full h-[26px] bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden cursor-pointer select-none group shadow-inner"
        title="Click or drag to scrub mission timeline"
      >
        {/* Background Grid & 0° Horizon Line */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-slate-600 pointer-events-none z-0">
          <span>0d (Launch)</span>
          <span className="text-slate-700 hidden sm:inline">··· 0° LOCAL HORIZON ···</span>
          <span>{missionDurationDays}d (End)</span>
        </div>

        {/* SVG Waveforms */}
        <svg
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* Zero elevation reference dashed line */}
          <line
            x1="0"
            y1={graphHeight / 2}
            x2={graphWidth}
            y2={graphHeight / 2}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Earth elevation trajectory */}
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.8"
            opacity="0.85"
            points={earthPointsStr}
          />

          {/* Sun elevation trajectory */}
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            opacity="0.85"
            points={solarPointsStr}
          />

          {/* Current Scrubber Needle */}
          <line
            x1={currentCursorX}
            y1="0"
            x2={currentCursorX}
            y2={graphHeight}
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>

        {/* Needle Head Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none z-10"
          style={{ left: `${progressFraction * 100}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full -translate-x-[4px] -translate-y-[2px] shadow-sm border border-cyan-400" />
        </div>
      </div>
    </footer>
  );
};
