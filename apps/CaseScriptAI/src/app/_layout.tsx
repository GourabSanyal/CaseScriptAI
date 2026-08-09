import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SplashScreenOverlay } from '@/components/splash-screen';
import { ToastHost } from '@/components/toast/toast-host';
import { useCallAudioPresenceToast } from '@/hooks/use-call-audio-presence-toast';
import { useDmSans } from '@/hooks/use-dm-sans';
import { getExecutorchBootReady } from '@/services/ai/executorch-boot';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { useBootStore } from '@/stores/boot-store';
import { useDeviceStore } from '@/stores/device-store';
import { initAppStorage } from '@/stores/session-runtime';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden during fast reload.
});

function AppChrome({ children }: { children: ReactNode }) {
  useCallAudioPresenceToast();
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loaded: fontsLoaded, error: fontError } = useDmSans();
  const [isExecutorchReady, setIsExecutorchReady] = useState(false);
  const [executorchError, setExecutorchError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const destination = useBootStore((state) => state.destination);
  const setDestination = useBootStore((state) => state.setDestination);

  // Always wire Keychain/AES + SQL — do not gate on destination (persisted `app` skipped init before).
  useEffect(() => {
    if (!fontsLoaded) return;
    void initAppStorage();
  }, [fontsLoaded]);

  // ponytail: resolve download vs app from disk only — do not load ExecuTorch during download.
  useEffect(() => {
    if (!fontsLoaded || destination) return;

    ExpoSplashScreen.hideAsync().catch(() => undefined);

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
  }, [destination, fontsLoaded, setDestination]);

  // Load ExecuTorch only when entering the main app (models already on disk).
  useEffect(() => {
    if (destination !== 'app' || isExecutorchReady) return;

    let cancelled = false;
    const run = async () => {
      const { initializeExecutorch } = await import('@/services/ai/llm-inference');
      const result = await initializeExecutorch();
      if (cancelled) return;
      if (result.success) {
        setIsExecutorchReady(true);
      } else {
        setExecutorchError(result.error ?? 'Failed to initialize AI runtime');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [destination, isExecutorchReady]);

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

  // Download screen must not wait on ExecuTorch native init.
  // Continue may init ExecuTorch before layout state updates — honor the module flag so Slot stays mounted.
  const bootReady =
    destination === 'download' ||
    (destination === 'app' && (isExecutorchReady || getExecutorchBootReady()));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppChrome>
          {bootReady && !showSplash ? <Slot /> : null}
          {showSplash ? (
            <SplashScreenOverlay
              readyToDismiss={bootReady}
              onFinish={handleSplashFinish}
            />
          ) : null}
        </AppChrome>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
