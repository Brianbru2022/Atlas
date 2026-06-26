import React from 'react';
import { Command, Keyboard, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  hasActiveScript: boolean;
  onClose: () => void;
}

const shortcutGroups = [
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], macKeys: ['Cmd', 'K'], label: 'Open command palette' },
      { keys: ['Esc'], label: 'Close palette, modal, or drawer' },
    ],
  },
  {
    title: 'Editor',
    items: [
      { keys: ['Ctrl', 'S'], macKeys: ['Cmd', 'S'], label: 'Save the open script' },
      { keys: ['Ctrl', 'K'], macKeys: ['Cmd', 'K'], label: 'Run editor tools from the palette' },
    ],
  },
  {
    title: 'Palette',
    items: [
      { keys: ['↑', '↓'], label: 'Move through commands' },
      { keys: ['Enter'], label: 'Run selected command' },
    ],
  },
];

const editorCommands = [
  'Switch views',
  'Export draft',
  'Teleprompter',
  'Version history',
  'Restyle script',
  'Rebalance clips',
  'Simple mode',
  'Read draft aloud',
  'Focus mode',
];

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({ isOpen, hasActiveScript, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-[125] flex items-start justify-center bg-black/45 px-3 pt-[10vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          onClick={onClose}
          aria-label="Close keyboard shortcuts"
        />
        <motion.div
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div className="flex items-start justify-between gap-4 border-b border-sc-border-subtle px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sc-accent-soft text-sc-accent">
                <Keyboard size={19} />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Keyboard</p>
                <h2 className="mt-1 text-lg font-semibold text-sc-text">Shortcuts & Commands</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sc-text-subtle transition-colors hover:bg-sc-accent-soft hover:text-sc-text"
              aria-label="Close keyboard shortcuts"
            >
              <X size={17} />
            </button>
          </div>

          <div className="max-h-[min(68vh,560px)] overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {shortcutGroups.map(group => (
                <section key={group.title} className="rounded-xl border border-sc-border-subtle bg-white/35 p-4">
                  <h3 className="text-sm font-semibold text-sc-text">{group.title}</h3>
                  <div className="mt-3 space-y-3">
                    {group.items.map(item => (
                      <div key={`${group.title}-${item.label}`} className="space-y-1.5">
                        <ShortcutKeys keys={item.keys} macKeys={item.macKeys} />
                        <p className="text-xs leading-relaxed text-sc-text-muted">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-sc-border-subtle bg-sc-accent-soft/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-sc-text">
                <Search size={16} />
                Command palette
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sc-text-muted">
                Use the palette for project actions, recent scripts, settings, style library, and {hasActiveScript ? 'all current script tools.' : 'script tools after opening a draft.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {editorCommands.map(command => (
                  <span key={command} className="rounded-full border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] px-3 py-1 text-xs text-sc-text-muted">
                    {command}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ShortcutKeys: React.FC<{ keys: string[]; macKeys?: string[] }> = ({ keys, macKeys }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {(macKeys ?? keys).map((key, index) => (
      <React.Fragment key={`${key}-${index}`}>
        {index > 0 && <span className="text-xs text-sc-text-subtle">+</span>}
        <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-sc-border-subtle bg-[color:var(--sc-bg-strong)] px-2 py-1 text-xs font-semibold text-sc-text">
          {key === 'Cmd' ? <Command size={12} /> : key}
        </kbd>
      </React.Fragment>
    ))}
  </div>
);
