import React, { useRef, useState } from 'react';
import { Video, Plus, Trash2, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { VideoClip } from '../types';
import { Button } from './ui';
import { buildClipDataExport, parseImportedClipData } from '../utils/scriptDocument';

interface VideoClipsStepProps {
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  title?: string;
}

export const VideoClipsStep: React.FC<VideoClipsStepProps> = ({ clips, setClips, title = 'script' }) => {
  const mainClips = clips.filter(c => !c.parentId);
  const getSubclips = (parentId: string) => clips.filter(c => c.parentId === parentId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const addClip = (parentId?: string) => {
    const newClip: VideoClip = {
      id: crypto.randomUUID(),
      length: 10,
      description: '',
      parentId: parentId ?? undefined,
    };
    setClips(prev => [...prev, newClip]);
  };

  const updateClip = (id: string, field: keyof VideoClip, value: string | number) => {
    setClips(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeClip = (id: string) => {
    const clip = clips.find(c => c.id === id);
    if (!clip) return;
    if (clip.parentId) {
      setClips(prev => prev.filter(c => c.id !== id));
    } else {
      setClips(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    }
  };

  const subclipLabel = (parentIndex: number, subIndex: number) =>
    `${parentIndex + 1}${String.fromCharCode(97 + subIndex)}`;

  const handleExportClips = () => {
    const payload = buildClipDataExport(title, clips);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'script'}_clips.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatus({
      tone: 'success',
      message: `Downloaded ${clips.length} clip${clips.length === 1 ? '' : 's'} as JSON.`,
    });
  };

  const handleImportClips = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const importedClips = parseImportedClipData(raw);
      setClips(importedClips);
      setStatus({
        tone: 'success',
        message: `Imported ${importedClips.length} clip${importedClips.length === 1 ? '' : 's'} from ${file.name}.`,
      });
    } catch (error) {
      console.error('Failed to import clip data into wizard', error);
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Clip import failed. Check that the file is valid JSON.',
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <motion.div
      key="videoClips"
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Video size={20} className="text-sc-accent" />
        <h3 className="text-lg font-medium text-sc-text font-serif">Have any video clips to include?</h3>
      </div>
      <p className="text-sm text-sc-text-muted">
        List your b-roll, interviews, or other footage. The script will be written to work around these clips. If you don&apos;t add any, we&apos;ll suggest clips after the script is written to match its content and timing.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="subtle" className="gap-2" onClick={handleExportClips}>
          <Download size={16} />
          Download clips
        </Button>
        <Button variant="primary" className="gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
          Import clips
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportClips}
        />
      </div>

      {status && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            status.tone === 'success'
              ? 'border-sc-accent-soft-strong bg-sc-accent-soft text-sc-accent'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {mainClips.map((clip, mainIndex) => {
          const subclips = getSubclips(clip.id);
          return (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-sc-border-subtle bg-sc-bg-elevated overflow-hidden"
            >
              {/* Main clip row */}
              <div className="flex items-center gap-4 p-4">
                <span className="text-sm font-mono text-sc-text-subtle font-medium w-6">
                  {mainIndex + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Clip description (e.g., Drone shot of the coastline)"
                    className="w-full bg-transparent text-sm text-sc-text focus:outline-none"
                    value={clip.description}
                    onChange={e => updateClip(clip.id, 'description', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-20 bg-sc-bg border border-sc-border-subtle rounded-md p-2 text-sm text-center text-sc-text focus:outline-none focus:border-sc-accent transition-colors"
                    value={clip.length}
                    onChange={e => updateClip(clip.id, 'length', parseInt(e.target.value) || 0)}
                  />
                  <span className="text-xs text-sc-text-subtle">sec</span>
                </div>
                <button
                  type="button"
                  onClick={() => addClip(clip.id)}
                  className="p-2 text-sc-text-subtle hover:text-sc-accent hover:bg-sc-accent-soft rounded-lg transition-colors"
                  title="Add subclip (e.g. 1a, 1b)"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeClip(clip.id)}
                  className="p-2 text-sc-text-subtle hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Subclips */}
              {subclips.length > 0 && (
                <div className="border-t border-sc-border-subtle bg-sc-accent-soft/20 space-y-0">
                  {subclips.map((sub, subIndex) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-4 px-4 py-3 pl-12"
                    >
                      <span className="text-sm font-mono text-sc-accent font-medium w-6">
                        {subclipLabel(mainIndex, subIndex)}.
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Subclip description"
                          className="w-full bg-transparent text-sm text-sc-text focus:outline-none"
                          value={sub.description}
                          onChange={e => updateClip(sub.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-16 bg-sc-bg border border-sc-border-subtle rounded-md p-1.5 text-sm text-center text-sc-text focus:outline-none focus:border-sc-accent"
                          value={sub.length}
                          onChange={e => updateClip(sub.id, 'length', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-xs text-sc-text-subtle">sec</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClip(sub.id)}
                        className="p-1.5 text-sc-text-subtle hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addClip()}
        className="w-full py-3 rounded-xl border border-dashed border-sc-border-subtle text-sc-text-muted hover:text-sc-text hover:border-sc-accent-soft-strong transition-all flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add main clip
      </button>
    </motion.div>
  );
};
