import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SplashScreenOverlay } from '@/components/splash-screen';
import { useDmSans } from '@/hooks/use-dm-sans';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { initializeExecutorch } from '@/services/ai/llm-inference';
import { useBootStore } from '@/stores/boot-store';
import { useDeviceStore } from '@/stores/device-store';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden during fast reload.
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loaded: fontsLoaded, error: fontError } = useDmSans();
  const [isExecutorchReady, setIsExecutorchReady] = useState(false);
  const [executorchError, setExecutorchError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const destination = useBootStore((state) => state.destination);
  const setDestination = useBootStore((state) => state.setDestination);

  useEffect(() => {
    if (!fontsLoaded) return;

    ExpoSplashScreen.hideAsync().catch(() => undefined);

    const init = async () => {
      const result = await initializeExecutorch();
      if (result.success) {
        setIsExecutorchReady(true);
      } else {
        setExecutorchError(result.error ?? 'Failed to initialize AI runtime');
      }
    };

    void init();
  }, [fontsLoaded]);

  // Resolve download vs home while splash is still up (avoids the bare spinner screen).
  useEffect(() => {
    if (!isExecutorchReady || destination) return;

    let cancelled = false;

    const run = async () => {
      const device = useDeviceStore.getState();
      let tier = device.selection?.tier;
      if (!tier) {
        const assessed = await device.assessAndSelect();
        tier = assessed.success ? assessed.data.tier : 'lite';
      }

      const readiness = await modelManager.checkAllModelsReady(tier);
      if (cancelled) return;
      setDestination(readiness.success && readiness.data.ready ? 'app' : 'download');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [destination, isExecutorchReady, setDestination]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Font error: {fontError.message}</Text>
      </View>
    );
  }

  if (executorchError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>AI runtime error: {executorchError}</Text>
      </View>
    );
  }

  if (!fontsLoaded) return null;

  const bootReady = isExecutorchReady && destination !== null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {bootReady && !showSplash ? <Slot /> : null}
        {showSplash ? (
          <SplashScreenOverlay
            readyToDismiss={bootReady}
            onFinish={handleSplashFinish}
          />
        ) : null}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
