import React from 'react';
import { X, Download, FileText, Braces, ScrollText } from 'lucide-react';
import { Button, Card } from './ui';

export type ExportFormat = 'txt' | 'md' | 'json';

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ExportModalProps {
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

const options: ExportOption[] = [
  {
    format: 'txt',
    label: 'Plain text',
    description: 'Best for simple sharing, copy-paste, or quick archive exports.',
    icon: <ScrollText size={18} />,
  },
  {
    format: 'md',
    label: 'Markdown',
    description: 'Keeps headings and structure for docs, notes, or versioned content.',
    icon: <FileText size={18} />,
  },
  {
    format: 'json',
    label: 'JSON package',
    description: 'Exports script, metadata, storyboard, and packaging data in one structured file.',
    icon: <Braces size={18} />,
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport }) => (
  <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="modal-panel bg-sc-bg-elevated rounded-2xl border border-sc-border-subtle shadow-xl max-w-2xl w-full overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sc-text font-serif">Export Script</h2>
          <p className="text-sm text-sc-text-subtle">Choose the format that best matches where this script goes next.</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-sc-accent-soft rounded-full transition-colors">
          <X size={20} className="text-sc-text-muted" />
        </button>
      </div>

      <div className="p-6 grid gap-4 md:grid-cols-3">
        {options.map(option => (
          <Card key={option.format} className="p-5 hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/20 transition-all">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 text-sc-accent">
                {option.icon}
                <h3 className="text-base font-semibold text-sc-text font-serif">{option.label}</h3>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-sc-text-muted">{option.description}</p>
              <Button
                variant="primary"
                className="mt-5 gap-2"
                onClick={() => onExport(option.format)}
              >
                <Download size={16} />
                Export
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);
