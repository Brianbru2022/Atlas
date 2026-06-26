import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Badge } from './ui';
import { createEmptyBlock, joinBlocks, parseBlocks, ScriptBlock, isDirectionBlock } from '../utils/scriptDocument';

interface BlockEditorViewProps {
  content: string;
  onChange: (content: string) => void;
}

export const BlockEditorView: React.FC<BlockEditorViewProps> = ({ content, onChange }) => {
  const [blocks, setBlocks] = useState<ScriptBlock[]>(() => parseBlocks(content));

  useEffect(() => {
    setBlocks(parseBlocks(content));
  }, [content]);

  const updateBlocks = (nextBlocks: ScriptBlock[]) => {
    setBlocks(nextBlocks);
    onChange(joinBlocks(nextBlocks));
  };

  const updateBlock = (id: string, text: string) => {
    updateBlocks(
        blocks.map(block => ({
          ...block,
          text,
          type: isDirectionBlock(text) ? 'direction' : 'paragraph',
        }))
      );
  };

  const addBlock = (index: number) => {
    const nextBlocks = [...blocks];
    nextBlocks.splice(index + 1, 0, createEmptyBlock());
    updateBlocks(nextBlocks);
  };

  const removeBlock = (id: string) => {
    const nextBlocks = blocks.filter(block => block.id !== id);
    updateBlocks(nextBlocks.length > 0 ? nextBlocks : [createEmptyBlock()]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const nextBlocks = [...blocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, block);
    updateBlocks(nextBlocks);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 md:p-12">
      <div className="mx-auto max-w-5xl space-y-4 pb-24">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-sc-text font-serif">Block editor</h3>
              <p className="mt-1 text-sm text-sc-text-muted leading-relaxed">
                Edit the script as ordered blocks instead of one long page. This is useful for restructuring sections, tightening pacing, and keeping clip cues separate from spoken paragraphs.
              </p>
            </div>
            <Badge variant="default">{blocks.length} blocks</Badge>
          </div>
        </Card>

        {blocks.map((block, index) => (
          <Card key={block.id} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex items-start gap-3 md:w-40 md:flex-col md:justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-sc-text-subtle" />
                  <span className="text-xs font-mono uppercase tracking-[0.22em] text-sc-text-subtle">
                    Block {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <Badge variant={block.type === 'direction' ? 'default' : 'accent'}>
                  {block.type === 'direction' ? 'Direction' : 'Paragraph'}
                </Badge>
              </div>

              <div className="flex-1">
                <textarea
                  value={block.text}
                  onChange={e => updateBlock(block.id, e.target.value)}
                  placeholder={block.type === 'direction' ? '[CLIP 1: Direction cue]' : 'Write the spoken paragraph for this block...'}
                  className="w-full min-h-[120px] rounded-2xl border border-sc-border-subtle bg-sc-bg px-4 py-4 text-sm leading-relaxed text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-y"
                />
              </div>

              <div className="flex gap-2 md:flex-col">
                <Button variant="ghost" size="sm" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                  <ArrowUp size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>
                  <ArrowDown size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addBlock(index)}>
                  <Plus size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeBlock(block.id)} disabled={blocks.length === 1}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
