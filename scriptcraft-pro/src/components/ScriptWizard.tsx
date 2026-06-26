import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  Loader2,
  MapPin,
  PenTool,
  Plus,
  ListTree,
  Target,
  RefreshCcw,
  Compass
} from 'lucide-react';
import { Style, ScriptIdea, Script, ScriptOutline, VideoClip } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { applyClipAssignments, generateScriptIdeas, generateScriptOutline, generateFullScript, suggestClipsFromScript } from '../services/gemini';
import { VideoClipsStep } from './VideoClipsStep';
import { Button, Card } from './ui';

interface ScriptWizardProps {
  projectId: string;
  styles: Style[];
  onComplete: (script: Script) => void;
  onCancel: () => void;
  onOpenStyleLibrary: () => void;
}

type Step = 'style' | 'location' | 'premise' | 'criteria' | 'clips' | 'ideas' | 'outline' | 'length' | 'generating';

export const ScriptWizard: React.FC<ScriptWizardProps> = ({ projectId, styles, onComplete, onCancel, onOpenStyleLibrary }) => {
  const [step, setStep] = useState<Step>('style');
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [location, setLocation] = useState('');
  const [premise, setPremise] = useState('');
  const [criteria, setCriteria] = useState('');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [ideas, setIdeas] = useState<ScriptIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ScriptIdea | null>(null);
  const [outline, setOutline] = useState<ScriptOutline | null>(null);
  const [lengthMinutes, setLengthMinutes] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLocationContext = location.trim().length > 0;
  const handleGenerateIdeas = async () => {
    if (!selectedStyle || (!premise.trim() && !hasLocationContext)) return;
    setIsLoading(true);
    setError(null);
    try {
      const newIdeas = await generateScriptIdeas(selectedStyle, premise, criteria, clips, location);
      if (newIdeas.length === 0) {
        throw new Error("No ideas generated. Please try again.");
      }
      setIdeas(newIdeas);
      setStep('ideas');
    } catch (error) {
      console.error(error);
      setError("Failed to generate ideas. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMoreIdeas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const moreIdeas = await generateScriptIdeas(selectedStyle!, premise, criteria, clips, location);
      setIdeas(prev => [...prev, ...moreIdeas]);
    } catch (error) {
      console.error(error);
      setError("Failed to generate more ideas.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateIdeaAt = (index: number, patch: Partial<ScriptIdea>) => {
    setIdeas(prev => {
      const next = prev.map((idea, ideaIndex) => ideaIndex === index ? { ...idea, ...patch } : idea);
      if (selectedIdea && prev[index]?.title === selectedIdea.title) {
        setSelectedIdea(next[index]);
      }
      return next;
    });
  };

  const handleSaveBrief = async () => {
    if (!selectedStyle || !selectedIdea) return;
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const briefContent = outline
        ? [
            `# ${selectedIdea.title}`,
            '',
            `Hook: ${selectedIdea.hook}`,
            '',
            `Angle: ${outline.angle}`,
            `Audience promise: ${outline.audiencePromise}`,
            '',
            'Outline:',
            ...outline.sections.map((section, index) => `${index + 1}. ${section.label} - ${section.purpose}\n${section.beats.map(beat => `   - ${beat}`).join('\n')}`),
          ].join('\n')
        : '';
      const script: Script = {
        id: crypto.randomUUID(),
        project_id: projectId,
        title: selectedIdea.title || premise || 'Untitled brief',
        content: briefContent,
        style_id: selectedStyle.id,
        location,
        premise: selectedIdea.description || premise,
        criteria,
        length_minutes: lengthMinutes,
        video_clips: clips,
        created_at: now,
        updated_at: now,
        status: 'draft',
      };

      const saved = await invoke<Script>('create_script', { script });
      onComplete(saved);
    } catch (error) {
      console.error(error);
      setError('Failed to save the brief. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOutline = (patch: Partial<ScriptOutline>) => {
    setOutline(prev => prev ? { ...prev, ...patch } : prev);
  };

  const updateOutlineSection = (sectionIndex: number, patch: Partial<ScriptOutline['sections'][number]>) => {
    setOutline(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section),
      };
    });
  };

  const updateOutlineBeat = (sectionIndex: number, beatIndex: number, value: string) => {
    setOutline(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => index === sectionIndex
          ? { ...section, beats: section.beats.map((beat, currentBeatIndex) => currentBeatIndex === beatIndex ? value : beat) }
          : section
        ),
      };
    });
  };

  const handleFinalGenerate = async () => {
    if (!selectedStyle || !selectedIdea || !outline) return;
    setStep('generating');
    setIsLoading(true);
    setError(null);
    try {
      let content = await generateFullScript(selectedStyle, selectedIdea, outline, criteria, lengthMinutes, clips, location);
      let finalClips = clips;
      if (clips.length === 0) {
        const suggested = await suggestClipsFromScript(content, lengthMinutes);
        finalClips = suggested.map(s => ({
          id: crypto.randomUUID(),
          length: s.length,
          description: s.description,
        }));
        content = applyClipAssignments(content, finalClips);
      }
      const script: Script = {
        id: crypto.randomUUID(),
        project_id: projectId,
        title: selectedIdea.title,
        content,
        style_id: selectedStyle.id,
        location,
        premise,
        criteria,
        length_minutes: lengthMinutes,
        video_clips: finalClips,
        created_at: new Date().toISOString()
      };
      
      await invoke<Script>('create_script', { script });
      
      onComplete(script);
    } catch (error) {
      console.error(error);
      setError("Failed to generate script. Please try again.");
      setStep('length'); // Go back to length step on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!selectedStyle || !selectedIdea) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextOutline = await generateScriptOutline(selectedStyle, selectedIdea, criteria, lengthMinutes, clips, location);
      if (!nextOutline) {
        throw new Error("No outline generated.");
      }
      setOutline(nextOutline);
      setStep('outline');
    } catch (error) {
      console.error(error);
      setError("Failed to generate the script plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const stepsOrder: Step[] = ['style', 'location', 'premise', 'criteria', 'clips', 'ideas', 'outline', 'length'];
  const currentStepIndex = stepsOrder.indexOf(step);
  const stepLabel = `${currentStepIndex + 1} / ${stepsOrder.length}`;
  const stepNames: Record<Exclude<Step, 'generating'>, string> = {
    style: 'Voice',
    location: 'Place',
    premise: 'Direction',
    criteria: 'Must-haves',
    clips: 'Footage',
    ideas: 'Angles',
    outline: 'Plan',
    length: 'Runtime',
  };

  return (
    <div className="fixed inset-0 bg-[rgba(6,10,13,0.52)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="modal-panel w-full max-w-5xl rounded-[1.5rem] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between gap-4 surface-tint">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sc-accent-soft rounded-[1.25rem] flex items-center justify-center text-sc-accent shadow-[0_18px_40px_rgba(20,91,82,0.16)]">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-sc-text tracking-tight">Script Wizard</h2>
              <p className="text-sm text-sc-text-muted mt-1">
                Step {stepLabel}{step !== 'generating' ? ` - ${stepNames[step]} - ` : ' - '}Define the angle, then turn it into a script.
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {stepsOrder.map((s, i) => (
              <div 
                key={s}
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                  step === s ? 'bg-sc-accent w-12' : i < currentStepIndex ? 'bg-sc-accent/40' : 'bg-sc-border-subtle'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50 p-4 text-center text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <AnimatePresence mode="wait">
            {step === 'style' && (
              <motion.div 
                key="style"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-sc-text">Choose the voice for this script</h3>
                  <Button variant="ghost" size="sm" onClick={onOpenStyleLibrary} className="gap-1.5">
                    <Plus size={14} />
                    Manage Styles
                  </Button>
                </div>
                <Card className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">How this shapes the draft</p>
                  <p className="mt-2 text-[15px] leading-7 text-sc-text-muted">
                    The style you choose influences idea selection, pacing, outline structure, script language, packaging suggestions, and even how strict the restyle tools behave later on.
                  </p>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {styles.map(style => (
                    <Card
                      key={style.id}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer p-5 transition-all text-left h-full min-h-[172px] ${
                        selectedStyle?.id === style.id 
                          ? 'ring-2 ring-sc-accent border-sc-accent bg-sc-accent-soft shadow-[0_18px_40px_rgba(20,91,82,0.14)]' 
                          : 'hover:-translate-y-0.5 hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/50'
                      }`}
                      onClick={() => setSelectedStyle(style)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedStyle(style);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sc-text">{style.name}</span>
                        {selectedStyle?.id === style.id && <CheckCircle2 size={18} className="text-sc-accent shrink-0" />}
                      </div>
                      <p className="text-[15px] leading-7 text-sc-text-muted line-clamp-3">{style.description}</p>
                    </Card>
                  ))}
                </div>
                {selectedStyle && (
                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setStep('location')}
                      className="gap-2"
                    >
                      Continue with {selectedStyle.name}
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                )}
                {styles.length === 0 && (
                  <Card className="text-center py-12 border-dashed">
                    <p className="text-sc-text-muted mb-4">You do not have any saved styles yet.</p>
                    <Button variant="primary" onClick={onOpenStyleLibrary}>
                      Create a Style
                    </Button>
                  </Card>
                )}
              </motion.div>
            )}

            {step === 'location' && (
              <motion.div 
                key="location"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Compass size={20} className="text-sc-accent" />
                  <h3 className="text-lg font-semibold text-sc-text">Is this tied to a specific place?</h3>
                </div>
                <p className="text-[15px] leading-7 text-sc-text-muted">
                  Enter a broad place like a town, county, region, attraction, neighbourhood, or landmark. ScriptCraft will then suggest specific spots and video angles inside that area in your chosen style.
                </p>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Alloa, Cornwall, Norfolk, Tate Modern, York..."
                  className="soft-input w-full rounded-[1.5rem] px-6 py-5 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent transition-all text-lg"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
                <Card className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">How it works</p>
                  <p className="mt-2 text-[15px] leading-7 text-sc-text-muted">
                    Example: if you enter `Alloa`, ScriptCraft might suggest `Alloa Tower`, `Gartmorn Dam`, or other local anchors, explain why each one has story potential right now, then turn those into actual video ideas instead of asking you to know the final place up front.
                  </p>
                </Card>
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => setStep('premise')}>
                    Add my own direction instead
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'premise' && (
              <motion.div 
                key="premise"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <PenTool size={20} className="text-sc-accent" />
                  <h3 className="text-lg font-semibold text-sc-text">
                    {hasLocationContext ? 'What direction should this place-based video take?' : 'What is this video really about?'}
                  </h3>
                </div>
                <p className="text-[15px] leading-7 text-sc-text-muted">
                  {hasLocationContext
                    ? 'Optional. Leave this blank if you want ScriptCraft to discover the angle from the location. Add a sentence only if you already know the kind of story, lens, or hook you want.'
                    : 'Write the core idea in one or two sentences. Think angle, promise, and why someone would care.'}
                </p>
                <textarea
                  autoFocus
                  placeholder={
                    hasLocationContext
                      ? 'Optional: e.g., Find an unexpected angle on Wells-next-the-Sea, focus on hidden local history, or compare tourist myth with reality...'
                      : 'e.g., Why modern architecture often feels emotionally cold, or what I learned living in a van for 30 days...'
                  }
                  className="soft-input w-full h-40 rounded-[1.5rem] p-6 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent transition-all resize-none text-lg leading-relaxed"
                  value={premise}
                  onChange={e => setPremise(e.target.value)}
                />
                {hasLocationContext && (
                  <Card className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">Location-led mode</p>
                    <p className="mt-2 text-[15px] leading-7 text-sc-text-muted">
                      ScriptCraft will use the location plus live context to suggest possible video concepts, so you do not need to define the premise up front.
                    </p>
                  </Card>
                )}
              </motion.div>
            )}

            {step === 'criteria' && (
              <motion.div 
                key="criteria"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <MapPin size={20} className="text-sc-accent" />
                  <h3 className="text-lg font-semibold text-sc-text">What must make it into the script?</h3>
                </div>
                <p className="text-[15px] leading-7 text-sc-text-muted">Add non-negotiables like products, facts, sponsor notes, places, footage constraints, or lines you need covered.</p>
                <textarea
                  autoFocus
                  placeholder="e.g., Mention the Louvre visit, include the 40% efficiency stat, call out the RED camera, avoid repeating the intro hook..."
                  className="soft-input w-full h-40 rounded-[1.5rem] p-6 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent transition-all resize-none text-lg leading-relaxed"
                  value={criteria}
                  onChange={e => setCriteria(e.target.value)}
                />
              </motion.div>
            )}

            {step === 'clips' && (
              <VideoClipsStep
                clips={clips}
                setClips={setClips}
                title={selectedIdea?.title || premise || 'script'}
              />
            )}

            {step === 'ideas' && (
              <motion.div 
                key="ideas"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-sc-text">Pick and tune the strongest direction</h3>
                  <p className="mt-1 text-[15px] leading-7 text-sc-text-muted">Edit any card before continuing. The selected version is what the outline and draft will use.</p>
                </div>
                <Card className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">How to judge these</p>
                  <p className="mt-2 text-[15px] leading-7 text-sc-text-muted">
                    Each concept now explains why it matches your style and place. Use that reasoning, not just the headline, to decide whether the idea feels specific enough to build on.
                  </p>
                </Card>
                <div className="mx-auto max-w-3xl space-y-4">
                  {ideas.map((idea, idx) => (
                    <Card
                      key={idx}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer p-5 transition-all text-left flex flex-col gap-3 ${
                        selectedIdea?.title === idea.title 
                          ? 'ring-2 ring-sc-accent border-sc-accent bg-sc-accent-soft shadow-[0_18px_40px_rgba(20,91,82,0.14)]' 
                          : 'hover:-translate-y-0.5 hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/50'
                      }`}
                      onClick={() => setSelectedIdea(idea)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedIdea(idea);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <input
                          value={idea.title}
                          onClick={event => event.stopPropagation()}
                          onChange={event => updateIdeaAt(idx, { title: event.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-sc-text focus:border-sc-accent focus:outline-none"
                          aria-label={`Idea ${idx + 1} title`}
                        />
                        {selectedIdea?.title === idea.title && <CheckCircle2 size={20} className="text-sc-accent shrink-0" />}
                      </div>
                      {idea.focusLocation && (
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-accent">
                          Suggested place: {idea.focusLocation}
                        </p>
                      )}
                      <textarea
                        value={idea.hook}
                        onClick={event => event.stopPropagation()}
                        onChange={event => updateIdeaAt(idx, { hook: event.target.value })}
                        className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] font-medium leading-7 text-sc-accent focus:border-sc-accent focus:outline-none"
                        rows={2}
                        aria-label={`Idea ${idx + 1} hook`}
                      />
                      <textarea
                        value={idea.description}
                        onClick={event => event.stopPropagation()}
                        onChange={event => updateIdeaAt(idx, { description: event.target.value })}
                        className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] leading-7 text-sc-text-muted focus:border-sc-accent focus:outline-none"
                        rows={4}
                        aria-label={`Idea ${idx + 1} description`}
                      />
                      {(idea.rationale || idea.currentHook || typeof idea.confidence === 'number') && (
                        <div className="grid gap-3 pt-2">
                          <div className="rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sc-text-subtle">Why this was suggested</p>
                            <textarea
                              value={idea.rationale || ''}
                              onClick={event => event.stopPropagation()}
                              onChange={event => updateIdeaAt(idx, { rationale: event.target.value })}
                              placeholder="Why this was suggested"
                              className="mt-2 w-full resize-none rounded-lg border border-sc-border-subtle bg-sc-bg-elevated px-3 py-2 text-sm leading-relaxed text-sc-text-muted focus:border-sc-accent focus:outline-none"
                              rows={3}
                              aria-label={`Idea ${idx + 1} rationale`}
                            />
                            {idea.currentHook && (
                              <p className="mt-2 text-xs leading-relaxed text-sc-text-subtle">Current hook: {idea.currentHook}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sc-border-subtle bg-sc-accent-soft/40 px-4 py-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sc-text-subtle">Confidence</p>
                              <p className="mt-1 text-xs text-sc-text-muted">A prioritization hint, not a guarantee.</p>
                            </div>
                            <p className="text-xl font-semibold text-sc-text">{idea.confidence ?? 70}<span className="text-sm text-sc-text-subtle">/100</span></p>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-sc-border-subtle hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/50"
                  onClick={handleGenerateMoreIdeas}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  <span className="ml-2">Show 5 More Angles</span>
                </Button>
              </motion.div>
            )}

            {step === 'outline' && outline && (
              <motion.div
                key="outline"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <ListTree size={20} className="text-sc-accent" />
                      <h3 className="text-lg font-semibold text-sc-text">Review the draft plan</h3>
                    </div>
                    <p className="max-w-2xl text-[15px] leading-7 text-sc-text-muted">
                      Before writing, ScriptCraft maps the angle, audience promise, retention beats, and section flow. This is the best place to catch weak framing before you spend time editing a full draft.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleGenerateOutline} disabled={isLoading} className="gap-2 shrink-0">
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
                    Rework plan
                  </Button>
                </div>

                <div className="mx-auto grid max-w-3xl gap-4">
                  <Card className="space-y-3">
                    <div className="flex items-center gap-2 text-sc-accent">
                      <Target size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">Core angle</span>
                    </div>
                    <div>
                      <label className="text-sm text-sc-text-subtle mb-1 block" htmlFor="outline-angle">Angle</label>
                      <textarea
                        id="outline-angle"
                        value={outline.angle}
                        onChange={event => updateOutline({ angle: event.target.value })}
                        className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] leading-7 text-sc-text focus:border-sc-accent focus:outline-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-sc-text-subtle mb-1 block" htmlFor="outline-promise">Audience promise</label>
                      <textarea
                        id="outline-promise"
                        value={outline.audiencePromise}
                        onChange={event => updateOutline({ audiencePromise: event.target.value })}
                        className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] leading-7 text-sc-text focus:border-sc-accent focus:outline-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-sc-text-subtle mb-1 block" htmlFor="outline-cta">Closing CTA</label>
                      <textarea
                        id="outline-cta"
                        value={outline.closingCTA}
                        onChange={event => updateOutline({ closingCTA: event.target.value })}
                        className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] leading-7 text-sc-text focus:border-sc-accent focus:outline-none"
                        rows={2}
                      />
                    </div>
                  </Card>

                  <Card className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sc-accent">Retention moments</span>
                    <div className="space-y-3">
                      {outline.retentionMoments.map((moment, index) => (
                        <div key={`${moment}-${index}`} className="rounded-xl border border-sc-border-subtle bg-sc-accent-soft/30 px-4 py-3">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle" htmlFor={`retention-${index}`}>Moment {index + 1}</label>
                          <textarea
                            id={`retention-${index}`}
                            value={moment}
                            onChange={event => updateOutline({
                              retentionMoments: outline.retentionMoments.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
                            })}
                            className="mt-2 w-full resize-none rounded-lg border border-sc-border-subtle bg-sc-bg px-3 py-2 text-[15px] leading-7 text-sc-text focus:border-sc-accent focus:outline-none"
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="mx-auto max-w-3xl space-y-4">
                  {outline.sections.map((section, index) => (
                    <Card key={`${section.label}-${index}`} className="space-y-4 p-5">
                      <div className="grid gap-3">
                        <div className="max-w-xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">Section {index + 1}</p>
                          <input
                            value={section.label}
                            onChange={event => updateOutlineSection(index, { label: event.target.value })}
                            className="mt-1 w-full rounded-lg border border-sc-border-subtle bg-sc-bg px-3 py-2 text-lg font-semibold text-sc-text focus:border-sc-accent focus:outline-none"
                            aria-label={`Section ${index + 1} label`}
                          />
                        </div>
                        <textarea
                          value={section.purpose}
                          onChange={event => updateOutlineSection(index, { purpose: event.target.value })}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-sc-border-subtle bg-sc-accent-soft px-3 py-2 text-sm font-medium leading-6 text-sc-accent focus:border-sc-accent focus:outline-none"
                          aria-label={`Section ${index + 1} purpose`}
                        />
                      </div>
                      <div className="grid gap-3">
                        {section.beats.map((beat, beatIndex) => (
                          <textarea
                            key={`${section.label}-${beatIndex}`}
                            value={beat}
                            onChange={event => updateOutlineBeat(index, beatIndex, event.target.value)}
                            className="min-h-[112px] resize-y rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-[15px] text-sc-text leading-7 focus:border-sc-accent focus:outline-none"
                            aria-label={`Section ${index + 1} beat ${beatIndex + 1}`}
                          />
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'length' && (
              <motion.div 
                key="length"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8 py-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-sc-accent-soft rounded-full flex items-center justify-center text-sc-accent mx-auto mb-4">
                    <Clock size={40} />
                  </div>
                  <h3 className="text-2xl font-semibold text-sc-text">Choose the target runtime</h3>
                  <p className="text-sc-text-muted">The estimate uses roughly 150 spoken words per minute.</p>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-sc-text-muted">Runtime target</span>
                    <span className="text-4xl font-bold text-sc-accent">{lengthMinutes} <span className="text-lg font-normal text-sc-text-subtle">min</span></span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="60"
                    value={lengthMinutes}
                    onChange={e => setLengthMinutes(parseInt(e.target.value))}
                    className="w-full h-2 bg-sc-border-subtle rounded-lg appearance-none cursor-pointer [accent-color:var(--sc-accent)]"
                  />
                  <div className="flex justify-between text-[10px] text-sc-text-subtle uppercase tracking-widest font-bold">
                    <span>Short (1m)</span>
                    <span>Standard (10-15m)</span>
                    <span>Long (60m)</span>
                  </div>
                  
                  <Card className="text-center p-5">
                    <p className="text-sm text-sc-text-muted">Estimated spoken word count</p>
                    <p className="text-xl font-semibold text-sc-text">{(lengthMinutes * 150).toLocaleString()} words</p>
                  </Card>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 space-y-8 text-center"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-sc-accent-soft rounded-full animate-pulse" />
                  <Loader2 className="absolute inset-0 m-auto animate-spin text-sc-accent" size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-sc-text">Building your draft...</h3>
                  <p className="text-sc-text-muted max-w-sm">ScriptCraft is turning the brief and outline into a working script. This usually takes a moment.</p>
                </div>
                <div className="flex flex-col gap-2 text-xs text-sc-text-subtle font-mono">
                  <p>Checking style guardrails ... OK</p>
                  <p>Targeting {lengthMinutes} minutes ... OK</p>
                  <p>Writing in {selectedStyle?.name} mode ... OK</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'generating' && (
          <div className="p-4 border-t border-sc-border-subtle flex flex-wrap justify-between gap-3 items-center bg-transparent surface-tint">
            <Button variant="ghost" onClick={step === 'style' ? onCancel : () => {
              if (step === 'criteria' && hasLocationContext && !premise.trim()) {
                setStep('location');
                return;
              }
              const currentIdx = stepsOrder.indexOf(step);
              setStep(stepsOrder[currentIdx - 1]);
            }} className="gap-2">
              <ChevronLeft size={20} />
              Back
            </Button>

            <div className="flex flex-wrap justify-end gap-2">
              {step === 'length' && selectedIdea && (
                <Button
                  variant="subtle"
                  size="lg"
                  onClick={handleSaveBrief}
                  disabled={isLoading || !selectedStyle}
                  className="gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Save Brief
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                disabled={
                  (step === 'style' && !selectedStyle) ||
                  (step === 'premise' && !premise.trim() && !hasLocationContext) ||
                  (step === 'ideas' && !selectedIdea) ||
                  (step === 'outline' && !outline) ||
                  isLoading
                }
                onClick={() => {
                  if (step === 'style') setStep('location');
                  else if (step === 'location') setStep('criteria');
                  else if (step === 'premise') setStep('criteria');
                  else if (step === 'criteria') setStep('clips');
                  else if (step === 'clips') handleGenerateIdeas();
                  else if (step === 'ideas') handleGenerateOutline();
                  else if (step === 'outline') setStep('length');
                  else if (step === 'length') handleFinalGenerate();
                }}
                className="gap-2 shadow-md min-w-[140px]"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>{step === 'length' ? 'Build Draft' : 'Continue'}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const BadgeChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center rounded-full bg-sc-accent-soft px-3 py-1 text-xs font-medium text-sc-accent">
    {label}
  </span>
);
