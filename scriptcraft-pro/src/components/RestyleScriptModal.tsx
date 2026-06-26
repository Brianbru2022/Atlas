import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RefreshCcw, Wand2, X } from 'lucide-react';
import { RestyleStartPoint, Style } from '../types';
import { Button, Card, Badge } from './ui';

interface RestyleScriptModalProps {
  styles: Style[];
  currentStyleId: string | null;
  onClose: () => void;
  onApply: (styleId: string, startPoint: RestyleStartPoint) => Promise<void> | void;
  isApplying: boolean;
}

const startPointOptions: Array<{
  value: RestyleStartPoint;
  label: string;
  description: string;
}> = [
  {
    value: 'full_script',
    label: 'Entire script',
    description: 'Rewrite the whole script in the new style.',
  },
  {
    value: 'after_intro',
    label: 'After intro',
    description: 'Keep the opening intact and restyle everything after it.',
  },
  {
    value: 'after_first_clip',
    label: 'After first clip',
    description: 'Keep the opening and first clip setup, then restyle the rest.',
  },
];

export const RestyleScriptModal: React.FC<RestyleScriptModalProps> = ({
  styles,
  currentStyleId,
  onClose,
  onApply,
  isApplying,
}) => {
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [startPoint, setStartPoint] = useState<RestyleStartPoint>('after_intro');
  const currentStyle = styles.find(style => style.id === currentStyleId) ?? null;
  const availableStyles = useMemo(
    () => styles.filter(style => style.id !== currentStyleId),
    [styles, currentStyleId]
  );

  useEffect(() => {
    setSelectedStyleId(prev => {
      if (prev && availableStyles.some(style => style.id === prev)) {
        return prev;
      }
      return availableStyles[0]?.id ?? '';
    });
  }, [availableStyles]);

  return (
    <div className="fixed inset-0 bg-[rgba(6,10,13,0.52)] backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="modal-panel w-full max-w-2xl rounded-[2rem] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between surface-tint">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[1rem] bg-sc-accent-soft text-sc-accent flex items-center justify-center">
              <RefreshCcw size={18} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-sc-text font-serif">Restyle Script</h2>
              <p className="text-sm text-sc-text-subtle mt-1">Apply a different voice to the current draft without restarting the wizard.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sc-accent-soft rounded-full transition-colors">
            <X size={20} className="text-sc-text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-sc-text mb-3">Choose a target style</p>
            {currentStyle && (
              <Card className="p-4 mb-3 opacity-70">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-sc-text font-serif">{currentStyle.name}</h3>
                  <Badge variant="default">Current style</Badge>
                </div>
                <p className="mt-2 text-sm text-sc-text-muted leading-relaxed">{currentStyle.description}</p>
              </Card>
            )}

            {availableStyles.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableStyles.map(style => {
                  const isSelected = style.id === selectedStyleId;

                  return (
                    <button
                      key={style.id}
                      type="button"
                      className={`text-left rounded-[1.75rem] transition-all ${isSelected ? 'ring-2 ring-sc-accent' : ''}`}
                      onClick={() => setSelectedStyleId(style.id)}
                    >
                      <Card className={`h-full p-4 transition-all ${isSelected ? 'border-sc-accent bg-sc-accent-soft shadow-[0_18px_40px_rgba(20,91,82,0.14)]' : 'hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/30'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-sc-text font-serif">{style.name}</h3>
                          {isSelected ? <CheckCircle2 size={18} className="text-sc-accent" /> : null}
                        </div>
                        <p className="mt-2 text-sm text-sc-text-muted leading-relaxed">{style.description}</p>
                      </Card>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-sc-text-muted">Add or duplicate another style first, then you can restyle this script into it.</p>
              </Card>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-sc-text mb-3">Where should the restyle begin?</p>
            <div className="grid gap-3">
              {startPointOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`text-left rounded-[1.75rem] transition-all ${startPoint === option.value ? 'ring-2 ring-sc-accent' : ''}`}
                  onClick={() => setStartPoint(option.value)}
                >
                  <Card className={`p-4 transition-all ${startPoint === option.value ? 'border-sc-accent bg-sc-accent-soft shadow-[0_18px_40px_rgba(20,91,82,0.12)]' : 'hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/30'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-4 w-4 rounded-full border ${startPoint === option.value ? 'border-sc-accent bg-sc-accent' : 'border-sc-border-subtle'}`} />
                      <div>
                        <p className="font-medium text-sc-text">{option.label}</p>
                        <p className="mt-1 text-sm text-sc-text-muted leading-relaxed">{option.description}</p>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-sc-border-subtle bg-sc-accent-soft/30 p-4 text-sm text-sc-text-muted leading-relaxed">
            ScriptCraft will rewrite the selected portion in the new style while trying to preserve story facts, chronology, and clip cues.
          </div>
        </div>

        <div className="p-4 border-t border-sc-border-subtle surface-tint flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="gap-2"
            disabled={!selectedStyleId || isApplying}
            onClick={() => onApply(selectedStyleId, startPoint)}
          >
            <Wand2 size={16} />
            {isApplying ? 'Restyling...' : 'Apply New Style'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
