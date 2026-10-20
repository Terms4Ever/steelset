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
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniWorkoutBar } from '@/components/MiniWorkoutBar';
import { palette } from '@/constants/theme';
import { refillHealthAfterRestore } from '@/lib/healthRefill';
import { scheduleBackup, syncFromCloud } from '@/lib/sync';
import { useMonetization } from '@/lib/useMonetization';
import { useBodyweightSync } from '@/lib/useBodyweightSync';
import { useWatchSync } from '@/lib/useWatchSync';
import { useWidgetSync } from '@/lib/useWidgetSync';
import { useLang, useT } from '@/i18n/useT';
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
    /* box-none: ťuknutí vedle samotné lišty musí projít na obsah pod ní, ne se ztratit */
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 10) }}>
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
  // jazyk aplikace podle nastavení nebo telefonu, dřív než se vykreslí cokoli dalšího (#20)
  useT();
  const lang = useLang();
  // jazyk se přepíná v Profilu; přemontovaný strom by na iPhonu začal na Dnešku
  const shownLang = useRef(lang);
  useEffect(() => {
    if (shownLang.current === lang) return;
    shownLang.current = lang;
    router.navigate('/profil');
  }, [lang, router]);

  // subscription state + ads (no-op for Pro subscribers)
  useMonetization(ready);

  // snímek dat pro widgety na ploše (#16) a vážení z Health pro widget tělesné váhy; mimo iOS nic nedělají
  useWidgetSync(ready);
  useBodyweightSync(ready);
  // trénink i na hodinkách: start, konec a konec z hodinek (#15)
  useWatchSync(ready);

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
        if (restored) {
          await (useStore as any).persist?.rehydrate?.();
          // záloha nenese data z Apple Health (#18), na novém telefonu se načtou znovu
          void refillHealthAfterRestore();
        }
      } catch {}
      unsub = useStore.subscribe(() => scheduleBackup());
    })();
    return () => unsub?.();
  }, [hydrated]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  return (
    // gesta z react-native-gesture-handler (přetahování hodnot, keypad) potřebují tenhle kořen
    // Po přepnutí jazyka se strom přemontuje (key). React Compiler si v komponentách pamatuje
    // texty spočítané z dat (data, názvy partií, cviků) a bez přemontování by zůstaly ve starém
    // jazyce až do další změny dat (#20).
    <GestureHandlerRootView key={lang} style={{ flex: 1 }}>
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
          <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="routine/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="history/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <FloatingWorkoutBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
