import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { History, Loader2, Sparkles } from 'lucide-react';
import { ScriptVersion } from '../types';
import { Badge, Button, Card } from './ui';

interface ScriptSelection {
  text: string;
  start: number;
  end: number;
}

interface HistoryPanelProps {
  isOpen: boolean;
  versions: ScriptVersion[];
  onRestoreVersion: (version: ScriptVersion) => void;
}

export const ScriptHistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  versions,
  onRestoreVersion,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        className="w-80 border-l border-sc-border-subtle glass-panel p-6 flex flex-col gap-4 shadow-2xl z-10"
      >
        <div className="flex items-center gap-2 text-sc-accent">
          <History size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Version History</h3>
        </div>

        <p className="text-sm text-sc-text-muted leading-relaxed">
          Manual saves create checkpoints here. Restoring a checkpoint loads it into the editor so you can review and save it as the current version.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {versions.length > 0 ? versions.map(version => (
            <Card key={version.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sc-text truncate">{version.title}</p>
                  <p className="text-xs text-sc-text-subtle mt-1">{new Date(version.created_at).toLocaleString()}</p>
                </div>
                <Badge variant="default">Checkpoint</Badge>
              </div>
              <p className="mt-3 text-sm text-sc-text-muted line-clamp-4 whitespace-pre-wrap">
                {version.content || 'Empty draft'}
              </p>
              <Button
                variant="ghost"
                className="mt-3 justify-start px-0 text-sc-accent hover:bg-transparent"
                onClick={() => onRestoreVersion(version)}
              >
                Restore this version
              </Button>
            </Card>
          )) : (
            <Card className="p-4 text-center">
              <p className="text-sm text-sc-text-muted">No checkpoints yet. Save the script manually to create the first version.</p>
            </Card>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

interface RewritePanelProps {
  selection: ScriptSelection | null;
  rewriteReason: string;
  onRewriteReasonChange: (value: string) => void;
  isRewriting: boolean;
  onRewrite: () => void;
  onClose: () => void;
}

export const ScriptRewritePanel: React.FC<RewritePanelProps> = ({
  selection,
  rewriteReason,
  onRewriteReasonChange,
  isRewriting,
  onRewrite,
  onClose,
}) => (
  <AnimatePresence>
    {selection && (
      <motion.div
        initial={{ x: 280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 280, opacity: 0 }}
        className="w-80 border-l border-sc-border-subtle glass-panel p-6 flex flex-col gap-6 shadow-2xl z-10"
      >
        <div className="flex items-center gap-2 text-sc-accent">
          <Sparkles size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Surgical Rewrite</h3>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-sc-text-subtle">Selected Section</span>
          <div className="p-3 rounded-lg bg-sc-accent-soft border border-sc-border-subtle text-sm text-sc-text-muted italic leading-relaxed">
            "{selection.text.length > 150 ? selection.text.substring(0, 150) + '...' : selection.text}"
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <span className="text-[10px] uppercase tracking-widest font-bold text-sc-text-subtle">What should change?</span>
          <textarea
            autoFocus
            placeholder="e.g., Make this sharper, sound less scripted, add the price here, or tighten the setup..."
            className="soft-input w-full h-32 rounded-[1.25rem] p-4 text-sm text-sc-text focus:outline-none focus:border-sc-accent transition-all resize-none"
            value={rewriteReason}
            onChange={e => onRewriteReasonChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRewrite}
            disabled={isRewriting || !rewriteReason}
            className="w-full py-3 bg-sc-accent hover:bg-sc-accent/90 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRewriting ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Rewrite section
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-sc-text-subtle hover:text-sc-text text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
