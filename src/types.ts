/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CountryBucket {
  POWERHOUSE = "POWERHOUSE",
  REGIONAL = "REGIONAL",
  RISING_STAR = "RISING_STAR",
  MICRO_NATION = "MICRO_NATION"
}

export interface Country {
  id: string;
  name: string;
  code: string; // ISO-like short code
  flag: string; // flag emoji
  bucket: CountryBucket;
  region: string;
}

export interface SongMetadata {
  artistName: string;
  artistBio: string;
  songTitle: string;
  lyrics: string; // Complete structured lyrics with Verse/Chorus/Bridge
  genre: string;
  bpm: number;
  vibe: string;
  instruments: string[];
  vocals: string;
}

export interface PhotoCategory {
  category: string; // e.g., "Landscape & Nature", "Landmarks & Icons"
  suggestions: string[]; // List of suggestions, sum of all must be exactly 60
}

export interface Contestant {
  country: Country;
  song?: SongMetadata;
  photoSuggestions?: PhotoCategory[];
  generatedPhotos: Record<string, string>; // suggestion prompt -> base64 or URL
  selectedPhoto?: string; // current active cover photo
  score?: number; // accumulated points in the current season
  votesGiven?: Record<string, number>; // other country id -> points given
}

export interface Season {
  id: string;
  seasonNumber: number;
  contestants: Contestant[];
  isCompleted: boolean;
  winnerCountryId?: string;
  draftDate: string;
}
