import React, { useState } from "react";
import { View, StyleSheet, Text, LayoutChangeEvent } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

type Props = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

export const AudioSeeker = ({ currentTime, duration, onSeek }: Props) => {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (width > 0 && duration > 0) {
        const progress = Math.max(0, Math.min(1, event.x / width));
        const seekTime = progress * duration;
        runOnJS(onSeek)(seekTime);
      }
    })
    .onEnd(() => {
      // Optional logic
    });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.progressBarBackground} onLayout={onLayout}>
          <View
            style={[styles.progressBarForeground, { width: `${progress}%` }]}
          />
          <View style={[styles.knob, { left: `${progress}%` }]} />
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    fontVariant: ["tabular-nums"],
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  progressBarForeground: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  knob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    position: "absolute",
    marginLeft: -6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});
