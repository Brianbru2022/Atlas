import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Video, Mic, Clock, Download, Upload, CheckCircle2, AlertCircle, Layers3, Film, FolderTree } from 'lucide-react';
import { VideoClip } from '../types';
import { Button } from './ui';
import { buildClipDataExport, parseImportedClipData } from '../utils/scriptDocument';

interface StoryboardViewProps {
  content: string;
  title?: string;
  /** When script has no [CLIP X: ...] markers, use these clips to build storyboard segments that match the script. */
  videoClips?: VideoClip[] | null;
  onImportClips?: (clips: VideoClip[]) => Promise<void> | void;
}

interface Shot {
  type: 'visual' | 'audio';
  content: string;
  clipLabels: string[];
  clipDescriptions: string[];
  durationSeconds?: number;
}

interface ClipReference {
  label: string;
  description: string;
  durationSeconds?: number;
}

interface PlayableClipEntry {
  label: string;
  clip: VideoClip;
}

interface ClipLegendItem {
  kind: 'container' | 'playable';
  label: string;
  description: string;
  seconds: number;
}

interface AuditRow {
  id: string;
  clipLabels: string[];
  wordCount: number;
  targetSeconds: number;
  assignedSeconds: number;
  status: 'good' | 'short' | 'long' | 'missing';
  fitReason: string;
}

/** Split script text into segments by word count, weighted by clip duration. */
function splitScriptByClipDuration(text: string, durations: number[]): string[] {
  const trimmed = text.trim();
  if (!trimmed || durations.length === 0) return [];
  if (durations.length === 1) return [trimmed];

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const segments: string[] = [];
  const totalDuration = durations.reduce((sum, duration) => sum + Math.max(duration, 1), 0);
  let start = 0;

  for (let i = 0; i < durations.length; i++) {
    const isLast = i === durations.length - 1;
    const ratio = Math.max(durations[i], 1) / totalDuration;
    const targetWordCount = Math.max(1, Math.round(words.length * ratio));
    const end = isLast ? words.length : Math.min(start + targetWordCount, words.length);
    const segmentWords = words.slice(start, end);
    segments.push(segmentWords.join(' '));
    start = end;
  }

  return segments.filter(s => s.length > 0);
}

/** Detect if script contains explicit [CLIP 1: ...], [CLIP 2: ...] style markers. */
function scriptHasClipMarkers(text: string): boolean {
  return /\[CLIP\s+\d+/i.test(text);
}

function countWords(text: string): number {
  const words = text.match(/\b[\w']+\b/g);
  return words ? words.length : 0;
}

function buildClipReferenceMap(videoClips?: VideoClip[] | null) {
  const clipMap = new Map<string, ClipReference>();
  const clips = videoClips ?? [];
  const mainClips = clips.filter(clip => !clip.parentId);
  const parentIds = new Set(clips.filter(clip => clip.parentId).map(clip => clip.parentId as string));

  mainClips.forEach((clip, mainIndex) => {
    const mainLabel = String(mainIndex + 1);
    if (!parentIds.has(clip.id)) {
      clipMap.set(mainLabel.toLowerCase(), {
        label: mainLabel,
        description: clip.description || `Clip ${mainLabel}`,
        durationSeconds: clip.length,
      });
    }

    const subclips = clips.filter(candidate => candidate.parentId === clip.id);
    subclips.forEach((subclip, subIndex) => {
      const subLabel = `${mainLabel}${String.fromCharCode(97 + subIndex)}`;
      clipMap.set(subLabel.toLowerCase(), {
        label: subLabel,
        description: subclip.description || `Clip ${subLabel}`,
        durationSeconds: subclip.length,
      });
    });
  });

  return clipMap;
}

function buildPlayableClipEntries(videoClips?: VideoClip[] | null): PlayableClipEntry[] {
  const clips = videoClips ?? [];
  const mainClips = clips.filter(clip => !clip.parentId);
  const parentIds = new Set(clips.filter(clip => clip.parentId).map(clip => clip.parentId as string));
  const entries: PlayableClipEntry[] = [];

  mainClips.forEach((clip, mainIndex) => {
    const mainLabel = String(mainIndex + 1);
    if (!parentIds.has(clip.id)) {
      entries.push({ label: mainLabel, clip });
    }

    const subclips = clips.filter(candidate => candidate.parentId === clip.id);
    subclips.forEach((subclip, subIndex) => {
      entries.push({
        label: `${mainLabel}${String.fromCharCode(97 + subIndex)}`,
        clip: subclip,
      });
    });
  });

  return entries;
}

function buildClipLegend(videoClips?: VideoClip[] | null): ClipLegendItem[] {
  const clips = videoClips ?? [];
  const mainClips = clips.filter(clip => !clip.parentId);
  const parentIds = new Set(clips.filter(clip => clip.parentId).map(clip => clip.parentId as string));
  const legend: ClipLegendItem[] = [];

  mainClips.forEach((clip, mainIndex) => {
    const mainLabel = String(mainIndex + 1);
    legend.push({
      kind: parentIds.has(clip.id) ? 'container' : 'playable',
      label: mainLabel,
      description: clip.description || `Clip ${mainLabel}`,
      seconds: clip.length,
    });

    const subclips = clips.filter(candidate => candidate.parentId === clip.id);
    subclips.forEach((subclip, subIndex) => {
      legend.push({
        kind: 'playable',
        label: `${mainLabel}${String.fromCharCode(97 + subIndex)}`,
        description: subclip.description || `Clip ${mainLabel}${String.fromCharCode(97 + subIndex)}`,
        seconds: subclip.length,
      });
    });
  });

  return legend;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({ content, title = 'script', videoClips, onImportClips }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const clipReferenceMap = buildClipReferenceMap(videoClips);
  const playableClipEntries = buildPlayableClipEntries(videoClips);
  const clipLegend = buildClipLegend(videoClips);

  const buildShots = (): Shot[] => {
    const hasMarkers = scriptHasClipMarkers(content);

    if (hasMarkers) {
      return parseScriptWithMarkers(content);
    }

    if (playableClipEntries.length > 0) {
      const segments = splitScriptByClipDuration(
        content,
        playableClipEntries.map(entry => entry.clip.length)
      );
      return segments.map((segmentText, i) => {
        const entry = playableClipEntries[i];
        const clip = entry?.clip;
        const label = entry?.label ?? String(i + 1);
        return {
          type: 'visual' as const,
          content: segmentText,
          clipLabels: [label],
          clipDescriptions: [clip?.description ?? `Clip ${i + 1}`],
          durationSeconds: clip?.length,
        };
      });
    }

    return parseScriptWithMarkers(content);
  };

  const parseScriptWithMarkers = (text: string): Shot[] => {
    const shots: Shot[] = [];
    const lines = text.split('\n').filter(line => !line.trim().toUpperCase().startsWith('[B-ROLL'));
    let currentShot: Shot | null = null;

    // Regex to identify clip headers: [CLIP X: ...], [CLIP Xa: ...], etc.
    const clipRegex = /^\[(CLIP|CLIPS)\s+([^:\]]+):\s*(.*?)\]/i;

    lines.forEach(line => {
      const match = line.match(clipRegex);
      
      if (match) {
        const clipLabels = match[2].split(',').map(label => label.trim()).filter(Boolean);
        const mappedClips = clipLabels.map(label => clipReferenceMap.get(label.toLowerCase()));
        const clipDescription = mappedClips
          .map(mappedClip => mappedClip?.description)
          .filter(Boolean)
          .join(' + ') || match[3] || match[0];
        const durationSeconds = mappedClips.reduce((sum, mappedClip) => sum + (mappedClip?.durationSeconds ?? 0), 0);

        if (currentShot && currentShot.content.trim()) {
          shots.push(currentShot);
          currentShot = null;
        }

        if (!currentShot) {
          currentShot = {
            type: 'visual',
            content: '',
            clipLabels,
            clipDescriptions: [clipDescription],
            durationSeconds: durationSeconds ?? 0,
          };
        } else {
          currentShot.clipLabels.push(...clipLabels);
          currentShot.clipDescriptions.push(clipDescription);
          currentShot.durationSeconds = (currentShot.durationSeconds ?? 0) + (durationSeconds ?? 0);
        }
      } else if (line.trim() !== '' && !line.trim().startsWith('[')) {
        if (!currentShot) {
          currentShot = { type: 'audio', content: line, clipLabels: [], clipDescriptions: [], durationSeconds: undefined };
        } else {
          currentShot.content += (currentShot.content ? '\n' : '') + line;
        }
      }
    });

    if (currentShot) {
      shots.push(currentShot);
    }

    return shots;
  };

  const shots = buildShots();
  const clipCount = (videoClips ?? []).length;
  const auditRows: AuditRow[] = shots.map((shot, index) => {
    const wordCount = countWords(shot.content);
    const targetSeconds = Math.max(1, Math.round((wordCount / 150) * 60));
    const assignedSeconds = shot.durationSeconds ?? 0;
    const delta = assignedSeconds - targetSeconds;
    const tolerance = Math.max(3, Math.round(targetSeconds * 0.35));
    let status: AuditRow['status'] = 'good';

    if (shot.clipLabels.length === 0 || assignedSeconds === 0) {
      status = 'missing';
    } else if (delta < -tolerance) {
      status = 'short';
    } else if (delta > tolerance) {
      status = 'long';
    }

    return {
      id: `audit-${index}`,
      clipLabels: shot.clipLabels,
      wordCount,
      targetSeconds,
      assignedSeconds,
      status,
      fitReason:
        status === 'missing'
          ? 'No playable clips are assigned to this paragraph yet.'
          : status === 'short'
            ? 'The assigned clips are too short for the amount of narration here.'
            : status === 'long'
              ? 'The assigned clips run longer than the paragraph likely needs at 150 wpm.'
              : 'Assigned runtime is close enough to the paragraph target to feel usable.',
    };
  });
  const flaggedRows = auditRows.filter(row => row.status !== 'good');
  const reuseCounts = auditRows.reduce<Record<string, number>>((acc, row) => {
    row.clipLabels.forEach(label => {
      acc[label] = (acc[label] ?? 0) + 1;
    });
    return acc;
  }, {});
  const heavyReuse = Object.entries(reuseCounts).filter(([, count]) => count > 1);

  const handleExportClips = () => {
    const payload = buildClipDataExport(title, videoClips ?? []);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'script'}_clips.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setImportStatus({ tone: 'success', message: `Downloaded ${clipCount} clip${clipCount === 1 ? '' : 's'} as JSON.` });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImportClips) {
      return;
    }

    try {
      const text = await file.text();
      const importedClips = parseImportedClipData(text);
      await onImportClips(importedClips);
      setImportStatus({
        tone: 'success',
        message: `Imported ${importedClips.length} clip${importedClips.length === 1 ? '' : 's'} from ${file.name}.`,
      });
    } catch (error) {
      console.error('Failed to import clip data', error);
      setImportStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Clip import failed. Check that the file is valid JSON.',
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-sc-bg p-4 md:p-8" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      <div className="max-w-6xl mx-auto pb-32">
        <div className="mb-8 flex flex-col gap-4 rounded-[1.5rem] border border-sc-border-subtle bg-sc-bg-elevated/80 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-sc-text-subtle">Clip Data</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-sc-text">Storyboard and clips</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sc-text-muted">
              Download your clip list as JSON, then import it later to restore the same clip map without rebuilding it by hand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="subtle" className="gap-2" onClick={handleExportClips}>
              <Download size={16} />
              Download clips
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={!onImportClips}
            >
              <Upload size={16} />
              Import clips
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {importStatus && (
          <div
            className={`mb-8 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
              importStatus.tone === 'success'
                ? 'border-sc-accent-soft-strong bg-sc-accent-soft text-sc-accent'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {importStatus.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="mb-8 grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
          <div className="rounded-[1.5rem] border border-sc-border-subtle bg-sc-bg-elevated/80 p-5">
            <div className="flex items-center gap-2 text-sc-accent">
              <FolderTree size={16} />
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-sc-text-subtle">Clip Legend</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-sc-text-muted">
              Containers organize families like `6`, but only playable leaf clips should appear in the script timing.
            </p>
            <div className="mt-4 space-y-3">
              {clipLegend.map(item => (
                <div key={`${item.label}-${item.kind}`} className="flex items-center justify-between rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.18em] ${
                        item.kind === 'container'
                          ? 'bg-sc-accent-soft text-sc-text-muted'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {item.kind === 'container' ? 'Container' : 'Playable'}
                      </span>
                      <span className="text-sm font-semibold text-sc-text">{item.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-sc-text-muted">{item.description}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-sm text-sc-text-subtle">
                    {item.kind === 'container' ? <Layers3 size={14} /> : <Film size={14} />}
                    <span>{item.seconds}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-sc-border-subtle bg-sc-bg-elevated/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-sc-text-subtle">Timing Audit</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-sc-text">Paragraph-by-paragraph fit</h3>
              </div>
              <div className={`rounded-full px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] ${
                flaggedRows.length === 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}>
                {flaggedRows.length === 0 ? 'All balanced' : `${flaggedRows.length} flagged`}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-sc-border-subtle">
              <div className="min-w-[620px]">
              <div className="grid grid-cols-[120px_96px_96px_120px_92px] gap-3 bg-sc-bg px-4 py-3 text-[11px] font-mono uppercase tracking-[0.18em] text-sc-text-subtle">
                <span>Clips</span>
                <span>Words</span>
                <span>Target</span>
                <span>Assigned</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-sc-border-subtle bg-sc-bg-elevated">
                {auditRows.map((row, index) => (
                  <div key={row.id} className="px-4 py-3 text-sm text-sc-text">
                    <div className="grid grid-cols-[120px_96px_96px_120px_92px] gap-3">
                      <span className="font-mono text-sc-accent">{row.clipLabels.join(', ') || `P${index + 1}`}</span>
                      <span>{row.wordCount}</span>
                      <span>{row.targetSeconds}s</span>
                      <span>{row.assignedSeconds}s</span>
                      <span className={`font-medium ${
                        row.status === 'good'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : row.status === 'missing'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-sc-text-muted">{row.fitReason}</p>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>

        {heavyReuse.length > 0 && (
          <div className="mb-8 rounded-[1.5rem] border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-amber-700">Clip reuse warning</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
              These playable clips are being reused across multiple paragraphs. That can work occasionally, but repeated reuse usually makes the edit feel thin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {heavyReuse.map(([label, count]) => (
                <span key={label} className="rounded-full border border-amber-200 bg-sc-bg px-3 py-1 text-xs font-mono uppercase tracking-[0.18em] text-amber-800">
                  {label} used {count} times
                </span>
              ))}
            </div>
          </div>
        )}

        {shots.map((shot, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="grid gap-5 border-b border-sc-border-subtle py-8 first:pt-0 last:border-b-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]"
          >
            <div>
              {(() => {
                const wordCount = countWords(shot.content);
                const targetSeconds = Math.max(1, Math.round((wordCount / 150) * 60));
                const assignedSeconds = shot.durationSeconds ?? 0;
                const deltaSeconds = Math.abs(assignedSeconds - targetSeconds);
                const isCloseMatch = shot.clipLabels.length === 0 || deltaSeconds <= Math.max(3, Math.round(targetSeconds * 0.35));

                return (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-[0.18em]">
                    <span className="rounded-full border border-sc-border-subtle bg-sc-bg-elevated px-3 py-1 text-sc-text-subtle">
                      {wordCount} words
                    </span>
                    <span className="rounded-full border border-sc-border-subtle bg-sc-bg-elevated px-3 py-1 text-sc-text-subtle">
                      Needs ~{targetSeconds}s
                    </span>
                    <span className="rounded-full border border-sc-border-subtle bg-sc-bg-elevated px-3 py-1 text-sc-text-subtle">
                      Clips {assignedSeconds > 0 ? `${assignedSeconds}s` : 'not assigned'}
                    </span>
                    {!isCloseMatch && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700">
                        Timing mismatch: revisit clip choice
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className="flex items-center gap-2 mb-3 text-sc-text-subtle">
                <Mic size={16} />
                <span className="text-xs font-mono uppercase tracking-widest">Audio / V.O.</span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-sc-text">
                {shot.content || <span className="text-sc-text-subtle italic">(No spoken audio)</span>}
              </p>
            </div>

            <div>
              <div className={`h-full p-5 rounded-xl border ${shot.clipDescriptions.length > 0 ? 'border-sc-accent-soft-strong bg-sc-accent-soft/70' : 'border-sc-border-subtle bg-sc-bg-elevated'} flex flex-col justify-center`}>
                <div className="flex items-center gap-2 mb-3 text-sc-accent">
                  <Video size={16} />
                  <span className="text-xs font-mono uppercase tracking-widest font-bold">
                    {shot.clipLabels.length > 0 ? `Playable clips ${shot.clipLabels.join(' + ')}` : 'Visual Cue'}
                  </span>
                </div>
                {shot.clipDescriptions.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold leading-7 text-sc-accent">
                      {shot.clipDescriptions.join(' + ')}
                    </p>
                    {shot.durationSeconds != null && (
                      <p className="text-sm text-sc-text-muted mt-2 flex items-center gap-1">
                        <Clock size={14} />
                        {shot.durationSeconds}s
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sc-text-muted italic">
                    Talking head / Main camera
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {shots.length === 0 && (
          <div className="text-center py-20 text-sc-text-muted">
            <p>No visual cues found. Add [CLIP 1: ...] tags to your script, or add clips in the wizard so we can suggest clips that match the script.</p>
          </div>
        )}
      </div>
    </div>
  );
};
