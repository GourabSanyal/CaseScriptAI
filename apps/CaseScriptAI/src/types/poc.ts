import type { AudioEntry } from "./audio";

export type PipelineResult = {
  transcript: string;
  soapNote: string;
  transcriptError: string | null;
  soapNoteError: string | null;
  isTranscribing: boolean;
  isGeneratingSoap: boolean;
};

export type PocStore = {
  audios: AudioEntry[];
  hasHydrated: boolean;
  pipelineResult: PipelineResult | null;
  addAudio: (entry: AudioEntry) => void;
  removeAudio: (uri: string) => void;
  clearAudios: () => void;
  setPipelineResult: (result: PipelineResult | null) => void;
  clearPipelineResult: () => void;
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
  handlePress: (type: string) => void | Promise<void>;
};

export type OutputsSectionProps = Record<string, never>;
