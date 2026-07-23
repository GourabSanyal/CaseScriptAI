import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { useDeviceStore } from '@/stores/device-store';

export default function LaunchGateScreen() {
  const theme = useTheme();
  const selection = useDeviceStore((state) => state.selection);
  const assessAndSelect = useDeviceStore((state) => state.assessAndSelect);
  const [target, setTarget] = useState<'download' | 'app' | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let tier = selection?.tier;
      if (!tier) {
        const assessed = await assessAndSelect();
        tier = assessed.success ? assessed.data.tier : 'lite';
      }

      const readiness = await modelManager.checkAllModelsReady(tier);
      if (cancelled) return;
      setTarget(readiness.success && readiness.data.ready ? 'app' : 'download');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [assessAndSelect, selection?.tier]);

  if (target === 'download') {
    return <Redirect href="/(onboarding)/model-download" />;
  }
  if (target === 'app') {
    return <Redirect href="/(app)/record" />;
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
      }}
    >
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}
