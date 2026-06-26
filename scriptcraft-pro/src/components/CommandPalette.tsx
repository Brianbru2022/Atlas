import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Folder,
  FolderPlus,
  Library,
  Search,
  Settings,
  Wand2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Project, Script } from '../types';

export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string[];
  disabled?: boolean;
  onRun: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  recentScripts: Script[];
  activeProjectId: string | null;
  editorActions?: CommandPaletteAction[];
  onNewProject: () => void;
  onNewScript: (projectId: string) => void;
  onOpenStyleLibrary: () => void;
  onOpenSettings: () => void;
  onSelectScript: (script: Script) => void;
  onOpenWorkspace: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  projects,
  recentScripts,
  activeProjectId,
  editorActions = [],
  onNewProject,
  onNewScript,
  onOpenStyleLibrary,
  onOpenSettings,
  onSelectScript,
  onOpenWorkspace,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeProject = projects.find(project => project.id === activeProjectId) ?? projects[0] ?? null;

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const baseActions: CommandPaletteAction[] = [
      {
        id: 'new-project',
        label: 'New Project',
        description: 'Create a workspace for a channel, client, or series.',
        group: 'Actions',
        icon: <FolderPlus size={17} />,
        keywords: ['create', 'workspace', 'channel'],
        onRun: onNewProject,
      },
      {
        id: 'new-script',
        label: activeProject ? `New Script in ${activeProject.name}` : 'New Script',
        description: activeProject ? 'Open the script wizard for the current project.' : 'Create a project before starting a script.',
        group: 'Actions',
        icon: <Wand2 size={17} />,
        keywords: ['wizard', 'draft', 'brief', 'generate'],
        disabled: !activeProject,
        onRun: () => {
          if (activeProject) onNewScript(activeProject.id);
        },
      },
      {
        id: 'style-library',
        label: 'Style Library',
        description: 'Manage voice profiles, examples, and starter templates.',
        group: 'Actions',
        icon: <Library size={17} />,
        keywords: ['voice', 'tone', 'profile', 'template'],
        onRun: onOpenStyleLibrary,
      },
      {
        id: 'settings',
        label: 'Settings',
        description: 'Edit workspace context and local preferences.',
        group: 'Actions',
        icon: <Settings size={17} />,
        keywords: ['workspace', 'preferences', 'context'],
        onRun: onOpenSettings,
      },
      {
        id: 'workspace-navigation',
        label: 'Workspace Navigation',
        description: 'Open the project and script drawer on small windows.',
        group: 'Actions',
        icon: <Folder size={17} />,
        keywords: ['sidebar', 'projects', 'drawer'],
        onRun: onOpenWorkspace,
      },
    ];

    const projectActions = projects.map(project => ({
      id: `project-${project.id}`,
      label: project.name,
      description: project.description || 'Start a new script in this project.',
      group: 'Projects',
      icon: <Folder size={17} />,
      keywords: ['project', 'workspace', 'new script'],
      onRun: () => onNewScript(project.id),
    }));

    const scriptActions = recentScripts.map(script => ({
      id: `script-${script.id}`,
      label: script.title,
      description: `Open recent script${script.status ? ` · ${script.status}` : ''}`,
      group: 'Recent Scripts',
      icon: <FileText size={17} />,
      keywords: ['recent', 'open', 'script'],
      onRun: () => onSelectScript(script),
    }));

    return [...baseActions, ...editorActions, ...projectActions, ...scriptActions];
  }, [activeProject, editorActions, onNewProject, onNewScript, onOpenSettings, onOpenStyleLibrary, onOpenWorkspace, onSelectScript, projects, recentScripts]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return actions;
    }

    return actions.filter(action => {
      const haystack = [
        action.label,
        action.description,
        action.group,
        ...(action.keywords ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const runAction = (action: CommandPaletteAction) => {
    if (action.disabled) return;
    action.onRun();
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(index => Math.min(index + 1, Math.max(filteredActions.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(index => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const action = filteredActions[selectedIndex];
      if (action) runAction(action);
    }
  };

  const groupedActions = filteredActions.reduce<Record<string, CommandPaletteAction[]>>((groups, action) => {
    groups[action.group] = [...(groups[action.group] ?? []), action];
    return groups;
  }, {});

  let renderedIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/45 px-3 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
            aria-label="Close command palette"
          />
          <motion.div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 border-b border-sc-border-subtle px-4 py-3">
              <Search size={18} className="text-sc-text-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                className="min-w-0 flex-1 bg-transparent text-base text-sc-text placeholder:text-sc-text-subtle focus:outline-none"
                placeholder="Search commands, projects, and scripts"
                aria-label="Search commands"
              />
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sc-text-subtle transition-colors hover:bg-sc-accent-soft hover:text-sc-text"
                aria-label="Close command palette"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[min(62vh,520px)] overflow-y-auto p-2">
              {filteredActions.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-sc-text">No commands found</p>
                  <p className="mt-1 text-sm text-sc-text-muted">Try searching for project, style, script, or settings.</p>
                </div>
              ) : (
                (Object.entries(groupedActions) as Array<[string, CommandPaletteAction[]]>).map(([group, groupActions]) => (
                  <div key={group} className="py-2">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-sc-text-subtle">{group}</p>
                    <div className="space-y-1">
                      {groupActions.map(action => {
                        renderedIndex += 1;
                        const actionIndex = renderedIndex;
                        const isSelected = actionIndex === selectedIndex;
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={action.disabled}
                            onMouseEnter={() => setSelectedIndex(actionIndex)}
                            onClick={() => runAction(action)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                              isSelected ? 'bg-sc-accent-soft text-sc-text' : 'text-sc-text-muted hover:bg-sc-accent-soft hover:text-sc-text'
                            } ${action.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-sc-accent">
                              {action.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{action.label}</span>
                              {action.description && (
                                <span className="mt-0.5 block truncate text-xs text-sc-text-subtle">{action.description}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-sc-border-subtle px-4 py-2 text-[11px] text-sc-text-subtle">
              <span>Enter to run</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
