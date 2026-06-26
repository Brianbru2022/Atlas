import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { motion } from 'motion/react';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="modal-panel bg-sc-bg-elevated w-full max-w-md rounded-2xl border border-sc-border-subtle shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderPlus size={20} className="text-sc-accent" />
            <h2 className="text-lg font-semibold text-sc-text">Create New Project</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sc-accent-soft rounded-full transition-colors">
            <X size={20} className="text-sc-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <label htmlFor="projectName" className="text-sm font-medium text-sc-text-muted">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Awesome YouTube Channel"
              className="w-full bg-sc-bg border border-sc-border-subtle rounded-lg p-3 text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent focus:ring-1 focus:ring-sc-accent transition-all"
            />
          </div>
          <div className="p-4 bg-sc-accent-soft/30 border-t border-sc-border-subtle flex justify-end">
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 bg-sc-accent text-white rounded-lg font-bold hover:bg-sc-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
