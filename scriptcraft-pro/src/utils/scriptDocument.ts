import { Script, VideoClip } from '../types';

export interface ScriptBlock {
  id: string;
  type: 'direction' | 'paragraph';
  text: string;
}

export interface StoryboardRow {
  type: 'clip' | 'voiceover';
  text: string;
}

export interface ClipDataExport {
  version: 1;
  title: string;
  exportedAt: string;
  clips: VideoClip[];
}

export const isDirectionBlock = (text: string) => {
  const trimmed = text.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
};

export const createEmptyBlock = (): ScriptBlock => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  text: '',
});

export const parseBlocks = (content: string): ScriptBlock[] => {
  const chunks = content
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return [createEmptyBlock()];
  }

  return chunks.map(chunk => ({
    id: crypto.randomUUID(),
    type: isDirectionBlock(chunk) ? 'direction' : 'paragraph',
    text: chunk,
  }));
};

export const joinBlocks = (blocks: ScriptBlock[]) =>
  blocks
    .map(block => block.text.trim())
    .filter(Boolean)
    .join('\n\n');

export const buildStoryboardRows = (content: string): StoryboardRow[] => {
  const rows: StoryboardRow[] = [];
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (isDirectionBlock(trimmed)) {
      rows.push({ type: 'clip', text: trimmed });
    } else if (trimmed !== '') {
      rows.push({ type: 'voiceover', text: trimmed });
    }
  });
  return rows;
};

export const buildClipDataExport = (title: string, clips: VideoClip[]): ClipDataExport => ({
  version: 1,
  title,
  exportedAt: new Date().toISOString(),
  clips,
});

export const parseImportedClipData = (raw: string): VideoClip[] => {
  const parsed = JSON.parse(raw) as VideoClip[] | { clips?: VideoClip[] };
  const clips = Array.isArray(parsed) ? parsed : parsed.clips;

  if (!Array.isArray(clips)) {
    throw new Error('The selected file does not contain clip data.');
  }

  return clips.map((clip, index) => {
    const id = typeof clip.id === 'string' && clip.id.trim() ? clip.id : crypto.randomUUID();
    const length = Number.isFinite(Number(clip.length)) ? Number(clip.length) : 0;
    const description = typeof clip.description === 'string' ? clip.description : '';
    const normalizedParentId =
      typeof clip.parentId === 'string' && clip.parentId.trim() ? clip.parentId : null;

    return {
      id,
      length,
      description,
      parentId: normalizedParentId,
    };
  });
};

export const buildExportMetadata = (
  script: Script,
  title: string,
  styleName: string,
  wordCount: number,
  estimatedMinutes: number
) => ({
  title,
  style: styleName,
  wordCount,
  estimatedMinutes,
  createdAt: script.created_at,
  premise: script.premise,
  criteria: script.criteria,
});

export const buildTextExport = (
  metadata: ReturnType<typeof buildExportMetadata>,
  content: string,
  storyboardRows: StoryboardRow[],
  packagingData: any
) => {
  let exportText = `TITLE: ${metadata.title}\n`;
  exportText += `STYLE: ${metadata.style}\n`;
  exportText += `WORD COUNT: ${metadata.wordCount}\n`;
  exportText += `ESTIMATED LENGTH: ${metadata.estimatedMinutes} minutes\n\n`;
  exportText += `--- SCRIPT ---\n\n${content}\n\n`;
  exportText += `--- STORYBOARD ---\n\n`;
  storyboardRows.forEach(row => {
    exportText += row.type === 'clip' ? `${row.text}\n` : `  VO: ${row.text}\n`;
  });

  if (packagingData) {
    exportText += `\n--- PACKAGING DRAFTS ---\n\n`;
    exportText += `TITLES:\n`;
    packagingData.titles?.forEach((item: any) => {
      const text = typeof item === 'string' ? item : item.title;
      const rating = typeof item === 'string' ? '' : ` (${item.rating}/100)`;
      exportText += `- ${text}${rating}\n`;
    });
    exportText += `\nTHUMBNAIL CONCEPTS:\n`;
    packagingData.thumbnails?.forEach((item: any, index: number) => {
      const text = typeof item === 'string' ? item : item.description;
      const rating = typeof item === 'string' ? '' : ` (${item.rating}/100)`;
      exportText += `Concept ${index + 1}${rating}: ${text}\n`;
    });
    exportText += `\nDESCRIPTION:\n${packagingData.description ?? ''}\n`;
    exportText += `\nTAGS: ${packagingData.tags?.join(', ') ?? ''}\n`;
    exportText += `\nPINNED COMMENT: ${packagingData.pinnedComment ?? ''}\n`;
  }

  return exportText;
};

export const buildMarkdownExport = (
  metadata: ReturnType<typeof buildExportMetadata>,
  content: string,
  storyboardRows: StoryboardRow[],
  packagingData: any
) => {
  let markdown = `# ${metadata.title}\n\n`;
  markdown += `- Style: ${metadata.style}\n`;
  markdown += `- Word count: ${metadata.wordCount}\n`;
  markdown += `- Estimated length: ${metadata.estimatedMinutes} minutes\n`;
  if (metadata.premise) markdown += `- Premise: ${metadata.premise}\n`;
  if (metadata.criteria) markdown += `- Criteria: ${metadata.criteria}\n`;
  markdown += `\n## Script\n\n${content}\n\n`;
  markdown += `## Storyboard\n\n`;
  storyboardRows.forEach(row => {
    markdown += row.type === 'clip' ? `- ${row.text}\n` : `- VO: ${row.text}\n`;
  });

  if (packagingData) {
    markdown += `\n## Packaging Drafts\n\n### Titles\n`;
    packagingData.titles?.forEach((item: any) => {
      const text = typeof item === 'string' ? item : item.title;
      const rating = typeof item === 'string' ? '' : ` (${item.rating}/100)`;
      markdown += `- ${text}${rating}\n`;
    });
    markdown += `\n### Thumbnail Concepts\n`;
    packagingData.thumbnails?.forEach((item: any, index: number) => {
      const text = typeof item === 'string' ? item : item.description;
      const rating = typeof item === 'string' ? '' : ` (${item.rating}/100)`;
      markdown += `- Concept ${index + 1}${rating}: ${text}\n`;
    });
    markdown += `\n### Description\n\n${packagingData.description ?? ''}\n`;
    markdown += `\n### Tags\n\n${(packagingData.tags ?? []).map((tag: string) => `#${tag}`).join(' ')}\n`;
    markdown += `\n### Pinned Comment\n\n> ${packagingData.pinnedComment ?? ''}\n`;
  }

  return markdown;
};
