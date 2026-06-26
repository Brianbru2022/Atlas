import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Layout, 
  Plus, 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Library, 
  Settings,
  Trash2,
  SunMedium,
  Moon,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { Project, Script } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import { slideInLeft } from '../utils/motion';

interface SidebarProps {
  projects: Project[];
  onSelectScript: (script: Script) => void;
  onNewProject: () => void;
  onNewScript: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onProjectsChange?: () => void;
  onScriptsChange?: () => void;
  onOpenStyleLibrary: () => void;
  onOpenSettings?: () => void;
  activeScriptId?: string | null;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ projects, onSelectScript, onNewProject, onNewScript, onDeleteProject, onProjectsChange, onScriptsChange, onOpenStyleLibrary, onOpenSettings, activeScriptId, className }) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projectScripts, setProjectScripts] = useState<Record<string, Script[]>>({});
  const [confirmProjectId, setConfirmProjectId] = useState<string | null>(null);
  const [confirmScript, setConfirmScript] = useState<Script | null>(null);
  const [projectQuery, setProjectQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState({ name: '', description: '' });
  const [renamingScriptId, setRenamingScriptId] = useState<string | null>(null);
  const [scriptTitleDraft, setScriptTitleDraft] = useState('');
  const { theme, setTheme } = useTheme();

  const toggleProject = async (projectId: string) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    if (!projectScripts[projectId]) {
      const data = await invoke<Script[]>('get_scripts', { projectId });
      setProjectScripts(prev => ({ ...prev, [projectId]: data }));
    }
  };

  useEffect(() => {
    let active = true;
    const loadAllProjectScripts = async () => {
      const missingProjects = projects.filter(project => !projectScripts[project.id]);
      if (missingProjects.length === 0) return;
      const entries = await Promise.all(
        missingProjects.map(async project => [
          project.id,
          await invoke<Script[]>('get_scripts', { projectId: project.id }),
        ] as const)
      );
      if (!active) return;
      setProjectScripts(prev => {
        const next = { ...prev };
        entries.forEach(([projectId, scripts]) => {
          next[projectId] = scripts;
        });
        return next;
      });
    };

    loadAllProjectScripts().catch(error => console.error('Failed to load sidebar scripts', error));
    return () => {
      active = false;
    };
  }, [projects]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectQuery.trim().toLowerCase())
  );
  const recentScripts = (Object.values(projectScripts) as Script[][])
    .reduce<Script[]>((all, scripts) => [...all, ...scripts], [])
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 3);

  const startProjectEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectDraft({ name: project.name, description: project.description ?? '' });
  };

  const saveProjectEdit = async (project: Project) => {
    const nextName = projectDraft.name.trim();
    if (!nextName) return;
    await invoke<void>('update_project', {
      payload: {
        id: project.id,
        name: nextName,
        description: projectDraft.description.trim(),
        default_style_id: project.default_style_id ?? null,
      },
    });
    setEditingProjectId(null);
    onProjectsChange?.();
  };

  const refreshProjectScripts = async (projectId: string) => {
    const data = await invoke<Script[]>('get_scripts', { projectId });
    setProjectScripts(prev => ({ ...prev, [projectId]: data }));
    onScriptsChange?.();
  };

  const saveScriptRename = async (script: Script) => {
    const nextTitle = scriptTitleDraft.trim();
    if (!nextTitle) return;
    await invoke<void>('update_script', {
      id: script.id,
      content: script.content,
      title: nextTitle,
      style_id: script.style_id,
      location: script.location,
      video_clips: script.video_clips,
      status: script.status ?? 'draft',
      packaging: script.packaging ?? null,
      verification: script.verification ?? null,
      scorecard: script.scorecard ?? null,
      editor_preferences: script.editor_preferences ?? null,
    });
    setRenamingScriptId(null);
    await refreshProjectScripts(script.project_id);
  };

  const deleteScriptFromSidebar = async (script: Script) => {
    await invoke<void>('delete_script', { id: script.id });
    setConfirmScript(null);
    await refreshProjectScripts(script.project_id);
  };

  return (
    <div className={className ?? "hidden h-full w-[272px] shrink-0 border-r border-sc-border-subtle text-sc-text-muted font-sans surface-tint md:flex md:flex-col lg:w-[296px]"}>
      <div className="p-5 flex items-center gap-3 border-b border-sc-border-subtle">
        <div className="w-10 h-10 bg-sc-accent rounded-[1rem] flex items-center justify-center text-white shadow-[0_12px_24px_rgba(20,91,82,0.22)]">
          <Layout size={18} />
        </div>
        <div>
          <h1 className="font-semibold text-sc-text tracking-tight text-lg">ScriptCraft</h1>
          <p className="text-[11px] uppercase tracking-[0.26em] font-mono text-sc-text-subtle">Creator cockpit</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">
        {recentScripts.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-sc-text-subtle px-3 mb-3 block">Recent</span>
            <div className="space-y-1">
              {recentScripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => onSelectScript(script)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-sc-accent-soft"
                >
                  <FileText size={14} />
                  <span className="min-w-0 flex-1 truncate">{script.title}</span>
                  <StatusBadge status={script.status} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-sc-text-subtle">Projects</span>
            <button 
              onClick={onNewProject}
              className="h-8 w-8 rounded-full glass-panel flex items-center justify-center hover:text-sc-text transition-colors"
              aria-label="Create new project"
            >
              <Plus size={14} />
            </button>
          </div>
          <label className="sr-only" htmlFor="project-search">Search projects</label>
          <input
            id="project-search"
            value={projectQuery}
            onChange={event => setProjectQuery(event.target.value)}
            placeholder="Search projects"
            className="mb-3 w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
          />
          
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >
            {filteredProjects.map(project => (
              <motion.div
                key={project.id}
                variants={slideInLeft}
                initial="hidden"
                animate="show"
              >
                <div className="rounded-2xl">
                  <div
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-2xl hover:bg-sc-accent-soft transition-colors group cursor-pointer"
                  >
                    {expandedProjects[project.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sc-accent-soft text-sc-accent">
                      <Folder size={15} className="text-sc-accent" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm">{project.name}</span>
                      {project.description && <span className="block truncate text-[11px] text-sc-text-subtle">{project.description}</span>}
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); startProjectEdit(project); }}
                        className="p-1.5 text-sc-text-subtle hover:text-sc-text transition-colors"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNewScript(project.id); }}
                        className="p-1.5 text-sc-text-subtle hover:text-sc-text transition-colors"
                        aria-label={`Create script in ${project.name}`}
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmProjectId(project.id); }}
                        className="p-1.5 text-sc-text-subtle hover:text-red-500 transition-colors"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {editingProjectId === project.id && (
                    <div className="mx-3 mb-2 space-y-2 rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-3">
                      <input
                        value={projectDraft.name}
                        onChange={event => setProjectDraft(prev => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-lg border border-sc-border-subtle bg-sc-bg-elevated px-3 py-2 text-sm text-sc-text focus:border-sc-accent focus:outline-none"
                        aria-label="Project name"
                      />
                      <textarea
                        value={projectDraft.description}
                        onChange={event => setProjectDraft(prev => ({ ...prev, description: event.target.value }))}
                        placeholder="Project description"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-sc-border-subtle bg-sc-bg-elevated px-3 py-2 text-sm text-sc-text focus:border-sc-accent focus:outline-none"
                        aria-label="Project description"
                      />
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg px-2 py-1 text-xs hover:bg-sc-accent-soft" onClick={() => setEditingProjectId(null)}><X size={14} /></button>
                        <button className="rounded-lg bg-sc-accent px-2 py-1 text-xs text-white" onClick={() => saveProjectEdit(project)}><Check size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
                
                <AnimatePresence>
                  {expandedProjects[project.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden ml-5 border-l border-sc-border-subtle mt-2"
                    >
                      {projectScripts[project.id]?.map(script => (
                        <div
                          key={script.id}
                          className={`group/script flex w-full items-center gap-2 rounded-r-2xl px-4 py-2.5 text-sm transition-colors ${
                            activeScriptId === script.id 
                              ? 'bg-sc-accent-soft text-sc-accent border-l-2 border-sc-accent shadow-sm' 
                              : 'hover:bg-sc-accent-soft/70'
                          }`}
                        >
                          <FileText size={14} />
                          {renamingScriptId === script.id ? (
                            <input
                              value={scriptTitleDraft}
                              onChange={event => setScriptTitleDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') saveScriptRename(script);
                                if (event.key === 'Escape') setRenamingScriptId(null);
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-sc-border-subtle bg-sc-bg px-2 py-1 text-sm text-sc-text focus:border-sc-accent focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <button onClick={() => onSelectScript(script)} className="min-w-0 flex-1 text-left">
                              <span className="block truncate">{script.title}</span>
                            </button>
                          )}
                          <StatusBadge status={script.status} />
                          <div className="flex items-center opacity-0 transition-opacity group-hover/script:opacity-100">
                            {renamingScriptId === script.id ? (
                              <button className="p-1 text-sc-text-subtle hover:text-sc-text" onClick={() => saveScriptRename(script)} aria-label="Save script title"><Check size={13} /></button>
                            ) : (
                              <button
                                className="p-1 text-sc-text-subtle hover:text-sc-text"
                                onClick={() => {
                                  setRenamingScriptId(script.id);
                                  setScriptTitleDraft(script.title);
                                }}
                                aria-label={`Rename ${script.title}`}
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button className="p-1 text-sc-text-subtle hover:text-red-500" onClick={() => setConfirmScript(script)} aria-label={`Delete ${script.title}`}><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                      {(!projectScripts[project.id] || projectScripts[project.id].length === 0) && (
                        <div className="px-4 py-3">
                          <p className="text-xs text-sc-text-subtle">No scripts yet</p>
                          <button
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-sc-border-subtle px-3 py-2 text-xs text-sc-accent hover:bg-sc-accent-soft"
                            onClick={() => onNewScript(project.id)}
                          >
                            <Plus size={13} />
                            New script
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="rounded-xl border border-dashed border-sc-border-subtle px-4 py-5 text-center text-sm text-sc-text-subtle">
                No matching projects
              </div>
            )}
          </motion.div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-sc-text-subtle px-3 mb-3 block">Library</span>
          <button 
            onClick={onOpenStyleLibrary}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-sc-accent-soft transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--sc-accent-2-soft)] text-[color:var(--sc-accent-2)]">
              <Library size={16} />
            </div>
            <span className="text-sm">Style Library</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-sc-border-subtle flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl hover:bg-sc-accent-soft transition-colors text-sc-text-subtle"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
        </button>
        <button
          className="h-10 w-10 rounded-full glass-panel flex items-center justify-center hover:bg-sc-accent-soft transition-colors"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <SunMedium className={theme === 'dark' ? 'inline-block' : 'hidden'} size={16} />
          <Moon className={theme === 'light' ? 'inline-block' : 'hidden'} size={16} />
        </button>
      </div>

      {confirmProjectId && (
        <ConfirmModal
          title="Delete project?"
          message={`"${projects.find(p => p.id === confirmProjectId)?.name ?? 'This project'}" and all its scripts will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            onDeleteProject(confirmProjectId);
            setConfirmProjectId(null);
          }}
          onCancel={() => setConfirmProjectId(null)}
        />
      )}
      {confirmScript && (
        <ConfirmModal
          title="Delete script?"
          message={`"${confirmScript.title}" will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteScriptFromSidebar(confirmScript)}
          onCancel={() => setConfirmScript(null)}
        />
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const normalized = status || 'draft';
  const label = normalized === 'polishing' ? 'Polish' : normalized === 'ready' ? 'Ready' : 'Draft';
  const tone = normalized === 'ready'
    ? 'bg-emerald-100 text-emerald-700'
    : normalized === 'polishing'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-sc-accent-soft text-sc-text-subtle';

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      {label}
    </span>
  );
};
