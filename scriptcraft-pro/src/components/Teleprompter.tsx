import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Type, Gauge, FlipHorizontal, Keyboard } from 'lucide-react';
import { motion } from 'motion/react';

interface TeleprompterProps {
  content: string;
  onClose: () => void;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ content, onClose }) => {
  // Remove [BRACKETS] visual-cue lines so only spoken text appears
  const spokenContent = content
    .split('\n')
    .filter(line => !/^\s*\[.+\]\s*$/.test(line.trim()))
    .join('\n');

  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(150);
  const [fontSize, setFontSize] = useState(64);
  const [isMirrored, setIsMirrored] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && scrollerRef.current && textRef.current) {
      // Calculate Pixels Per Word dynamically based on the actual text height
      const totalWords = spokenContent.split(/\s+/).filter(w => w.length > 0).length;
      const textHeight = textRef.current.scrollHeight;
      
      const pixelsPerWord = textHeight / (totalWords || 1);
      const pixelsPerMinute = wpm * pixelsPerWord;
      const pixelsPerTick = pixelsPerMinute / (60 * 1000 / 30); // 30ms tick

      interval = setInterval(() => {
        if (scrollerRef.current) {
          // Stop if we've reached the bottom
          if (scrollerRef.current.scrollTop + scrollerRef.current.clientHeight >= scrollerRef.current.scrollHeight) {
            setIsPlaying(false);
            return;
          }
          scrollerRef.current.scrollTop += pixelsPerTick;
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isPlaying, wpm, fontSize, spokenContent]);

  // Toggle play/pause with spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col text-white bg-black">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(105,208,188,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(231,139,81,0.08),transparent_30%)]" />
      {/* Controls Header */}
      <div className="h-20 bg-black/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[linear-gradient(135deg,#69d0bc,#2b7f73)] hover:brightness-110 rounded-full font-bold transition-all shadow-[0_18px_40px_rgba(105,208,188,0.2)]"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            <span>{isPlaying ? 'Pause' : 'Start'}</span>
          </button>
          
          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <Gauge size={18} className="text-white/50" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/50">Speed ({wpm} WPM)</span>
            <input 
              type="range" 
              min="50" 
              max="300" 
              step="10"
              value={wpm} 
              onChange={(e) => setWpm(parseInt(e.target.value))}
              className="w-32 accent-[#69d0bc] h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <Type size={18} className="text-white/50" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/50">Size</span>
            <input 
              type="range" 
              min="32" 
              max="128" 
              value={fontSize} 
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-32 accent-[#69d0bc] h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button 
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-2.5 rounded-2xl transition-colors ${isMirrored ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mirror Text"
          >
            <FlipHorizontal size={20} />
          </button>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      <div className="px-8 py-3 border-b border-white/10 bg-black/70 flex items-center gap-3 text-xs font-mono uppercase tracking-[0.22em] text-white/45 z-10">
        <Keyboard size={14} />
        <span>Space to play or pause</span>
        <span className="h-3 w-px bg-white/10" />
        <span>Esc to close</span>
        <span className="h-3 w-px bg-white/10" />
        <span>Click anywhere to toggle scrolling</span>
      </div>

      {/* Scrolling Area */}
      <div 
        ref={scrollerRef}
        className="flex-1 overflow-y-auto scroll-smooth no-scrollbar relative z-10"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {/* Padding to start text in middle of screen */}
        <div className="h-[40vh]" />
        
        <div className="max-w-5xl mx-auto px-12 pb-[50vh]">
          <p 
            ref={textRef}
            style={{ 
              fontSize: `${fontSize}px`,
              transform: isMirrored ? 'scaleX(-1)' : 'none',
              lineHeight: 1.5
            }}
            className="font-semibold text-center transition-all duration-200 whitespace-pre-wrap font-sans tracking-tight"
          >
            {spokenContent}
          </p>
        </div>
      </div>

      {/* Reading Guide Line */}
      <div className="absolute top-[45%] left-0 right-0 h-24 border-y border-[#69d0bc]/30 bg-[#69d0bc]/5 pointer-events-none z-0 flex items-center">
        <div className="w-4 h-4 bg-[#69d0bc] absolute left-2 rounded-full opacity-50" />
        <div className="w-4 h-4 bg-[#69d0bc] absolute right-2 rounded-full opacity-50" />
      </div>
    </div>
  );
};
