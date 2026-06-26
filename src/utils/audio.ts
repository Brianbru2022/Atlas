/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AIEurovisionSynth {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private bpm = 120;
  private genre = "Synth-Pop";
  private timerId: any = null;
  private currentStep = 0;
  private tempoRatio = 1.0;
  private gainNode: GainNode | null = null;

  // Scale of notes (C Minor Pentatonic)
  // C3, Eb3, F3, G3, Bb3, C4, Eb4, F4, G4, Bb4
  private freqs = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16];

  constructor() {}

  public start(genre: string, bpm: number) {
    if (this.isPlaying) this.stop();

    this.genre = genre;
    this.bpm = Math.min(Math.max(bpm, 70), 180); // clamp
    this.tempoRatio = 60 / this.bpm / 4; // duration of a 16th note in seconds

    try {
      // Create audio context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      // Main master volume slider
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime); // keep comfortable lower volume
      this.gainNode.connect(this.ctx.destination);

      this.isPlaying = true;
      this.currentStep = 0;

      // Start tick scheduler
      const scheduleAheadTime = 0.1;
      let nextStepTime = this.ctx.currentTime;

      const scheduleTick = () => {
        while (nextStepTime < this.ctx!.currentTime + scheduleAheadTime) {
          this.playStep(this.ctx!, nextStepTime, this.currentStep);
          nextStepTime += this.tempoRatio;
          this.currentStep = (this.currentStep + 1) % 16;
        }
        this.timerId = setTimeout(scheduleTick, 25);
      };

      scheduleTick();
    } catch (e) {
      console.error("Failed to start Web Audio Synthesizer:", e);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      if (this.ctx.state !== "closed") {
        this.ctx.close();
      }
      this.ctx = null;
    }
  }

  private playStep(ctx: AudioContext, time: number, step: number) {
    if (!this.gainNode) return;

    // KICK DRUM on beats 0, 4, 8, 12 (every quarter note)
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.gainNode);
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      osc.start(time);
      osc.stop(time + 0.16);
    }

    // SNARE/CLAP sound on beats 4, 12 (backbeats)
    if (step % 8 === 4) {
      // Noise buffer for snap feel
      const bufferSize = ctx.sampleRate * 0.1; // 100ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1000, time);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
      
      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.gainNode);
      
      noiseNode.start(time);
      noiseNode.stop(time + 0.09);
    }

    // CYMBAL/HAT on odd beats for rhythm
    if (step % 2 === 1) {
      const hiosc = ctx.createOscillator();
      const higain = ctx.createGain();
      hiosc.type = "triangle";
      hiosc.frequency.setValueAtTime(10000, time);
      
      higain.gain.setValueAtTime(0.04, time);
      higain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      
      hiosc.connect(higain);
      higain.connect(this.gainNode);
      hiosc.start(time);
      hiosc.stop(time + 0.05);
    }

    // BASSLINE based on selected song style
    const isDance = this.genre.toLowerCase().includes("pop") || this.genre.toLowerCase().includes("disco");
    const isMetal = this.genre.toLowerCase().includes("metal");
    
    // Bass notes progression
    // 4 chords progression over 16 steps (4 steps per chord)
    const chordIdx = Math.floor(step / 4);
    const chords = [0, 3, 4, 1]; // indexes in our frequency scale
    const rootFreq = this.freqs[chords[chordIdx]];
    
    if (step % 2 === 0) { // Offbeat or onbeat bass rhythm
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      bassOsc.type = isMetal ? "sawtooth" : "sawtooth";
      bassOsc.frequency.setValueAtTime(rootFreq / 2, time); // drop an octave
      
      bassGain.gain.setValueAtTime(isDance ? 0.25 : 0.18, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + this.tempoRatio * 1.5);
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.gainNode);
      bassOsc.start(time);
      bassOsc.stop(time + this.tempoRatio * 1.6);
    }

    // ARPEGGIATION MELODY
    // Plays a shimmering lead line on certain ticks
    const melodySteps = [0, 3, 6, 8, 10, 11, 14];
    if (melodySteps.includes(step)) {
      const melodyOsc = ctx.createOscillator();
      const melodyGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // select melody note based on current chord + arpeggio step
      const scaleDegree = (chords[chordIdx] + (step % 3) * 2) % this.freqs.length;
      const melodyFreq = this.freqs[scaleDegree] * 2; // up an octave

      melodyOsc.type = "sawtooth";
      melodyOsc.frequency.setValueAtTime(melodyFreq, time);
      
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300 + Math.sin(time) * 1000, time);
      filter.frequency.exponentialRampToValueAtTime(1200, time + 0.1);

      melodyGain.gain.setValueAtTime(0.08, time);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      melodyOsc.connect(filter);
      filter.connect(melodyGain);
      melodyGain.connect(this.gainNode);
      melodyOsc.start(time);
      melodyOsc.stop(time + 0.16);
    }
  }
}

export const soundEngine = new AIEurovisionSynth();
