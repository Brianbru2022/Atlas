import React, { Suspense, lazy, useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Loader2,
  Circle,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  History,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Package,
  RefreshCcw,
  Rows3,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2
} from 'lucide-react';
import { Script, ScriptVersion, Style } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { applyClipAssignments, generateScriptScorecard, restyleScriptFromPoint, rewriteSectionStream } from '../services/gemini';

import { ConfirmModal } from './ConfirmModal';
import { ExportFormat } from './ExportModal';
import { BlockEditorView } from './BlockEditorView';
import { Card } from './ui';
import { ScriptEditorOverview } from './ScriptEditorOverview';
import { ScriptEditorToolbar } from './ScriptEditorToolbar';
import { ScriptHistoryPanel, ScriptRewritePanel } from './ScriptEditorSidePanels';
import { buildClipDataExport, buildExportMetadata, buildMarkdownExport, buildStoryboardRows, buildTextExport, parseImportedClipData } from '../utils/scriptDocument';
import { CommandPaletteAction } from './CommandPalette';

const Teleprompter = lazy(() => import('./Teleprompter').then(module => ({ default: module.Teleprompter })));
const StoryboardView = lazy(() => import('./StoryboardView').then(module => ({ default: module.StoryboardView })));
const PackagingView = lazy(() => import('./PackagingView').then(module => ({ default: module.PackagingView })));
const VerificationView = lazy(() => import('./VerificationView').then(module => ({ default: module.VerificationView })));
const ExportModal = lazy(() => import('./ExportModal').then(module => ({ default: module.ExportModal })));
const RestyleScriptModal = lazy(() => import('./RestyleScriptModal').then(module => ({ default: module.RestyleScriptModal })));

const ViewFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-sc-bg text-sm text-sc-text-muted">
    Loading workspace...
  </div>
);

const MAX_CLIP_SEGMENT_SECONDS = 8;

interface ScriptEditorProps {
  script: Script;
  style: Style | null;
  styles: Style[];
  onSave: (updatedScript: Script) => void;
  onDelete: (id: string) => void;
  focusMode?: boolean;
  onFocusModeChange?: (value: boolean) => void;
  onCommandActionsChange?: (actions: CommandPaletteAction[]) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, style, styles, onSave, onDelete, focusMode = false, onFocusModeChange, onCommandActionsChange }) => {
  const [content, setContent] = useState(script.content || '');
  const [title, setTitle] = useState(script.title);
  const [currentStyleId, setCurrentStyleId] = useState<string | null>(script.style_id || null);
  const [currentVideoClips, setCurrentVideoClips] = useState(script.video_clips || []);
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isRestyling, setIsRestyling] = useState(false);
  const [rewriteReason, setRewriteReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'storyboard' | 'packaging' | 'verify'>(script.editor_preferences?.viewMode ?? 'editor');
  const [editorMode, setEditorMode] = useState<'page' | 'blocks'>(script.editor_preferences?.editorMode ?? 'page');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [packagingData, setPackagingData] = useState<any>(script.packaging ?? null);
  const [verificationData, setVerificationData] = useState<any>(script.verification ?? null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRestyleModal, setShowRestyleModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(Boolean(script.editor_preferences?.showHistoryPanel));
  const [lastSavedContent, setLastSavedContent] = useState(script.content || '');
  const [lastSavedTitle, setLastSavedTitle] = useState(script.title);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [recoveryDraft, setRecoveryDraft] = useState<{ title: string; content: string; updatedAt: string } | null>(null);
  const [editorSurfaceHeight, setEditorSurfaceHeight] = useState(960);
  const [simpleMode, setSimpleMode] = useState(Boolean(script.editor_preferences?.simpleMode));
  const [scorecard, setScorecard] = useState<any>(script.scorecard ?? null);
  const [scorecardError, setScorecardError] = useState<string | null>(null);
  const [lastAiChange, setLastAiChange] = useState<{ label: string; previousContent: string; previousStyleId: string | null } | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const clipImportInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveSuccessTimerRef = useRef<number | null>(null);
  const suppressAutosaveRef = useRef(false);

  const autosaveKey = `scriptcraft-autosave-${script.id}`;

  const resolveSelectionRange = useCallback((currentContent: string, currentSelection: { text: string; start: number; end: number }) => {
    const directSlice = currentContent.slice(currentSelection.start, currentSelection.end);
    if (directSlice === currentSelection.text) {
      return currentSelection;
    }

    const exactMatchAtStart = currentContent.indexOf(currentSelection.text, Math.max(0, currentSelection.start - 120));
    if (exactMatchAtStart >= 0) {
      return {
        text: currentSelection.text,
        start: exactMatchAtStart,
        end: exactMatchAtStart + currentSelection.text.length,
      };
    }

    const fallbackIndex = currentContent.indexOf(currentSelection.text);
    if (fallbackIndex >= 0) {
      return {
        text: currentSelection.text,
        start: fallbackIndex,
        end: fallbackIndex + currentSelection.text.length,
      };
    }

    return null;
  }, []);

  const clipTimingByLine = useMemo(() => {
    const clipMap = new Map<string, { length: number; description: string }>();
    const mainClips = currentVideoClips.filter(clip => !clip.parentId);
    const parentIds = new Set(currentVideoClips.filter(clip => clip.parentId).map(clip => clip.parentId as string));
    const addClipSegments = (labelBase: string, description: string, rawLength: number) => {
      const totalLength = Math.max(1, Math.round(rawLength || 0));
      const segmentCount = Math.ceil(totalLength / MAX_CLIP_SEGMENT_SECONDS);

      if (segmentCount <= 1) {
        clipMap.set(labelBase.toLowerCase(), { length: totalLength, description });
        return;
      }

      Array.from({ length: segmentCount }).forEach((_, segmentIndex) => {
        const usedSeconds = segmentIndex * MAX_CLIP_SEGMENT_SECONDS;
        const remainingSeconds = totalLength - usedSeconds;
        const segmentLength = Math.min(MAX_CLIP_SEGMENT_SECONDS, remainingSeconds);
        const suffix = /^[0-9]+$/.test(labelBase) && segmentIndex < 26
          ? String.fromCharCode(97 + segmentIndex)
          : `-${segmentIndex + 1}`;
        clipMap.set(`${labelBase}${suffix}`.toLowerCase(), {
          length: segmentLength,
          description: `${description} (${usedSeconds + 1}-${usedSeconds + segmentLength}s)`,
        });
      });
    };

    mainClips.forEach((clip, mainIndex) => {
      const mainLabel = String(mainIndex + 1).toLowerCase();
      if (!parentIds.has(clip.id)) {
        addClipSegments(mainLabel, clip.description, clip.length);
      }

      const subclips = currentVideoClips.filter(candidate => candidate.parentId === clip.id);
      subclips.forEach((subclip, subIndex) => {
        const subLabel = `${mainIndex + 1}${String.fromCharCode(97 + subIndex)}`.toLowerCase();
        addClipSegments(subLabel, subclip.description, subclip.length);
      });
    });

    const result = new Map<number, { words: number; targetSeconds: number; assignedSeconds: number; mismatch: boolean }>();
    const lines = content.split('\n');
    const clipHeaderRegex = /^\[(?:CLIP|CLIPS)\s+([^:\]]+):/i;

    let currentHeaderLine: number | null = null;
    let currentAssignedSeconds = 0;
    let currentWords = 0;

    const flushCurrent = () => {
      if (currentHeaderLine === null) return;
      const targetSeconds = Math.max(1, Math.round((currentWords / 150) * 60));
      const mismatch = Math.abs(currentAssignedSeconds - targetSeconds) > Math.max(3, Math.round(targetSeconds * 0.35));
      result.set(currentHeaderLine, {
        words: currentWords,
        targetSeconds,
        assignedSeconds: currentAssignedSeconds,
        mismatch,
      });
    };

    lines.forEach((line, index) => {
      const headerMatch = line.trim().match(clipHeaderRegex);
      if (headerMatch) {
        flushCurrent();
        currentHeaderLine = index;
        currentWords = 0;
        currentAssignedSeconds = headerMatch[1]
          .split(',')
          .map(label => label.trim().toLowerCase())
          .reduce((sum, label) => sum + (clipMap.get(label)?.length ?? 0), 0);
        return;
      }

      if (line.trim() === '') {
        return;
      }

      if (currentHeaderLine !== null && !line.trim().startsWith('[')) {
        const words = line.match(/\b[\w']+\b/g);
        currentWords += words ? words.length : 0;
      }
    });

    flushCurrent();
    return result;
  }, [content, currentVideoClips]);

  // Helper to render syntax highlighting
  const renderHighlightedLine = (line: string, lineIndex: number) => {
    if (!line) return <br />;

    // 1. Visual Cues [BRACKETS]
    if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
      const timing = clipTimingByLine.get(lineIndex);
      return (
        <>
          <span className="text-blue-600 font-bold">{line}</span>
          {timing && (
            <span className={`ml-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 align-middle text-[11px] font-mono font-semibold uppercase tracking-[0.18em] ${
              timing.mismatch
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              <span>{timing.words}w</span>
              <span>{timing.assignedSeconds}s playable clips</span>
              <span>{timing.targetSeconds}s target</span>
            </span>
          )}
        </>
      );
    }

    // 2. Character Names (ALL CAPS:)
    const charMatch = line.match(/^([A-Z\s]+):/);
    if (charMatch) {
      const name = charMatch[1];
      const rest = line.substring(name.length + 1);
      return (
        <>
          <span className="text-red-600 font-bold">{name}:</span>
          {renderInlineStyles(rest)}
        </>
      );
    }

    return renderInlineStyles(line);
  };

  const renderInlineStyles = (text: string) => {
    // Simple parser for **bold** and *italics*
    // Note: This is a basic implementation. Nested styles might be tricky.
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-bold text-black">{part}</span>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <span key={i} className="italic text-black/80">{part}</span>;
          }
          return <span key={i} className="text-black/90">{part}</span>;
        })}
      </>
    );
  };

  useEffect(() => {
    setContent(script.content || '');
    setTitle(script.title);
    setCurrentStyleId(script.style_id || null);
    setCurrentVideoClips(script.video_clips || []);
    setPackagingData(script.packaging ?? null);
    setVerificationData(script.verification ?? null);
    setScorecard(script.scorecard ?? null);
    setViewMode(script.editor_preferences?.viewMode ?? 'editor');
    setEditorMode(script.editor_preferences?.editorMode ?? 'page');
    setSimpleMode(Boolean(script.editor_preferences?.simpleMode));
    setShowHistoryPanel(Boolean(script.editor_preferences?.showHistoryPanel));
    setLastSavedContent(script.content || '');
    setLastSavedTitle(script.title);
    setAutosaveStatus('idle');

    try {
      const raw = window.localStorage.getItem(autosaveKey);
      if (!raw) {
        setRecoveryDraft(null);
        return;
      }

      const parsed = JSON.parse(raw) as { title?: string; content?: string; updatedAt?: string };
      const recoveredTitle = parsed.title ?? '';
      const recoveredContent = parsed.content ?? '';
      const hasMeaningfulDifference = recoveredTitle !== (script.title || '') || recoveredContent !== (script.content || '');

      if (hasMeaningfulDifference) {
        setRecoveryDraft({
          title: recoveredTitle,
          content: recoveredContent,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        });
      } else {
        window.localStorage.removeItem(autosaveKey);
        setRecoveryDraft(null);
      }
    } catch (error) {
      console.error('Failed to load autosave draft', error);
      setRecoveryDraft(null);
    }
  }, [script, autosaveKey]);

  const currentStyle = useMemo(
    () => styles.find(candidate => candidate.id === currentStyleId) ?? style ?? null,
    [styles, currentStyleId, style]
  );

  const editorPreferences = useMemo(() => ({
    viewMode,
    editorMode,
    simpleMode,
    showHistoryPanel,
  }), [editorMode, showHistoryPanel, simpleMode, viewMode]);

  const persistScriptArtifacts = useCallback(async (artifacts: {
    packaging?: any;
    verification?: any;
    scorecard?: any;
    editor_preferences?: any;
    status?: string;
  }) => {
    const savedScript = await invoke<Script>('update_script_artifacts', {
      id: script.id,
      ...artifacts,
    });
    const editorIsClean = content === lastSavedContent && title === lastSavedTitle;
    if (editorIsClean) {
      onSave(savedScript);
    }
  }, [content, lastSavedContent, lastSavedTitle, onSave, script.id, title]);

  useEffect(() => {
    let active = true;
    const loadScorecard = async () => {
      if (!content.trim() || content.trim().length < 120) {
        setScorecard(null);
        setScorecardError(null);
        return;
      }

      try {
        setScorecardError(null);
        const nextScorecard = await generateScriptScorecard(content, currentStyle);
        if (active) {
          setScorecard(nextScorecard);
          if (nextScorecard) {
            await persistScriptArtifacts({ scorecard: nextScorecard, status: 'polishing' });
          }
        }
      } catch (error) {
        console.error('Failed to load script scorecard', error);
        if (active) {
          setScorecardError('Scorecard generation failed. You can retry after saving or editing.');
        }
      }
    };

    const timer = window.setTimeout(loadScorecard, 700);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [content, currentStyle, persistScriptArtifacts]);

  const handleTextSelection = () => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);

    if (text.trim().length > 0) {
      setSelection({ text, start, end });
    } else {
      setSelection(null);
    }
  };

  const handleRewrite = async () => {
    if (!selection || !rewriteReason || !style) return;
    const resolvedSelection = resolveSelectionRange(content, selection);
    if (!resolvedSelection) {
      console.error('Could not resolve highlighted selection in current content');
      return;
    }

    setIsRewriting(true);
    setLastAiChange({
      label: `Surgical rewrite: ${rewriteReason}`,
      previousContent: content,
      previousStyleId: currentStyleId,
    });
    
    const originalContentBefore = content.substring(0, resolvedSelection.start);
    const originalContentAfter = content.substring(resolvedSelection.end);
    let rewrittenText = '';

    try {
      await rewriteSectionStream(
        content, 
        resolvedSelection.text, 
        rewriteReason, 
        style, 
        (chunk) => {
          rewrittenText += chunk;
          setContent(originalContentBefore + rewrittenText + originalContentAfter);
        }
      );
      setSelection(null);
      setRewriteReason('');
    } catch (error) {
      console.error(error);
      // Revert on error
      setContent(originalContentBefore + resolvedSelection.text + originalContentAfter);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const savedWordCount = (() => {
        const spoken = content
          .split('\n')
          .filter(line => !/^\s*\[.+\]\s*$/.test(line.trim()))
          .join('\n');
        const words = spoken.match(/\b[\w']+\b/g);
        return words ? words.length : 0;
      })();

      const savedScript = await invoke<Script>('update_script', {
        id: script.id,
        content,
        title,
        style_id: currentStyleId,
        location: script.location,
        video_clips: currentVideoClips,
        packaging: packagingData,
        verification: verificationData,
        scorecard,
        editor_preferences: editorPreferences,
        status: savedWordCount >= 80 ? 'polishing' : 'draft',
      });
      onSave(savedScript);
      setLastSavedContent(content);
      setLastSavedTitle(title);
      window.localStorage.removeItem(autosaveKey);
      setRecoveryDraft(null);
      setShowSaveSuccess(true);
      if (saveSuccessTimerRef.current) {
        window.clearTimeout(saveSuccessTimerRef.current);
      }
      saveSuccessTimerRef.current = window.setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [script, content, title, onSave, autosaveKey, lastSavedContent, lastSavedTitle, currentStyleId, currentVideoClips, editorPreferences, packagingData, scorecard, verificationData]);

  const exportBaseName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'script';
  const versions = script.versions ?? [];
  const storyboardRows = useMemo(() => buildStoryboardRows(content), [content]);

  const downloadExport = (filename: string, mimeType: string, body: string) => {
    const blob = new Blob([body], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: ExportFormat) => {
    const metadata = buildExportMetadata(script, title, style?.name || 'Default', wordCount, Number(estMinutes));

    if (format === 'txt') {
      downloadExport(`${exportBaseName}_export.txt`, 'text/plain', buildTextExport(metadata, content, storyboardRows, packagingData));
    }

    if (format === 'md') {
      downloadExport(`${exportBaseName}.md`, 'text/markdown', buildMarkdownExport(metadata, content, storyboardRows, packagingData));
    }

    if (format === 'json') {
      const payload = {
        metadata,
        script: {
          content,
          videoClips: currentVideoClips,
        },
        storyboard: storyboardRows,
        packaging: packagingData ?? null,
      };

      downloadExport(`${exportBaseName}.json`, 'application/json', JSON.stringify(payload, null, 2));
    }

    setShowExportModal(false);
  };

  const handleExportClips = useCallback(() => {
    const payload = buildClipDataExport(title, currentVideoClips);
    downloadExport(
      `${exportBaseName}_clips.json`,
      'application/json',
      JSON.stringify(payload, null, 2)
    );
  }, [title, currentVideoClips, exportBaseName]);

  const handleRestoreVersion = (version: ScriptVersion) => {
    suppressAutosaveRef.current = true;
    setTitle(version.title);
    setContent(version.content);
    setShowHistoryPanel(false);
    setAutosaveStatus('saved');
  };

  const handleTTS = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }, [content, isSpeaking]);

  // Stop speaking when unmounting or changing content
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (saveSuccessTimerRef.current) {
        window.clearTimeout(saveSuccessTimerRef.current);
      }
    };
  }, []);

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const wordCount = useMemo(() => {
    const spoken = content
      .split('\n')
      .filter(line => !/^\s*\[.+\]\s*$/.test(line.trim()))
      .join('\n');
    const words = spoken.match(/\b[\w']+\b/g);
    return words ? words.length : 0;
  }, [content]);
  const estMinutes = (wordCount / 150).toFixed(1);
  const hasUnsavedChanges = content !== lastSavedContent || title !== lastSavedTitle;
  const documentSections = useMemo(() => {
    const sections: Array<{ id: string; label: string; detail: string }> = [];
    let paragraphIndex = 1;

    content.split('\n').forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const clipMatch = trimmed.match(/^\[(?:CLIP|CLIPS)\s+([^:\]]+):?\s*([^\]]*)\]/i);
      if (clipMatch) {
        sections.push({
          id: `line-${index + 1}`,
          label: `Clip ${clipMatch[1]}`,
          detail: clipMatch[2] || 'Visual cue',
        });
        return;
      }

      if (sections.length === 0 || trimmed.length > 42) {
        sections.push({
          id: `line-${index + 1}`,
          label: `Paragraph ${paragraphIndex}`,
          detail: trimmed.slice(0, 80),
        });
        paragraphIndex += 1;
      }
    });

    return sections.slice(0, 12);
  }, [content]);
  const scriptHealth = useMemo(() => {
    if (wordCount < 80) {
      return {
        label: 'Early draft',
        tone: 'warning' as const,
        summary: 'This draft still needs its opening beats and basic structure before the polish tools will be useful.',
      };
    }

    if (hasUnsavedChanges) {
      return {
        label: 'Needs save',
        tone: 'warning' as const,
        summary: 'You have unsaved edits. Save now so history, export, and the rest of the workflow reflect the latest version.',
      };
    }

    return {
      label: 'Ready to polish',
      tone: 'ready' as const,
      summary: 'This version is stable enough to storyboard, fact-check, rehearse, or prepare packaging.',
    };
  }, [hasUnsavedChanges, wordCount]);

  const nextActions = [
    {
      id: 'storyboard',
      label: 'Build storyboard',
      description: 'Break the draft into visual beats before you record, shoot pickups, or start editing.',
      onClick: () => setViewMode('storyboard'),
      disabled: !content.trim(),
    },
    {
      id: 'verify',
      label: 'Verify claims',
      description: 'Pressure-test dates, names, and factual lines before the script is locked.',
      onClick: () => setViewMode('verify'),
      disabled: !content.trim(),
    },
    {
      id: 'packaging',
      label: packagingData ? 'Refresh packaging' : 'Generate packaging',
      description: 'Draft titles, thumbnail concepts, tags, and the description once the episode angle is clear.',
      onClick: () => setViewMode('packaging'),
      disabled: !content.trim(),
    },
    {
      id: 'teleprompter',
      label: 'Rehearse delivery',
      description: 'Practice the script at speaking pace to catch awkward phrasing before recording.',
      onClick: () => setShowTeleprompter(true),
      disabled: !content.trim(),
    },
  ];

  const statusIcon = scriptHealth.tone === 'ready' ? CheckCircle2 : hasUnsavedChanges ? AlertCircle : Circle;
  const StatusIcon = statusIcon;
  const statusBadgeVariant = scriptHealth.tone === 'ready' ? 'accent' : 'default';
  const autosaveLabel = autosaveStatus === 'saving' ? 'Saving local backup...' : autosaveStatus === 'saved' ? 'Local backup updated' : 'Local backup enabled';
  const handleRetryScorecard = useCallback(async () => {
    if (!content.trim() || content.trim().length < 120) return;
    try {
      setScorecardError(null);
      const nextScorecard = await generateScriptScorecard(content, currentStyle);
      setScorecard(nextScorecard);
      if (nextScorecard) {
        await persistScriptArtifacts({ scorecard: nextScorecard, status: 'polishing' });
      }
    } catch (error) {
      console.error('Failed to retry script scorecard', error);
      setScorecardError('Scorecard generation failed again. Check your API key or try later.');
    }
  }, [content, currentStyle, persistScriptArtifacts]);

  useEffect(() => {
    if (!onCommandActionsChange) return;

    const hasContent = Boolean(content.trim());
    const actions: CommandPaletteAction[] = [
      {
        id: 'editor-save-draft',
        label: 'Save Draft',
        description: 'Save the current title, script, clips, and workspace state.',
        group: 'Current Script',
        icon: <Save size={17} />,
        keywords: ['save', 'draft', 'checkpoint'],
        onRun: handleSave,
      },
      {
        id: 'editor-view-script',
        label: 'Open Editor View',
        description: 'Return to the script editor.',
        group: 'Current Script',
        icon: <FileText size={17} />,
        keywords: ['write', 'draft', 'page'],
        onRun: () => setViewMode('editor'),
      },
      {
        id: 'editor-view-storyboard',
        label: 'Open Storyboard',
        description: 'Break the script into visual beats.',
        group: 'Current Script',
        icon: <LayoutTemplate size={17} />,
        keywords: ['clips', 'visual', 'shot list'],
        disabled: !hasContent,
        onRun: () => setViewMode('storyboard'),
      },
      {
        id: 'editor-view-verify',
        label: 'Verify Claims',
        description: 'Find and check factual claims in the script.',
        group: 'Current Script',
        icon: <ShieldCheck size={17} />,
        keywords: ['facts', 'claims', 'research'],
        disabled: !hasContent,
        onRun: () => setViewMode('verify'),
      },
      {
        id: 'editor-view-packaging',
        label: 'Open Packaging',
        description: 'Generate titles, thumbnail ideas, tags, and description copy.',
        group: 'Current Script',
        icon: <Package size={17} />,
        keywords: ['publish', 'titles', 'thumbnail', 'seo'],
        disabled: !hasContent,
        onRun: () => setViewMode('packaging'),
      },
      {
        id: 'editor-page-mode',
        label: 'Page Editor Mode',
        description: 'Use the continuous script page editor.',
        group: 'Editor Tools',
        icon: <FileText size={17} />,
        keywords: ['page', 'document'],
        onRun: () => {
          setViewMode('editor');
          setEditorMode('page');
        },
      },
      {
        id: 'editor-block-mode',
        label: 'Block Editor Mode',
        description: 'Use the structured block editor.',
        group: 'Editor Tools',
        icon: <Rows3 size={17} />,
        keywords: ['blocks', 'sections'],
        onRun: () => {
          setViewMode('editor');
          setEditorMode('blocks');
        },
      },
      {
        id: 'editor-export',
        label: 'Export Draft',
        description: 'Open export options for script and production assets.',
        group: 'Editor Tools',
        icon: <Download size={17} />,
        keywords: ['download', 'markdown', 'text'],
        disabled: !hasContent,
        onRun: () => setShowExportModal(true),
      },
      {
        id: 'editor-teleprompter',
        label: 'Open Teleprompter',
        description: 'Rehearse the script at speaking pace.',
        group: 'Editor Tools',
        icon: <MonitorPlay size={17} />,
        keywords: ['rehearse', 'read', 'delivery'],
        disabled: !hasContent,
        onRun: () => setShowTeleprompter(true),
      },
      {
        id: 'editor-history',
        label: showHistoryPanel ? 'Hide Version History' : 'Show Version History',
        description: 'Review saved checkpoints for this script.',
        group: 'Editor Tools',
        icon: <History size={17} />,
        keywords: ['versions', 'restore', 'history'],
        onRun: () => setShowHistoryPanel(value => !value),
      },
      {
        id: 'editor-restyle',
        label: 'Restyle Script',
        description: 'Apply another saved voice profile to this draft.',
        group: 'AI Tools',
        icon: <RefreshCcw size={17} />,
        keywords: ['style', 'voice', 'rewrite'],
        disabled: !hasContent,
        onRun: () => setShowRestyleModal(true),
      },
      {
        id: 'editor-rebalance-clips',
        label: 'Rebalance Clips',
        description: 'Reassign visual cues around the current clip list.',
        group: 'AI Tools',
        icon: <Sparkles size={17} />,
        keywords: ['clips', 'visuals', 'timing'],
        disabled: !hasContent || currentVideoClips.length === 0,
        onRun: () => {
          setLastAiChange({
            label: 'Clip rebalance',
            previousContent: content,
            previousStyleId: currentStyleId,
          });
          setContent(applyClipAssignments(content, currentVideoClips));
        },
      },
      {
        id: 'editor-toggle-simple-mode',
        label: simpleMode ? 'Full Workspace' : 'Simple Mode',
        description: simpleMode ? 'Show overview and production guidance.' : 'Hide side guidance for a cleaner editor.',
        group: 'Editor Tools',
        icon: <Rows3 size={17} />,
        keywords: ['density', 'minimal', 'workspace'],
        onRun: () => setSimpleMode(value => !value),
      },
      {
        id: 'editor-read-aloud',
        label: isSpeaking ? 'Stop Read-Through' : 'Read Draft Aloud',
        description: 'Use system speech to hear pacing and awkward phrasing.',
        group: 'Editor Tools',
        icon: isSpeaking ? <Square size={17} /> : <Volume2 size={17} />,
        keywords: ['tts', 'audio', 'listen'],
        disabled: !hasContent,
        onRun: handleTTS,
      },
      {
        id: 'editor-focus-mode',
        label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
        description: focusMode ? 'Restore the full workspace shell.' : 'Hide the shell and focus on the open script.',
        group: 'Editor Tools',
        icon: focusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />,
        keywords: ['writing', 'distraction', 'focus'],
        onRun: () => onFocusModeChange?.(!focusMode),
      },
    ];

    onCommandActionsChange(actions);
    return () => onCommandActionsChange([]);
  }, [
    content,
    currentStyleId,
    currentVideoClips,
    focusMode,
    handleSave,
    handleTTS,
    isSpeaking,
    onCommandActionsChange,
    onFocusModeChange,
    showHistoryPanel,
    simpleMode,
  ]);

  useEffect(() => {
    if (suppressAutosaveRef.current) {
      suppressAutosaveRef.current = false;
      return;
    }

    if (!hasUnsavedChanges) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    setAutosaveStatus('saving');
    autosaveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          autosaveKey,
          JSON.stringify({
            title,
            content,
            updatedAt: new Date().toISOString(),
          })
        );
        setAutosaveStatus('saved');
      } catch (error) {
        console.error('Failed to autosave draft', error);
        setAutosaveStatus('idle');
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [autosaveKey, content, title, hasUnsavedChanges]);

  useLayoutEffect(() => {
    const syncEditorHeight = () => {
      if (!editorRef.current) return;

      const textarea = editorRef.current;
      textarea.style.height = 'auto';
      const minimumHeight = Math.max(window.innerHeight - 260, 960);
      const nextHeight = Math.max(textarea.scrollHeight + 64, minimumHeight);
      textarea.style.height = `${nextHeight}px`;
      setEditorSurfaceHeight(nextHeight);
    };

    syncEditorHeight();
    window.addEventListener('resize', syncEditorHeight);
    return () => window.removeEventListener('resize', syncEditorHeight);
  }, [content, editorMode, viewMode]);

  const persistVideoClips = useCallback(async (nextVideoClips: typeof currentVideoClips) => {
    const savedScript = await invoke<Script>('update_script', {
      id: script.id,
      content,
      title,
      style_id: currentStyleId,
      location: script.location,
      video_clips: nextVideoClips,
      packaging: packagingData,
      verification: verificationData,
      scorecard,
      editor_preferences: editorPreferences,
    });

    setCurrentVideoClips(nextVideoClips);
    onSave(savedScript);
  }, [script, content, title, currentStyleId, onSave, packagingData, verificationData, scorecard, editorPreferences]);

  const handleImportClipFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const nextVideoClips = parseImportedClipData(raw);
      await persistVideoClips(nextVideoClips);
    } catch (error) {
      console.error('Failed to import clip data', error);
    } finally {
      event.target.value = '';
    }
  }, [persistVideoClips]);

  return (
    <div className="flex-1 flex min-h-0 flex-col h-full bg-sc-bg text-sc-text">
      <input
        ref={clipImportInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportClipFile}
      />
      <ScriptEditorToolbar
        title={title}
        onTitleChange={setTitle}
        estMinutes={estMinutes}
        wordCount={wordCount}
        viewMode={viewMode}
        editorMode={editorMode}
        onViewModeChange={setViewMode}
        onEditorModeChange={setEditorMode}
        isSpeaking={isSpeaking}
        onToggleTts={handleTTS}
        onOpenExport={() => setShowExportModal(true)}
        onExportClips={handleExportClips}
        onImportClips={() => clipImportInputRef.current?.click()}
        showHistoryPanel={showHistoryPanel}
        onToggleHistoryPanel={() => setShowHistoryPanel(prev => !prev)}
        onOpenTeleprompter={() => setShowTeleprompter(true)}
        onOpenRestyle={() => setShowRestyleModal(true)}
        onRebalanceClips={() => {
          setLastAiChange({
            label: 'Clip rebalance',
            previousContent: content,
            previousStyleId: currentStyleId,
          });
          setContent(applyClipAssignments(content, currentVideoClips));
        }}
        simpleMode={simpleMode}
        onSimpleModeChange={setSimpleMode}
        onDelete={() => setShowConfirmDelete(true)}
        onSave={handleSave}
        isSaving={isSaving}
        showSaveSuccess={showSaveSuccess}
        focusMode={focusMode}
        onFocusModeChange={onFocusModeChange}
      />

      {/* Editor Area */}
      <div className="flex-1 min-h-0 flex relative bg-sc-bg">
        <Suspense fallback={<ViewFallback />}>
        {viewMode === 'editor' ? (
          <>
            {editorMode === 'page' ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-8 md:p-12">
              <div className="mx-auto grid w-full max-w-[1500px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
                {!simpleMode && (
                  <ScriptEditorOverview
                    script={script}
                    wordCount={wordCount}
                    hasUnsavedChanges={hasUnsavedChanges}
                    estMinutes={estMinutes}
                    lastSavedAt={script.updated_at ?? script.created_at}
                    sections={documentSections}
                    packagingData={packagingData}
                    scriptHealth={scriptHealth}
                    statusIcon={StatusIcon}
                    statusBadgeVariant={statusBadgeVariant}
                    autosaveStatus={autosaveStatus}
                    autosaveLabel={autosaveLabel}
                    nextActions={nextActions}
                    recoveryDraft={recoveryDraft}
                    scorecard={scorecard}
                    scorecardError={scorecardError}
                    lastAiChange={lastAiChange}
                    onRestoreRecoveryDraft={() => {
                      if (!recoveryDraft) return;
                      suppressAutosaveRef.current = true;
                      setTitle(recoveryDraft.title);
                      setContent(recoveryDraft.content);
                      setRecoveryDraft(null);
                      setAutosaveStatus('saved');
                    }}
                    onDiscardRecoveryDraft={() => {
                      window.localStorage.removeItem(autosaveKey);
                      setRecoveryDraft(null);
                    }}
                    onRestoreAiChange={() => {
                      if (!lastAiChange) return;
                      suppressAutosaveRef.current = true;
                      setContent(lastAiChange.previousContent);
                      setCurrentStyleId(lastAiChange.previousStyleId);
                      setLastAiChange(null);
                    }}
                    onDismissAiChange={() => setLastAiChange(null)}
                    onRetryScorecard={handleRetryScorecard}
                  />
                )}

                <div className={`w-full relative glass-card min-h-[100vh] rounded-[1.25rem] pb-32 ${simpleMode ? 'max-w-5xl mx-auto' : ''}`}>
                  {!content.trim() && (
                    <div className="absolute inset-x-8 top-8 z-20 rounded-2xl border border-dashed border-sc-border-subtle bg-sc-bg-elevated/90 px-5 py-4 text-sm text-sc-text-muted md:inset-x-12 md:top-10">
                      <p className="font-medium text-sc-text">Start with a draft</p>
                      <p className="mt-1 leading-relaxed">Paste a script here, start writing, or use the wizard from a project to generate a structured first draft.</p>
                    </div>
                  )}
                  <div className="relative w-full" style={{ minHeight: `${editorSurfaceHeight}px` }}>
                    {/* Syntax Highlighter Overlay */}
                    <div 
                    ref={highlighterRef}
                    className="absolute inset-x-0 top-0 p-10 pb-28 pt-32 md:p-14 md:pb-32 md:pt-36 pointer-events-none whitespace-pre-wrap break-words font-mono text-[17px] leading-8 z-0 overflow-hidden no-scrollbar"
                    style={{ minHeight: `${editorSurfaceHeight}px` }}
                    aria-hidden="true"
                  >
                    {content.split('\n').map((line, i) => (
                      <div key={i} id={`line-${i + 1}`} className="min-h-8 scroll-mt-8">
                        {renderHighlightedLine(line, i)}
                      </div>
                    ))}
                  </div>

                  {/* Transparent Textarea for Input */}
                  <textarea
                    ref={editorRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onSelect={handleTextSelection}
                    onScroll={(e) => {
                      if (highlighterRef.current) {
                        highlighterRef.current.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                    className="relative z-10 w-full bg-transparent text-transparent caret-[color:var(--sc-text)] text-[17px] leading-8 font-mono resize-none overflow-hidden focus:outline-none p-10 pb-28 pt-32 md:p-14 md:pb-32 md:pt-36 placeholder:text-sc-text-subtle selection:bg-sc-accent-soft-strong"
                    style={{ minHeight: `${editorSurfaceHeight}px` }}
                    placeholder="Your script will appear here..."
                    spellCheck={false}
                  />
                </div>
                </div>
              </div>
            </div>
            ) : (
              <BlockEditorView content={content} onChange={setContent} />
            )}

            <ScriptHistoryPanel
              isOpen={showHistoryPanel}
              versions={versions}
              onRestoreVersion={handleRestoreVersion}
            />

            <ScriptRewritePanel
              selection={selection}
              rewriteReason={rewriteReason}
              onRewriteReasonChange={setRewriteReason}
              isRewriting={isRewriting}
              onRewrite={handleRewrite}
              onClose={() => setSelection(null)}
            />
            {selection && !showHistoryPanel && (
              <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] px-4 py-2 text-xs font-medium text-sc-text-muted shadow-lg">
                Add rewrite instructions in the side panel to refine the selected text.
              </div>
            )}
          </>
        ) : viewMode === 'storyboard' ? (
          <StoryboardView
            title={title}
            content={content}
            videoClips={currentVideoClips}
            onImportClips={persistVideoClips}
          />
        ) : viewMode === 'packaging' ? (
          <PackagingView 
            scriptContent={content} 
            style={currentStyle} 
            initialData={packagingData} 
            onDataGenerated={(data) => {
              setPackagingData(data);
              persistScriptArtifacts({ packaging: data, status: 'polishing' });
            }}
          />
        ) : (
          <VerificationView
            content={content}
            initialData={verificationData}
            onDataChange={(data) => {
              setVerificationData(data);
              persistScriptArtifacts({ verification: data, status: 'polishing' });
            }}
          />
        )}
        </Suspense>
      </div>

      {/* Teleprompter Overlay */}
      <AnimatePresence>
        {showTeleprompter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            <Suspense fallback={<ViewFallback />}>
              <Teleprompter content={content} onClose={() => setShowTeleprompter(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {showConfirmDelete && (
        <ConfirmModal
          title="Delete script?"
          message={`"${title}" will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            onDelete(script.id);
            setShowConfirmDelete(false);
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}

      {showExportModal && (
        <Suspense fallback={<ViewFallback />}>
          <ExportModal
            onClose={() => setShowExportModal(false)}
            onExport={handleExport}
          />
        </Suspense>
      )}

      {showRestyleModal && (
        <Suspense fallback={<ViewFallback />}>
          <RestyleScriptModal
            styles={styles}
            currentStyleId={currentStyleId}
            isApplying={isRestyling}
            onClose={() => setShowRestyleModal(false)}
            onApply={async (styleId, startPoint) => {
              const targetStyle = styles.find(candidate => candidate.id === styleId);
              if (!targetStyle) return;

              setIsRestyling(true);
              try {
                setLastAiChange({
                  label: `Restyle from ${startPoint.replaceAll('_', ' ')}`,
                  previousContent: content,
                  previousStyleId: currentStyleId,
                });
                const nextContent = await restyleScriptFromPoint(content, currentStyle, targetStyle, startPoint);
                setCurrentStyleId(styleId);
                setContent(nextContent);
                setShowRestyleModal(false);
              } catch (error) {
                console.error('Failed to restyle script', error);
              } finally {
                setIsRestyling(false);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
