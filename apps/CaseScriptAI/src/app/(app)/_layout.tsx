import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useBindPipelineRuntimes } from '@/hooks/ai/use-bind-pipeline-runtimes';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_BAR_CONTENT_HEIGHT = 56;

export default function AppLayout() {
  useBindPipelineRuntimes();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Spacing.two);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.outlineVariant,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: Spacing.one,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.sans,
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="record"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="schedule" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="drafts"
        options={{
          title: 'Drafts',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="edit-note" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="processing" options={{ href: null }} />
      <Tabs.Screen name="preview" options={{ href: null }} />
      <Tabs.Screen name="export" options={{ href: null }} />
    </Tabs>
  );
}
