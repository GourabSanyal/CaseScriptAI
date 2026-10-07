import { Redirect } from 'expo-router';

import { LOCAL_ON_DEVICE_AI_ENABLED } from '@/constants/features';
import { useAuthStore } from '@/stores/auth-store';
import { useBootStore } from '@/stores/boot-store';

export default function LaunchGateScreen() {
  const destination = useBootStore((state) => state.destination);
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (LOCAL_ON_DEVICE_AI_ENABLED && destination === 'download') {
    return <Redirect href="/(onboarding)/model-download" />;
  }
  if (destination !== 'app') {
    return null;
  }
  if (!hasHydrated) {
    return null;
  }
  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (session.role === 'patient') {
    return <Redirect href="/(patient)/waiting-room" />;
  }
  return <Redirect href="/(app)/record" />;
}
