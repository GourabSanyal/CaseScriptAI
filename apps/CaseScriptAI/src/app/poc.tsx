import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useAudio } from "@/hooks/audio/use-audio";
import { usePocStore } from "@/stores/poc-store";
import { AudioInputSection } from "@/components/poc/sections/audio-input-section";
import { PlaybackSection } from "@/components/poc/sections/playback-section";
import { PipelineSection } from "@/components/poc/sections/pipeline-section";
import { OutputsSection } from "@/components/poc/sections/outputs-section";

export const PoCTestScreen = (): React.JSX.Element => {
  const {
    handleAudioImport,
    playAudio,
    pauseAudio,
    seekTo,
    audios,
    isPlaying,
    currentTime,
    duration,
    playbackState,
  } = useAudio();

  const hasHydrated = usePocStore((state) => state.hasHydrated);
  const clearAudios = usePocStore((state) => state.clearAudios);

  const handlePress = (type: string) => {
    console.log(`${type} pressed`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Pipeline PoC</Text>

      <AudioInputSection
        handleAudioImport={handleAudioImport}
        clearAudios={clearAudios}
      />

      <PlaybackSection
        audios={audios}
        playAudio={playAudio}
        pauseAudio={pauseAudio}
        seekTo={seekTo}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        playbackState={playbackState}
      />

      <PipelineSection audios={audios} handlePress={handlePress} />

      <OutputsSection handlePress={handlePress} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
    textAlign: "center",
  },
});

export default PoCTestScreen;
