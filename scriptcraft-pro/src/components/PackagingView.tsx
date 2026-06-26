import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Package, Copy, Check, Hash, MessageCircle, Image as ImageIcon, Type, Loader2, FlaskConical, TriangleAlert } from 'lucide-react';
import { generatePackaging } from '../services/gemini';
import { PackagingDraft, Style } from '../types';
import { Button, Card, Badge } from './ui';
import { fadeUp, listItemFade } from '../utils/motion';

interface PackagingViewProps {
  scriptContent: string;
  style: Style | null;
  initialData?: any;
  onDataGenerated?: (data: any) => void;
}

export const PackagingView: React.FC<PackagingViewProps> = ({ scriptContent, style, initialData, onDataGenerated }) => {
  const [packaging, setPackaging] = useState<PackagingDraft | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!style) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await generatePackaging(scriptContent, style);
      setPackaging(data);
      if (onDataGenerated) onDataGenerated(data);
    } catch (error) {
      console.error(error);
      setError('Packaging generation failed. Check your API key or try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!packaging && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-sc-bg">
        <div className="glass-card w-24 h-24 rounded-[2rem] flex items-center justify-center text-sc-accent mb-6">
          <Package size={40} />
        </div>
        <h2 className="text-4xl font-semibold text-sc-text font-serif mb-3">Generate Packaging Drafts</h2>
        <p className="text-sc-text-muted max-w-2xl mb-8 leading-relaxed">
          Create first-pass title, thumbnail, description, and tag ideas based on the current script and style. Treat these as creative options to refine, not final answers.
        </p>
        {error && (
          <div className="mb-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!style}
          size="lg"
          className="gap-2"
        >
          <SparklesIcon />
          <span>Generate Packaging Drafts</span>
        </Button>
        {!style && (
          <p className="mt-3 text-sm text-sc-text-subtle">Choose a style profile before generating packaging.</p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-sc-bg">
        <Loader2 className="animate-spin text-sc-accent mb-4" size={40} />
        <p className="text-sc-text-muted font-mono text-sm uppercase tracking-widest">Generating Packaging Drafts...</p>
      </div>
    );
  }

  const titlesWithRatings = packaging.titles || [];
  const thumbnailsWithRatings = packaging.thumbnails || [];
  
  const topTitle = [...titlesWithRatings].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))[0];
  const topThumb = [...thumbnailsWithRatings].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))[0];

  return (
    <div className="flex-1 overflow-y-auto bg-sc-bg p-8" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      <motion.div
        className="max-w-5xl mx-auto space-y-8 pb-32"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="ambient-orb hover-float p-6">
            <div className="flex items-center gap-3 mb-3">
              <FlaskConical className="text-sc-accent" size={18} />
              <h3 className="text-lg font-semibold text-sc-text font-serif">Packaging recommendations</h3>
            </div>
            <p className="text-sm leading-relaxed text-sc-text-muted">
              These assets are generated from your script and style profile. They are useful for exploring angles quickly, but they are not based on live platform performance data.
            </p>
          </Card>
          <Card className="hover-float p-6 border-amber-200 bg-amber-50/70">
            <div className="flex items-center gap-3 mb-2 text-amber-800">
              <TriangleAlert size={18} />
              <p className="text-sm font-semibold">Human review recommended</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-900/80">
              Sanity-check claims, wording, and audience fit before publishing. Ratings are internal suggestions, not guarantees.
            </p>
          </Card>
        </div>
        {error && (
          <Card className="border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-900">{error}</p>
              <Button variant="subtle" size="sm" onClick={handleGenerate} disabled={!style || isLoading}>
                Retry
              </Button>
            </div>
          </Card>
        )}
        
        {/* Titles */}
        <Card className="ambient-orb p-8">
          <div className="flex items-center gap-3 mb-6">
            <Type className="text-sc-accent" />
            <h3 className="text-xl font-bold font-serif text-sc-text">Title Drafts</h3>
          </div>
          <div className="grid gap-3">
            {titlesWithRatings.map((item: any, idx: number) => {
              const titleText = typeof item === 'string' ? item : item.title;
              const rating = typeof item === 'string' ? null : item.rating;
              const isTop = item === topTitle && rating;

              return (
                <motion.div
                  key={idx}
                  {...listItemFade(idx)}
                  className="p-4 bg-sc-accent-soft/30 rounded-[1.25rem] group hover:bg-sc-accent-soft/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium text-sc-text">{titleText}</span>
                        {rating && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-sc-accent-soft rounded-full text-sc-text-subtle">
                            {rating}/100
                          </span>
                        )}
                        {typeof item !== 'string' && item.strategy && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-white/70 rounded-full text-sc-text-subtle uppercase">
                            {item.strategy}
                          </span>
                        )}
                        {isTop && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                            <SparklesIcon size={10} />
                            STRONGEST FIT
                          </span>
                        )}
                      </div>
                      {typeof item !== 'string' && item.rationale && (
                        <p className="mt-2 text-xs leading-relaxed text-sc-text-muted">{item.rationale}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(titleText, `title-${idx}`)}
                      className="shrink-0 text-sc-text-subtle hover:text-sc-accent transition-colors"
                    >
                      {copied === `title-${idx}` ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Thumbnails */}
        <Card className="ambient-orb p-8">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="text-sc-accent" />
            <h3 className="text-xl font-bold font-serif text-sc-text">Thumbnail Concepts</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {thumbnailsWithRatings.map((item: any, idx: number) => {
              const desc = typeof item === 'string' ? item : item.description;
              const rating = typeof item === 'string' ? null : item.rating;
              const isTop = item === topThumb && rating;

              return (
                <motion.div
                  key={idx}
                  {...listItemFade(idx, 0.05)}
                  className={`hover-float p-5 border rounded-[1.25rem] transition-all ${isTop ? 'border-amber-200 bg-amber-50/30' : 'border-sc-border-subtle bg-sc-accent-soft/20'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-sc-text-subtle">Concept {idx + 1}</span>
                      {rating && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-sc-accent-soft rounded-full text-sc-text-subtle">
                          {rating}/100
                        </span>
                      )}
                    </div>
                    {isTop && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                        <SparklesIcon size={10} />
                        STRONGEST FIT
                      </span>
                    )}
                  </div>
                      <p className="text-sm leading-relaxed text-sc-text-muted">{desc}</p>
                      {'rationale' in item && item.rationale && (
                        <div className="mt-3 rounded-xl border border-sc-border-subtle bg-white/60 px-3 py-2">
                          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-sc-text-subtle">Why this was suggested</p>
                          <p className="mt-1 text-xs leading-relaxed text-sc-text-muted">{item.rationale}</p>
                        </div>
                      )}
                    </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Description & Tags */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="ambient-orb p-8 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileTextIcon className="text-sc-accent" />
                <h3 className="text-xl font-bold font-serif text-sc-text">Description</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(packaging.description, 'desc')}
                className="text-sc-text-subtle hover:text-sc-accent transition-colors"
              >
                {copied === 'desc' ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm text-sc-text-muted bg-sc-accent-soft/20 p-6 rounded-[1.25rem] border border-sc-border-subtle leading-relaxed">
              {packaging.description}
            </pre>
            {packaging.confidenceNote && (
              <div className="mt-4 rounded-[1.25rem] border border-sc-border-subtle bg-white/60 px-4 py-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-sc-text-subtle">Confidence note</p>
                <p className="mt-1 text-sm text-sc-text-muted leading-relaxed">{packaging.confidenceNote}</p>
              </div>
            )}
          </Card>

          <div className="space-y-8">
            <Card className="hover-float p-8">
              <div className="flex items-center gap-3 mb-6">
                <Hash className="text-sc-accent" />
                <h3 className="text-xl font-bold font-serif text-sc-text">Tag Ideas</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {packaging.tags?.map((tag: string, idx: number) => (
                  <Badge key={idx} className="font-medium">
                    #{tag}
                  </Badge>
                ))}
              </div>
              <button 
                onClick={() => copyToClipboard(packaging.tags?.join(', '), 'tags')}
                className="mt-4 text-xs font-bold text-sc-accent hover:underline flex items-center gap-1"
              >
                {copied === 'tags' ? <Check size={14} /> : <Copy size={14} />}
                Copy All Tags
              </button>
            </Card>

            <Card className="hover-float p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="text-sc-accent" />
                <h3 className="text-xl font-bold font-serif text-sc-text">Pinned Comment</h3>
              </div>
              <div className="p-4 bg-sc-accent-soft/20 rounded-[1.25rem] border border-sc-border-subtle text-sm text-sc-text-muted italic relative group">
                "{packaging.pinnedComment}"
                <button 
                  onClick={() => copyToClipboard(packaging.pinnedComment, 'comment')}
                  className="absolute top-2 right-2 text-sc-text-subtle hover:text-sc-accent opacity-0 group-hover:opacity-100 transition-all"
                >
                  {copied === 'comment' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </Card>
          </div>
        </div>

        {!!packaging.reviewWarnings?.length && (
          <Card className="p-6 border-amber-200 bg-amber-50/60">
            <div className="flex items-center gap-3 text-amber-800">
              <TriangleAlert size={18} />
              <h3 className="text-lg font-semibold font-serif">Review before publishing</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {packaging.reviewWarnings.map((warning, index) => (
                <div key={`${warning}-${index}`} className="rounded-[1rem] border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-900/80">
                  {warning}
                </div>
              ))}
            </div>
          </Card>
        )}

      </motion.div>
    </div>
  );
};

const SparklesIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
