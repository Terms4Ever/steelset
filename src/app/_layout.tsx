import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniWorkoutBar } from '@/components/MiniWorkoutBar';
import { palette } from '@/constants/theme';
import { scheduleBackup, syncFromCloud } from '@/lib/sync';
import { useStore } from '@/store/useStore';

/**
 * Floating "workout in progress" bar on screens OUTSIDE the tabs (exercise picker, muscle map,
 * history detail…) so the user can always get back to a running workout. The tab screens render
 * their own copy above the tab bar; the workout screen itself doesn't need one.
 */
function FloatingWorkoutBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const workouts = useStore((s) => s.workouts);
  const activeId = useStore((s) => s.activeWorkoutId);
  const hasActive = !!activeId && workouts.some((w) => w.id === activeId);
  // tabs render their own bar; workout is the target itself; the exercise picker/new-exercise modals
  // are part of the workout flow (and iOS native modals cover overlays anyway)
  const HIDDEN = ['/workout', '/onboarding', '/', '/plany', '/pokrok', '/kalendar', '/profil', '/exercises', '/exercise-new'];
  if (!hasActive || HIDDEN.includes(pathname)) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 10) }}>
      <MiniWorkoutBar />
    </View>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useStore((s) => s._hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);
  const segments = useSegments();
  const router = useRouter();

  const ready = loaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    else if (onboarded && inOnboarding) router.replace('/');
  }, [ready, onboarded, segments, router]);

  // iCloud sync: restore newer cloud data on launch, then back up on changes (iOS only; no-op elsewhere).
  useEffect(() => {
    if (!hydrated) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const restored = await syncFromCloud();
        if (restored) await (useStore as any).persist?.rehydrate?.();
      } catch {}
      unsub = useStore.subscribe(() => scheduleBackup());
    })();
    return () => unsub?.();
  }, [hydrated]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="exercises" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="exercise-new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="routine/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="history/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <FloatingWorkoutBar />
    </SafeAreaProvider>
  );
}
