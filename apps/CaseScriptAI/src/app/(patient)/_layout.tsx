import { Redirect, Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';

export default function PatientLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const session = useAuthStore((s) => s.session);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) return null;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (session.role !== 'patient') return <Redirect href="/(app)/record" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="waiting-room" />
    </Stack>
  );
}
