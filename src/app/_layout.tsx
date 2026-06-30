import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { scheduleBackup, syncFromCloud } from '@/lib/sync';
import { useStore } from '@/store/useStore';

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
    </SafeAreaProvider>
  );
}
