import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { MiniWorkoutBar } from '@/components/MiniWorkoutBar';
import { Txt } from '@/components/ui';
import { palette, space } from '@/constants/theme';
import type { Dict } from '@/i18n';
import { useT } from '@/i18n/useT';

const TABS: Record<string, { label: keyof Dict['tabs']; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'today', icon: 'today-outline' },
  plany: { label: 'plans', icon: 'albums-outline' },
  pokrok: { label: 'progress', icon: 'trending-up-outline' },
  kalendar: { label: 'calendar', icon: 'calendar-outline' },
  profil: { label: 'profile', icon: 'person-outline' },
};

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const tx = useT();
  return (
    <View>
      <AdBanner />
      <MiniWorkoutBar />
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.hairline,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
        }}>
      {state.routes.map((route: any, i: number) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === i;
        const color = focused ? palette.accent : palette.textMute;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Ionicons name={cfg.icon} size={23} color={color} />
            <Txt size={10} weight={focused ? 'semibold' : 'medium'} color={color}>
              {tx.tabs[cfg.label]}
            </Txt>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plany" />
      <Tabs.Screen name="pokrok" />
      <Tabs.Screen name="kalendar" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
