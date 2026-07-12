import { useFonts } from 'expo-font';

export function useDmSans() {
  const [loaded, error] = useFonts({
    DMSans: require('@/assets/fonts/DMSans.ttf'),
  });

  return { loaded, error };
}
