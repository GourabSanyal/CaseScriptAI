import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useColorScheme, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { initializeExecutorch } from "@/services/ai/llm-inference";

const TabLayout = () => {
  const colorScheme = useColorScheme();
  const [isExecutorchReady, setIsExecutorchReady] = useState(false);
  const [executorchError, setExecutorchError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const result = await initializeExecutorch();
      if (result.success) {
        setIsExecutorchReady(true);
      } else {
        setExecutorchError(result.error ?? "Failed to initialize AI runtime");
      }
    };
    init();
  }, []);

  if (executorchError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>AI runtime error: {executorchError}</Text>
      </View>
    );
  }

  if (!isExecutorchReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Initializing AI runtime...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default TabLayout;
