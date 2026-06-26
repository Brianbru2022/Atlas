export type PresentationMode = 'talking_head' | 'voiceover';

export interface Style {
  id: string;
  name: string;
  description: string;
  category?: string;
  favorite?: boolean;
  created_at?: string;
  updated_at?: string;
  example_output?: string;
  /** Whether scripts use on-camera talking head or voiceover only. Defaults to talking_head. */
  presentationMode?: PresentationMode;
  targetAudience?: string;
  toneNotes?: string;
  pacingNotes?: string;
  signaturePhrases?: string[];
  avoidPhrases?: string[];
  referenceTranscript?: string;
  dos?: string[];
  donts?: string[];
  strictness?: number;
  seriesPreset?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  last_opened_at?: string | null;
  script_count?: number;
  default_style_id?: string | null;
  created_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  style_id: string | null;
  location: string | null;
  premise: string | null;
  criteria: string | null;
  length_minutes: number | null;
  video_clips: VideoClip[] | null;
  created_at: string;
  updated_at?: string | null;
  status?: 'draft' | 'polishing' | 'ready' | string | null;
  last_opened_at?: string | null;
  packaging?: PackagingDraft | null;
  verification?: VerificationWorkspace | null;
  scorecard?: ScriptScorecard | null;
  editor_preferences?: EditorPreferences | null;
  versions?: ScriptVersion[];
}

export interface ScriptVersion {
  id: string;
  title: string;
  content: string;
  created_at: string;
  reason?: string | null;
}

export interface VideoClip {
  id: string;
  length: number;
  description: string;
  /** When set, this clip is a subclip of the clip with this id. Subclips are never placed next to each other in the script. */
  parentId?: string | null;
}

export interface ScriptIdea {
  title: string;
  hook: string;
  description: string;
  focusLocation?: string;
  rationale?: string;
  currentHook?: string;
  confidence?: number;
}

export interface ScriptOutlineSection {
  label: string;
  purpose: string;
  beats: string[];
}

export interface ScriptOutline {
  angle: string;
  audiencePromise: string;
  retentionMoments: string[];
  sections: ScriptOutlineSection[];
  closingCTA: string;
}

export interface WorkspaceSettings {
  creatorName: string;
  channelFocus: string;
  targetAudience: string;
  defaultCTA: string;
  bannedPhrases: string[];
}

export type RestyleStartPoint = 'full_script' | 'after_intro' | 'after_first_clip';

export interface ScriptScorecardMetric {
  label: string;
  score: number;
  summary: string;
}

export interface ScriptScorecard {
  overall: number;
  strongest: string;
  weakest: string;
  nextFix: string;
  metrics: ScriptScorecardMetric[];
}

export interface PackagingDraft {
  titles?: Array<{ title: string; rating: number; rationale?: string; strategy?: string }>;
  thumbnails?: Array<{ description: string; rating: number; rationale?: string; strategy?: string }>;
  description?: string;
  tags?: string[];
  pinnedComment?: string;
  confidenceNote?: string;
  reviewWarnings?: string[];
}

export interface VerificationWorkspace {
  claims?: Array<{ claim: string }>;
  claimStates?: Record<string, string>;
  claimResults?: Record<string, { snippets?: string[]; sources?: Array<{ title?: string; uri?: string }> }>;
}

export interface EditorPreferences {
  viewMode?: 'editor' | 'storyboard' | 'packaging' | 'verify';
  editorMode?: 'page' | 'blocks';
  simpleMode?: boolean;
  showHistoryPanel?: boolean;
}
