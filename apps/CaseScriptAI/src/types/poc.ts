import type { AudioEntry } from "./audio";

export type PocStore = {
  audios: AudioEntry[];
  hasHydrated: boolean;
  addAudio: (entry: AudioEntry) => void;
  removeAudio: (uri: string) => void;
  clearAudios: () => void;
};

export type PlaybackSectionProps = {
  audios: AudioEntry[];
  playAudio: () => void;
  pauseAudio: () => void;
  seekTo: (seconds: number) => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackState: string;
};

export type AudioInputSectionProps = {
  handleAudioImport: () => Promise<void>;
  clearAudios: () => void;
};

export type PipelineSectionProps = {
  audios: AudioEntry[];
  handlePress: (type: string) => void;
};

export type OutputsSectionProps = {
  handlePress: (type: string) => void;
};
