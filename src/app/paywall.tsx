import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { palette, radius, space, type } from '@/constants/theme';
import { haptic } from '@/lib/haptic';
import { buyPro, getProPackages, ProPackage, purchasesAvailable, restorePro } from '@/lib/purchases';
import { useStore } from '@/store/useStore';

/** Apple's standard EULA - a terms link is required when selling subscriptions. */
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://setly.cz/soukromi';

const BENEFITS = [
  { icon: 'eye-off-outline' as const, title: 'Žádné reklamy', text: 'Bannery i celoobrazovkové reklamy zmizí.' },
  { icon: 'flash-outline' as const, title: 'Nerušený zápis', text: 'Trénink bez čehokoliv navíc na obrazovce.' },
  { icon: 'heart-outline' as const, title: 'Podpoříš vývoj', text: 'Steelset dělá jeden člověk, ne velká firma.' },
];

export default function Paywall() {
  const router = useRouter();
  const isPro = useStore((s) => s.isPro);
  const setPro = useStore((s) => s.setPro);

  const [packages, setPackages] = useState<ProPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getProPackages();
      if (cancelled) return;
      setPackages(list);
      // preselect the annual plan - better value and the one people keep
      setSelected(list.find((p) => p.period === 'annual')?.id ?? list[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = packages?.find((p) => p.id === selected) ?? null;

  const onBuy = async () => {
    if (!current || busy) return;
    setBusy(true);
    const res = await buyPro(current);
    setBusy(false);
    if (res.cancelled) return;
    if (res.ok && res.isPro) {
      setPro(true);
      haptic.success();
      Alert.alert('Hotovo', 'Předplatné je aktivní, reklamy zmizely. Díky!');
      router.back();
      return;
    }
    haptic.warning();
    Alert.alert('Nákup se nepodařil', res.error ?? 'Zkus to prosím znovu.');
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    const res = await restorePro();
    setBusy(false);
    if (res.ok && res.isPro) {
      setPro(true);
      haptic.success();
      Alert.alert('Obnoveno', 'Předplatné je zpátky aktivní.');
      router.back();
      return;
    }
    Alert.alert('Nic k obnovení', 'Na tomhle Apple ID jsme aktivní předplatné nenašli.');
  };

  const renewalNote = current
    ? (current.trialDays
        ? `Po ${current.trialDays} dnech zdarma se předplatné automaticky obnovuje za ${current.priceString}. `
        : `Předplatné se automaticky obnovuje za ${current.priceString}. `) +
      'Zrušit jde kdykoliv v Nastavení iPhonu, nejpozději 24 hodin před koncem období.'
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: palette.accentDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.accent }}>
            <Ionicons name="star" size={30} color={palette.accent} />
          </View>
          <Txt size={type.title} weight="bold" style={{ marginTop: 14 }}>
            Steelset Pro
          </Txt>
          <Txt size={type.body} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 6 }}>
            Aplikace zůstane celá zdarma. Předplatné jen vypne reklamy.
          </Txt>
        </View>

        <View style={{ marginTop: space.xl, gap: space.md }}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={b.icon} size={19} color={palette.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={type.body} weight="bold">
                  {b.title}
                </Txt>
                <Txt size={type.caption} weight="medium" color={palette.textMute}>
                  {b.text}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        {isPro ? (
          <View style={{ marginTop: space.xl, backgroundColor: palette.accentDeep, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.accent }}>
            <Txt size={type.body} weight="bold" color={palette.accent}>
              Předplatné máš aktivní
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 2 }}>
              Spravovat nebo zrušit jde v Nastavení iPhonu, v sekci Apple ID - Předplatné.
            </Txt>
          </View>
        ) : packages === null ? (
          <View style={{ marginTop: space.xxl, alignItems: 'center' }}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : packages.length === 0 ? (
          <View style={{ marginTop: space.xl, backgroundColor: palette.surface, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: palette.hairline }}>
            <Txt size={type.body} weight="semibold">
              Předplatné teď nejde načíst
            </Txt>
            <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 4 }}>
              {purchasesAvailable()
                ? 'Zkontroluj připojení k internetu a zkus to znovu.'
                : 'V téhle verzi aplikace nákupy nejsou dostupné.'}
            </Txt>
          </View>
        ) : (
          <View style={{ marginTop: space.xl, gap: 10 }}>
            {packages.map((p) => {
              const on = p.id === selected;
              const annual = p.period === 'annual';
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: on ? palette.accentDeep : palette.surface,
                    borderRadius: radius.md,
                    padding: space.lg,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? palette.accent : palette.hairline,
                  }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: on ? palette.accent : palette.surface3,
                      backgroundColor: on ? palette.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {on && <Ionicons name="checkmark" size={14} color={palette.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Txt size={type.body} weight="bold">
                        {annual ? 'Ročně' : 'Měsíčně'}
                      </Txt>
                      {annual && (
                        <View style={{ backgroundColor: palette.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Txt size={type.caption} weight="bold" color={palette.bg}>
                            nejvýhodnější
                          </Txt>
                        </View>
                      )}
                    </View>
                    {!!p.pricePerMonthString && (
                      <Txt size={type.caption} weight="medium" num color={palette.textMute} style={{ marginTop: 2 }}>
                        {p.pricePerMonthString} za měsíc
                      </Txt>
                    )}
                    {!!p.trialDays && (
                      <Txt size={type.caption} weight="semibold" color={palette.accent} style={{ marginTop: 2 }}>
                        {p.trialDays} dní zdarma
                      </Txt>
                    )}
                  </View>
                  <Txt size={type.h2} weight="bold" num>
                    {p.priceString}
                  </Txt>
                </Pressable>
              );
            })}

            <Pressable
              onPress={onBuy}
              disabled={busy || !current}
              style={({ pressed }) => ({
                marginTop: 6,
                paddingVertical: 16,
                alignItems: 'center',
                borderRadius: radius.md,
                backgroundColor: palette.accent,
                opacity: busy || !current ? 0.5 : pressed ? 0.85 : 1,
              })}>
              {busy ? (
                <ActivityIndicator color={palette.bg} />
              ) : (
                <Txt size={type.body} weight="bold" color={palette.bg}>
                  {current?.trialDays ? 'Vyzkoušet zdarma' : 'Zapnout Pro'}
                </Txt>
              )}
            </Pressable>

            {/* Apple requires the renewal terms to be stated on the purchase screen itself */}
            <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
              {renewalNote}
            </Txt>
          </View>
        )}

        <Pressable onPress={onRestore} disabled={busy} style={{ marginTop: space.lg, alignItems: 'center', paddingVertical: 10 }}>
          <Txt size={type.label} weight="semibold" color={palette.accent}>
            Obnovit nákup
          </Txt>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 4 }}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Txt size={type.caption} weight="medium" color={palette.textMute}>
              Podmínky
            </Txt>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Txt size={type.caption} weight="medium" color={palette.textMute}>
              Ochrana soukromí
            </Txt>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
