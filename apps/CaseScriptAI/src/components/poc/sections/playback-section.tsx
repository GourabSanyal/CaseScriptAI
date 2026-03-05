import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AudioSeeker } from "@/components/audio/audio-seeker";

import type { AudioEntry } from "@/types/audio";
import type { PlaybackSectionProps } from "@/types/poc";

export const PlaybackSection = ({
  audios,
  playAudio,
  pauseAudio,
  seekTo,
  currentTime,
  duration,
  isPlaying,
  playbackState = "unknown",
}: PlaybackSectionProps) => {
  const getStatusColor = () => {
    switch (playbackState) {
      case "readyToPlay":
        return "#34C759";
      case "playing":
        return "#34C759";
      case "buffering":
        return "#FF9500";
      case "loading":
        return "#007AFF";
      case "error":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Playback</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor() + "20" },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {(playbackState || "unknown").toUpperCase()}
          </Text>
        </View>
      </View>

      {audios.length > 0 ? (
        <View style={styles.audioList}>
          {audios.map((item: AudioEntry, index: number) => (
            <View key={item.uri} style={styles.audioItem}>
              <View style={styles.audioInfo}>
                <Text style={styles.audioName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.audioMeta}>
                  {new Date(item.addedAt).toLocaleTimeString()} •{" "}
                  {((item.size ?? 0) / 1024).toFixed(1)} KB
                </Text>
              </View>
              {index === audios.length - 1 && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No audio tracks persisted yet.</Text>
      )}

      {audios.length > 0 && (
        <AudioSeeker
          currentTime={currentTime}
          duration={duration}
          onSeek={seekTo}
        />
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.flexButton,
            isPlaying ? styles.pauseButton : styles.playButton,
          ]}
          onPress={isPlaying ? pauseAudio : playAudio}
          activeOpacity={0.7}
          disabled={audios.length === 0}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? "⏸️ Pause" : "▶️ Play Active"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  audioList: {
    marginBottom: 16,
  },
  audioItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  audioInfo: {
    flex: 1,
  },
  audioName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  audioMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  activeBadgeText: {
    fontSize: 10,
    color: "#1976D2",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  flexButton: {
    flex: 1,
  },
  playButton: {
    backgroundColor: "#34C759",
  },
  pauseButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
