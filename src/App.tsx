/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Trophy,
  Sliders,
  Youtube,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Search,
  ChevronRight,
  Tv,
  Music,
  User,
  Image as ImageIcon,
  BookOpen,
  Award,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  FileText,
  MapPin,
  Flame,
  Layout,
  Info
} from "lucide-react";
import { ALL_COUNTRIES } from "./data/countries";
import { Country, CountryBucket, Contestant, Season, SongMetadata } from "./types";
import { soundEngine } from "./utils/audio";

function getLocalPhotoSuggestionsBackup(countryName: string) {
  return [
    {
      category: "Scenic landscapes and natural wonders",
      suggestions: Array.from({ length: 15 }, (_, i) => `A majestic wide-angle shot of ${countryName}'s outstanding mountain peaks and national parks during ${["sunset", "golden hour", "autumn morning", "misty sunrise"][i % 4]}, highly detailed landscape photographic masterpiece.`)
    },
    {
      category: "Historical monuments and architectural symbols",
      suggestions: Array.from({ length: 15 }, (_, i) => `A low-angle dramatic render of a prominent historical monument in ${countryName}, surrounded by traditional trees and beautiful sky textures, ${["cinematic light", "vintage look", "grand architectural photorealism"][i % 3]}.`)
    },
    {
      category: "Cultural heritages, folklore and culinary treasures",
      suggestions: Array.from({ length: 15 }, (_, i) => `Close-up celebration of ${countryName} traditional delicacies, cultural patterns, and celebratory folkloric decorations, rich color saturation, professional food/cultural microphotography.`)
    },
    {
      category: "Urban modern life, tech trends and community quirks",
      suggestions: Array.from({ length: 15 }, (_, i) => `A vibrant street scene from a major city of ${countryName} at night, with neon traffic trails, reflection in puddles, modern citizens walking, cyber-urban architectural style.`)
    }
  ];
}

function generateClientSideSvg(countryName: string, promptText: string) {
  const colors = [
    ["#1e1b4b", "#4338ca", "#a855f7"],
    ["#0f172a", "#0d9488", "#22c55e"],
    ["#1c1917", "#b45309", "#ec4899"],
    ["#18000a", "#e11d48", "#f43f5e"],
    ["#030712", "#0284c7", "#6366f1"],
  ];
  
  const pickedPalette = colors[Math.floor(Math.random() * colors.length)];
  const hash = promptText.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const rotation = hash % 360;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
      <defs>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${rotation})">
          <stop offset="0%" stop-color="${pickedPalette[0]}" />
          <stop offset="50%" stop-color="${pickedPalette[1]}" />
          <stop offset="100%" stop-color="${pickedPalette[2]}" />
        </linearGradient>
        <radialGradient id="ringglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="500" fill="url(#backGrad)" />
      <g stroke="white" stroke-opacity="0.1" fill="none">
        <circle cx="250" cy="250" r="180" stroke-width="1.5" />
        <circle cx="250" cy="250" r="140" stroke-width="1" stroke-dasharray="5 5" />
        <circle cx="250" cy="250" r="220" stroke-width="2" />
      </g>
      <path d="M 0,100 Q 250,250 500,100" stroke="${pickedPalette[2]}" stroke-width="3" stroke-opacity="0.4" fill="none" />
      <path d="M 0,400 Q 250,250 500,400" stroke="#ffffff" stroke-width="2" stroke-opacity="0.2" fill="none" />
      <g stroke="white" stroke-opacity="0.4" stroke-width="4" stroke-linecap="round">
        <line x1="170" y1="250" x2="170" y2="290" />
        <line x1="190" y1="210" x2="190" y2="270" />
        <line x1="210" y1="250" x2="210" y2="330" />
        <line x1="230" y1="200" x2="230" y2="300" />
        <line x1="250" y1="130" x2="250" y2="370" />
        <line x1="270" y1="180" x2="270" y2="320" />
        <line x1="290" y1="250" x2="290" y2="290" />
        <line x1="310" y1="200" x2="310" y2="280" />
        <line x1="330" y1="250" x2="330" y2="260" />
      </g>
      <circle cx="250" cy="250" r="200" fill="url(#ringglow)"/>
      <g transform="translate(0, 410)">
        <rect x="25" y="0" width="450" height="70" rx="10" fill="black" fill-opacity="0.5" stroke="white" stroke-opacity="0.1"/>
        <text x="50" y="30" font-family="'Inter', sans-serif" font-weight="900" font-size="18" fill="white" letter-spacing="1">
          ${countryName.toUpperCase()}
        </text>
        <text x="50" y="52" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94a3b8" width="400">
           ${promptText.substring(0, 58)}${promptText.length > 58 ? '...' : ''}
        </text>
      </g>
      <rect x="25" y="25" width="115" height="26" rx="5" fill="#f43f5e" />
      <text x="32" y="42" font-family="'JetBrains Mono', monospace" font-weight="bold" font-size="10" fill="white" letter-spacing="1">
        ATLES MUSIC
      </text>
    </svg>
  `;
  
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg.trim());
}

function getClientSideBackupSong(country: Country) {
  const genres = ["Synth-Pop", "Electro-Folk", "Symphonic Metal", "Cyber-Pop", "Afro-Fusion", "Neo-Chanson", "Techno-Disco"];
  const selectedGenre = genres[Math.floor(Math.random() * genres.length)];
  const bpm = Math.floor(Math.random() * 50) + 100;
  const vibes = ["Euphoric", "Hypnotic", "Soaring and Cinematic", "Mysterious and Dark", "Infectious High Energy", "Rebellious"];
  const selectedVibe = vibes[Math.floor(Math.random() * vibes.length)];
  
  const nationalTerms: Record<string, string> = {
    "Sweden": "Dansa med mig under norrskenet! (Dance with me under the auroras!)",
    "United Kingdom": "We rise above the rolling fog, steady and strong!",
    "France": "La liberté brille dans nos yeux électriques! (Freedom shines in our electric eyes!)",
    "Germany": "Wir tanzen bis das Licht zerbricht! (We dance until the light shatters!)",
    "Italy": "Sotto il cielo stellato cantiamo insieme! (Under the starry sky we sing together!)",
    "Spain": "¡Siente el fogo del ritmo de la noche! (Feel the fire of the night's rhythm!)",
    "Ukraine": "Ми заспіваємо про свободу і вітер! (We will sing of freedom and the wind!)",
    "Iceland": "Eldur og ís í hjarta mér! (Fire and ice in my heart!)",
    "San Marino": "Una piccola stella brilla stasera! (A tiny star shines tonight!)",
    "Brazil": "O calor que bate em nosso peito livre! (The heat that beats in our free chest!)"
  };

  const nativePhrase = nationalTerms[country.name] || `Welcome to ${country.name}! Let's dance together under the stars!`;

  const songTitles = [
    `The Heart of ${country.flag} ${country.name}`,
    `Echoes over ${country.name}`,
    `Digital ${country.name}`,
    `Rhythms of the ${country.region}`,
    `Neon Sunset in ${country.name}`,
    `Folklore Future (${country.code})`
  ];
  const selectedTitle = songTitles[Math.floor(Math.random() * songTitles.length)];

  const bios = [
    `A high-concept virtual representative from ${country.name} blending historical folk rhythms with custom-synthesized cyberbass.`,
    `A modern electronic duet from ${country.name} exploring traditional folk tales through the lens of high-tempo experimental hyperpop.`,
    `A solo cybernetic performance unit representing ${country.name}, delivering high-energy tracks characterized by anthemic hooks and native chanting.`
  ];
  const selectedBio = bios[Math.floor(Math.random() * bios.length)];

  const instrumentsGroup: Record<string, string[]> = {
    "Synth-Pop": ["Sub Bass", "Analog Lead Synth", "Drum Machine 808"],
    "Electro-Folk": ["Traditional Accordion", "Nylon Guitar", "Modulated Synth Brass", "Frame Drum"],
    "Symphonic Metal": ["Distorted Cyber-Guitars", "Double Kick Drums", "Orchestral String Section", "Harpsichord"],
    "Cyber-Pop": ["Hologram Lead Synth", "Glitch Drums", "Vocoder FX"],
    "Afro-Fusion": ["Talking Drums", "Afrobeat Marimba", "Polyrhythmic Percussion", "Deep Sub Bass"]
  };
  const instruments = instrumentsGroup[selectedGenre] || ["Hologram lead", "Digital percussion", "Resonance synthesizer"];

  const vocalGroup = [
    "Warm layered vocal harmonies with deep robotic resonance",
    "A clean, soaring, passionate belt paired with traditional throat chanting elements",
    "A dramatic operatic soprano soaring above modern industrial beats",
    "Spoken-word cyberpunk poetic narrative in native language leading into high-concept choruses"
  ];
  const selectedVocals = vocalGroup[Math.floor(Math.random() * vocalGroup.length)];

  const lyrics = `[Verse 1]
Beneath the digital horizon of ${country.name},
We find the shadows where our stories live,
We are the waves of a new generation,
With so much fire and dreams to give!

[Chorus]
Oh, can you feel the vibration? The rhythm of Atles!
${nativePhrase}
Sing it together, across boundaries and seas,
We find our truth in these cyber-melodies!

[Verse 2]
Through old cobbled alleyways and modern hyper-towers,
We feel the gravity of a thousand suns,
Our heartbeat is the ticking clock,
This is the second of the chosen ones!

[Bridge]
Our hearts beat at ${bpm} BPM,
We are the spark, a glowing cyber gem!
From ${country.region} to the wider skies,
Watch us as our holographic spirits rise!

[Outro]
Yes, we are ${country.name}!
Hear the future call!
Underneath the banner of the song...
We stand together, standing tall!`;

  return {
    artistName: `AI_${country.name.replace(/\s+/g, "")} // ${Math.floor(Math.random() * 900 + 100)}`,
    artistBio: selectedBio,
    songTitle: selectedTitle,
    lyrics: lyrics,
    genre: selectedGenre,
    bpm: bpm,
    vibe: selectedVibe,
    instruments: instruments,
    vocals: selectedVocals,
    photoCategories: getLocalPhotoSuggestionsBackup(country.name)
  };
}

export default function App() {
  // --- Persistent State ---
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);

  // --- UI Navigation State ---
  const [activeTab, setActiveTab] = useState<"seasons" | "draft" | "production" | "voting" | "youtube">("seasons");

  // --- Draft Phase State ---
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftStep, setDraftStep] = useState<"idle" | "drawing" | "complete">("idle");
  const [draftedContestants, setDraftedContestants] = useState<Contestant[]>([]);
  const [spinIndex, setSpinIndex] = useState(0);
  const [spinningBucket, setSpinningBucket] = useState<CountryBucket | null>(null);
  const [drawRevealCount, setDrawRevealCount] = useState(0);

  // --- Production Suite State ---
  const [selectedContestantId, setSelectedContestantId] = useState<string>("");
  const [generatingSongId, setGeneratingSongId] = useState<string | null>(null);
  const [generatingPhotoPrompt, setGeneratingPhotoPrompt] = useState<string | null>(null);
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // --- Synth Playback State ---
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(Array(12).fill(2));
  const visualRef = useRef<number | null>(null);

  // --- Live Board Simulator State ---
  const [votingState, setVotingState] = useState<"idle" | "running" | "paused" | "finished">("idle");
  const [voterIndex, setVoterIndex] = useState(0);
  const [votingLog, setVotingLog] = useState<{from: string, flag: string, points: number, to: string}[]>([]);
  const [votingSpeed, setVotingSpeed] = useState<number>(1000); // ms per vote set
  const [autoProgress, setAutoProgress] = useState(false);

  // --- YouTube Script Variations State ---
  const [youtubeHookStyle, setYoutubeHookStyle] = useState<"shock" | "narrative" | "technical">("shock");

  // Load Seasons on Mount
  useEffect(() => {
    const saved = localStorage.getItem("atles_seasons");
    if (saved) {
      try {
        setSeasons(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse seasons", e);
      }
    }

    const savedCurrent = localStorage.getItem("atles_current_season");
    if (savedCurrent) {
      try {
        const parsed = JSON.parse(savedCurrent);
        setCurrentSeason(parsed);
        // default select first contestant
        if (parsed?.contestants?.length > 0) {
          setSelectedContestantId(parsed.contestants[0].country.id);
        }
      } catch (e) {
        console.error("Failed to parse current season", e);
      }
    }
  }, []);

  // Save Seasons and Current Season
  const saveSeasonsAndCurrent = (updatedSeasons: Season[], updatedCurrent: Season | null) => {
    setSeasons(updatedSeasons);
    setCurrentSeason(updatedCurrent);
    localStorage.setItem("atles_seasons", JSON.stringify(updatedSeasons));
    if (updatedCurrent) {
      localStorage.setItem("atles_current_season", JSON.stringify(updatedCurrent));
    } else {
      localStorage.removeItem("atles_current_season");
    }
  };

  // --- Audio Visualizer Tick ---
  useEffect(() => {
    if (playingSongId) {
      const interval = setInterval(() => {
        setVisualizerHeights(prev => prev.map(() => Math.floor(Math.random() * 30) + 5));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setVisualizerHeights(Array(12).fill(2));
    }
  }, [playingSongId]);

  const toggleSynthPlayback = (contestant: Contestant) => {
    if (playingSongId === contestant.country.id) {
      soundEngine.stop();
      setPlayingSongId(null);
    } else {
      soundEngine.stop();
      if (contestant.song) {
        soundEngine.start(contestant.song.genre, contestant.song.bpm);
        setPlayingSongId(contestant.country.id);
      }
    }
  };

  // Turn off synthesizer if tab changes
  useEffect(() => {
    soundEngine.stop();
    setPlayingSongId(null);
  }, [activeTab]);

  // --- Draft Operations ---
  const triggerBrandNewDraft = () => {
    setDraftStep("drawing");
    setDrawRevealCount(0);
    setDraftedContestants([]);
    setIsDrafting(true);

    // Pick 3 random countries from each bucket
    const pickFromBucket = (bucket: CountryBucket, count: number): Country[] => {
      const pool = ALL_COUNTRIES.filter(c => c.bucket === bucket);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    const powerhouses = pickFromBucket(CountryBucket.POWERHOUSE, 3);
    const regionals = pickFromBucket(CountryBucket.REGIONAL, 3);
    const risingStars = pickFromBucket(CountryBucket.RISING_STAR, 3);
    const microscopes = pickFromBucket(CountryBucket.MICRO_NATION, 3);

    const fullDrafted = [...powerhouses, ...regionals, ...risingStars, ...microscopes]
      .sort(() => Math.random() - 0.5) // final shuffle for random reveal order
      .map(country => ({
        country,
        generatedPhotos: {},
        score: 0
      }));

    // Perform dramatic staggered reveal animation
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setDrawRevealCount(count);
      setDraftedContestants(fullDrafted.slice(0, count));
      
      const currentSpinnerBucket = fullDrafted[count - 1]?.country.bucket;
      if (currentSpinnerBucket) {
        setSpinningBucket(currentSpinnerBucket);
      }

      if (count >= 12) {
        clearInterval(interval);
        setDraftStep("complete");
        setSpinningBucket(null);
      }
    }, 450);
  };

  const confirmSeasonDraft = () => {
    if (draftedContestants.length < 12) return;

    const nextSeasonNum = seasons.length + 1;
    const newSeason: Season = {
      id: `season-${Date.now()}`,
      seasonNumber: nextSeasonNum,
      contestants: draftedContestants,
      isCompleted: false,
      draftDate: new Date().toLocaleDateString()
    };

    // Auto-select first contestant in workspace
    setSelectedContestantId(draftedContestants[0].country.id);

    // Persist
    const updatedSeasons = [...seasons, newSeason];
    saveSeasonsAndCurrent(updatedSeasons, newSeason);

    // Swap tab
    setDraftStep("idle");
    setDraftedContestants([]);
    setActiveTab("production");
    
    // Auto-generate the song for the first country to minimize initial loading
    generateContestantData(draftedContestants[0]);
  };

  // --- Static/PWA generation ---
  // This build is frontend-only so it can be deployed on free static hosts.
  // There is no Node/Express backend and no API key exposed in the browser.
  // Song profiles, image prompts and cover images are generated locally.
  const generateContestantData = async (contestant: Contestant) => {
    if (!currentSeason) return;
    setGeneratingSongId(contestant.country.id);

    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const fallbackData = getClientSideBackupSong(contestant.country);
      const songMetadata: SongMetadata = {
        artistName: fallbackData.artistName,
        artistBio: fallbackData.artistBio,
        songTitle: fallbackData.songTitle,
        lyrics: fallbackData.lyrics,
        genre: fallbackData.genre,
        bpm: fallbackData.bpm,
        vibe: fallbackData.vibe,
        instruments: fallbackData.instruments,
        vocals: fallbackData.vocals
      };

      const updatedContestants = currentSeason.contestants.map(c => {
        if (c.country.id === contestant.country.id) {
          return {
            ...c,
            song: songMetadata,
            photoSuggestions: fallbackData.photoCategories
          };
        }
        return c;
      });

      const updatedSeason = { ...currentSeason, contestants: updatedContestants };
      const updatedSeasons = seasons.map(s => s.id === currentSeason.id ? updatedSeason : s);
      saveSeasonsAndCurrent(updatedSeasons, updatedSeason);
    } finally {
      setGeneratingSongId(null);
    }
  };

  const generateAIPhoto = async (contestant: Contestant, promptText: string) => {
    if (!currentSeason) return;
    setGeneratingPhotoPrompt(promptText);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const fallbackImageUrl = generateClientSideSvg(contestant.country.name, promptText);
      
      const updatedContestants = currentSeason.contestants.map(c => {
        if (c.country.id === contestant.country.id) {
          const updatedPhotos = {
            ...c.generatedPhotos,
            [promptText]: fallbackImageUrl
          };
          return {
            ...c,
            generatedPhotos: updatedPhotos,
            selectedPhoto: fallbackImageUrl
          };
        }
        return c;
      });

      const updatedSeason = { ...currentSeason, contestants: updatedContestants };
      const updatedSeasons = seasons.map(s => s.id === currentSeason.id ? updatedSeason : s);
      saveSeasonsAndCurrent(updatedSeasons, updatedSeason);
    } finally {
      setGeneratingPhotoPrompt(null);
    }
  };

  // Helper for batch-generation of all missing songs in a season
  const batchGenerateEmptySongs = async () => {
    if (!currentSeason) return;
    
    // Filter down to contestants requiring generation
    const missing = currentSeason.contestants.filter(c => !c.song);
    
    for (const contestant of missing) {
      await generateContestantData(contestant);
    }
  };

  // --- Interactive Voting Scoreboard Simulator ---
  const currentSelectedContestant = currentSeason?.contestants.find(c => c.country.id === selectedContestantId);

  // Initialize the voting matrix
  const startScoreboardVoting = () => {
    if (!currentSeason) return;

    // Check if everyone has a song generated first. If not, generate mock metadata
    // so we can simulate immediately without errors.
    const sanitizedContestants = currentSeason.contestants.map(c => {
      if (!c.song) {
        return {
          ...c,
          song: {
            artistName: `AI_${c.country.name.replace(/\s+/g, "")}`,
            artistBio: "Generated for competition simulation.",
            songTitle: `The Flame of ${c.country.name}`,
            lyrics: "[Chorus]\nSinging for freedom!",
            genre: "Synth-Pop",
            bpm: 120,
            vibe: "Radiant",
            instruments: ["Sub Synth"],
            vocals: "Cleans"
          },
          score: 0,
          votesGiven: {}
        };
      }
      return { ...c, score: 0, votesGiven: {} };
    });

    // Simulate voting distribution for all 12 contestants
    // Each contestant awards: 12, 10, 8, 7, 6, 5, 4, 3, 2, 1 to 10 other countries.
    const voters = sanitizedContestants.map(v => v.country.id);
    const votesPoints = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

    const fullyVotedContestants = sanitizedContestants.map(subject => {
      const recipientPool = voters.filter(id => id !== subject.country.id);
      
      // Inject some slight bias (e.g., countries from the same geographic region are 25% more likely to rank each other higher)
      const rankedPool = recipientPool.map(recipientId => {
        const recipient = sanitizedContestants.find(c => c.country.id === recipientId);
        let weight = Math.random();
        if (recipient && recipient.country.region === subject.country.region) {
          weight += 0.35; // friendly neighborhood bias
        }
        return { id: recipientId, weight };
      });

      // Sort by weighted bias and assign fixed points
      rankedPool.sort((a, b) => b.weight - a.weight);

      const votesGiven: Record<string, number> = {};
      votesPoints.forEach((points, index) => {
        const recipient = rankedPool[index];
        if (recipient) {
          votesGiven[recipient.id] = points;
        }
      });

      return {
        ...subject,
        votesGiven
      };
    });

    const refreshedSeason: Season = {
      ...currentSeason,
      contestants: fullyVotedContestants,
      isCompleted: false,
      winnerCountryId: undefined
    };

    saveSeasonsAndCurrent(seasons.map(s => s.id === currentSeason.id ? refreshedSeason : s), refreshedSeason);
    setVoterIndex(0);
    setVotingLog([]);
    setVotingState("running");
  };

  // Perform single spokesperson point declaration step
  const executeSpokespersonTurn = () => {
    if (!currentSeason || votingState !== "running") return;
    if (voterIndex >= currentSeason.contestants.length) {
      declareWinnerOfTheSeason();
      return;
    }

    const currentVoter = currentSeason.contestants[voterIndex];
    const votes = currentVoter.votesGiven || {};

    // Apply the spokesperson points to corresponding contestants
    const updatedContestants = currentSeason.contestants.map(c => {
      const incoming = votes[c.country.id] || 0;
      return {
        ...c,
        score: (c.score || 0) + incoming
      };
    });

    // Capture log lines for 12, 10 and 8 points
    const newLogs: {from: string, flag: string, points: number, to: string}[] = [];
    Object.entries(votes).forEach(([recipientId, pts]) => {
      if (pts === 12 || pts === 10 || pts === 8) {
        const recipient = currentSeason.contestants.find(c => c.country.id === recipientId);
        if (recipient) {
          newLogs.push({
            from: currentVoter.country.name,
            flag: currentVoter.country.flag,
            points: pts,
            to: recipient.country.name
          });
        }
      }
    });

    // Sort logs descending so 12-points is declared highlighted
    newLogs.sort((a, b) => b.points - a.points);

    const updatedSeason: Season = {
      ...currentSeason,
      contestants: updatedContestants
    };

    setVotingLog(prev => [...newLogs, ...prev].slice(0, 18)); // hold top 18 logs
    saveSeasonsAndCurrent(seasons.map(s => s.id === currentSeason.id ? updatedSeason : s), updatedSeason);

    if (voterIndex + 1 >= currentSeason.contestants.length) {
      setVotingState("finished");
      // Select the winner
      const sorted = [...updatedContestants].sort((a, b) => (b.score || 0) - (a.score || 0));
      const winner = sorted[0];
      const completedSeason: Season = {
        ...updatedSeason,
        isCompleted: true,
        winnerCountryId: winner?.country.id
      };
      saveSeasonsAndCurrent(seasons.map(s => s.id === currentSeason.id ? completedSeason : s), completedSeason);
    } else {
      setVoterIndex(prev => prev + 1);
    }
  };

  // Auto progression trigger
  useEffect(() => {
    let timer: any = null;
    if (votingState === "running" && autoProgress) {
      timer = setInterval(() => {
        executeSpokespersonTurn();
      }, votingSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [votingState, voterIndex, autoProgress, votingSpeed, currentSeason]);

  const declareWinnerOfTheSeason = () => {
    setVotingState("finished");
  };

  // Reset/Re-simulate Voting Board
  const resetSimulationPoints = () => {
    if (!currentSeason) return;
    const resetContestants = currentSeason.contestants.map(c => ({
      ...c,
      score: 0,
      votesGiven: {}
    }));
    const updatedSeason = {
      ...currentSeason,
      contestants: resetContestants,
      isCompleted: false,
      winnerCountryId: undefined
    };
    setVoterIndex(0);
    setVotingLog([]);
    setVotingState("idle");
    saveSeasonsAndCurrent(seasons.map(s => s.id === currentSeason.id ? updatedSeason : s), updatedSeason);
  };

  // Copy helper
  const handleCopyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(identifier);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Get current scoreboard sort
  const sortedScoreboard = currentSeason?.contestants
    ? [...currentSeason.contestants].sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];

  const winningContestant = currentSeason?.contestants.find(c => c.country.id === currentSeason.winnerCountryId);

  // Generate YouTube Descriptions and tags
  const getExportTitle = () => {
    if (!currentSeason) return "AI Eurovision Song Contest - World Grand Prix Atles";
    const winnerName = winningContestant?.country.name || "A surprise contender";
    const winnerSong = winningContestant?.song?.songTitle || "Cyber Anthem";
    const year = new Date().getFullYear();

    if (youtubeHookStyle === "shock") {
      return `I ran an AI EUROVISION with EVERY Country and ${winningContestant?.country.flag} ${winnerName} SHOCKED the World! 😱`;
    } else if (youtubeHookStyle === "narrative") {
      return `Atles World Song Contest Season ${currentSeason.seasonNumber} - The Ultimate AI Eurovision Finals 🏆`;
    } else {
      return `AI Eurovision Song Contest: ${winnerName} Wins with "${winnerSong}" (${genreFrequencyDisplay()})`;
    }
  };

  const genreFrequencyDisplay = () => {
    const genres = currentSeason?.contestants.map(c => c.song?.genre || "Synth").filter(Boolean) || [];
    return Array.from(new Set(genres)).slice(0, 2).join("/");
  };

  const getExportDescription = () => {
    if (!currentSeason) return "";
    const contestantList = currentSeason.contestants
      .map((c, i) => `${i + 1}. ${c.country.flag} ${c.country.name} - ${c.song?.artistName || "TBD"} ("${c.song?.songTitle || "TBD"}")`)
      .join("\n");

    const scoreboardText = sortedScoreboard
      .map((c, idx) => `Rank #${idx + 1} - ${c.country.flag} ${c.country.name}: ${c.score || 0} Points (${c.song?.genre || "Unknown"})`)
      .join("\n");

    const desc = `Welcome to Season ${currentSeason.seasonNumber} of the Atles Grand Prix - the ultimate artificial-intelligence generated World Eurovision Song Contest! 

In this video, 12 countries drafted from major powerhouses, regional contenders, rising stars, and micro-nations compete in an epic clash of synthesized melodies, custom AI songwriting, and digital vocals! 

Let us know in the comments: Do you agree with the votes given by the spokespersons, or was your favorite country robbed?! 🗳️

TIMESTAMPS:
00:00 - Introduction & Rules of Atles
01:15 - The Country Draft Selection
02:30 - National Submissions & Tracks
07:45 - The Grand Finale Jury Voting
11:55 - Final Standings & Trophy Ceremony
13:10 - Outro & Upcoming Season Teaser

COMPETING CONTESTANTS:
${contestantList}

---

THE FINAL JURY LEADERBOARD:
${scoreboardText}

This video's audio, tracks, and performance elements were generated using leading language and media synthesis architectures on the Atles Music Framework. All visuals were directed and produced via our advanced design suggestions of accurately structured scenery representing each country.

#AIEurovision #AtlesSongContest #Eurovision${currentSeason.seasonNumber} #MusicSynthesizer #AIGeneratedArt`;
    return desc;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased selection:bg-fuchsia-500 selection:text-white pb-16 relative overflow-x-hidden">
      
      {/* Immersive UI ambient blur backdrops */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
      </div>

      {/* Primary Global Header in Immersive Studio styling */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 py-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                <span className="font-bold text-white text-xs">AT</span>
              </div>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                ATLES <span className="text-slate-500 font-medium">AI Eurovision Manager</span>
              </h1>
            </div>
          </div>

          {/* Quick Stats Panel */}
          {currentSeason && (
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span>Active: Season {currentSeason.seasonNumber}</span>
              <span className="text-slate-600">|</span>
              <span>{currentSeason.contestants.filter(c => c.song).length}/12 Songs Synthesized</span>
            </div>
          )}

          {/* Tab Navigation Controls */}
          <nav className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-full border border-slate-800 backdrop-blur-md">
            <button
              id="tab-seasons"
              onClick={() => setActiveTab("seasons")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === "seasons"
                  ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Layout className="inline-block w-3.5 h-3.5 mr-1.5" />
              My Seasons
            </button>
            
            <button
              id="tab-draft"
              onClick={() => {
                setActiveTab("draft");
                if (draftStep === "idle") triggerBrandNewDraft();
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === "draft"
                  ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5" />
              Draft Stage
            </button>

            {currentSeason && (
              <>
                <button
                  id="tab-prod"
                  onClick={() => setActiveTab("production")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === "production"
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Music className="inline-block w-3.5 h-3.5 mr-1.5" />
                  Production Hub
                </button>

                <button
                  id="tab-sim"
                  onClick={() => {
                    setActiveTab("voting");
                    if (votingState === "idle") resetSimulationPoints();
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === "voting"
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Tv className="inline-block w-3.5 h-3.5 mr-1.5" />
                  Scoreboard Live
                </button>

                <button
                  id="tab-yt"
                  onClick={() => setActiveTab("youtube")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === "youtube"
                      ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Youtube className="inline-block w-3.5 h-3.5 mr-1.5" />
                  YouTube Kit
                </button>
              </>
            )}
          </nav>

        </div>
      </header>


      {/* Main Content Region */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* ==================== TAB 1: SEASONS OVERVIEW ==================== */}
        {activeTab === "seasons" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Elegant Hero Pitch */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900/30 backdrop-blur-md border border-slate-800 p-8 md:p-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
              
              <div className="max-w-2xl relative z-10">
                <div className="inline-flex items-center gap-2 bg-slate-900 text-teal-400 font-mono text-xs px-3 py-1 rounded-full border border-slate-800 mb-6">
                  <Flame className="w-3.5 h-3.5 animate-pulse text-fuchsia-500" />
                  Global Broadcast Strategy Engine
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white tracking-tight">
                  Elevating AI Music Contests for the Global YouTube Stage
                </h2>
                <p className="text-slate-400 mt-4 leading-relaxed text-sm md:text-base">
                  Welcome to <strong className="text-slate-200">Atles</strong>! In this workspace, you can manage the grandest AI simulated music contest in the world. Program custom songs, generate distinct localized photo recommendations, simulate spectacular point integrations, and package descriptions and tags for premium YouTube video uploads.
                </p>

                <div className="flex flex-wrap gap-4 mt-8">
                  <button
                    id="btn-create-season-main"
                    onClick={() => {
                      setActiveTab("draft");
                      triggerBrandNewDraft();
                    }}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-fuchsia-500/20 flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Draft a New Season
                  </button>
                  {currentSeason && (
                    <button
                      id="btn-resume-workspace"
                      onClick={() => setActiveTab("production")}
                      className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 flex items-center gap-2 transition"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                      Resume Active Season {currentSeason.seasonNumber}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Historic Dashboard Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: List of seasons */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-fuchsia-400" />
                  Your Eurovision Archive ({seasons.length} Seasons)
                </h3>

                {seasons.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 bg-[#0a0e1a]/40">
                    <Layout className="w-12 h-12 mx-auto stroke-slate-600 mb-4" />
                    <p className="text-sm font-semibold text-slate-400">No seasons compiled yet</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">Click "Draft a New Season" above to trigger your first balanced contestant pool spin!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {seasons.map(season => {
                      const pointsSorted = [...season.contestants].sort((a,b) => (b.score || 0) - (a.score || 0));
                      const winContestant = season.contestants.find(c => c.country.id === season.winnerCountryId);
                      
                      return (
                        <div
                          key={season.id}
                          className={`group relative rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                            currentSeason?.id === season.id
                              ? "bg-fuchsia-500/5 border-fuchsia-500/30 shadow-lg shadow-fuchsia-950/10"
                              : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-display">
                                Season {season.seasonNumber}
                              </span>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                {season.draftDate}
                              </span>
                              {currentSeason?.id === season.id && (
                                <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  In Production
                                </span>
                              )}
                            </div>
                            
                            {/* Contestant small Flags line */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-slate-400 mr-1">Lineup:</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {season.contestants.map(c => (
                                  <span
                                    key={c.country.id}
                                    title={c.country.name}
                                    className="inline-block text-base p-0.5 rounded bg-slate-900 border border-slate-800"
                                  >
                                    {c.country.flag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                            {season.isCompleted && winContestant ? (
                              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-400">
                                <Trophy className="w-3.5 h-3.5 animate-bounce" />
                                <span>Champion: {winContestant.country.flag} {winContestant.country.name} ({winContestant.score}pts)</span>
                              </div>
                            ) : (
                              <div className="text-xs font-mono text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded">
                                Pending Finals Simulation
                              </div>
                            )}

                            <button
                              id={`select-season-${season.id}`}
                              onClick={() => {
                                setCurrentSeason(season);
                                // default select first
                                setSelectedContestantId(season.contestants[0].country.id);
                                saveSeasonsAndCurrent(seasons, season);
                                setActiveTab("production");
                              }}
                              className="px-3 py-1.5 rounded bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition font-mono text-xs flex items-center gap-1 ml-auto"
                            >
                              Manage
                              <ChevronRight className="w-3 h-3 text-slate-400Group-hover:translate-x-0.5 transition" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic summary card */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-500" />
                  Studio Guidelines & Statistics
                </h3>
                
                <div className="bg-[#101626]/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
                  <div className="border-b border-slate-800 pb-3">
                    <p className="font-semibold text-slate-200 uppercase font-mono tracking-wider">Balanced Buckets Mechanism</p>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      Every season features exactly 12 contestants. Our specialized draft algorithm draws exactly <span className="text-white">3 powerhouses</span>, <span className="text-white">3 regional leaders</span>, <span className="text-white">3 rising stars</span>, and <span className="text-white">3 micro-nations</span>. This prevents smaller, charming microstates like San Marino or Andorra from overloading a single season, maintaining maximum suspense for your subscriber base.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#080c16] rounded p-2.5 border border-slate-800/60">
                      <span className="text-slate-400 block font-mono text-[10px]">TOTAL SEASONS</span>
                      <span className="text-xl font-bold font-display text-white">{seasons.length}</span>
                    </div>
                    <div className="bg-[#080c16] rounded p-2.5 border border-slate-800/60">
                      <span className="text-slate-400 block font-mono text-[10px]">GLOBAL COUNTRIES</span>
                      <span className="text-xl font-bold font-display text-white">{ALL_COUNTRIES.length}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-3 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex gap-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      Toggle between the different tabs above at any time to manage current contestant details, design personalized covers, review live scores, and bundle outputs for recording sessions.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* ==================== TAB 2: ACTIVE DRAFT SPINNER ==================== */}
        {activeTab === "draft" && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-8 text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 shadow-md shadow-fuchsia-500/20" />
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-white">
                  Contestant Selector Board
                </h2>
                <p className="text-xs text-slate-400 max-w-lg mx-auto font-mono">
                  Synthesizing balanced participant lineups for optimal YouTube video retention. Drawing 3 random representatives across 4 major capacity buckets.
                </p>
              </div>

              {/* Graphical representation of Buckets */}
              <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                {[
                  { name: "Powerhouses", color: "from-fuchsia-500 to-rose-600", count: 3, bucket: CountryBucket.POWERHOUSE },
                  { name: "Regionals", color: "from-violet-500 to-indigo-600", count: 3, bucket: CountryBucket.REGIONAL },
                  { name: "Rising Stars", color: "from-amber-500 to-yellow-600", count: 3, bucket: CountryBucket.RISING_STAR },
                  { name: "Micro-Nations", color: "from-teal-500 to-emerald-600", count: 3, bucket: CountryBucket.MICRO_NATION },
                ].map(b => (
                  <div key={b.name} className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block tracking-wider">
                        {b.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {ALL_COUNTRIES.filter(c => c.bucket === b.bucket).length} in pool
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/50">
                      <span className="text-xs font-mono font-bold text-white">DRAW: {b.count}</span>
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${b.color} ${spinningBucket === b.bucket ? "animate-pulse" : ""}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* The Spinning Draft Wheel Screen */}
              <div className="relative py-12 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm mx-auto overflow-hidden max-w-xl shadow-inner">
                {draftStep === "drawing" && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <RefreshCw className="w-10 h-10 text-fuchsia-500 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-slate-400">
                        Querying bucket directories...
                      </p>
                      <p className="text-sm font-display font-medium text-white tracking-widest uppercase">
                        Active Draw: {spinningBucket || "Selecting..."}
                      </p>
                    </div>
                  </div>
                )}

                {draftStep === "idle" && (
                  <div className="py-8 space-y-4">
                    <div className="text-4xl">🗳️</div>
                    <p className="text-sm text-slate-400 font-mono">
                      Lineup completely clear. Ready for dynamic trigger.
                    </p>
                    <button
                      id="btn-spin-trigger"
                      onClick={triggerBrandNewDraft}
                      className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-fuchsia-500/20 hover:brightness-110 active:scale-95 transition"
                    >
                      DRAFT SEASON
                    </button>
                  </div>
                )}

                {draftStep === "complete" && (
                  <div className="space-y-4">
                    <div className="text-4xl text-teal-400">✨</div>
                    <p className="text-sm text-teal-400 font-semibold uppercase tracking-wider font-display">
                      Season Lineup Successfully Generated!
                    </p>
                    <button
                      id="btn-confirm-draft"
                      onClick={confirmSeasonDraft}
                      className="px-8 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs font-mono uppercase tracking-widest shadow-lg shadow-teal-950/25 transition"
                    >
                      Confirm Lineup & Initialize Production Suite
                    </button>
                  </div>
                )}
              </div>

              {/* Live Draft Board Grid */}
              {draftedContestants.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-slate-900">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest text-left">
                    Draft Output Logs ({draftedContestants.length}/12)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {draftedContestants.map((cont, idx) => (
                      <div
                        key={cont.country.id}
                        className="bg-[#0b0f19] border border-slate-800 p-3 rounded-lg text-left flex items-center gap-2.5 animate-scale-up"
                      >
                        <span className="text-xl">{cont.country.flag}</span>
                        <div className="overflow-hidden">
                          <span className="text-xs font-semibold text-white block truncate">
                            {cont.country.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {cont.country.bucket.replace("_", " ")}
                          </span>
                        </div>
                        <span className="ml-auto text-xs font-mono font-bold text-indigo-400">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}


        {/* ==================== TAB 3: CONTESTANT HUB (PRODUCTION WORKSPACE) ==================== */}
        {activeTab === "production" && currentSeason && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Split layout: left sidebar with drafted list, right main workspace details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Sidebar (Contestant selector menu) */}
              <div className="lg:col-span-4 bg-[#090e1a]/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    DRAFTED CONTESTANTS
                  </h3>
                  <button
                    id="btn-batch-songs"
                    onClick={batchGenerateEmptySongs}
                    className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-500/30"
                    title="Generate AI song profiles for all selected countries in this season"
                  >
                    Batch AI
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {currentSeason.contestants.map(cont => {
                    const hasSong = !!cont.song;
                    const isSelected = cont.country.id === selectedContestantId;

                    return (
                      <button
                        key={cont.country.id}
                        id={`select-country-${cont.country.id}`}
                        onClick={() => setSelectedContestantId(cont.country.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-white font-semibold scale-[1.01] shadow-lg shadow-fuchsia-900/20"
                            : "bg-slate-900/30 border-slate-800/80 hover:bg-slate-800/50 text-slate-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{cont.country.flag}</span>
                          <div className="truncate">
                            <span className="text-white font-semibold block">{cont.country.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 block truncate uppercase">
                              {cont.country.bucket.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasSong ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" title="Song metadata fully ready" />
                          ) : (
                            <span className="text-[10px] font-mono text-fuchsia-400 px-1.5 py-0.5 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20" title="Requires simulation generation">
                              DRAFT
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-fuchsia-400 translate-x-0.5" : "text-slate-600"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    id="btn-re-draft"
                    onClick={() => {
                      setActiveTab("draft");
                      triggerBrandNewDraft();
                    }}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono rounded"
                  >
                    Re-draw balanced countries pool
                  </button>
                </div>
              </div>

              {/* Right Main Details Workspace Screen */}
              <div className="lg:col-span-8 space-y-6">
                
                {currentSelectedContestant ? (
                  <div className="space-y-6">
                    
                    {/* Top contestant visual banner */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 flex flex-col md:flex-row gap-6 shadow-xl shadow-fuchsia-950/5">
                      
                      {/* Album cover / Cover visual with elegant gradient trim border */}
                      <div className="w-full md:w-36 h-36 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 p-0.5 relative shrink-0 overflow-hidden flex items-center justify-center group shadow-md shadow-fuchsia-950/20">
                        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
                          {currentSelectedContestant.selectedPhoto ? (
                            <img
                              src={currentSelectedContestant.selectedPhoto}
                              alt={`${currentSelectedContestant.country.name} album cover`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="p-4 text-center space-y-2 text-slate-600 shrink-0">
                              <ImageIcon className="w-8 h-8 mx-auto stroke-slate-700" />
                              <span className="text-[10px] font-mono block text-slate-500">No cover art selected</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Shimmer cover progress */}
                        {generatingPhotoPrompt && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center rounded-[10px]">
                            <RefreshCw className="w-5 h-5 text-fuchsia-400 animate-spin" />
                            <span className="text-[9.5px] font-mono text-fuchsia-400 mt-2">AI Generating...</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-300 px-3 py-1 rounded-full text-xs font-mono border border-slate-800">
                          <span>{currentSelectedContestant.country.flag}</span>
                          <span>{currentSelectedContestant.country.name}</span>
                          <span className="text-slate-700">•</span>
                          <span className="text-fuchsia-400 font-semibold">{currentSelectedContestant.country.region}</span>
                        </div>
                        
                        {currentSelectedContestant.song ? (
                          <>
                            <h2 className="text-2xl font-display font-extrabold text-white leading-tight">
                              {currentSelectedContestant.song.songTitle}
                            </h2>
                            <p className="text-sm text-fuchsia-400 font-mono font-medium flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              Artist: {currentSelectedContestant.song.artistName}
                            </p>
                            <p className="text-[11.5px] text-slate-400 leading-relaxed italic max-w-xl">
                              "{currentSelectedContestant.song.artistBio}"
                            </p>
                          </>
                        ) : (
                          <div className="py-2.5">
                            <p className="text-sm font-semibold text-slate-400">AIC submissions are waiting for synthesis!</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">Click the generation trigger below to run dynamic songwriting analysis.</p>
                          </div>
                        )}
                      </div>

                      {/* Top Action panel (Audio synthetic Player) */}
                      {currentSelectedContestant.song && (
                        <div className="md:self-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 shrink-0 text-center">
                          <button
                            id={`playback-toggle-${currentSelectedContestant.country.id}`}
                            onClick={() => toggleSynthPlayback(currentSelectedContestant)}
                            className={`h-14 w-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                              playingSongId === currentSelectedContestant.country.id
                                ? "bg-fuchsia-500 shadow-lg shadow-fuchsia-500/30 transform scale-105"
                                : "bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:brightness-110 shadow-lg shadow-fuchsia-500/20"
                            }`}
                            title="Play Synth Arpeggiator Demo Loop"
                          >
                            {playingSongId === currentSelectedContestant.country.id ? (
                              <Pause className="w-6 h-6 fill-white" />
                            ) : (
                              <Play className="w-6 h-6 fill-white ml-1" />
                            )}
                          </button>
                          
                          <span className="text-[9px] font-mono text-slate-400 block mt-2">
                            {playingSongId === currentSelectedContestant.country.id ? "MUTING OFF" : "HEAR AI LOOP"}
                          </span>

                          {/* Sound wave graphics animation */}
                          <div className="flex justify-center items-end gap-0.5 h-4 mt-2">
                            {visualizerHeights.map((h, i) => (
                              <div
                                key={i}
                                style={{ height: `${h}px` }}
                                className="w-0.5 bg-gradient-to-t from-rose-500 to-indigo-400 rounded-sm transition-all duration-100"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* AI Generator Trigger */}
                    {!currentSelectedContestant.song && (
                      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-8 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 items-center justify-center flex mx-auto">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-white font-semibold font-display">Generate Contestant Profile Data</h4>
                          <p className="text-xs text-slate-500 font-mono max-w-sm mx-auto">
                            Queries AI models for an original artist, backstory, BPM tempo rhythm, lyrical refrains in native dialect, and 60 photographic item suggestions.
                          </p>
                        </div>
                        <button
                          id={`btn-generate-ai-${currentSelectedContestant.country.id}`}
                          onClick={() => generateContestantData(currentSelectedContestant)}
                          disabled={generatingSongId === currentSelectedContestant.country.id}
                          className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-mono text-xs uppercase tracking-wider font-bold shadow hover:brightness-110 transition disabled:opacity-50"
                        >
                          {generatingSongId === currentSelectedContestant.country.id ? (
                            <span className="flex items-center gap-1.5 justify-center">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Synthesizing...
                            </span>
                          ) : (
                            "Trigger AI Generation"
                          )}
                        </button>
                      </div>
                    )}

                    {/* Meta parameter columns + lyrics */}
                    {currentSelectedContestant.song && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Audio metadata spec card */}
                        <div className="bg-[#090e1a]/80 border border-slate-800 rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                            <Sliders className="w-3.5 h-3.5 text-rose-500" />
                            Digital Music Specifications
                          </h3>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-[#070b14] border border-slate-800/50 p-3 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[10px]">THEME GENRE</span>
                              <span className="font-semibold text-white block mt-0.5">{currentSelectedContestant.song.genre}</span>
                            </div>
                            <div className="bg-[#070b14] border border-slate-800/50 p-3 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[10px]">TEMPO SCALE</span>
                              <span className="font-semibold text-teal-400 block mt-0.5 font-mono">{currentSelectedContestant.song.bpm} BPM</span>
                            </div>
                            <div className="bg-[#070b14] border border-slate-800/50 p-3 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[10px]">ARRANGEMENT VIBE</span>
                              <span className="font-semibold text-indigo-400 block mt-0.5">{currentSelectedContestant.song.vibe}</span>
                            </div>
                            <div className="bg-[#070b14] border border-slate-800/50 p-3 rounded-lg">
                              <span className="text-slate-500 block font-mono text-[10px]">VOCAL ARCHITECTURE</span>
                              <span className="font-semibold text-slate-300 block mt-0.5 truncate">{currentSelectedContestant.song.vocals}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs bg-[#070b14] border border-slate-800/60 p-3.5 rounded-lg">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Soundboard Instrumentation</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {currentSelectedContestant.song.instruments.map(inst => (
                                <span key={inst} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                                  {inst}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Song lyrics card */}
                        <div className="bg-[#090e1a]/80 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                Interactive Lyrics Book
                              </h3>
                              <button
                                id={`copy-lyrics-${currentSelectedContestant.country.id}`}
                                onClick={() => handleCopyToClipboard(currentSelectedContestant.song?.lyrics || "", "lyrics")}
                                className="text-slate-500 hover:text-white font-mono text-[10px] flex items-center gap-1"
                              >
                                {copiedText === "lyrics" ? (
                                  <>
                                    <Check className="w-3 h-3 text-teal-400" />
                                    <span className="text-teal-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Lyrics</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Lyrics viewer container */}
                            <div className="font-mono text-[11px] text-slate-300 leading-relaxed bg-[#070b14] border border-slate-800/50 p-3.5 rounded-lg h-44 overflow-y-auto whitespace-pre-line text-left">
                              {currentSelectedContestant.song.lyrics}
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-550 leading-tight italic mt-2 text-slate-500">
                            Eurovision regulations mandates that songs contain elements of national heritage dialects. High-spirit native parts are embedded as refrains.
                          </p>
                        </div>

                      </div>
                    )}

                    {/* Spectacular Photograph Suggestions Board: 60 items */}
                    {currentSelectedContestant.photoSuggestions && currentSelectedContestant.photoSuggestions.length > 0 && (
                      <div className="bg-[#090e1a]/80 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div>
                            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                              Visual Media Guide: 60 Photographic AI Suggestions
                            </h3>
                            <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                              Mix of landscapes, architectural monuments, and cultural heritage to accurately capture representing aesthetics.
                            </p>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search prompts..."
                              value={photoSearchQuery}
                              onChange={(e) => setPhotoSearchQuery(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono w-44"
                            />
                          </div>
                        </div>

                        {/* Iterate on categorized categories */}
                        <div className="space-y-6">
                          {currentSelectedContestant.photoSuggestions.map(cat => {
                            // Filter suggestions
                            const filtered = cat.suggestions.filter(s =>
                              s.toLowerCase().includes(photoSearchQuery.toLowerCase())
                            );

                            if (filtered.length === 0) return null;

                            return (
                              <div key={cat.category} className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-300 font-display flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                  {cat.category}
                                  <span className="text-[10px] text-slate-500 font-mono font-normal">
                                    ({filtered.length} matching)
                                  </span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {filtered.map((suggestion, sIdx) => {
                                    const isGeneratingThis = generatingPhotoPrompt === suggestion;
                                    const hasGeneratedThis = !!currentSelectedContestant.generatedPhotos[suggestion];
                                    const isActiveCover = currentSelectedContestant.selectedPhoto === currentSelectedContestant.generatedPhotos[suggestion] && hasGeneratedThis;

                                    return (
                                      <div
                                        key={sIdx}
                                        className={`p-3 d-flex flex-col justify-between border rounded-lg text-left text-xs transition-all relative ${
                                          isActiveCover
                                            ? "bg-indigo-950/20 border-indigo-500 shadow-lg shadow-indigo-950/20"
                                            : hasGeneratedThis
                                            ? "bg-slate-900/30 border-slate-700 hover:border-slate-550"
                                            : "bg-[#070b14]/50 border-slate-850 hover:bg-slate-900/40 border-slate-800/60"
                                        }`}
                                      >
                                        <p className="text-slate-400 text-[11px] leading-relaxed mb-3 italic">
                                          "{suggestion}"
                                        </p>

                                        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-800/60 justify-between">
                                          
                                          {/* Set as cover action if present */}
                                          {hasGeneratedThis ? (
                                            <div className="flex items-center gap-1">
                                              <button
                                                id={`btn-set-cover-${sIdx}`}
                                                onClick={() => {
                                                  // set as cover art
                                                  const updatedConts = currentSeason.contestants.map(c => {
                                                    if (c.country.id === currentSelectedContestant.country.id) {
                                                      return {
                                                        ...c,
                                                        selectedPhoto: c.generatedPhotos[suggestion]
                                                      };
                                                    }
                                                    return c;
                                                  });
                                                  const sUpdated = { ...currentSeason, contestants: updatedConts };
                                                  saveSeasonsAndCurrent(seasons.map(s => s.id === currentSeason.id ? sUpdated : s), sUpdated);
                                                }}
                                                className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                                                  isActiveCover
                                                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 font-semibold"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                                }`}
                                              >
                                                {isActiveCover ? "Active Cover" : "Select Cover"}
                                              </button>
                                              
                                              {/* Image preview indicator */}
                                              <span
                                                className="h-5 w-5 rounded border border-slate-800 cursor-pointer overflow-hidden bg-slate-900 shrink-0 inline-block align-middle"
                                                onClick={() => {
                                                  // trigger preview in main image
                                                  const pUrl = currentSelectedContestant.generatedPhotos[suggestion];
                                                  // open/focus/preview
                                                }}
                                                title="View Generated Image Thumbnail"
                                              >
                                                <img
                                                  src={currentSelectedContestant.generatedPhotos[suggestion]}
                                                  alt="thumbnail preview"
                                                  className="w-full h-full object-cover"
                                                  referrerPolicy="no-referrer"
                                                />
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] font-mono text-slate-500">
                                              Not Generated Yet
                                            </span>
                                          )}

                                          <button
                                            id={`btn-build-img-${sIdx}`}
                                            onClick={() => generateAIPhoto(currentSelectedContestant, suggestion)}
                                            disabled={!!generatingPhotoPrompt}
                                            className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition ${
                                              hasGeneratedThis
                                                ? "bg-slate-800 hover:bg-slate-750 text-slate-400"
                                                : "bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-400 border border-indigo-600/30"
                                            }`}
                                          >
                                            {isGeneratingThis ? (
                                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                                            ) : (
                                              <Sparkles className="w-3 h-3" />
                                            )}
                                            {hasGeneratedThis ? "Re-Generate Cover" : "Produce Art"}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="bg-[#090e1a]/85 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                    <Music className="w-12 h-12 mx-auto stroke-slate-700 mb-3" />
                    <p className="font-semibold text-slate-400">Loading Active Contestant Session ...</p>
                    <p className="text-xs text-slate-600 font-mono mt-1">Make sure you have drafted a pool selection first!</p>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}


        {/* ==================== TAB 4: SCOREBOARD LEADERBOARD LIVE WORKSPACE ==================== */}
        {activeTab === "voting" && currentSeason && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 shadow-md shadow-fuchsia-500/20" />

              {/* Top simulation manager layout */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
                    <Tv className="w-6 h-6 text-fuchsia-500" />
                    Atles World Grand Prix Scoreboard Selector
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Live television sequence running simulated juror points (12, 10, 8 to 1 points). Blends geographical and style patterns.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {votingState === "idle" && (
                    <button
                      id="btn-start-votes-sim"
                      onClick={startScoreboardVoting}
                      className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:brightness-110 text-white font-semibold text-xs font-mono uppercase tracking-wider shadow rounded-full transition-all active:scale-95 duration-150"
                    >
                      Start Live Voting
                    </button>
                  )}

                  {votingState === "running" && (
                    <>
                      <button
                        id="btn-single-step-vote"
                        onClick={executeSpokespersonTurn}
                        className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs font-mono"
                      >
                        Declare Juror Step ({voterIndex + 1}/12)
                      </button>

                      <button
                        id="btn-auto-toggle"
                        onClick={() => setAutoProgress(!autoProgress)}
                        className={`px-4 py-2 rounded font-semibold text-xs font-mono transition ${
                          autoProgress ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-350 hover:bg-slate-700"
                        }`}
                      >
                        {autoProgress ? "Auto Progress: ON" : "Auto Progress: OFF"}
                      </button>

                      <select
                        value={votingSpeed}
                        onChange={(e) => setVotingSpeed(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-300 font-mono"
                      >
                        <option value={1500}>Speed: Normal (1.5s)</option>
                        <option value={750}>Speed: Fast (0.75s)</option>
                        <option value={300}>Speed: Hyper (0.3s)</option>
                      </select>
                    </>
                  )}

                  {votingState === "finished" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-teal-400 font-medium">Competition Complete!</span>
                      <button
                        id="btn-reset-scoreboard"
                        onClick={resetSimulationPoints}
                        className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-705 text-white border border-slate-700 font-mono text-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Re-Simulate Board
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scoreboard interactive grid details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side: The Leaderboard Bars (8 columns) */}
                <div className="lg:col-span-8 space-y-3.5">
                  <div className="flex justify-between text-xs font-mono text-slate-500 uppercase tracking-widest px-2 pb-1.5 border-b border-slate-900">
                    <span>Rank & Competitor</span>
                    <span>Score / Points</span>
                  </div>

                  {sortedScoreboard.length === 0 ? (
                    <div className="bg-[#080c16]/50 border border-slate-850 p-12 text-center rounded-xl text-slate-550 italic text-sm">
                      Scoreboard is empty. Click "Start Live Voting" above to run regional jurors!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedScoreboard.map((contestant, index) => {
                        const rank = index + 1;
                        const score = contestant.score || 0;
                        const isWinner = votingState === "finished" && index === 0;
                        
                        // Find max score for relative bar sizing
                        const maxScore = Math.max(...sortedScoreboard.map(c => c.score || 0), 1);
                        const weightPercentage = Math.min((score / maxScore) * 100, 100);

                        return (
                          <div
                            key={contestant.country.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all duration-300 ${
                              isWinner
                                ? "bg-amber-500/10 border-amber-500/40 shadow shadow-amber-500/5"
                                : "bg-[#080c16]/80 border-slate-850 hover:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              
                              {/* Rank placement */}
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold shrink-0 ${
                                rank === 1
                                  ? "bg-amber-500/20 text-amber-400"
                                  : rank === 2
                                  ? "bg-slate-300/20 text-slate-300"
                                  : rank === 3
                                  ? "bg-amber-700/20 text-amber-600"
                                  : "bg-slate-900 text-slate-500"
                              }`}>
                                {rank}
                              </span>

                              <span className="text-lg shrink-0">{contestant.country.flag}</span>
                              
                              <div className="flex-1 min-w-0 pr-4">
                                <span className="font-semibold text-white block truncate">
                                  {contestant.country.name}
                                </span>
                                
                                <div className="flex items-center gap-2 mt-1">
                                  {/* Point bar backing */}
                                  <div className="flex-1 h-2 bg-slate-950 rounded overflow-hidden max-w-sm">
                                    <div
                                      style={{ width: `${weightPercentage}%` }}
                                      className={`h-full rounded-r transition-all duration-500 ${
                                        rank === 1
                                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                          : rank === 2
                                          ? "bg-gradient-to-r from-slate-300 to-slate-400"
                                          : "bg-gradient-to-r from-indigo-500 to-rose-500"
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                    {contestant.song?.artistName}
                                  </span>
                                </div>

                              </div>
                            </div>

                            {/* Score Display */}
                            <div className="text-right pl-3">
                              <span className={`font-mono text-sm font-bold block ${isWinner ? "text-amber-400" : "text-white"}`}>
                                {score}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 block uppercase">
                                Points
                              </span>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side: Spokesperson speech console and connection logs (4 columns) */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* Speaker card booth */}
                  <div className="bg-[#0b1021] border border-slate-800 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] font-mono text-rose-400 px-2 py-0.5 rounded bg-rose-500/5 border border-rose-550/10 uppercase tracking-widest inline-block select-none">
                      Broadcast Control
                    </span>
                    
                    {votingState === "running" && currentSeason?.contestants[voterIndex] && (
                      <div className="space-y-3.5">
                        <div className="bg-[#070b14] p-3 rounded-lg flex items-center gap-2.5 border border-slate-800">
                          <span className="text-3xl animate-bounce">{currentSeason.contestants[voterIndex].country.flag}</span>
                          <div className="overflow-hidden">
                            <span className="text-[10px] font-mono text-slate-500 block">SPOKESPERSON FOR</span>
                            <span className="text-xs font-bold font-display text-white block truncate">
                              {currentSeason.contestants[voterIndex].country.name.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#070b14]/90 p-3.5 rounded-lg border border-slate-850 italic text-xs text-slate-300 relative text-left">
                          <span className="absolute -top-2 left-4 px-1.5 text-[8px] font-mono font-bold bg-[#f43f5e] text-white rounded">
                            QUOTE
                          </span>
                          "Greetings Atles! The performances were spectacular tonight. Here is the decision of our sovereign jury... Our peak maximum twelve points go to..."
                        </div>
                      </div>
                    )}

                    {votingState === "finished" && winningContestant && (
                      <div className="space-y-3 text-center py-4">
                        <div className="text-5xl animate-bounce">🏆</div>
                        <h4 className="font-display font-extrabold text-amber-400 uppercase text-sm tracking-wider">
                          Winner Declared!
                        </h4>
                        <div className="bg-[#070b14] p-3 rounded-lg border border-slate-800 inline-flex items-center gap-2">
                          <span className="text-2xl">{winningContestant.country.flag}</span>
                          <span className="text-sm font-bold font-display text-white">{winningContestant.country.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic max-w-xs mx-auto">
                          "{winningContestant.song?.artistName}" dominates the grand finals of Atles with an astronomical {winningContestant.score} points!
                        </p>
                      </div>
                    )}

                    {votingState === "idle" && (
                      <div className="text-center py-8 text-slate-500 font-mono text-xs">
                        📡 Connection Idle.<br />Waiting for live voter dispatch trigger...
                      </div>
                    )}
                  </div>

                  {/* Real-time point logs Feed */}
                  <div className="bg-[#0b1021] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-left">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                      Points Declaration Stream
                    </h4>

                    {votingLog.length === 0 ? (
                      <div className="text-slate-600 font-mono text-[11px] py-4 text-center italic">
                        No scoreboard packages logged.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto font-mono text-[10.5px]">
                        {votingLog.map((log, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 py-1 border-b border-slate-900/40 last:border-b-0 ${
                              log.points === 12 ? "text-amber-400" : log.points === 10 ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            <span>{log.flag}</span>
                            <span className="truncate max-w-[80px] text-slate-450 text-[9.5px]" title={log.from}>
                              {log.from}
                            </span>
                            <span>→</span>
                            <span className="font-bold underline text-white">
                              {log.points}pts
                            </span>
                            <span>to</span>
                            <span className="truncate font-semibold text-slate-200">
                              {log.to}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}


        {/* ==================== TAB 5: YOUTUBE METADATA & EXPORTER WORKSPACE ==================== */}
        {activeTab === "youtube" && currentSeason && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 shadow-md shadow-fuchsia-500/20" />

              <div className="space-y-2">
                <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
                  <Youtube className="w-6 h-6 text-fuchsia-500" />
                  YouTube Content Exporter Package
                </h2>
                <p className="text-xs text-slate-400 font-mono max-w-xl">
                  Automated generation of highly retaining titles, timestamp descriptions, video tags and checklists to help record and publish your contest videos.
                </p>
              </div>

              {/* Split views: checklist & templates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual guidelines checklist (1 column) */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4 text-xs text-left">
                  <span className="text-[10px] font-mono text-fuchsia-450 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2.5 py-1 rounded inline-block text-fuchsia-400 uppercase font-semibold">
                    Producer Checklist
                  </span>

                  <ul className="space-y-3.5 text-slate-400 text-[11px] leading-relaxed">
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>
                        <strong>Cover Art Assets:</strong> Copy the generated AI scenery cover photos from your <strong className="text-slate-200">Production Hub</strong> to represent individual contestants in your video sequence slide.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>
                        <strong>Sound Sequence:</strong> Export the genre beats and loop tempos for the showcase stage. Match the BPM indices as reference.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>
                        <strong>Timeline Markers:</strong> Insert the generated timestamps into your YouTube upload box for automatic interactive chapters.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>
                        <strong>Audience Polling:</strong> Ask viewers in your community comments block to pinpoint which contestant was "robbed" or had the premier sound layout!
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Markdown text cards (2 columns) */}
                <div className="md:col-span-2 space-y-4">
                  
                  {/* Style selectors for title hook */}
                  <div className="flex gap-1.5 p-1 bg-slate-950/50 rounded-full border border-slate-805">
                    {[
                      { id: "shock", name: "Shock / Clickbait Title" },
                      { id: "narrative", name: "Narrative Title" },
                      { id: "technical", name: "Technical Title" },
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => setYoutubeHookStyle(style.id as any)}
                        className={`flex-1 py-1.5 text-[11px] font-mono font-medium rounded-full transition cursor-pointer ${
                          youtubeHookStyle === style.id
                            ? "bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400"
                            : "text-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>

                  {/* Title card */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                        Optimized Video Title
                      </span>
                      <button
                        id="btn-copy-title"
                        onClick={() => handleCopyToClipboard(getExportTitle(), "title")}
                        className="text-slate-500 hover:text-white font-mono text-[10px] flex items-center gap-1"
                      >
                        {copiedText === "title" ? (
                          <>
                            <Check className="w-3 h-3 text-teal-400" />
                            <span className="text-teal-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Title</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-white text-sm font-semibold selection:bg-rose-500 leading-tight">
                      {getExportTitle()}
                    </p>
                  </div>

                  {/* Description card */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                        Video Description Template
                      </span>
                      <button
                        id="btn-copy-desc"
                        onClick={() => handleCopyToClipboard(getExportDescription(), "desc")}
                        className="text-slate-500 hover:text-white font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText === "desc" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-teal-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Description</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-350 leading-relaxed font-mono overflow-y-auto h-64 pr-1 scrollbar bg-slate-950 p-3 rounded border border-slate-900 select-all">
                      {getExportDescription()}
                    </pre>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
