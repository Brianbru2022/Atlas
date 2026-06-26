import React from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Script } from '../types';
import { Badge, Button, Card } from './ui';

interface ScriptHealth {
  label: string;
  tone: 'warning' | 'ready';
  summary: string;
}

interface NextAction {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}

interface RecoveryDraft {
  title: string;
  content: string;
  updatedAt: string;
}

interface ScriptScorecard {
  overall: number;
  strongest: string;
  weakest: string;
  nextFix: string;
  metrics: Array<{ label: string; score: number; summary: string }>;
}

interface LastAiChange {
  label: string;
}

interface ScriptEditorOverviewProps {
  script: Script;
  wordCount: number;
  hasUnsavedChanges: boolean;
  estMinutes: string;
  lastSavedAt?: string | null;
  sections: Array<{ id: string; label: string; detail: string }>;
  packagingData: unknown;
  scriptHealth: ScriptHealth;
  statusIcon: React.ComponentType<{ size?: number; className?: string }>;
  statusBadgeVariant: 'default' | 'accent';
  autosaveStatus: 'idle' | 'saving' | 'saved';
  autosaveLabel: string;
  nextActions: NextAction[];
  recoveryDraft: RecoveryDraft | null;
  scorecard: ScriptScorecard | null;
  scorecardError?: string | null;
  lastAiChange: LastAiChange | null;
  onRestoreRecoveryDraft: () => void;
  onDiscardRecoveryDraft: () => void;
  onRestoreAiChange: () => void;
  onDismissAiChange: () => void;
  onRetryScorecard?: () => void;
}

export const ScriptEditorOverview: React.FC<ScriptEditorOverviewProps> = ({
  script,
  wordCount,
  hasUnsavedChanges,
  estMinutes,
  lastSavedAt,
  sections,
  packagingData,
  scriptHealth,
  statusIcon: StatusIcon,
  statusBadgeVariant,
  autosaveStatus,
  autosaveLabel,
  nextActions,
  recoveryDraft,
  scorecard,
  scorecardError,
  lastAiChange,
  onRestoreRecoveryDraft,
  onDiscardRecoveryDraft,
  onRestoreAiChange,
  onDismissAiChange,
  onRetryScorecard,
}) => {
  const workflowItems = [
    { label: 'Write', done: wordCount >= 80, hint: `${wordCount.toLocaleString()} words` },
    { label: 'Save', done: !hasUnsavedChanges, hint: hasUnsavedChanges ? 'Not saved yet' : 'Up to date' },
    { label: 'Package', done: Boolean(packagingData), hint: packagingData ? 'Drafted' : 'Not started' },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 xl:sticky xl:top-6">
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={statusBadgeVariant}>{scriptHealth.label}</Badge>
                <span className="text-xs font-mono uppercase tracking-[0.24em] text-sc-text-subtle">
                  {hasUnsavedChanges ? 'Unsaved changes' : 'Draft synced'}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${scriptHealth.tone === 'ready' ? 'bg-sc-accent text-white' : 'bg-sc-accent-soft text-sc-accent'}`}>
                  <StatusIcon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-sc-text">Next best move</h3>
                  <p className="mt-1 text-sm leading-relaxed text-sc-text-muted">{scriptHealth.summary}</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 text-xs font-mono uppercase tracking-[0.22em] text-sc-text-subtle">
                <Circle size={10} className={autosaveStatus === 'saving' ? 'animate-pulse text-sc-accent' : autosaveStatus === 'saved' ? 'text-sc-accent' : 'text-sc-text-subtle'} />
                <span>{autosaveLabel}</span>
              </div>
              {lastSavedAt && (
                <p className="mt-2 text-xs text-sc-text-subtle">
                  Last saved {new Date(lastSavedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-sc-text-muted">
              <MiniMetric label="Words" value={wordCount.toLocaleString()} />
              <MiniMetric label="Runtime" value={`${estMinutes}m`} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-sc-text-subtle">Workflow progress</p>
          <div className="mt-4 space-y-3">
            {workflowItems.map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-sc-border-subtle px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-sc-text">{item.label}</p>
                  <p className="text-xs text-sc-text-subtle">{item.hint}</p>
                </div>
                {item.done ? <CheckCircle2 size={18} className="text-sc-accent" /> : <Circle size={18} className="text-sc-text-subtle" />}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-sc-text-subtle">Navigator</p>
          <div className="mt-3 space-y-2">
            {sections.length > 0 ? sections.slice(0, 8).map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-xl border border-sc-border-subtle px-3 py-2 text-sm transition-colors hover:bg-sc-accent-soft"
              >
                <span className="block truncate font-medium text-sc-text">{section.label}</span>
                <span className="mt-0.5 block truncate text-xs text-sc-text-subtle">{section.detail}</span>
              </a>
            )) : (
              <div className="rounded-xl border border-dashed border-sc-border-subtle px-3 py-4 text-sm text-sc-text-subtle">
                Add paragraphs or clip markers to build a section map.
              </div>
            )}
          </div>
        </Card>

        {recoveryDraft && (
          <Card className="border-amber-200 bg-amber-50/60 p-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-900">A newer local draft is available</p>
                <p className="mt-1 text-sm text-amber-900/80 leading-relaxed">
                  ScriptCraft found a more recent local backup from {new Date(recoveryDraft.updatedAt).toLocaleString()}. Restore it if you want to keep working from that version.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="subtle" onClick={onRestoreRecoveryDraft}>
                  Restore backup
                </Button>
                <Button variant="ghost" onClick={onDiscardRecoveryDraft}>
                  Discard
                </Button>
              </div>
            </div>
          </Card>
        )}

        {lastAiChange && (
          <Card className="border-sc-accent-soft-strong bg-sc-accent-soft/50 p-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-sc-text">Latest AI action is reversible</p>
                <p className="mt-1 text-sm text-sc-text-muted leading-relaxed">
                  {lastAiChange.label} changed the draft. If it missed the mark, restore the previous version before you keep editing.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="subtle" onClick={onRestoreAiChange}>
                  Restore previous draft
                </Button>
                <Button variant="ghost" onClick={onDismissAiChange}>
                  Keep changes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {scorecard && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-sc-text-subtle">Script scorecard</p>
                <h3 className="mt-2 text-base font-semibold text-sc-text">What to fix next</h3>
              </div>
              <Badge variant="accent">{scorecard.overall}/100</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-sc-border-subtle bg-sc-accent-soft/30 px-4 py-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Strongest</p>
                <p className="mt-1 text-sm text-sc-text">{scorecard.strongest}</p>
              </div>
              <div className="rounded-2xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Weakest</p>
                <p className="mt-1 text-sm text-sc-text">{scorecard.weakest}</p>
              </div>
              <div className="rounded-2xl border border-sc-border-subtle bg-sc-bg px-4 py-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">Next fix</p>
                <p className="mt-1 text-sm text-sc-text">{scorecard.nextFix}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {scorecard.metrics.map(metric => (
                <div key={metric.label} className="rounded-2xl border border-sc-border-subtle px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-sc-text">{metric.label}</span>
                    <span className="text-xs font-mono uppercase tracking-[0.18em] text-sc-accent">{metric.score}/100</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-sc-text-muted">{metric.summary}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {scorecardError && (
          <Card className="border-amber-200 bg-amber-50/60 p-5">
            <p className="text-sm font-semibold text-amber-900">Scorecard unavailable</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80">{scorecardError}</p>
            {onRetryScorecard && (
              <Button variant="subtle" size="sm" className="mt-4" onClick={onRetryScorecard}>
                Retry scorecard
              </Button>
            )}
          </Card>
        )}

        <div className="grid gap-3">
          {nextActions.map(action => (
            <Card
              key={action.id}
              className={`group p-4 transition-all ${action.disabled ? 'opacity-60' : 'hover:border-sc-accent-soft-strong hover:bg-sc-accent-soft/30'}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-sc-text">{action.label}</h3>
                  <ArrowRight size={16} className="text-sc-text-subtle transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-sc-text-muted">{action.description}</p>
                <Button
                  variant="ghost"
                  className="mt-4 justify-start px-0 text-sc-accent hover:bg-transparent"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  Open
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-sc-border-subtle bg-sc-accent-soft/30 px-3 py-2">
    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-sc-text-subtle">{label}</p>
    <p className="mt-1 text-sm font-semibold text-sc-text">{value}</p>
  </div>
);
