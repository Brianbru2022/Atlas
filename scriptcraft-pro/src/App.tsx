import React, { Suspense, lazy, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { ScriptEditor } from './components/ScriptEditor';
import { CommandPalette, CommandPaletteAction } from './components/CommandPalette';
import { ShortcutHelpModal } from './components/ShortcutHelpModal';
import { Project, Script, Style } from './types';
import { FolderPlus, Sparkles, Layout, FileText, Wand2, Clapperboard, CheckCircle2, Menu, X, Search, Keyboard } from 'lucide-react';
import { Card } from './components/ui';
import { motion, AnimatePresence } from 'motion/react';
import { riseIn, staggerContainer } from './utils/motion';

const StyleLibrary = lazy(() => import('./components/StyleLibrary').then(module => ({ default: module.StyleLibrary })));
const ScriptWizard = lazy(() => import('./components/ScriptWizard').then(module => ({ default: module.ScriptWizard })));
const NewProjectModal = lazy(() => import('./components/NewProjectModal').then(module => ({ default: module.NewProjectModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));

const LazyPanelFallback = () => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
    <div className="modal-panel rounded-2xl px-6 py-4 text-sm text-sc-text-muted">Loading workspace...</div>
  </div>
);

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [recentScripts, setRecentScripts] = useState<Script[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [showStyleLibrary, setShowStyleLibrary] = useState(false);
  const [wizardConfig, setWizardConfig] = useState<{ projectId: string } | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showWorkspaceDrawer, setShowWorkspaceDrawer] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [editorActions, setEditorActions] = useState<CommandPaletteAction[]>([]);
  const globalPaletteActions: CommandPaletteAction[] = [
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'Show the shortcut and command reference.',
      group: 'Actions',
      icon: <Keyboard size={17} />,
      keywords: ['help', 'shortcuts', 'keys'],
      onRun: () => setShowShortcutHelp(true),
    },
  ];

  // Close modals with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(open => !open);
        return;
      }
      if (e.key !== 'Escape') return;
      if (showShortcutHelp) setShowShortcutHelp(false);
      else if (showCommandPalette) setShowCommandPalette(false);
      else if (showStyleLibrary) setShowStyleLibrary(false);
      else if (showNewProjectModal) setShowNewProjectModal(false);
      else if (wizardConfig) setWizardConfig(null);
      else if (showSettings) setShowSettings(false);
      else if (showWorkspaceDrawer) setShowWorkspaceDrawer(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, showShortcutHelp, showStyleLibrary, showNewProjectModal, wizardConfig, showSettings, showWorkspaceDrawer]);

  useEffect(() => {
    const init = async () => {
      try {
        const [projectsData, stylesData] = await Promise.all([
          invoke<Project[]>('get_projects'),
          invoke<Style[]>('get_styles')
        ]);
        setProjects(projectsData);
        setStyles(stylesData);
        const scriptsByProject = await Promise.all(
          projectsData.map(project => invoke<Script[]>('get_scripts', { projectId: project.id }))
        );
        setRecentScripts(
          scriptsByProject
            .flat()
            .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
            .slice(0, 5)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
  }, []);

  const handleSelectScript = (script: Script) => {
    setActiveScript(script);
    setActiveProject(script.project_id);
    setShowWorkspaceDrawer(false);
  };

  useEffect(() => {
    if (!activeScript) {
      setEditorActions([]);
    }
  }, [activeScript]);

  const handleNewProject = () => {
    setShowWorkspaceDrawer(false);
    setShowNewProjectModal(true);
  };

  const handleCreateProject = async (name: string) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString()
    };
    const saved = await invoke<Project>('create_project', { project });
    setProjects(prev => [saved, ...prev]);
    setShowNewProjectModal(false);
  };

  const handleNewScript = (projectId: string) => {
    setShowWorkspaceDrawer(false);
    setWizardConfig({ projectId });
  };

  const handleDeleteProject = async (projectId: string) => {
    await invoke<void>('delete_project', { projectId });
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProject === projectId) {
      setActiveProject(null);
      setActiveScript(null);
    }
  };

  const handleDeleteScript = async (id: string) => {
    await invoke<void>('delete_script', { id });
    setActiveScript(null);
    const data = await invoke<Project[]>('get_projects');
    setProjects(data);
  };

  const refreshStyles = async () => {
    const data = await invoke<Style[]>('get_styles');
    setStyles(data);
  };

  const refreshRecentScripts = async (projectList = projects) => {
    const scriptsByProject = await Promise.all(
      projectList.map(project => invoke<Script[]>('get_scripts', { projectId: project.id }))
    );
    setRecentScripts(
      scriptsByProject
        .flat()
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .slice(0, 5)
    );
  };

  const activeProjectName = projects.find(project => project.id === activeProject)?.name ?? null;
  const workflowSteps = [
    {
      id: 'project',
      label: 'Project',
      description: activeProjectName ? activeProjectName : 'Set up the home base for a channel, client, or series',
      icon: FolderPlus,
      state: projects.length > 0 ? 'done' : 'current',
    },
    {
      id: 'brief',
      label: 'Brief',
      description: activeScript?.premise ? 'Angle, constraints, and source material are locked in' : 'Define the angle, must-hit points, and available footage',
      icon: Wand2,
      state: activeScript?.premise ? 'done' : wizardConfig ? 'current' : 'upcoming',
    },
    {
      id: 'draft',
      label: 'Draft',
      description: activeScript ? activeScript.title : 'Generate the first draft and shape the script',
      icon: FileText,
      state: activeScript ? 'done' : wizardConfig ? 'current' : 'upcoming',
    },
    {
      id: 'polish',
      label: 'Polish',
      description: activeScript ? 'Refine the script, check claims, and prep delivery' : 'Tighten structure, pacing, and delivery',
      icon: Clapperboard,
      state: activeScript ? 'current' : 'upcoming',
    },
    {
      id: 'publish',
      label: 'Publish',
      description: 'Prepare titles, packaging, and export-ready assets',
      icon: CheckCircle2,
      state: activeScript ? 'upcoming' : 'upcoming',
    },
  ] as const;

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen bg-sc-bg flex items-center justify-center">
        <div className="glass-panel rounded-[2rem] px-10 py-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-sc-accent-soft border-t-sc-accent rounded-full animate-spin" />
          <p className="text-sc-text-subtle font-mono text-xs uppercase tracking-[0.32em]">Initializing ScriptCraft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell h-screen w-screen overflow-hidden bg-sc-bg p-2 sm:p-4">
      <div className="glass-panel h-full w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/20 flex">
      {!focusMode && (
        <Sidebar 
          projects={projects}
          onSelectScript={handleSelectScript}
          onNewProject={handleNewProject}
          onNewScript={handleNewScript}
          onDeleteProject={handleDeleteProject}
              onProjectsChange={async () => {
            const data = await invoke<Project[]>('get_projects');
            setProjects(data);
            refreshRecentScripts(data);
          }}
          onScriptsChange={() => refreshRecentScripts()}
          onOpenStyleLibrary={() => setShowStyleLibrary(true)}
          onOpenSettings={() => setShowSettings(true)}
          activeScriptId={activeScript?.id}
        />
      )}

      <main className="flex-1 flex min-h-0 flex-col relative min-w-0">
        <div className="border-b border-sc-border-subtle bg-transparent">
          <div className={`px-4 py-4 md:px-6 ${activeScript ? 'md:py-4' : 'md:py-5'}`}>
            {!focusMode && (
              <button
                type="button"
                onClick={() => setShowWorkspaceDrawer(true)}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-sc-border-subtle bg-sc-bg-elevated px-3 py-2 text-sm font-medium text-sc-text shadow-sm transition-colors hover:bg-sc-accent-soft md:hidden"
                aria-label="Open workspace navigation"
              >
                <Menu size={16} />
                Workspace
              </button>
            )}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-sc-text-subtle font-mono">Creator Workflow</p>
                <h2 className={`${activeScript ? 'mt-1 text-xl md:text-2xl' : 'mt-2 text-3xl'} font-semibold text-sc-text leading-tight`}>
                  {activeScript ? `Building "${activeScript.title}"` : 'Go from rough idea to publish-ready script'}
                </h2>
                {!activeScript && <p className="mt-3 text-sm text-sc-text-muted max-w-3xl leading-relaxed">
                  {activeScript
                    ? 'Work left to right: strengthen the draft, pressure-test the facts, then package the episode for release.'
                    : 'ScriptCraft walks you through one clear path: choose the voice, find the angle, build the plan, write the script, verify the facts, then package it for release.'}
                </p>}
              </div>
              <div className="glass-card rounded-xl px-4 py-3 text-sm text-sc-text-muted max-w-sm">
                {activeProjectName ? (
                  <span>Active project: <span className="text-sc-text font-medium">{activeProjectName}</span></span>
                ) : (
                  <span>Start by creating a project, then open the wizard to map out the next script.</span>
                )}
              </div>
            </div>
            {!focusMode && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowCommandPalette(true)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-sc-border-subtle bg-sc-bg-elevated/70 px-3 py-2 text-left text-sm text-sc-text-muted transition-colors hover:border-sc-accent-soft-strong hover:text-sc-text sm:w-auto"
                aria-label="Open command palette"
              >
                <span className="flex items-center gap-2">
                  <Search size={15} />
                  Search commands
                </span>
                <span className="rounded-md border border-sc-border-subtle px-1.5 py-0.5 text-[11px] font-medium text-sc-text-subtle">Ctrl K</span>
              </button>
              <button
                type="button"
                onClick={() => setShowShortcutHelp(true)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-sc-border-subtle bg-sc-bg-elevated/70 px-3 py-2 text-left text-sm text-sc-text-muted transition-colors hover:border-sc-accent-soft-strong hover:text-sc-text sm:w-auto"
                aria-label="Open keyboard shortcuts"
              >
                <span className="flex items-center gap-2">
                  <Keyboard size={15} />
                  Shortcuts
                </span>
                <span className="rounded-md border border-sc-border-subtle px-1.5 py-0.5 text-[11px] font-medium text-sc-text-subtle">?</span>
              </button>
              </div>
            )}

            <motion.div
              className={`${activeScript ? 'mt-4 flex gap-2 overflow-x-auto pb-1' : 'mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5'}`}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isCurrent = step.state === 'current';
                const isDone = step.state === 'done';

                return (
                  <motion.div key={step.id} variants={riseIn} className="h-full">
                  <Card
                    className={`relative h-full overflow-hidden transition-all ${activeScript ? 'min-w-[150px] px-3 py-2 rounded-xl' : 'ambient-orb hover-float min-h-[104px] p-5'} ${
                      isCurrent
                        ? 'border-sc-accent bg-sc-accent-soft shadow-[0_18px_40px_rgba(20,91,82,0.16)]'
                        : isDone
                          ? 'border-sc-accent-soft-strong'
                          : ''
                    }`}
                  >
                    {!activeScript && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
                    <div className={`flex h-full ${activeScript ? 'items-center gap-2' : 'items-start gap-3'}`}>
                      <div
                        className={`mt-0.5 flex shrink-0 items-center justify-center ${activeScript ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-[1.1rem]'} ${
                          isCurrent
                            ? 'bg-sc-accent text-white'
                          : isDone
                              ? 'bg-sc-accent-soft text-sc-accent'
                              : 'bg-white/70 text-sc-text-subtle'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-sc-text-subtle">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-semibold text-sc-text">{step.label}</span>
                        </div>
                        {!activeScript && <p className="mt-2 text-sm leading-relaxed text-sc-text-muted line-clamp-2">{step.description}</p>}
                      </div>
                    </div>
                  </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeScript ? (
            <motion.div 
              key={activeScript.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-0"
            >
              <ScriptEditor 
                script={activeScript}
                style={styles.find(s => s.id === activeScript.style_id) || null}
                styles={styles}
                onSave={setActiveScript}
                onDelete={handleDeleteScript}
                focusMode={focusMode}
                onFocusModeChange={setFocusMode}
                onCommandActionsChange={setEditorActions}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex-1 overflow-y-auto p-6 md:p-8"
            >
              <motion.div className="mx-auto grid w-full max-w-6xl gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]" variants={staggerContainer} initial="hidden" animate="show">
                <motion.div variants={riseIn} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card
                      role="button"
                      tabIndex={0}
                      className="group cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:border-sc-accent-soft-strong"
                      onClick={handleNewProject}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleNewProject();
                        }
                      }}
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sc-accent-soft text-sc-accent">
                        <FolderPlus className="group-hover:scale-110 transition-transform" size={22} />
                      </div>
                      <h3 className="font-semibold text-sc-text mb-2 text-lg">New Project</h3>
                      <p className="text-sm text-sc-text-muted leading-relaxed">Create a workspace for a channel, recurring format, or client.</p>
                    </Card>
                    <Card
                      role="button"
                      tabIndex={0}
                      className="group cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:border-sc-accent-soft-strong"
                      onClick={() => setShowStyleLibrary(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setShowStyleLibrary(true);
                        }
                      }}
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--sc-accent-2-soft)] text-[color:var(--sc-accent-2)]">
                        <Sparkles className="group-hover:scale-110 transition-transform" size={22} />
                      </div>
                      <h3 className="font-semibold text-sc-text mb-2 text-lg">Style Library</h3>
                      <p className="text-sm text-sc-text-muted leading-relaxed">Save tone, pacing, and phrase rules for future drafts.</p>
                    </Card>
                  </div>

                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Recent Scripts</p>
                        <h3 className="mt-1 text-lg font-semibold text-sc-text">Pick up where you left off</h3>
                      </div>
                      <Layout size={20} className="text-sc-text-subtle" />
                    </div>
                    <div className="mt-4 divide-y divide-sc-border-subtle overflow-hidden rounded-xl border border-sc-border-subtle">
                      {recentScripts.length > 0 ? recentScripts.map(script => (
                        <button
                          key={script.id}
                          onClick={() => handleSelectScript(script)}
                          className="flex w-full items-center justify-between gap-4 bg-white/45 px-4 py-3 text-left transition-colors hover:bg-sc-accent-soft"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-sc-text">{script.title}</p>
                            <p className="mt-1 text-xs text-sc-text-subtle">
                              {new Date(script.updated_at || script.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <FileText size={16} className="shrink-0 text-sc-text-subtle" />
                        </button>
                      )) : (
                        <div className="bg-white/45 px-4 py-8 text-center">
                          <p className="text-sm font-medium text-sc-text">No scripts yet</p>
                          <p className="mt-1 text-sm text-sc-text-muted">Create a project, then open the wizard to generate your first draft.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={riseIn}>
                  <Card className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Getting Started</p>
                    <h3 className="mt-1 text-lg font-semibold text-sc-text">First useful setup</h3>
                    <div className="mt-4 space-y-3">
                      <ChecklistRow done={projects.length > 0} label="Create a project" hint="A home for a channel, client, or series." />
                      <ChecklistRow done={styles.length > 0} label="Add a style" hint="Teach drafts your voice and constraints." />
                      <ChecklistRow done={recentScripts.length > 0} label="Generate a script" hint="Use the wizard to move from brief to draft." />
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <Suspense fallback={<LazyPanelFallback />}>
        <AnimatePresence>
          {showWorkspaceDrawer && !focusMode && (
            <motion.div
              className="fixed inset-0 z-[90] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowWorkspaceDrawer(false)}
                aria-label="Close workspace navigation"
              />
              <motion.div
                className="absolute inset-y-0 left-0 w-[min(88vw,340px)] overflow-hidden border-r border-sc-border-subtle bg-sc-bg shadow-[20px_0_60px_rgba(0,0,0,0.24)]"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className="absolute right-3 top-3 z-10">
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceDrawer(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sc-border-subtle bg-sc-bg-elevated text-sc-text-muted transition-colors hover:text-sc-text"
                    aria-label="Close workspace navigation"
                  >
                    <X size={16} />
                  </button>
                </div>
                <Sidebar
                  projects={projects}
                  onSelectScript={handleSelectScript}
                  onNewProject={handleNewProject}
                  onNewScript={handleNewScript}
                  onDeleteProject={handleDeleteProject}
                  onProjectsChange={async () => {
                    const data = await invoke<Project[]>('get_projects');
                    setProjects(data);
                    refreshRecentScripts(data);
                  }}
                  onScriptsChange={() => refreshRecentScripts()}
                  onOpenStyleLibrary={() => {
                    setShowWorkspaceDrawer(false);
                    setShowStyleLibrary(true);
                  }}
                  onOpenSettings={() => {
                    setShowWorkspaceDrawer(false);
                    setShowSettings(true);
                  }}
                  activeScriptId={activeScript?.id}
                  className="flex h-full w-full flex-col text-sc-text-muted font-sans surface-tint"
                />
              </motion.div>
            </motion.div>
          )}
          {showStyleLibrary && (
            <StyleLibrary 
              onClose={() => setShowStyleLibrary(false)} 
              onStylesChange={refreshStyles}
              onSelect={(style) => {
                // Just viewing library from sidebar, no selection logic needed here
                // unless we're in the middle of a flow
              }}
            />
          )}
          {showNewProjectModal && (
            <NewProjectModal 
              onClose={() => setShowNewProjectModal(false)}
              onCreate={handleCreateProject}
            />
          )}
          {wizardConfig && (
            <ScriptWizard 
              projectId={wizardConfig.projectId}
              styles={styles}
              onOpenStyleLibrary={() => setShowStyleLibrary(true)}
              onCancel={() => setWizardConfig(null)}
              onComplete={(script) => {
                setWizardConfig(null);
                setActiveScript(script);
                invoke<Project[]>('get_projects').then((nextProjects) => {
                  setProjects(nextProjects);
                  refreshRecentScripts(nextProjects);
                });
              }}
            />
          )}
          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} />
          )}
        </AnimatePresence>
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          projects={projects}
          recentScripts={recentScripts}
          activeProjectId={activeProject}
          editorActions={[...globalPaletteActions, ...editorActions]}
          onNewProject={handleNewProject}
          onNewScript={handleNewScript}
          onOpenStyleLibrary={() => setShowStyleLibrary(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSelectScript={handleSelectScript}
          onOpenWorkspace={() => setShowWorkspaceDrawer(true)}
        />
        <ShortcutHelpModal
          isOpen={showShortcutHelp}
          hasActiveScript={Boolean(activeScript)}
          onClose={() => setShowShortcutHelp(false)}
        />
        </Suspense>
      </main>
      </div>
    </div>
  );
}

const ChecklistRow: React.FC<{ done: boolean; label: string; hint: string }> = ({ done, label, hint }) => (
  <div className="flex items-start gap-3 rounded-xl border border-sc-border-subtle bg-white/45 px-4 py-3">
    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-sc-accent text-white' : 'bg-sc-accent-soft text-sc-text-subtle'}`}>
      {done ? <CheckCircle2 size={14} /> : <span className="h-2 w-2 rounded-full bg-current" />}
    </div>
    <div>
      <p className="text-sm font-medium text-sc-text">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-sc-text-muted">{hint}</p>
    </div>
  </div>
);
