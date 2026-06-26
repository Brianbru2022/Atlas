import React, { useEffect, useState } from 'react';
import { X, Palette, Settings2, Ban, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { WorkspaceSettings } from '../types';
import { Button } from './ui';

interface SettingsModalProps {
  onClose: () => void;
}

const SETTINGS_KEY = 'scriptcraft-workspace-settings';

const defaultSettings: WorkspaceSettings = {
  creatorName: '',
  channelFocus: '',
  targetAudience: '',
  defaultCTA: '',
  bannedPhrases: [],
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceSettings;
        setSettings({
          ...defaultSettings,
          ...parsed,
          bannedPhrases: parsed.bannedPhrases ?? [],
        });
      }
    } catch (error) {
      console.error('Failed to load workspace settings', error);
    }
  }, []);

  const updateSettings = (next: WorkspaceSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const updateField = (field: keyof WorkspaceSettings, value: string | string[]) => {
    updateSettings({ ...settings, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-[rgba(6,10,13,0.52)] backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-panel rounded-[2rem] max-w-3xl w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-sc-border-subtle flex items-center justify-between surface-tint">
          <div className="flex items-center gap-3">
            <Settings2 size={20} className="text-sc-accent" />
            <div>
              <h2 className="text-2xl font-semibold text-sc-text font-serif">Settings</h2>
              <p className="text-sm text-sc-text-subtle mt-1">Set the defaults that should follow every new draft in this workspace.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-sc-accent-soft rounded-full transition-colors">
            <X size={20} className="text-sc-text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-sc-accent" />
              <h3 className="text-sm font-semibold text-sc-text uppercase tracking-[0.18em]">Appearance</h3>
            </div>
            <div>
              <label className="text-sm font-medium text-sc-text block mb-2">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                      theme === t
                        ? 'bg-sc-accent text-white'
                        : 'glass-panel text-sc-text-muted hover:text-sc-text hover:bg-sc-accent-soft-strong'
                    }`}
                  >
                    {t === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-sc-accent" />
              <h3 className="text-sm font-semibold text-sc-text uppercase tracking-[0.18em]">Workspace Defaults</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Creator or channel name">
                <input
                  type="text"
                  value={settings.creatorName}
                  onChange={e => updateField('creatorName', e.target.value)}
                  placeholder="e.g., ScriptCraft Essays"
                  className="soft-input w-full rounded-[1.25rem] px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
                />
              </Field>
              <Field label="Primary topic or format">
                <input
                  type="text"
                  value={settings.channelFocus}
                  onChange={e => updateField('channelFocus', e.target.value)}
                  placeholder="e.g., design breakdowns, creator commentary"
                  className="soft-input w-full rounded-[1.25rem] px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
                />
              </Field>
            </div>

            <Field label="Who this channel is for">
              <textarea
                value={settings.targetAudience}
                onChange={e => updateField('targetAudience', e.target.value)}
                placeholder="Describe the audience, what they already know, and what they want from the video"
                className="soft-input w-full rounded-[1.25rem] px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-none h-24"
              />
            </Field>

            <Field label="Default closing CTA">
              <textarea
                value={settings.defaultCTA}
                onChange={e => updateField('defaultCTA', e.target.value)}
                placeholder="How you usually want videos to wrap up and what action viewers should take"
                className="soft-input w-full rounded-[1.25rem] px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent resize-none h-20"
              />
            </Field>

            <Field label="Banned phrases across this workspace">
              <input
                type="text"
                value={settings.bannedPhrases.join(', ')}
                onChange={e => updateField('bannedPhrases', e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                placeholder="Comma-separated phrases the app should avoid in every draft"
                className="soft-input w-full rounded-[1.25rem] px-4 py-3 text-sm text-sc-text placeholder:text-sc-text-subtle focus:outline-none focus:border-sc-accent"
              />
            </Field>
          </section>

          <div className="rounded-[1.5rem] border border-sc-border-subtle bg-sc-accent-soft/30 p-5">
            <div className="flex items-center gap-2 mb-2 text-sc-accent">
              <Ban size={16} />
              <p className="text-sm font-semibold">Where this shows up</p>
            </div>
            <p className="text-sm text-sc-text-muted leading-relaxed">
              These defaults are fed into idea generation, outlining, and drafting. If a style profile is more specific, that style wins.
            </p>
          </div>

          <p className="text-xs text-sc-text-subtle">
            Everything here is stored locally on this machine. AI features still require `GEMINI_API_KEY` in the environment.
          </p>
        </div>

        <div className="p-4 border-t border-sc-border-subtle bg-transparent surface-tint flex justify-end">
          <Button variant="primary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-sc-text">{label}</span>
    {children}
  </label>
);
