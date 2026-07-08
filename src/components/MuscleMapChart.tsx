import { Platform, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { palette, type } from '@/constants/theme';
import { setZone, SET_ZONES } from '@/lib/calc';

/**
 * Anatomical muscle chart - muscular male physique, front + back side by side (anatomy-poster style).
 * Muscles are colored by WEEKLY HARD SETS on an absolute scale (see heatColor), so a muscle you
 * actually train lights up green regardless of how heavy your other muscles' exercises are.
 * Every muscle is pressable (onPressMuscle) and highlights when `selected`.
 */

export const MUSCLE_REGIONS = [
  'Trapézy',
  'Ramena',
  'Hrudník',
  'Biceps',
  'Triceps',
  'Předloktí',
  'Břicho',
  'Horní záda',
  'Spodní záda',
  'Hýždě',
  'Kvadricepsy',
  'Hamstringy',
  'Lýtka',
] as const;
export type MuscleRegion = (typeof MUSCLE_REGIONS)[number];

/**
 * Absolute heat by weekly hard sets (Hevy/Strong volume model), NOT relative to your biggest muscle:
 *   0 gray · <5 blue (udržovací) · 5-19 green (optimum) · 20-25 amber (hodně) · >25 red (přetížení)
 */
export function heatColor(setsPerWeek: number): string {
  switch (setZone(setsPerWeek)) {
    case 'none':
      return '#2C313A';
    case 'low':
      return palette.heatCold; // #7FA3D6
    case 'optimum':
      return palette.accent; // #00E07A
    case 'high':
      return palette.amber; // #FFB020
    default:
      return palette.red; // #FF5247
  }
}

const BASE = '#171A1F';
const BASE_STROKE = '#262B33';
const GAP = '#0A0B0D';

type Props = {
  /** weekly hard sets per muscle (see calc.muscleSetsDetailed + calc.perWeek) */
  volumes: Record<string, number>;
  onPressMuscle?: (m: MuscleRegion) => void;
  selected?: MuscleRegion | null;
  height?: number;
};

export function MuscleMapChart({ volumes, onPressMuscle, selected, height = 320 }: Props) {
  const fill = (m: MuscleRegion) => heatColor(volumes[m] ?? 0);
  const stroke = (m: MuscleRegion) => (selected === m ? palette.text : GAP);
  const sw = (m: MuscleRegion) => (selected === m ? 2.5 : 1.4);
  // react-native-svg maps onPress -> onClick on web (see its web prepare()), so onPress works everywhere
  const press = (m: MuscleRegion): any => (onPressMuscle ? { onPress: () => onPressMuscle(m) } : {});

  // shared base silhouette (head, torso block, arms, legs) drawn beneath the muscle shapes
  const Silhouette = (
    <>
      <Circle cx={85} cy={22} r={14} fill={BASE} stroke={BASE_STROKE} strokeWidth={1} />
      <Rect x={77} y={34} width={16} height={12} rx={5} fill={BASE} />
      <Path d="M48,52 Q85,42 122,52 L113,166 Q85,178 57,166 Z" fill={BASE} stroke={BASE_STROKE} strokeWidth={1} />
      <Rect x={27} y={58} width={19} height={102} rx={9.5} fill={BASE} />
      <Rect x={124} y={58} width={19} height={102} rx={9.5} fill={BASE} />
      <Circle cx={36} cy={168} r={6} fill={BASE} />
      <Circle cx={134} cy={168} r={6} fill={BASE} />
      <Rect x={55} y={168} width={27} height={160} rx={12} fill={BASE} />
      <Rect x={88} y={168} width={27} height={160} rx={12} fill={BASE} />
      <Ellipse cx={68} cy={332} rx={11} ry={5} fill={BASE} />
      <Ellipse cx={102} cy={332} rx={11} ry={5} fill={BASE} />
    </>
  );

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {/* ------------------------------ FRONT ------------------------------ */}
        <View style={{ width: '49%', alignItems: 'center' }}>
          <Svg width="100%" height={height} viewBox="0 0 170 340" preserveAspectRatio="xMidYMid meet">
            {Silhouette}

            {/* trapézy (horní) */}
            <G {...press('Trapézy')}>
              <Path d="M64,46 Q75,40 83,42 L83,54 Q72,52 64,56 Z" fill={fill('Trapézy')} stroke={stroke('Trapézy')} strokeWidth={sw('Trapézy')} />
              <Path d="M106,46 Q95,40 87,42 L87,54 Q98,52 106,56 Z" fill={fill('Trapézy')} stroke={stroke('Trapézy')} strokeWidth={sw('Trapézy')} />
            </G>
            {/* ramena (přední delt) */}
            <G {...press('Ramena')}>
              <Ellipse cx={47} cy={62} rx={16} ry={13} fill={fill('Ramena')} stroke={stroke('Ramena')} strokeWidth={sw('Ramena')} />
              <Ellipse cx={123} cy={62} rx={16} ry={13} fill={fill('Ramena')} stroke={stroke('Ramena')} strokeWidth={sw('Ramena')} />
            </G>
            {/* hrudník (prsní vějíře) */}
            <G {...press('Hrudník')}>
              <Path d="M64,68 Q84,66 84,78 Q84,94 66,94 Q52,90 54,76 Z" fill={fill('Hrudník')} stroke={stroke('Hrudník')} strokeWidth={sw('Hrudník')} />
              <Path d="M106,68 Q86,66 86,78 Q86,94 104,94 Q118,90 116,76 Z" fill={fill('Hrudník')} stroke={stroke('Hrudník')} strokeWidth={sw('Hrudník')} />
            </G>
            {/* biceps */}
            <G {...press('Biceps')}>
              <Ellipse cx={39} cy={102} rx={10} ry={17} fill={fill('Biceps')} stroke={stroke('Biceps')} strokeWidth={sw('Biceps')} />
              <Ellipse cx={131} cy={102} rx={10} ry={17} fill={fill('Biceps')} stroke={stroke('Biceps')} strokeWidth={sw('Biceps')} />
            </G>
            {/* předloktí */}
            <G {...press('Předloktí')}>
              <Ellipse cx={33} cy={140} rx={8} ry={20} fill={fill('Předloktí')} stroke={stroke('Předloktí')} strokeWidth={sw('Předloktí')} />
              <Ellipse cx={137} cy={140} rx={8} ry={20} fill={fill('Předloktí')} stroke={stroke('Předloktí')} strokeWidth={sw('Předloktí')} />
            </G>
            {/* břicho (6 bloků + spodní) + šikmé */}
            <G {...press('Břicho')}>
              <Rect x={72} y={100} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={86} y={100} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={72} y={117} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={86} y={117} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={72} y={134} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={86} y={134} width={12} height={15} rx={3.5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={74} y={151} width={22} height={13} rx={6} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              {/* šikmé břišní (vizuálně patří k břichu) */}
              <Rect x={58} y={104} width={11} height={46} rx={5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
              <Rect x={101} y={104} width={11} height={46} rx={5} fill={fill('Břicho')} stroke={stroke('Břicho')} strokeWidth={sw('Břicho')} />
            </G>
            {/* kvadricepsy (2 hlavy) + adduktory */}
            <G {...press('Kvadricepsy')}>
              <Ellipse cx={63} cy={212} rx={13} ry={40} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={sw('Kvadricepsy')} />
              <Ellipse cx={76} cy={216} rx={8} ry={34} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={sw('Kvadricepsy')} />
              <Ellipse cx={107} cy={212} rx={13} ry={40} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={sw('Kvadricepsy')} />
              <Ellipse cx={94} cy={216} rx={8} ry={34} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={sw('Kvadricepsy')} />
              {/* adduktory */}
              <Ellipse cx={82} cy={192} rx={4.5} ry={22} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={1} />
              <Ellipse cx={88} cy={192} rx={4.5} ry={22} fill={fill('Kvadricepsy')} stroke={stroke('Kvadricepsy')} strokeWidth={1} />
            </G>
            {/* lýtka (tibialis zepředu) */}
            <G {...press('Lýtka')}>
              <Ellipse cx={66} cy={296} rx={8} ry={27} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
              <Ellipse cx={104} cy={296} rx={8} ry={27} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
            </G>
          </Svg>
          <Txt size={type.caption} weight="semibold" color={palette.textMute} style={{ marginTop: 6, letterSpacing: 1.5 }}>
            PŘEDEK
          </Txt>
        </View>

        {/* ------------------------------ BACK ------------------------------- */}
        <View style={{ width: '49%', alignItems: 'center' }}>
          <Svg width="100%" height={height} viewBox="0 0 170 340" preserveAspectRatio="xMidYMid meet">
            {Silhouette}

            {/* trapézy (diamant) */}
            <G {...press('Trapézy')}>
              <Path d="M85,38 L55,58 L85,90 L115,58 Z" fill={fill('Trapézy')} stroke={stroke('Trapézy')} strokeWidth={sw('Trapézy')} />
            </G>
            {/* ramena (zadní delt) */}
            <G {...press('Ramena')}>
              <Ellipse cx={45} cy={64} rx={15} ry={12} fill={fill('Ramena')} stroke={stroke('Ramena')} strokeWidth={sw('Ramena')} />
              <Ellipse cx={125} cy={64} rx={15} ry={12} fill={fill('Ramena')} stroke={stroke('Ramena')} strokeWidth={sw('Ramena')} />
            </G>
            {/* horní záda (latissimus křídla) */}
            <G {...press('Horní záda')}>
              <Path d="M58,74 Q52,104 64,122 Q74,128 82,120 L82,84 Q70,76 58,74 Z" fill={fill('Horní záda')} stroke={stroke('Horní záda')} strokeWidth={sw('Horní záda')} />
              <Path d="M112,74 Q118,104 106,122 Q96,128 88,120 L88,84 Q100,76 112,74 Z" fill={fill('Horní záda')} stroke={stroke('Horní záda')} strokeWidth={sw('Horní záda')} />
            </G>
            {/* spodní záda (vzpřimovače) */}
            <G {...press('Spodní záda')}>
              <Rect x={74} y={124} width={9} height={34} rx={4.5} fill={fill('Spodní záda')} stroke={stroke('Spodní záda')} strokeWidth={sw('Spodní záda')} />
              <Rect x={87} y={124} width={9} height={34} rx={4.5} fill={fill('Spodní záda')} stroke={stroke('Spodní záda')} strokeWidth={sw('Spodní záda')} />
            </G>
            {/* triceps */}
            <G {...press('Triceps')}>
              <Ellipse cx={38} cy={104} rx={10} ry={18} fill={fill('Triceps')} stroke={stroke('Triceps')} strokeWidth={sw('Triceps')} />
              <Ellipse cx={132} cy={104} rx={10} ry={18} fill={fill('Triceps')} stroke={stroke('Triceps')} strokeWidth={sw('Triceps')} />
            </G>
            {/* předloktí */}
            <G {...press('Předloktí')}>
              <Ellipse cx={32} cy={142} rx={8} ry={19} fill={fill('Předloktí')} stroke={stroke('Předloktí')} strokeWidth={sw('Předloktí')} />
              <Ellipse cx={138} cy={142} rx={8} ry={19} fill={fill('Předloktí')} stroke={stroke('Předloktí')} strokeWidth={sw('Předloktí')} />
            </G>
            {/* hýždě */}
            <G {...press('Hýždě')}>
              <Ellipse cx={68} cy={174} rx={15} ry={16} fill={fill('Hýždě')} stroke={stroke('Hýždě')} strokeWidth={sw('Hýždě')} />
              <Ellipse cx={102} cy={174} rx={15} ry={16} fill={fill('Hýždě')} stroke={stroke('Hýždě')} strokeWidth={sw('Hýždě')} />
            </G>
            {/* hamstringy (2 hlavy) */}
            <G {...press('Hamstringy')}>
              <Ellipse cx={63} cy={232} rx={12} ry={36} fill={fill('Hamstringy')} stroke={stroke('Hamstringy')} strokeWidth={sw('Hamstringy')} />
              <Ellipse cx={75} cy={236} rx={7} ry={30} fill={fill('Hamstringy')} stroke={stroke('Hamstringy')} strokeWidth={sw('Hamstringy')} />
              <Ellipse cx={107} cy={232} rx={12} ry={36} fill={fill('Hamstringy')} stroke={stroke('Hamstringy')} strokeWidth={sw('Hamstringy')} />
              <Ellipse cx={95} cy={236} rx={7} ry={30} fill={fill('Hamstringy')} stroke={stroke('Hamstringy')} strokeWidth={sw('Hamstringy')} />
            </G>
            {/* lýtka (gastrocnemius, 2 hlavy) */}
            <G {...press('Lýtka')}>
              <Ellipse cx={64} cy={300} rx={9} ry={26} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
              <Ellipse cx={73} cy={296} rx={5} ry={20} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
              <Ellipse cx={106} cy={300} rx={9} ry={26} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
              <Ellipse cx={97} cy={296} rx={5} ry={20} fill={fill('Lýtka')} stroke={stroke('Lýtka')} strokeWidth={sw('Lýtka')} />
            </G>
          </Svg>
          <Txt size={type.caption} weight="semibold" color={palette.textMute} style={{ marginTop: 6, letterSpacing: 1.5 }}>
            ZADEK
          </Txt>
        </View>
      </View>
    </View>
  );
}

/** Legend row matching heatColor zones (weekly hard sets). */
export function MuscleMapLegend() {
  const items = [
    { c: '#2C313A', l: '0' },
    { c: palette.heatCold, l: `<${SET_ZONES.maintain}` },
    { c: palette.accent, l: `${SET_ZONES.maintain}-${SET_ZONES.optimumMax - 1} optimum` },
    { c: palette.amber, l: `${SET_ZONES.optimumMax}-${SET_ZONES.highMax}` },
    { c: palette.red, l: `${SET_ZONES.highMax}+ přetížení` },
  ];
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {items.map((i) => (
          <View key={i.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: i.c }} />
            <Txt size={type.caption} weight="medium" color={palette.textMute}>
              {i.l}
            </Txt>
          </View>
        ))}
      </View>
      <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ textAlign: 'center', marginTop: 5 }}>
        tvrdé série týdně
      </Txt>
    </View>
  );
}
