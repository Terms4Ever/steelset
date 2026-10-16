import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, PrimaryButton, Screen, Txt } from '@/components/ui';
import { folderName } from '@/i18n/catalog';
import { useT } from '@/i18n/useT';
import { palette, radius, space, type } from '@/constants/theme';
import { STARTER_ROUTINES } from '@/data/exercises';
import { useStore } from '@/store/useStore';

export default function Onboarding() {
  const tx = useT();
  const o = tx.onboarding;
  const router = useRouter();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [mode, setMode] = useState<'choose' | 'starters'>('choose');
  const [picked, setPicked] = useState<string[]>(STARTER_ROUTINES.map((r) => r.id));

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = (ids: string[]) => {
    completeOnboarding(ids);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <Image
          source={require('../../assets/images/steelset-wordmark.png')}
          style={{ width: 230, height: 80 }}
          contentFit="contain"
        />
        <Txt size={type.body} weight="medium" color={palette.textDim} style={{ marginTop: 8, textAlign: 'center' }}>
          {o.tagline}
        </Txt>
      </View>

      {mode === 'choose' ? (
        <View style={{ marginTop: space.xxl, gap: space.md }}>
          <Pressable onPress={() => setMode('starters')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Ionicons name="rocket-outline" size={24} color={palette.accent} />
              <View style={{ flex: 1 }}>
                <Txt size={type.h2} weight="bold">
                  {o.helpMe}
                </Txt>
                <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
                  {o.helpMeHint}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.textMute} />
            </Card>
          </Pressable>

          <Pressable onPress={() => finish([])}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Ionicons name="barbell-outline" size={24} color={palette.text} />
              <View style={{ flex: 1 }}>
                <Txt size={type.h2} weight="bold">
                  {o.ownPlan}
                </Txt>
                <Txt size={type.label} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
                  {o.ownPlanHint}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.textMute} />
            </Card>
          </Pressable>

          <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: space.md }}>
            {o.noAccount}
          </Txt>
        </View>
      ) : (
        <View style={{ marginTop: space.xl }}>
          <Txt size={type.label} weight="semibold" color={palette.textDim} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
            {o.pickPlans}
          </Txt>
          <View style={{ gap: space.md }}>
            {STARTER_ROUTINES.map((r) => {
              const on = picked.includes(r.id);
              return (
                <Pressable key={r.id} onPress={() => toggle(r.id)}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? palette.accent : palette.hairline }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        backgroundColor: on ? palette.accent : 'transparent',
                        borderWidth: on ? 0 : 2,
                        borderColor: palette.surface3,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {on && <Ionicons name="checkmark" size={16} color={palette.bg} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={type.h2} weight="bold">
                        {r.name}
                      </Txt>
                      <Txt size={type.label} weight="medium" color={palette.textMute}>
                        {folderName(r.folder)} · {tx.common.exercises(r.exercises.length)}
                      </Txt>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: space.xl }}>
            <PrimaryButton label={o.start} onPress={() => finish(picked)} />
            <Pressable onPress={() => setMode('choose')} style={{ marginTop: 10, alignItems: 'center', paddingVertical: 12 }}>
              <Txt size={type.body} weight="semibold" color={palette.textDim}>
                {tx.workout.back}
              </Txt>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
