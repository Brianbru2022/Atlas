import { invoke } from "@tauri-apps/api/core";
import { PackagingDraft, RestyleStartPoint, ScriptIdea, ScriptOutline, ScriptScorecard, Style, VideoClip, WorkspaceSettings } from "../types";

const SETTINGS_KEY = "scriptcraft-workspace-settings";
const MAX_CLIP_SEGMENT_SECONDS = 8;

interface GeminiContentResponse {
  text: string;
  groundingMetadata?: any;
}

const generateGeminiContent = (options: {
  prompt: string;
  responseMimeType?: "application/json";
  useGoogleSearch?: boolean;
  systemInstruction?: string;
}) =>
  invoke<GeminiContentResponse>("generate_gemini_content", {
    prompt: options.prompt,
    responseMimeType: options.responseMimeType ?? null,
    useGoogleSearch: options.useGoogleSearch ?? false,
    systemInstruction: options.systemInstruction ?? null,
  });

const getWorkspaceSettings = (): WorkspaceSettings => {
  if (typeof window === "undefined") {
    return {
      creatorName: "",
      channelFocus: "",
      targetAudience: "",
      defaultCTA: "",
      bannedPhrases: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        creatorName: "",
        channelFocus: "",
        targetAudience: "",
        defaultCTA: "",
        bannedPhrases: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceSettings>;
    return {
      creatorName: parsed.creatorName ?? "",
      channelFocus: parsed.channelFocus ?? "",
      targetAudience: parsed.targetAudience ?? "",
      defaultCTA: parsed.defaultCTA ?? "",
      bannedPhrases: parsed.bannedPhrases ?? [],
    };
  } catch (error) {
    console.error("Failed to load workspace settings", error);
    return {
      creatorName: "",
      channelFocus: "",
      targetAudience: "",
      defaultCTA: "",
      bannedPhrases: [],
    };
  }
};

const formatStyleContext = (style: Style, workspace: WorkspaceSettings) => {
  const styleAudience = style.targetAudience?.trim();
  const toneNotes = style.toneNotes?.trim();
  const pacingNotes = style.pacingNotes?.trim();
  const signaturePhrases = style.signaturePhrases?.length ? style.signaturePhrases.join(", ") : "None";
  const avoidedPhrases = [...(style.avoidPhrases ?? []), ...(workspace.bannedPhrases ?? [])];
  const dos = style.dos?.length ? style.dos.join(", ") : "None";
  const donts = style.donts?.length ? style.donts.join(", ") : "None";
  const referenceTranscript = style.referenceTranscript?.trim() || "None provided";
  const strictness = typeof style.strictness === "number" ? `${style.strictness}/100` : "70/100";

  return `
    STYLE PROFILE:
    - Name: ${style.name}
    - Core description: ${style.description}
    - Intended audience: ${styleAudience || workspace.targetAudience || "Not specified"}
    - Tone rules: ${toneNotes || "Not specified"}
    - Pacing notes: ${pacingNotes || "Not specified"}
    - Signature phrases: ${signaturePhrases}
    - Avoid phrases: ${avoidedPhrases.length ? avoidedPhrases.join(", ") : "None"}
    - Explicit do rules: ${dos}
    - Explicit don't rules: ${donts}
    - Style strictness: ${strictness}
    - Series / format preset: ${style.seriesPreset?.trim() || "None specified"}
    - Reference transcript sample: ${referenceTranscript}

    WORKSPACE CONTEXT:
    - Creator / channel: ${workspace.creatorName || "Not specified"}
    - Channel focus: ${workspace.channelFocus || "Not specified"}
    - Default CTA preference: ${workspace.defaultCTA || "Not specified"}
  `;
};

const estimateSpokenWordCount = (scriptContent: string) => {
  const spoken = scriptContent
    .split('\n')
    .filter(line => !/^\s*\[.+\]\s*$/.test(line.trim()))
    .join(' ');
  const words = spoken.match(/\b[\w']+\b/g);
  return words ? words.length : 0;
};

const hasStandaloneClipCue = (scriptContent: string) =>
  scriptContent
    .split(/\n\s*\n/)
    .some(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      return lines.length > 0 && /^\[(?:CLIP|CLIPS)\s+/i.test(lines[0]) && !lines.slice(1).some(line => !line.startsWith('['));
    });

const normalizeClipDurations = (
  clips: Pick<VideoClip, "description" | "length">[],
  targetSeconds: number
): Pick<VideoClip, "description" | "length">[] => {
  if (clips.length === 0) {
    return clips;
  }

  const safeTargetSeconds = Math.max(clips.length * 3, Math.round(targetSeconds));
  const sanitized = clips.map(clip => ({
    description: typeof clip.description === "string" && clip.description.trim() ? clip.description.trim() : "Clip",
    length: Math.min(MAX_CLIP_SEGMENT_SECONDS, Math.max(3, Math.round(Number.isFinite(Number(clip.length)) ? Number(clip.length) : MAX_CLIP_SEGMENT_SECONDS))),
  }));

  const total = sanitized.reduce((sum, clip) => sum + clip.length, 0);
  if (total <= 0) {
    const evenLength = Math.min(MAX_CLIP_SEGMENT_SECONDS, Math.max(3, Math.round(safeTargetSeconds / sanitized.length)));
    return sanitized.map(clip => ({ ...clip, length: evenLength }));
  }

  const scaled = sanitized.map(clip => ({
    ...clip,
    length: Math.min(MAX_CLIP_SEGMENT_SECONDS, Math.max(3, Math.round((clip.length / total) * safeTargetSeconds))),
  }));

  let difference = safeTargetSeconds - scaled.reduce((sum, clip) => sum + clip.length, 0);
  let index = 0;
  while (difference !== 0 && scaled.length > 0 && index < scaled.length * 20) {
    const clip = scaled[index % scaled.length];
    if (difference > 0) {
      if (clip.length < MAX_CLIP_SEGMENT_SECONDS) {
        clip.length += 1;
        difference -= 1;
      }
    } else if (clip.length > 3) {
      clip.length -= 1;
      difference += 1;
    }
    index += 1;
  }

  return scaled;
};

interface ClipAssignment {
  label: string;
  description: string;
  length: number;
}

const splitClipIntoSegments = (labelBase: string, description: string, rawLength: number): ClipAssignment[] => {
  const totalLength = Math.max(1, Math.round(rawLength || 0));
  const segmentCount = Math.ceil(totalLength / MAX_CLIP_SEGMENT_SECONDS);

  if (segmentCount <= 1) {
    return [{
      label: labelBase,
      description,
      length: totalLength,
    }];
  }

  return Array.from({ length: segmentCount }, (_, index) => {
    const usedSeconds = index * MAX_CLIP_SEGMENT_SECONDS;
    const remainingSeconds = totalLength - usedSeconds;
    const segmentLength = Math.min(MAX_CLIP_SEGMENT_SECONDS, remainingSeconds);
    const segmentSuffix = /^[0-9]+$/.test(labelBase) && index < 26
      ? String.fromCharCode(97 + index)
      : `-${index + 1}`;

    return {
      label: `${labelBase}${segmentSuffix}`,
      description: `${description} (${usedSeconds + 1}-${usedSeconds + segmentLength}s)`,
      length: segmentLength,
    };
  });
};

const getLeafClips = (clips: VideoClip[]) => {
  const parentIds = new Set(clips.filter(clip => clip.parentId).map(clip => clip.parentId as string));
  return clips.filter(clip => !parentIds.has(clip.id));
};

const getClipFamily = (label: string) => {
  const match = label.match(/^\d+/);
  return match ? match[0] : label;
};

const buildClipAssignments = (clips: VideoClip[]): ClipAssignment[] => {
  const assignments: ClipAssignment[] = [];
  const mainClips = clips.filter(clip => !clip.parentId);
  const leafClipIds = new Set(getLeafClips(clips).map(clip => clip.id));

  mainClips.forEach((clip, mainIndex) => {
    const mainLabel = String(mainIndex + 1);
    if (leafClipIds.has(clip.id)) {
      assignments.push(
        ...splitClipIntoSegments(
          mainLabel,
          clip.description || `Clip ${mainLabel}`,
          clip.length
        )
      );
    }

    const subclips = clips.filter(candidate => candidate.parentId === clip.id);
    subclips.forEach((subclip, subIndex) => {
      const subLabel = `${mainLabel}${String.fromCharCode(97 + subIndex)}`;
      assignments.push(
        ...splitClipIntoSegments(
          subLabel,
          subclip.description || `Clip ${subLabel}`,
          subclip.length
        )
      );
    });
  });

  return assignments;
};

const formatClipSegmentsForPrompt = (clips: VideoClip[]) => {
  const assignments = buildClipAssignments(clips);
  if (assignments.length === 0) return "";

  return assignments
    .map(assignment => `${assignment.label}. ${assignment.description} (${assignment.length}s)`)
    .join('\n');
};

const assignClipsToScriptParagraphs = (scriptContent: string, clips: VideoClip[]) => {
  if (clips.length === 0) {
    return scriptContent;
  }

  const clipAssignments = buildClipAssignments(clips);
  if (clipAssignments.length === 0) {
    return scriptContent;
  }

  const blocks = scriptContent
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block =>
      block
        .split('\n')
        .filter(line => !/^\[(?:CLIP|CLIPS)\s+/i.test(line.trim()))
        .join('\n')
        .trim()
    )
    .filter(Boolean);

  const rebuiltBlocks: string[] = [];
  let clipIndex = 0;
  let lastAssignedFamily: string | null = null;

  const takeNextClip = (blockedFamily: string | null) => {
    if (clipIndex >= clipAssignments.length) {
      return null;
    }

    const directCandidate = clipAssignments[clipIndex];
    if (!blockedFamily || getClipFamily(directCandidate.label) !== blockedFamily) {
      clipIndex += 1;
      return directCandidate;
    }

    const alternativeIndex = clipAssignments.findIndex(
      (candidate, index) => index >= clipIndex && getClipFamily(candidate.label) !== blockedFamily
    );

    if (alternativeIndex === -1) return null;

    const [candidate] = clipAssignments.splice(alternativeIndex, 1);
    return candidate;
  };

  blocks.forEach(block => {
    const wordCount = estimateSpokenWordCount(block);
    const targetSeconds = Math.max(4, Math.round((wordCount / 150) * 60));
    const paragraphClips: ClipAssignment[] = [];
    let assignedSeconds = 0;

    while (clipIndex < clipAssignments.length) {
      const blockedFamily = paragraphClips.length > 0
        ? getClipFamily(paragraphClips[paragraphClips.length - 1].label)
        : lastAssignedFamily;
      const nextClip = takeNextClip(blockedFamily);
      if (!nextClip) {
        break;
      }
      const projectedSeconds = assignedSeconds + nextClip.length;
      const keepCurrentDelta = paragraphClips.length > 0 ? Math.abs(targetSeconds - assignedSeconds) : Number.POSITIVE_INFINITY;
      const takeNextDelta = Math.abs(targetSeconds - projectedSeconds);

      paragraphClips.push(nextClip);
      assignedSeconds = projectedSeconds;

      const minimumCoverage = Math.max(4, Math.round(targetSeconds * 0.85));
      if (assignedSeconds < minimumCoverage) {
        continue;
      }

      const followingClip = clipAssignments[clipIndex];
      if (!followingClip) {
        break;
      }

      const followingDelta = Math.abs(targetSeconds - (assignedSeconds + followingClip.length));
      if (takeNextDelta > keepCurrentDelta && assignedSeconds >= targetSeconds) {
        break;
      }

      if (followingDelta >= takeNextDelta && assignedSeconds >= minimumCoverage) {
        break;
      }
    }

    if (paragraphClips.length === 0 && clipIndex < clipAssignments.length) {
      const fallbackClip = takeNextClip(lastAssignedFamily);
      if (fallbackClip) {
        paragraphClips.push(fallbackClip);
        assignedSeconds += fallbackClip.length;
      }
    }

    if (paragraphClips.length === 0) {
      rebuiltBlocks.push(block);
      return;
    }

    lastAssignedFamily = getClipFamily(paragraphClips[paragraphClips.length - 1].label);
    const labels = paragraphClips.map(clip => clip.label).join(', ');
    const descriptions = paragraphClips.map(clip => `${clip.label} ${clip.description}`).join('; ');
    const clipKeyword = paragraphClips.length > 1 ? 'CLIPS' : 'CLIP';
    rebuiltBlocks.push(`[${clipKeyword} ${labels}: ${descriptions}]\n${block}`);
  });

  return rebuiltBlocks.join('\n\n');
};

export const applyClipAssignments = (scriptContent: string, clips: VideoClip[]) =>
  assignClipsToScriptParagraphs(scriptContent, clips);

export const generateScriptIdeas = async (
  style: Style,
  premise: string,
  criteria: string,
  clips: VideoClip[],
  location?: string,
  count: number = 5
): Promise<ScriptIdea[]> => {
  const workspace = getWorkspaceSettings();
  const clipsText = clips.length > 0 
    ? `\n\nAvailable Video Clips:\n${clips.filter(c => !c.parentId).map((c, i) => `- ${c.description} (${c.length}s)`).join('\n')}`
    : '';
  const styleContext = formatStyleContext(style, workspace);

  const prompt = `
    Generate ${count} unique YouTube script ideas based on the following:
    ${styleContext}
    Location / area to explore: ${location?.trim() || "None provided"}
    Premise / direction from user: ${premise || "None provided"}
    Criteria/Context: ${criteria}
    ${clipsText}

    If video clips are provided, the ideas should reflect how those clips could be used.
    If a location is provided:
    - treat it as the broader area, not necessarily the final exact filming spot
    - use current web context to identify what is timely, notable, surprising, or creator-worthy about that area right now
    - suggest specific places inside that area when useful, such as landmarks, streets, viewpoints, neighbourhoods, attractions, ruins, beaches, trails, or museums
    - make each idea feel like a real video someone would actually make in that place, not a generic travel list
    Avoid AI cliches, "neon", "tapestry", "delve", or overly robotic transitions. 
    Make them sound like a human creator would actually pitch them.

    Return the response as a valid JSON array of objects with the following properties:
    - title: string
    - hook: string
    - description: string
    - focusLocation: string (the specific place inside the broader area to anchor the video around, or the same as the broad location if no narrower place makes sense)
    - rationale: string (why this angle matches the style, place, and current context)
    - currentHook: string (what feels timely, surprising, or relevant right now)
    - confidence: number from 0-100
    
    Do not include markdown formatting like \`\`\`json. Just return the raw JSON array.
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
    useGoogleSearch: Boolean(location?.trim()),
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse script ideas JSON", e);
    return [];
  }
};

export const generateScriptOutline = async (
  style: Style,
  idea: ScriptIdea,
  criteria: string,
  lengthMinutes: number,
  clips: VideoClip[],
  location?: string
): Promise<ScriptOutline | null> => {
  const workspace = getWorkspaceSettings();
  const targetWordCount = lengthMinutes * 150;
  const styleContext = formatStyleContext(style, workspace);
  const clipsText = clips.length > 0
    ? `\n\nAvailable Video Clips:\n${clips
        .filter(c => !c.parentId)
        .map((c, i) => `${i + 1}. ${c.description} (${c.length}s)`)
        .join('\n')}`
    : '\n\nNo fixed clips provided yet.';

  const prompt = `
    Create a planning outline for a YouTube script before drafting it.

    IDEA:
    Title: ${idea.title}
    Hook: ${idea.hook}
    Description: ${idea.description}

    ${styleContext}

    LOCATION:
    ${location?.trim() || 'None provided.'}

    CONTEXT / MUST-INCLUDE NOTES:
    ${criteria || 'None provided.'}

    TARGET LENGTH:
    ${lengthMinutes} minutes (~${targetWordCount} words)
    ${clipsText}

    Build an outline that feels specific, strategic, and human.
    Avoid generic filler and AI cliches.

    Return valid JSON with this shape:
    {
      "angle": "string",
      "audiencePromise": "string",
      "retentionMoments": ["string", "string", "string"],
      "sections": [
        {
          "label": "string",
          "purpose": "string",
          "beats": ["string", "string"]
        }
      ],
      "closingCTA": "string"
    }

    REQUIREMENTS:
    - Include 4 to 6 sections.
    - Each section should have 2 to 4 concrete beats.
    - retentionMoments should call out specific moments that keep viewers watching.
    - The closingCTA should feel native to the topic and style.
    - Return raw JSON only.
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    return parsed as ScriptOutline;
  } catch (e) {
    console.error("Failed to parse script outline JSON", e);
    return null;
  }
};

export const generateFullScript = async (
  style: Style,
  idea: ScriptIdea,
  outline: ScriptOutline,
  criteria: string,
  lengthMinutes: number,
  clips: VideoClip[],
  location?: string
): Promise<string> => {
  const workspace = getWorkspaceSettings();
  const targetWordCount = lengthMinutes * 150;
  const isVoiceover = (style.presentationMode ?? 'talking_head') === 'voiceover';
  const styleContext = formatStyleContext(style, workspace);
  const presentationInstruction = isVoiceover
    ? '\n\nPRESENTATION: This is a VOICEOVER-ONLY script. There is no on-camera host or talking head. All content is narrated over B-roll, clips, or visuals. Do not write direct-to-camera lines, host intros, or "see me" moments. Use [CLIP] cues for visuals only.'
    : '\n\nPRESENTATION: This script can include both on-camera talking head segments and B-roll/clips. Use [CLIP] for B-roll; dialogue without a clip is for talking head.';
  const totalClipSeconds = clips.reduce((sum, clip) => sum + Math.max(clip.length, 0), 0);
  const clipsText = clips.length > 0 
    ? (() => {
        const segmentLines = formatClipSegmentsForPrompt(clips);
        return `\n\nAvailable Video Clip Segments (use these exact labels, e.g. [CLIP 1] or [CLIP 1a]):\n${segmentLines}\n\nIMPORTANT: You MUST work around these clips. The script must use and fit these exact clips-weave the narrative and timing around what is provided. Do not invent different clips. Any original input clip longer than ${MAX_CLIP_SEGMENT_SECONDS} seconds has been split into reusable segments with a maximum segment length of ${MAX_CLIP_SEGMENT_SECONDS} seconds. You may reuse the same original clip across the script by using its different segment labels, but do not place segments from the same original clip back to back. The combined segment durations for any original clip must never exceed that original clip's length.`;
      })()
    : '\n\nNo video clips were provided. Write the script as continuous dialogue and narrative only. Do NOT add [CLIP: ...], [SUGGESTED: ...], or any clip placeholders—clips will be suggested later to match this script and its timing.';
  
  const clipTimingNote = clips.length > 0
    ? `Clip timing target: the available clips add up to ${totalClipSeconds} seconds, which is about ${Math.round((totalClipSeconds / 60) * 150)} spoken words at 150 wpm. Match spoken text to clip runtime as closely as possible.`
    : '';
  const prompt = `
    Write a complete, publishable YouTube script for the following idea:
    Title: ${idea.title}
    Hook: ${idea.hook}
    Description: ${idea.description}
    Angle: ${outline.angle}
    Audience Promise: ${outline.audiencePromise}
    Planned Retention Moments: ${outline.retentionMoments.join(' | ')}
    Planned Closing CTA: ${outline.closingCTA}
    
    ${styleContext}
    Location context: ${location?.trim() || 'None provided.'}
    Additional Context/Criteria: ${criteria}
    ${presentationInstruction}
    ${clipsText}
    ${clipTimingNote}
    
    Target Length: Approximately ${targetWordCount} words (for a ${lengthMinutes} minute video at 150 wpm).
    
    CRITICAL GUIDELINES:
    1. The selected style is the writing contract. Write in ${style.name}'s voice, pacing, rhythm, restraint, and vocabulary. Do not drift into generic YouTube narration.
    2. Every outline section and every listed beat must become spoken script. Do not summarize the plan, skip sections, leave placeholders, or output only clip cues.
    3. Write complete spoken narration after every clip cue. A [CLIP] line must never stand alone without script text below it.
    4. AVOID ALL AI CLICHES. No "In a world...", no "Welcome back to the channel", no "Let's dive in", no "neon", no "tapestry", no "unleash", no "hidden gem", no "steeped in history" unless the selected style explicitly asks for those exact phrases.
    5. Use natural human speech. Use contractions where they fit. Use sentence fragments for emphasis. Vary sentence length. Let the voice feel observed and specific rather than polished into generic copy.
    6. Do not use markdown headings, bullet points, section labels, beat labels, production notes, or outline language in the final script. Output script text only, with optional [CLIP ...] cue lines when clips are provided.
    7. CLIP FORMATTING (CRITICAL): 
       - If video clips are provided, you MUST use them and work around them—fit the script content and timing to the clips given.
       - You do NOT need to use them in order (1, 2, 3...). Pick the best clip for the moment.
       - Format them exactly like this:
         
         [CLIP 1: Description of clip]
         The spoken script text goes here. It can continue for a while.
         
         [CLIP 3: Description of clip]
         More spoken text here.
         
       - The script can "roll over" clips (continue speaking while the clip plays), but you must indicate when a new clip starts.
       - If an input clip is longer than ${MAX_CLIP_SEGMENT_SECONDS} seconds, use only the provided max-${MAX_CLIP_SEGMENT_SECONDS}-second segment labels.
       - Clip segments from the same original clip can appear more than once across the script, but NEVER back to back.
       - The combined duration of all segments from the same original clip must not exceed the original clip length.
       - Try to match the length of the clip segments with the amount of text provided for that section, but allow rollover if it suits the natural flow of the dialogue.
       - If NO clips were provided, do not add any [CLIP] or placeholder markers; write continuous narrative only.

    8. If places or specific criteria were provided, weave them naturally into the narrative.
    9. Follow this approved outline closely while still sounding natural:
       ${outline.sections
         .map((section, index) => `${index + 1}. ${section.label} - ${section.purpose}\n   Beats: ${section.beats.join(' | ')}`)
         .join('\n')}
    10. Give each section a distinct job. The script should escalate, not feel like several similar paragraphs stacked together.
    11. If a default CTA preference exists, adapt it naturally instead of forcing a generic closing.
    12. Before returning, silently check your draft:
        - Does every outline section have real spoken script?
        - Is the word count close to ${targetWordCount} words?
        - Does it sound recognizably like ${style.name}, not a generic assistant?
        - Are clip cues followed by narration?
        - Are banned and avoided phrases absent?
       If any answer is no, revise before returning.
  `;

  const response = await generateGeminiContent({
    prompt,
    systemInstruction: "You are a senior human YouTube scriptwriter and story producer. Your job is to write complete spoken scripts, not outlines. Obey the selected style profile as a hard constraint and avoid generic AI phrasing.",
  });

  let draft = response.text || "";
  const draftWordCount = estimateSpokenWordCount(draft);
  const looksIncomplete = draftWordCount < Math.round(targetWordCount * 0.65) || hasStandaloneClipCue(draft);

  if (looksIncomplete) {
    const repairPrompt = `
      The previous draft is incomplete or has clip cues without enough spoken script.

      Rewrite it into a complete spoken script now.

      ORIGINAL DRAFT:
      ${draft}

      STYLE CONTRACT:
      ${styleContext}

      APPROVED OUTLINE:
      ${outline.sections
        .map((section, index) => `${index + 1}. ${section.label} - ${section.purpose}\n   Beats: ${section.beats.join(' | ')}`)
        .join('\n')}

      REQUIREMENTS:
      - Target about ${targetWordCount} spoken words.
      - Every outline section and beat must have real spoken narration.
      - Preserve valid [CLIP ...] cues if clips were provided, but every cue must be followed by narration.
      - Do not output headings, bullets, notes, placeholders, or explanations.
      - Match ${style.name}'s voice and avoid generic AI phrasing.
    `;

    const repaired = await generateGeminiContent({
      prompt: repairPrompt,
      systemInstruction: "You are a senior script editor. Turn incomplete drafts into complete spoken scripts while preserving the chosen style.",
    });
    draft = repaired.text || draft;
  }

  return assignClipsToScriptParagraphs(draft, clips);
};

/** Suggest video clips that match the script content and timing. Call only after the script is written (when no clips were provided up front). */
export const suggestClipsFromScript = async (
  scriptContent: string,
  lengthMinutes: number
): Promise<Pick<VideoClip, "description" | "length">[]> => {
  const estimatedWordCount = estimateSpokenWordCount(scriptContent);
  const targetWordCount = Math.max(lengthMinutes * 150, estimatedWordCount);
  const targetSeconds = Math.max(
    lengthMinutes * 60,
    Math.round((estimatedWordCount / 150) * 60)
  );
  const prompt = `
    Analyze this YouTube script and suggest a list of video clips (B-roll, talking head segments, etc.) that would fit the content and timing.
    
    SCRIPT:
    ${scriptContent.substring(0, 12000)}
    
    Approximate target length: ${lengthMinutes} minutes (~${targetWordCount} words at 150 wpm).
    The total clip duration should land very close to ${targetSeconds} seconds.
    
    Return a JSON array of clip suggestions. Each object must have:
    - "description": string (clear description of the clip, e.g. "B-roll of product close-up", "Talking head intro to camera")
    - "length": number (duration in seconds, maximum ${MAX_CLIP_SEGMENT_SECONDS})
    
    Order the clips to match the flow of the script. Suggest enough clips to cover the runtime, keep each suggested clip at or below ${MAX_CLIP_SEGMENT_SECONDS} seconds, and keep the sum of all clip lengths close to ${targetSeconds} seconds.
    Do not include markdown or code fences—return only the raw JSON array.
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
  });

  try {
    const parsed = JSON.parse(response.text || "[]");
    if (!Array.isArray(parsed)) return [];
    const suggestedClips = parsed.map((item: any) => ({
      description: typeof item.description === "string" ? item.description : "Clip",
      length: typeof item.length === "number" && item.length > 0 ? item.length : 15,
    }));
    return normalizeClipDurations(suggestedClips, targetSeconds);
  } catch (e) {
    console.error("Failed to parse suggested clips JSON", e);
    return [];
  }
};

export const generatePackaging = async (
  scriptContent: string,
  style: Style
): Promise<PackagingDraft> => {
  const isVoiceover = (style.presentationMode ?? 'talking_head') === 'voiceover';
  const thumbnailNote = isVoiceover
    ? 'IMPORTANT: This video is voiceover only (no person on camera). Thumbnail concepts must NOT include people or talking heads. Focus on objects, environments, text, or abstract visuals.'
    : 'Thumbnail concepts can include talking head shots, B-roll, or abstract concepts as appropriate.';
  const prompt = `
    Based on the following YouTube script, generate a packaging draft kit.
    
    SCRIPT:
    ${scriptContent.substring(0, 5000)}... (truncated)
    
    STYLE: ${style.name}
    
    Generate a JSON object with the following:
    1. "titles": Array of 10 strong, click-worthy video titles. Each title should also have:
       - "rating" from 0-100
       - "strategy" like curiosity / authority / emotional / prestige
       - "rationale" explaining why it fits the script
    2. "thumbnails": Array of 5 visual concepts for thumbnails. Each concept should have:
       - "description"
       - "rating" from 0-100
       - "strategy"
       - "rationale"
       ${thumbnailNote}
    3. "description": A YouTube video description including a hook and placeholder timestamps.
    4. "tags": Array of 15 relevant SEO tags/keywords.
    5. "pinnedComment": A comment to post to drive engagement.
    6. "confidenceNote": short string explaining what parts seem strongest and what still needs human review.
    7. "reviewWarnings": array of short strings that call out likely risks, weak spots, or claims that need manual review.

    Return ONLY the JSON object.
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse packaging JSON", e);
    return {};
  }
};

export const generateScriptScorecard = async (
  scriptContent: string,
  style: Style | null
): Promise<ScriptScorecard | null> => {
  const prompt = `
    Review this YouTube script as a senior story producer.

    STYLE:
    ${style ? formatStyleContext(style, getWorkspaceSettings()) : "No style profile provided."}

    SCRIPT:
    ${scriptContent.substring(0, 14000)}

    Return valid JSON with this exact shape:
    {
      "overall": number,
      "strongest": "string",
      "weakest": "string",
      "nextFix": "string",
      "metrics": [
        { "label": "Hook strength", "score": number, "summary": "string" },
        { "label": "Pacing", "score": number, "summary": "string" },
        { "label": "Clarity", "score": number, "summary": "string" },
        { "label": "Novelty", "score": number, "summary": "string" },
        { "label": "Repetition", "score": number, "summary": "string" },
        { "label": "Factual risk", "score": number, "summary": "string" }
      ]
    }

    REQUIREMENTS:
    - Scores are 0-100.
    - Summaries should be concise and useful.
    - "nextFix" should identify the single highest-impact revision to make next.
    - Return raw JSON only.
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    if (!parsed || !Array.isArray(parsed.metrics)) return null;
    return parsed as ScriptScorecard;
  } catch (error) {
    console.error("Failed to parse script scorecard JSON", error);
    return null;
  }
};

export const identifyClaims = async (scriptContent: string): Promise<{ claim: string }[]> => {
  const prompt = `
    Analyze the following script and identify all specific, verifiable claims (e.g., dates, statistics, proper names, quotes, factual statements).

    SCRIPT:
    ${scriptContent}

    Return a JSON array of objects, where each object has a single key "claim" containing the exact text of the claim.
    Example: [{ "claim": "The Eiffel Tower was completed in 1889." }]
  `;

  const response = await generateGeminiContent({
    prompt,
    responseMimeType: "application/json",
  });

  try {
    const result = JSON.parse(response.text || "[]");
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.error("Failed to parse claims JSON", e);
    return [];
  }
};

export const verifyClaim = async (claim: string): Promise<any> => {
  const prompt = `Verify the following claim: "${claim}"`;

  const response = await generateGeminiContent({
    prompt,
    useGoogleSearch: true,
  });

  const groundingMetadata = response.groundingMetadata;
  const snippets = (groundingMetadata?.webSearchQueries as any[])?.flatMap(query => query.results?.map((result: any) => result.snippet) || []).filter(Boolean);
  const sources = groundingMetadata?.groundingChunks?.map(chunk => chunk.web).filter(Boolean);

  return {
    snippets,
    sources,
  };
};

export const rewriteSectionStream = async (
  fullScript: string,
  highlightedText: string,
  reason: string,
  style: Style,
  onChunk: (chunk: string) => void
) => {
  const prompt = `
    I have a YouTube script and I need to rewrite a specific section.
    
    FULL SCRIPT CONTEXT:
    ${fullScript}
    
    SECTION TO REWRITE:
    "${highlightedText}"
    
    REASON FOR REWRITE:
    ${reason}
    
    STYLE TO MAINTAIN:
    ${style.name} (${style.description})
    
    INSTRUCTIONS:
    Rewrite ONLY the section provided above. Ensure it fits perfectly back into the context of the full script. 
    Maintain the natural, human tone and avoid AI cliches. 
    Return ONLY the rewritten text for that specific section.
  `;

  const response = await generateGeminiContent({
    prompt,
    systemInstruction: "You are a surgical script editor. You rewrite specific parts of a script to better match a user's intent while maintaining the overall flow and avoiding AI tropes.",
  });

  onChunk(response.text || '');
};

const resolveRestyleStartIndex = (content: string, startPoint: RestyleStartPoint): number => {
  if (startPoint === 'full_script') return 0;

  if (startPoint === 'after_intro') {
    const paragraphBreak = content.indexOf('\n\n');
    return paragraphBreak >= 0 ? paragraphBreak + 2 : 0;
  }

  if (startPoint === 'after_first_clip') {
    const clipMatch = content.match(/\[CLIP[^\]]+\][\s\S]*?(?:\n\n|$)/);
    if (clipMatch && typeof clipMatch.index === 'number') {
      return clipMatch.index + clipMatch[0].length;
    }
  }

  return 0;
};

export const restyleScriptFromPoint = async (
  content: string,
  currentStyle: Style | null,
  targetStyle: Style,
  startPoint: RestyleStartPoint
): Promise<string> => {
  const workspace = getWorkspaceSettings();
  const startIndex = resolveRestyleStartIndex(content, startPoint);
  const preservedPrefix = content.slice(0, startIndex);
  const rewriteTarget = content.slice(startIndex);
  const currentStyleContext = currentStyle ? formatStyleContext(currentStyle, workspace) : 'Current style context not available.';
  const targetStyleContext = formatStyleContext(targetStyle, workspace);
  const startInstruction =
    startPoint === 'full_script'
      ? 'Rewrite the entire script in the new style.'
      : startPoint === 'after_intro'
        ? 'Keep the opening/introduction intact and rewrite everything after that point.'
        : 'Keep the intro and first clip setup intact, then rewrite everything after the first clip section.';

  const prompt = `
    You are restyling an existing YouTube script.

    CURRENT SCRIPT:
    ${content}

    CURRENT STYLE:
    ${currentStyleContext}

    TARGET STYLE:
    ${targetStyleContext}

    REWRITE RULE:
    ${startInstruction}

    PRESERVED PREFIX:
    ${preservedPrefix || '[none]'}

    SECTION TO RESTYLE:
    ${rewriteTarget}

    REQUIREMENTS:
    - Preserve the story facts, chronology, and clip references.
    - Keep all existing [CLIP ...] cues that appear in the rewrite target unless they become completely impossible.
    - Do not remove key factual points, sponsor notes, or named places.
    - The rewritten result must flow naturally from the preserved prefix.
    - Avoid AI cliches and generic transitions.

    Return only the rewritten section that should replace the target section.
  `;

  const response = await generateGeminiContent({
    prompt,
    systemInstruction: 'You are a precise YouTube script editor. You can change voice and pacing without losing story structure, factual accuracy, or clip planning.',
  });

  return `${preservedPrefix}${response.text || rewriteTarget}`;
};
