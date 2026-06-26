import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
    <div
      className="modal-panel bg-sc-bg-elevated rounded-2xl border border-sc-border-subtle shadow-xl max-w-sm w-full p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-sc-accent-soft text-sc-accent'}`}>
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-sc-text font-serif">{title}</h3>
          <p className="text-sm text-sc-text-muted mt-1">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'primary'}
          size="md"
          onClick={() => { onConfirm(); }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);
