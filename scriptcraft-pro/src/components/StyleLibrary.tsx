import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Plus, Trash2, Sparkles, Edit, Users, AudioLines, Ban, Copy, Star } from 'lucide-react';
import { Style, PresentationMode } from '../types';
import { motion } from 'motion/react';
import { Button, Card, Badge } from './ui';
import { ConfirmModal } from './ConfirmModal';

interface StyleLibraryProps {
  onClose: () => void;
  onSelect?: (style: Style) => void;
  onStylesChange?: () => void;
}

type StyleDraft = {
  name: string;
  description: string;
  presentationMode: PresentationMode;
  targetAudience: string;
  toneNotes: string;
  pacingNotes: string;
  signaturePhrases: string;
  avoidPhrases: string;
  referenceTranscript: string;
  dos: string;
  donts: string;
  strictness: number;
  seriesPreset: string;
  category: string;
  favorite: boolean;
  exampleOutput: string;
};

const emptyDraft = (): StyleDraft => ({
  name: '',
  description: '',
  presentationMode: 'talking_head',
  targetAudience: '',
  toneNotes: '',
  pacingNotes: '',
  signaturePhrases: '',
  avoidPhrases: '',
  referenceTranscript: '',
  dos: '',
  donts: '',
  strictness: 70,
  seriesPreset: '',
  category: '',
  favorite: false,
  exampleOutput: '',
});

const styleTemplates: Array<{ label: string; draft: StyleDraft }> = [
  {
    label: 'Story Essay',
    draft: {
      ...emptyDraft(),
      name: 'Story Essay',
      description: 'Reflective, narrative-led scripts with a strong central question and emotional payoff.',
      category: 'Essay',
      targetAudience: 'Curious viewers who like thoughtful storytelling',
      toneNotes: 'Warm, observant, specific, lightly poetic but never vague.',
      pacingNotes: 'Measured opening, steady escalation, short punchy turns after dense ideas.',
      seriesPreset: 'Video essay',
      dos: 'Open with a concrete scene, build around a central tension, land with a clear takeaway',
      donts: 'Do not over-explain, do not use generic motivational language',
      strictness: 78,
    },
  },
  {
    label: 'Travel Vlog',
    draft: {
      ...emptyDraft(),
      name: 'Travel Vlog',
      description: 'Grounded, place-first travel narration with practical observations and human moments.',
      category: 'Travel',
      targetAudience: 'Viewers planning trips or exploring places from home',
      toneNotes: 'Curious, candid, sensory, lightly humorous.',
      pacingNotes: 'Fast enough to feel alive, with breathing room for place details.',
      seriesPreset: 'Travel diary',
      dos: 'Name specific places, include costs/logistics when useful, describe what it feels like to be there',
      donts: 'Avoid brochure copy, avoid saying hidden gem unless it is earned',
      strictness: 70,
    },
  },
  {
    label: 'Tech Review',
    draft: {
      ...emptyDraft(),
      name: 'Tech Review',
      description: 'Clear, opinionated reviews that balance specs, tradeoffs, and real-world use.',
      category: 'Review',
      targetAudience: 'Buyers and enthusiasts who want practical judgment',
      toneNotes: 'Direct, skeptical, useful, no hype.',
      pacingNotes: 'Front-load verdict, then support with examples and caveats.',
      seriesPreset: 'Product review',
      dos: 'Call out tradeoffs, explain who it is for, compare to alternatives',
      donts: 'Do not list specs without interpretation, avoid exaggerated claims',
      strictness: 82,
    },
  },
  {
    label: 'Documentary VO',
    draft: {
      ...emptyDraft(),
      name: 'Documentary VO',
      description: 'Voiceover-only documentary style built for B-roll, archival context, and story clarity.',
      category: 'Documentary',
      presentationMode: 'voiceover',
      targetAudience: 'Viewers who want context-rich storytelling',
      toneNotes: 'Calm, authoritative, visual, precise.',
      pacingNotes: 'Scene-led, with clean transitions and clear chronology.',
      seriesPreset: 'Documentary voiceover',
      dos: 'Write for visuals, make each paragraph pair with an image or clip, flag uncertainty',
      donts: 'No talking-head references, no host-on-camera lines',
      strictness: 86,
    },
  },
  {
    label: 'Tutorial',
    draft: {
      ...emptyDraft(),
      name: 'Tutorial',
      description: 'Practical step-by-step teaching scripts with crisp explanations and clear outcomes.',
      category: 'Tutorial',
      targetAudience: 'Viewers trying to complete a task',
      toneNotes: 'Patient, concise, encouraging, direct.',
      pacingNotes: 'Short steps, frequent signposting, avoid long tangents.',
      seriesPreset: 'How-to tutorial',
      dos: 'State the goal, show prerequisites, explain mistakes to avoid',
      donts: 'Do not bury the first step, avoid vague encouragement',
      strictness: 74,
    },
  },
];

const styleToDraft = (style: Style): StyleDraft => ({
  name: style.name,
  description: style.description,
  presentationMode: style.presentationMode ?? 'talking_head',
  targetAudience: style.targetAudience ?? '',
  toneNotes: style.toneNotes ?? '',
  pacingNotes: style.pacingNotes ?? '',
  signaturePhrases: (style.signaturePhrases ?? []).join(', '),
  avoidPhrases: (style.avoidPhrases ?? []).join(', '),
  referenceTranscript: style.referenceTranscript ?? '',
  dos: (style.dos ?? []).join(', '),
  donts: (style.donts ?? []).join(', '),
  strictness: style.strictness ?? 70,
  seriesPreset: style.seriesPreset ?? '',
  category: style.category ?? '',
  favorite: Boolean(style.favorite),
  exampleOutput: style.example_output ?? '',
});

const draftToStylePayload = (draft: StyleDraft) => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  presentationMode: draft.presentationMode,
  targetAudience: draft.targetAudience.trim(),
  toneNotes: draft.toneNotes.trim(),
  pacingNotes: draft.pacingNotes.trim(),
  signaturePhrases: toPhraseList(draft.signaturePhrases),
  avoidPhrases: toPhraseList(draft.avoidPhrases),
  referenceTranscript: draft.referenceTranscript.trim(),
  dos: toPhraseList(draft.dos),
  donts: toPhraseList(draft.donts),
  strictness: draft.strictness,
  seriesPreset: draft.seriesPreset.trim(),
  category: draft.category.trim(),
  favorite: draft.favorite,
  example_output: draft.exampleOutput.trim(),
});

const toPhraseList = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export const StyleLibrary: React.FC<StyleLibraryProps> = ({ onClose, onSelect, onStylesChange }) => {
  const [styles, setStyles] = useState<Style[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStyle, setNewStyle] = useState<StyleDraft>(emptyDraft());
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [editingDraft, setEditingDraft] = useState<StyleDraft>(emptyDraft());
  const [deleteCandidate, setDeleteCandidate] = useState<Style | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    const data = await invoke<Style[]>('get_styles');
    setStyles(data);
    onStylesChange?.();
  };

  const handleAdd = async () => {
    if (!newStyle.name.trim() || !newStyle.description.trim()) return;

    const style: Style = {
      id: crypto.randomUUID(),
      ...draftToStylePayload(newStyle),
    };

    await invoke<Style>('create_style', { style });
    setNewStyle(emptyDraft());
    setIsAdding(false);
    fetchStyles();
  };

  const handleUpdate = async () => {
    if (!editingStyle) return;

    const payload = {
      id: editingStyle.id,
      ...draftToStylePayload(editingDraft),
    };

    await invoke<void>('update_style', { payload });
    setEditingStyle(null);
    setEditingDraft(emptyDraft());
    fetchStyles();
  };

  const handleDelete = async (id: string) => {
    await invoke<void>('delete_style', { id });
    fetchStyles();
  };

  const handleDuplicate = async (style: Style) => {
    const baseName = style.name.trim() || 'Untitled Style';
    const duplicateName = `${baseName} Copy`;

    const duplicatedStyle: Style = {
      ...style,
      id: crypto.randomUUID(),
      name: duplicateName,
      description: style.description,
      presentationMode: style.presentationMode ?? 'talking_head',
      targetAudience: style.targetAudience ?? '',
      toneNotes: style.toneNotes ?? '',
      pacingNotes: style.pacingNotes ?? '',
      signaturePhrases: [...(style.signaturePhrases ?? [])],
      avoidPhrases: [...(style.avoidPhrases ?? [])],
      referenceTranscript: style.referenceTranscript ?? '',
      dos: [...(style.dos ?? [])],
      donts: [...(style.donts ?? [])],
      strictness: style.strictness ?? 70,
      seriesPreset: style.seriesPreset ?? '',
      category: style.category ?? '',
      favorite: Boolean(style.favorite),
      created_at: style.created_at,
      updated_at: style.updated_at,
      example_output: style.example_output ?? '',
    };

    await invoke<Style>('create_style', { style: duplicatedStyle });
    await fetchStyles();
    startEditing(duplicatedStyle);
  };

  const handleUseTemplate = (draft: StyleDraft) => {
    setNewStyle({ ...draft, name: draft.name });
    setIsAdding(true);
    setEditingStyle(null);
  };

  const handleToggleFavorite = async (style: Style) => {
    const payload = {
      id: style.id,
      name: style.name,
      description: style.description,
      category: style.category ?? '',
      favorite: !style.favorite,
      example_output: style.example_output ?? '',
      presentationMode: style.presentationMode ?? 'talking_head',
      targetAudience: style.targetAudience ?? '',
      toneNotes: style.toneNotes ?? '',
      pacingNotes: style.pacingNotes ?? '',
      signaturePhrases: style.signaturePhrases ?? [],
      avoidPhrases: style.avoidPhrases ?? [],
      referenceTranscript: style.referenceTranscript ?? '',
      dos: style.dos ?? [],
      donts: style.donts ?? [],
      strictness: style.strictness ?? 70,
      seriesPreset: style.seriesPreset ?? '',
    };

    await invoke<void>('update_style', { payload });
    await fetchStyles();
  };

  const startEditing = (style: Style) => {
    setEditingStyle(style);
    setEditingDraft(styleToDraft(style));
  };

  const renderStyleForm = (
    draft: StyleDraft,
    setDraft: React.Dispatch<React.SetStateAction<StyleDraft>>,
    onSubmit: () => void,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <Card className="border-sc-accent-soft-strong bg-sc-accent-soft space-y-4">
      <input
        type="text"
        placeholder="Style Name (e.g., Tech Reviewer, Storyteller)"
        className="w-full bg-transparent border-b border-sc-border-subtle py-2 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent transition-colors"
        value={draft.name}
        onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
      />
      <textarea
        placeholder="Core voice summary. Explain the tone, posture, and overall feel."
        className="w-full bg-transparent border-b border-sc-border-subtle py-2 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent transition-colors resize-none h-24"
        value={draft.description}
        onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField label="Target audience">
          <input
            type="text"
            placeholder="Who this voice is for"
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.targetAudience}
            onChange={e => setDraft(prev => ({ ...prev, targetAudience: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Pacing notes">
          <input
            type="text"
            placeholder="Fast, punchy, reflective, dense..."
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.pacingNotes}
            onChange={e => setDraft(prev => ({ ...prev, pacingNotes: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Series / format preset">
          <input
            type="text"
            placeholder="Travel diary, documentary essay, reaction, explainers..."
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.seriesPreset}
            onChange={e => setDraft(prev => ({ ...prev, seriesPreset: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Category">
          <input
            type="text"
            placeholder="Essay, travel, review, tutorial..."
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.category}
            onChange={e => setDraft(prev => ({ ...prev, category: e.target.value }))}
          />
        </LabeledField>
      </div>

      <LabeledField label="Tone rules">
        <textarea
          placeholder="Specific writing guidance: skeptical but warm, short sentences, occasional humor, avoids hype..."
          className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-none h-24"
          value={draft.toneNotes}
          onChange={e => setDraft(prev => ({ ...prev, toneNotes: e.target.value }))}
        />
      </LabeledField>

      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField label="Signature phrases">
          <input
            type="text"
            placeholder="Comma-separated recurring phrases"
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.signaturePhrases}
            onChange={e => setDraft(prev => ({ ...prev, signaturePhrases: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Avoid phrases">
          <input
            type="text"
            placeholder="Comma-separated banned wording"
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.avoidPhrases}
            onChange={e => setDraft(prev => ({ ...prev, avoidPhrases: e.target.value }))}
          />
        </LabeledField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField label="Do rules">
          <input
            type="text"
            placeholder="Comma-separated guidance to lean into"
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.dos}
            onChange={e => setDraft(prev => ({ ...prev, dos: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label="Don't rules">
          <input
            type="text"
            placeholder="Comma-separated habits to avoid"
            className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
            value={draft.donts}
            onChange={e => setDraft(prev => ({ ...prev, donts: e.target.value }))}
          />
        </LabeledField>
      </div>

      <LabeledField label="Reference transcript sample">
        <textarea
          placeholder="Paste a short example of the voice you want to emulate. A few paragraphs is enough."
          className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-none h-28"
          value={draft.referenceTranscript}
          onChange={e => setDraft(prev => ({ ...prev, referenceTranscript: e.target.value }))}
        />
      </LabeledField>

      <LabeledField label="Example output">
        <textarea
          placeholder="A short paragraph showing how this style should sound."
          className="w-full rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-none h-24"
          value={draft.exampleOutput}
          onChange={e => setDraft(prev => ({ ...prev, exampleOutput: e.target.value }))}
        />
      </LabeledField>

      <LabeledField label={`Style strictness: ${draft.strictness}/100`}>
        <input
          type="range"
          min="0"
          max="100"
          value={draft.strictness}
          onChange={e => setDraft(prev => ({ ...prev, strictness: Number(e.target.value) }))}
          className="w-full h-2 bg-sc-border-subtle rounded-lg appearance-none cursor-pointer [accent-color:var(--sc-accent)]"
        />
      </LabeledField>

      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-sc-text-muted">Presentation:</span>
        <div className="flex gap-2">
          {(['talking_head', 'voiceover'] as const).map(mode => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`${submitLabel}-presentation`}
                checked={draft.presentationMode === mode}
                onChange={() => setDraft(prev => ({ ...prev, presentationMode: mode }))}
                className="sr-only"
              />
              <span
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  draft.presentationMode === mode
                    ? 'bg-[color:var(--sc-success)] text-white border-[color:var(--sc-success)] shadow-sm'
                    : 'border-sc-border-subtle bg-sc-bg text-sc-text-muted hover:bg-sc-accent-soft'
                }`}
              >
                {mode === 'talking_head' ? 'Talking head' : 'Voiceover only'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-sc-text-muted">
        <input
          type="checkbox"
          checked={draft.favorite}
          onChange={e => setDraft(prev => ({ ...prev, favorite: e.target.checked }))}
          className="h-4 w-4 rounded border-sc-border-subtle [accent-color:var(--sc-accent)]"
        />
        Mark as favorite
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </Card>
  );

  const renderStyleCard = (style: Style) => {
    const presentationMode = style.presentationMode ?? 'talking_head';
    if (editingStyle?.id === style.id) {
      return (
        <div key={style.id}>
          {renderStyleForm(editingDraft, setEditingDraft, handleUpdate, () => {
            setEditingStyle(null);
            setEditingDraft(emptyDraft());
          }, 'Save Style')}
        </div>
      );
    }

    return (
      <Card
        key={style.id}
        className="hover:bg-sc-accent-soft/30 transition-all group relative"
        tabIndex={0}
        role={onSelect ? 'button' : undefined}
        onKeyDown={(event) => {
          if (!onSelect) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(style);
          }
        }}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-sc-text">{style.name}</h3>
            <Badge variant={presentationMode === 'voiceover' ? 'default' : 'accent'}>
              {presentationMode === 'voiceover' ? 'VO only' : 'Talking head'}
            </Badge>
            {style.favorite && <Badge>Favorite</Badge>}
            {style.category && <Badge>{style.category}</Badge>}
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSelect && (
              <button onClick={() => onSelect(style)} className="rounded-full text-xs font-medium px-3 py-1 bg-sc-accent text-white hover:opacity-90 transition-opacity">
                Select
              </button>
            )}
            <button onClick={() => handleDuplicate(style)} className="p-1 text-sc-text-subtle hover:text-sc-text" title="Duplicate style">
              <Copy size={14} />
            </button>
            <button
              onClick={() => handleToggleFavorite(style)}
              className={`p-1 ${style.favorite ? 'text-[color:var(--sc-warning)]' : 'text-sc-text-subtle hover:text-sc-text'}`}
              title={style.favorite ? 'Remove favorite' : 'Favorite style'}
              aria-label={style.favorite ? `Remove ${style.name} from favorites` : `Favorite ${style.name}`}
            >
              <Star size={14} fill={style.favorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => startEditing(style)} className="p-1 text-sc-text-subtle hover:text-sc-text" aria-label={`Edit ${style.name}`}><Edit size={14} /></button>
            <button onClick={() => setDeleteCandidate(style)} className="p-1 text-sc-text-subtle hover:text-red-500" aria-label={`Delete ${style.name}`}><Trash2 size={14} /></button>
          </div>
        </div>

        <p className="max-w-[78ch] text-[15px] leading-7 text-sc-text-muted">{style.description}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoPill icon={<Users size={14} />} label="Audience" value={style.targetAudience || 'General audience'} />
          <InfoPill icon={<AudioLines size={14} />} label="Pacing" value={style.pacingNotes || 'Not specified'} />
          <InfoPill icon={<Ban size={14} />} label="Avoid" value={(style.avoidPhrases ?? []).slice(0, 2).join(', ') || 'No banned phrases'} />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <InfoPill icon={<Sparkles size={14} />} label="Preset" value={style.seriesPreset || 'No saved format'} />
          <InfoPill icon={<Sparkles size={14} />} label="Strictness" value={`${style.strictness ?? 70}/100`} />
        </div>

        {style.toneNotes && (
          <div className="mt-4 rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle mb-1">Tone rules</p>
            <p className="text-[15px] leading-7 text-sc-text-muted">{style.toneNotes}</p>
          </div>
        )}

        {!!style.signaturePhrases?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {style.signaturePhrases.slice(0, 4).map(phrase => (
              <span key={phrase} className="rounded-full bg-sc-accent-soft px-3 py-1 text-xs text-sc-accent">
                {phrase}
              </span>
            ))}
          </div>
        )}

        {!!style.dos?.length && (
          <div className="mt-3 rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle mb-1">Do</p>
            <p className="text-[15px] leading-7 text-sc-text-muted">{style.dos.join(', ')}</p>
          </div>
        )}

        {!!style.donts?.length && (
          <div className="mt-3 rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle mb-1">Don't</p>
            <p className="text-[15px] leading-7 text-sc-text-muted">{style.donts.join(', ')}</p>
          </div>
        )}

        {style.example_output && (
          <div className="mt-3 rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle mb-1">Example output</p>
            <p className="text-[15px] leading-7 text-sc-text-muted">{style.example_output}</p>
          </div>
        )}
      </Card>
    );
  };

  const categories = ['All', ...Array.from(new Set(styles.map(style => style.category).filter(Boolean) as string[])).sort()];
  const visibleStyles = styles.filter(style => {
    const categoryMatches = categoryFilter === 'All' || style.category === categoryFilter;
    const favoriteMatches = !favoritesOnly || Boolean(style.favorite);
    return categoryMatches && favoriteMatches;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="modal-panel bg-sc-bg-elevated w-full max-w-4xl rounded-2xl border border-sc-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-sc-text">Style Library</h2>
            <p className="text-sm text-sc-text-muted">Build reusable channel voices with audience, pacing, and phrase-level guidance.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sc-accent-soft rounded-full transition-colors">
            <X size={20} className="text-sc-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sc-text-subtle">Starter templates</p>
                <p className="mt-1 text-sm text-sc-text-muted">Start from a proven voice, then tune the details.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {styleTemplates.map(template => (
                  <Button
                    key={template.label}
                    variant="subtle"
                    size="sm"
                    onClick={() => handleUseTemplate(template.draft)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sc-border-subtle bg-sc-bg-elevated/70 p-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                  categoryFilter === category ? 'bg-sc-accent text-sc-text-inverse' : 'text-sc-text-muted hover:bg-sc-accent-soft hover:text-sc-text'
                }`}
              >
                {category}
              </button>
            ))}
            <button
              onClick={() => setFavoritesOnly(prev => !prev)}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
                favoritesOnly ? 'bg-[color:var(--sc-warning)] text-white' : 'text-sc-text-muted hover:bg-sc-accent-soft hover:text-sc-text'
              }`}
            >
              <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} />
              Favorites
            </button>
          </div>

          {styles.length === 0 && !isAdding && (
            <Card className="text-center py-10 border-dashed">
              <div className="w-14 h-14 bg-sc-accent-soft rounded-2xl flex items-center justify-center text-sc-accent mx-auto mb-4">
                <Sparkles size={28} />
              </div>
              <p className="text-sc-text font-medium mb-1">No styles yet</p>
              <p className="text-sm text-sc-text-muted mb-4">Add your first channel profile so scripts remember who they are for and how they should sound.</p>
              <Button variant="primary" onClick={() => setIsAdding(true)} className="gap-2">
                <Plus size={18} />
                Add your first style
              </Button>
            </Card>
          )}

          {visibleStyles.map(renderStyleCard)}

          {styles.length > 0 && visibleStyles.length === 0 && !isAdding && (
            <Card className="text-center py-8 border-dashed">
              <p className="text-sm text-sc-text-muted">No styles match the current filters.</p>
            </Card>
          )}

          {isAdding ? (
            renderStyleForm(newStyle, setNewStyle, handleAdd, () => {
              setIsAdding(false);
              setNewStyle(emptyDraft());
            }, 'Save Style')
          ) : (
            <Button
              variant="subtle"
              className="w-full py-4 rounded-xl border-dashed gap-2"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={18} />
              Add New Style
            </Button>
          )}
        </div>
      </motion.div>
      {deleteCandidate && (
        <ConfirmModal
          title="Delete style?"
          message={`"${deleteCandidate.name}" will be removed from the library. Existing scripts keep their text, but future drafts cannot use this style.`}
          confirmLabel="Delete"
          variant="danger"
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={async () => {
            await handleDelete(deleteCandidate.id);
            setDeleteCandidate(null);
          }}
        />
      )}
    </div>
  );
};

const LabeledField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-sc-text-muted">{label}</span>
    {children}
  </label>
);

const InfoPill: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
    <div className="flex items-center gap-2 text-sc-text-subtle">
      {icon}
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
    </div>
    <p className="mt-2 text-[15px] leading-7 text-sc-text">{value}</p>
  </div>
);
