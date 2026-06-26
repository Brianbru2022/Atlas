import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Link as LinkIcon, ShieldCheck, Search, Circle, CheckCircle2, AlertCircle } from 'lucide-react';
import { identifyClaims, verifyClaim } from '../services/gemini';
import { Button, Card } from './ui';
import { fadeUp, slideInRight } from '../utils/motion';

interface VerificationViewProps {
  content: string;
  initialData?: {
    claims?: Claim[];
    claimStates?: Record<string, ClaimStatus | string>;
    claimResults?: Record<string, VerificationResult>;
  } | null;
  onDataChange?: (data: {
    claims: Claim[];
    claimStates: Record<string, ClaimStatus>;
    claimResults: Record<string, VerificationResult>;
  }) => void;
}

interface Claim {
  claim: string;
}

interface VerificationResult {
  snippets?: string[];
  sources?: Array<{ title?: string; uri?: string }>;
}

type ClaimStatus = 'idle' | 'checking' | 'reviewed' | 'empty' | 'error';

export const VerificationView: React.FC<VerificationViewProps> = ({ content, initialData, onDataChange }) => {
  const [claims, setClaims] = useState<Claim[]>(initialData?.claims ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [claimStates, setClaimStates] = useState<Record<string, ClaimStatus>>((initialData?.claimStates as Record<string, ClaimStatus>) ?? {});
  const [claimResults, setClaimResults] = useState<Record<string, VerificationResult>>(initialData?.claimResults ?? {});

  useEffect(() => {
    const fetchClaims = async () => {
      setIsLoading(true);
      setApiError(null);
      setSelectedClaim(null);
      setVerificationResult(null);
      if (initialData?.claims?.length) {
        setClaims(initialData.claims);
        setClaimStates((initialData.claimStates as Record<string, ClaimStatus>) ?? {});
        setClaimResults(initialData.claimResults ?? {});
        setIsLoading(false);
        return;
      }
      setClaimStates({});
      setClaimResults({});

      try {
        const identifiedClaims = await identifyClaims(
          content
            .split('\n')
            .filter(line => !line.trim().startsWith('[B-ROLL'))
            .join('\n')
        );
        setClaims(identifiedClaims);
        onDataChange?.({ claims: identifiedClaims, claimStates: {}, claimResults: {} });
      } catch (error) {
        console.error("Failed to identify claims:", error);
        setApiError('Claim detection failed. Try switching away and back to this view after saving.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, [content]);

  const handleVerifyAll = async () => {
    setApiError(null);
    for (const claim of claims) {
      await handleVerifyClick(claim);
    }
  };

  const handleVerifyClick = async (claim: Claim) => {
    setApiError(null);
    setSelectedClaim(claim);
    setVerificationResult(null);
    setIsVerifying(true);
    setClaimStates(prev => ({ ...prev, [claim.claim]: 'checking' }));

    try {
      const result = await verifyClaim(claim.claim);
      const normalizedResult: VerificationResult = {
        snippets: result?.snippets ?? [],
        sources: result?.sources ?? [],
      };

      const status: ClaimStatus = normalizedResult.sources && normalizedResult.sources.length > 0 ? 'reviewed' : 'empty';

      setVerificationResult(normalizedResult);
      setClaimResults(prev => {
        const nextResults = { ...prev, [claim.claim]: normalizedResult };
        const nextStates = { ...claimStates, [claim.claim]: status };
        onDataChange?.({ claims, claimStates: nextStates, claimResults: nextResults });
        return nextResults;
      });
      setClaimStates(prev => ({ ...prev, [claim.claim]: status }));
    } catch (error: any) {
      console.error("Failed to verify claim:", error);
      setClaimStates(prev => ({ ...prev, [claim.claim]: 'error' }));

      if (error.message?.includes('RESOURCE_EXHAUSTED')) {
        setApiError('API quota exceeded. Please check your plan and billing details.');
      } else {
        setApiError('An unexpected error occurred during verification.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const reviewedCount = useMemo(
    () => Object.values(claimStates).filter(status => status === 'reviewed' || status === 'empty').length,
    [claimStates]
  );

  const renderContentWithHighlights = () => {
    if (claims.length === 0) return content;

    const sortedClaims = [...claims].sort((a, b) => content.indexOf(a.claim) - content.indexOf(b.claim));
    let lastIndex = 0;
    const parts: (string | React.ReactNode)[] = [];

    sortedClaims.forEach((claim, index) => {
      const matchIndex = content.indexOf(claim.claim, lastIndex);
      if (matchIndex === -1) return;

      parts.push(content.substring(lastIndex, matchIndex));
      parts.push(
        <button
          key={`${claim.claim}-${index}`}
          onClick={() => handleVerifyClick(claim)}
          className={`inline rounded px-1 py-0.5 transition-colors ${
            selectedClaim?.claim === claim.claim
              ? 'bg-yellow-300'
              : claimStates[claim.claim] === 'reviewed'
                ? 'bg-emerald-200 hover:bg-emerald-300'
                : claimStates[claim.claim] === 'error'
                  ? 'bg-red-200 hover:bg-red-300'
                  : 'bg-yellow-200 hover:bg-yellow-300'
          }`}
        >
          {claim.claim}
        </button>
      );
      lastIndex = matchIndex + claim.claim.length;
    });

    parts.push(content.substring(lastIndex));
    return parts;
  };

  const selectedStatus = selectedClaim ? claimStates[selectedClaim.claim] ?? 'idle' : 'idle';
  const selectedStoredResult = selectedClaim ? claimResults[selectedClaim.claim] : null;
  const activeResult = verificationResult ?? selectedStoredResult ?? null;
  const sourceCount = activeResult?.sources?.length ?? 0;
  const evidenceStrength =
    sourceCount >= 4 ? 'Stronger evidence set' : sourceCount >= 2 ? 'Moderate evidence set' : sourceCount >= 1 ? 'Thin evidence set' : 'No evidence returned';

  return (
    <div className="flex-1 flex h-full bg-sc-bg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        <motion.div
          className="max-w-4xl mx-auto space-y-6 pb-24"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <Card className="ambient-orb p-8">
              <h2 className="text-2xl font-bold font-serif mb-2 text-sc-text">Fact-check workspace</h2>
              <p className="text-sc-text-muted leading-relaxed">
                ScriptCraft highlights claims that look checkable, then fetches web-grounded evidence for manual review. This helps you triage facts quickly, but it does not certify accuracy on its own.
              </p>
            </Card>

            <Card className="hover-float p-6">
              <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-sc-text-subtle">Progress</p>
              <div className="mt-4 space-y-3">
                <StatusRow label="Claims found" value={String(claims.length)} />
                <StatusRow label="Reviewed" value={String(reviewedCount)} />
                <StatusRow label="Pending" value={String(Math.max(claims.length - reviewedCount, 0))} />
              </div>
              <Button
                onClick={handleVerifyAll}
                disabled={isVerifying || claims.length === 0}
                className="mt-5 w-full gap-2"
              >
                <ShieldCheck size={18} />
                Review all claims
              </Button>
            </Card>
          </div>

          <Card className="ambient-orb p-12">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-sc-accent" size={32} />
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="mx-auto text-sc-accent mb-4" size={28} />
                <p className="text-sc-text font-medium">No checkable claims detected.</p>
                <p className="text-sm text-sc-text-muted mt-2">If this script includes factual lines later, come back here after another draft pass.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-sc-text-muted mb-8">
                  Click a highlighted claim to inspect evidence. Green means you already reviewed it, not that it is guaranteed true.
                </p>
                <p className="text-lg leading-loose font-mono whitespace-pre-wrap text-sc-text">
                  {renderContentWithHighlights()}
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      <motion.aside
        className="w-96 border-l border-sc-border-subtle glass-panel p-6 flex flex-col shrink-0"
        variants={slideInRight}
        initial="hidden"
        animate="show"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-sc-text-muted mb-4">Research Assistant</h3>

        <div className="rounded-[1.25rem] border border-sc-border-subtle bg-sc-accent-soft/30 p-4 mb-4">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-sc-text-subtle mb-2">How to use this</p>
          <p className="text-sm text-sc-text-muted leading-relaxed">
            Use the snippets and links to confirm or rewrite factual lines. If evidence is thin, revise the script or verify manually from stronger sources.
          </p>
        </div>

        {selectedClaim ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-[1.25rem] mb-4">
              <p className="font-bold text-yellow-900">Selected claim</p>
              <p className="text-yellow-800 italic mt-1">"{selectedClaim.claim}"</p>
            </div>

            <div className="mb-4 rounded-[1.25rem] border border-sc-border-subtle p-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon status={selectedStatus} />
                <p className="text-sm font-semibold text-sc-text">{statusLabel(selectedStatus)}</p>
              </div>
              <p className="text-sm text-sc-text-muted leading-relaxed">{statusDescription(selectedStatus)}</p>
              {activeResult && (
                <div className="mt-3 inline-flex rounded-full border border-sc-border-subtle bg-sc-accent-soft/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-sc-text-subtle">
                  {evidenceStrength}
                </div>
              )}
            </div>

            {apiError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {apiError}</span>
              </div>
            )}

            {isVerifying ? (
              <div className="flex-1 flex items-center justify-center flex-col text-center">
                <Loader2 className="animate-spin text-sc-accent mb-4" size={24} />
                <p className="text-sm text-sc-text-muted">Searching for evidence...</p>
              </div>
            ) : activeResult ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Snippets" value={String(activeResult.snippets?.length ?? 0)} />
                  <MiniStat label="Sources" value={String(activeResult.sources?.length ?? 0)} />
                </div>

                <div className={`rounded-[1rem] border px-4 py-3 text-sm ${
                  sourceCount >= 4
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : sourceCount >= 2
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                  {sourceCount >= 4
                    ? 'Good starting evidence, but still confirm the wording before publishing.'
                    : sourceCount >= 2
                      ? 'Useful but incomplete evidence. Treat this as a review draft, not a final verdict.'
                      : 'Evidence is thin. This claim should probably be rewritten or verified manually from stronger sources.'}
                </div>

                <div>
                  <h4 className="font-bold text-sc-text mb-3">Evidence snippets</h4>
                  <div className="space-y-3">
                    {activeResult.snippets?.length ? activeResult.snippets.map((snippet, index) => (
                      <div key={`${snippet}-${index}`} className="p-3 bg-sc-accent-soft/30 border border-sc-border-subtle rounded-[1rem]">
                        <p className="text-sm text-sc-text-muted">"{snippet}"</p>
                      </div>
                    )) : (
                      <div className="p-3 bg-sc-accent-soft/20 border border-sc-border-subtle rounded-[1rem]">
                        <p className="text-sm text-sc-text-muted">No snippet text was returned for this claim. Use the sources below or verify manually.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sc-text mb-3">Sources</h4>
                  <div className="space-y-2">
                    {activeResult.sources?.length ? activeResult.sources.map((source, index) => (
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={`${source.uri}-${index}`}
                        className="flex items-center gap-2 text-sc-accent hover:underline text-sm p-3 bg-sc-accent-soft/20 rounded-[1rem] border border-sc-border-subtle"
                      >
                        <LinkIcon size={14} />
                        <span className="truncate">{source.title || source.uri || 'Source'}</span>
                      </a>
                    )) : (
                      <div className="p-3 bg-sc-accent-soft/20 border border-sc-border-subtle rounded-[1rem]">
                        <p className="text-sm text-sc-text-muted">No linked sources were returned for this claim.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="text-sc-text-subtle">No research run yet for this claim.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Search className="mx-auto text-sc-text-subtle mb-3" size={24} />
              <p className="text-sc-text-subtle">Select a highlighted claim to begin.</p>
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  );
};

const StatusRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-[1.25rem] border border-sc-border-subtle px-4 py-3">
    <span className="text-sm text-sc-text-muted">{label}</span>
    <span className="text-sm font-semibold text-sc-text">{value}</span>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[1.25rem] border border-sc-border-subtle px-4 py-3">
    <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-sc-text-subtle">{label}</p>
    <p className="mt-1 text-lg font-semibold text-sc-text">{value}</p>
  </div>
);

const StatusIcon: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  if (status === 'reviewed') return <CheckCircle2 size={16} className="text-sc-accent" />;
  if (status === 'checking') return <Loader2 size={16} className="animate-spin text-sc-accent" />;
  if (status === 'error') return <AlertCircle size={16} className="text-red-500" />;
  return <Circle size={16} className="text-sc-text-subtle" />;
};

const statusLabel = (status: ClaimStatus) => {
  if (status === 'reviewed') return 'Evidence collected';
  if (status === 'checking') return 'Checking sources';
  if (status === 'empty') return 'Needs manual review';
  if (status === 'error') return 'Research error';
  return 'Not reviewed yet';
};

const statusDescription = (status: ClaimStatus) => {
  if (status === 'reviewed') return 'This claim has linked evidence to inspect. Review the sources before trusting or publishing it.';
  if (status === 'checking') return 'ScriptCraft is gathering web-grounded snippets and source links for this claim.';
  if (status === 'empty') return 'The search returned weak or missing evidence. Treat this claim as unresolved until you verify it manually.';
  if (status === 'error') return 'The automated check failed. Try again or verify this claim outside the app.';
  return 'Run research on this claim to collect snippets and source links for manual review.';
};
