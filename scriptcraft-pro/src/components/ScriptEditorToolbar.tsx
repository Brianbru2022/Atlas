import React, { useState } from 'react';
import {
  Check,
  Clock,
  Download,
  Film,
  FileText,
  History,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  MonitorPlay,
  Package,
  RefreshCcw,
  Rows3,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Type as TypeIcon,
  Upload,
  Volume2,
} from 'lucide-react';

interface ScriptEditorToolbarProps {
  title: string;
  onTitleChange: (value: string) => void;
  estMinutes: string;
  wordCount: number;
  viewMode: 'editor' | 'storyboard' | 'packaging' | 'verify';
  editorMode: 'page' | 'blocks';
  onViewModeChange: (value: 'editor' | 'storyboard' | 'packaging' | 'verify') => void;
  onEditorModeChange: (value: 'page' | 'blocks') => void;
  isSpeaking: boolean;
  onToggleTts: () => void;
  onOpenExport: () => void;
  onExportClips: () => void;
  onImportClips: () => void;
  showHistoryPanel: boolean;
  onToggleHistoryPanel: () => void;
  onOpenTeleprompter: () => void;
  onOpenRestyle: () => void;
  onRebalanceClips: () => void;
  simpleMode: boolean;
  onSimpleModeChange: (value: boolean) => void;
  onDelete: () => void;
  onSave: () => void;
  isSaving: boolean;
  showSaveSuccess: boolean;
  focusMode: boolean;
  onFocusModeChange?: (value: boolean) => void;
}

export const ScriptEditorToolbar: React.FC<ScriptEditorToolbarProps> = ({
  title,
  onTitleChange,
  estMinutes,
  wordCount,
  viewMode,
  editorMode,
  onViewModeChange,
  onEditorModeChange,
  isSpeaking,
  onToggleTts,
  onOpenExport,
  onExportClips,
  onImportClips,
  showHistoryPanel,
  onToggleHistoryPanel,
  onOpenTeleprompter,
  onOpenRestyle,
  onRebalanceClips,
  simpleMode,
  onSimpleModeChange,
  onDelete,
  onSave,
  isSaving,
  showSaveSuccess,
  focusMode,
  onFocusModeChange,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const runAction = (action: () => void) => {
    action();
    setActionMenuOpen(false);
  };

  return (
    <>
      {focusMode && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 glass-panel rounded-2xl px-3 py-2 shadow-lg">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 bg-sc-accent hover:bg-sc-accent/90 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : showSaveSuccess ? <Check size={16} /> : <Save size={16} />}
            <span>{showSaveSuccess ? 'Saved' : 'Save'}</span>
          </button>
          <div className="w-px h-5 bg-sc-border-subtle" />
          <button
            onClick={() => onFocusModeChange?.(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-sc-text-subtle hover:text-sc-text hover:bg-sc-accent-soft rounded-lg text-sm font-medium transition-all"
            title="Exit focus mode"
          >
            <Minimize2 size={16} />
            Exit focus
          </button>
        </div>
      )}

      {!focusMode && (
        <>
          <div className="min-h-20 border-b border-sc-border-subtle px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-transparent surface-tint">
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <label htmlFor="script-title" className="sr-only">Script title</label>
              <input
                id="script-title"
                type="text"
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xl font-semibold focus:outline-none border-b border-transparent focus:border-sc-accent transition-colors px-1 leading-tight"
              />
              <div className="h-4 w-px bg-sc-border-subtle" />
              <div className="hidden sm:flex items-center gap-3 text-xs text-sc-text-subtle font-mono uppercase tracking-[0.16em]">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{estMinutes}m Est.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TypeIcon size={12} />
                  <span>{wordCount} Words</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <div className="glass-panel p-1 rounded-xl">
                {viewMode === 'editor' && (
                  <>
                    <button
                      onClick={() => onEditorModeChange('page')}
                      className={`p-2 rounded-xl transition-all ${editorMode === 'page' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                      title="Page Mode"
                      aria-label="Page editor mode"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => onEditorModeChange('blocks')}
                      className={`p-2 rounded-xl transition-all ${editorMode === 'blocks' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                      title="Block Mode"
                      aria-label="Block editor mode"
                    >
                      <Rows3 size={18} />
                    </button>
                    <div className="mx-1 h-6 w-px bg-sc-border-subtle" />
                  </>
                )}
                <button
                  onClick={() => onViewModeChange('editor')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'editor' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                  title="Editor View"
                  aria-label="Editor view"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => onViewModeChange('storyboard')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'storyboard' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                  title="Storyboard View"
                  aria-label="Storyboard view"
                >
                  <LayoutTemplate size={18} />
                </button>
                <button
                  onClick={() => onViewModeChange('packaging')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'packaging' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                  title="Packaging View"
                  aria-label="Packaging view"
                >
                  <Package size={18} />
                </button>
                <button
                  onClick={() => onViewModeChange('verify')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'verify' ? 'bg-white/80 shadow-sm text-sc-text' : 'text-sc-text-subtle hover:text-sc-text'}`}
                  title="Verify Claims"
                  aria-label="Verify claims view"
                >
                  <ShieldCheck size={18} />
                </button>
              </div>

              <button
                onClick={onToggleTts}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isSpeaking ? 'bg-red-50 text-red-500' : 'text-sc-text-subtle hover:text-sc-text hover:bg-sc-accent-soft'}`}
                title={isSpeaking ? 'Stop read-through' : 'Read draft aloud'}
                aria-label={isSpeaking ? 'Stop read-through' : 'Read draft aloud'}
              >
                {isSpeaking ? <Square size={20} fill="currentColor" /> : <Volume2 size={20} />}
              </button>

              <button
                onClick={onOpenExport}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sc-text-subtle hover:text-sc-text hover:bg-sc-accent-soft rounded-lg transition-all"
                title="Export draft and assets"
              >
                <Download size={20} />
                <span className="hidden lg:inline text-sm font-medium">Export</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setActionMenuOpen(open => !open)}
                  className="flex items-center gap-2 px-3 py-2 text-sc-text-subtle hover:text-sc-text hover:bg-sc-accent-soft rounded-lg transition-all"
                  title="More script tools"
                  aria-label="More script tools"
                  aria-expanded={actionMenuOpen}
                >
                  <MoreHorizontal size={20} />
                  <span className="hidden lg:inline text-sm font-medium">Tools</span>
                </button>
                {actionMenuOpen && (
                  <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] p-2 shadow-[0_18px_50px_rgba(31,23,17,0.18)]">
                    <ToolbarMenuItem icon={<Film size={16} />} label="Download clip data" onClick={() => runAction(onExportClips)} />
                    <ToolbarMenuItem icon={<Upload size={16} />} label="Import clips" onClick={() => runAction(onImportClips)} />
                    <ToolbarMenuItem icon={<History size={16} />} label={showHistoryPanel ? 'Hide version history' : 'Show version history'} onClick={() => runAction(onToggleHistoryPanel)} active={showHistoryPanel} />
                    <ToolbarMenuItem icon={<RefreshCcw size={16} />} label="Restyle script" onClick={() => runAction(onOpenRestyle)} />
                    <ToolbarMenuItem icon={<Sparkles size={16} />} label="Rebalance clips" onClick={() => runAction(onRebalanceClips)} />
                    <ToolbarMenuItem icon={<MonitorPlay size={16} />} label="Teleprompter" onClick={() => runAction(onOpenTeleprompter)} />
                    <ToolbarMenuItem icon={<Rows3 size={16} />} label={simpleMode ? 'Full workspace' : 'Simple mode'} onClick={() => runAction(() => onSimpleModeChange(!simpleMode))} active={simpleMode} />
                    <ToolbarMenuItem icon={isSpeaking ? <Square size={16} /> : <Volume2 size={16} />} label={isSpeaking ? 'Stop read-through' : 'Read draft aloud'} onClick={() => runAction(onToggleTts)} active={isSpeaking} />
                  </div>
                )}
              </div>
              <button
                onClick={onDelete}
                className="p-2 text-sc-text-subtle hover:text-red-500 transition-colors"
                title="Delete script"
                aria-label="Delete script"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-sc-accent hover:bg-sc-accent/90 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : showSaveSuccess ? <Check size={18} /> : <Save size={18} />}
                <span className="hidden sm:inline">{showSaveSuccess ? 'Saved' : 'Save Draft'}</span>
              </button>
            </div>
          </div>

          {onFocusModeChange && viewMode === 'editor' && (
            <button
              onClick={() => onFocusModeChange(true)}
              className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-2.5 text-sc-text-subtle hover:text-sc-text hover:bg-sc-accent-soft rounded-2xl text-sm font-medium transition-all border border-sc-border-subtle glass-panel"
              title="Focus mode (hide sidebar and toolbar)"
            >
              <Maximize2 size={18} />
              Focus
            </button>
          )}
        </>
      )}
    </>
  );
};

const ToolbarMenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}> = ({ icon, label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? 'bg-sc-accent-soft text-sc-text' : 'text-sc-text-muted hover:bg-sc-accent-soft hover:text-sc-text'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
