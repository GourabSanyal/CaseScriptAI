import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="therapist-login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="patient-join" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
