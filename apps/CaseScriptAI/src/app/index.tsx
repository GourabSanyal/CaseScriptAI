import { Redirect } from 'expo-router';

import { useBootStore } from '@/stores/boot-store';

export default function LaunchGateScreen() {
  const destination = useBootStore((state) => state.destination);

  if (destination === 'download') {
    return <Redirect href="/(onboarding)/model-download" />;
  }
  if (destination === 'app') {
    return <Redirect href="/(app)/record" />;
  }

  // Splash covers boot; nothing to paint here.
  return null;
}
