import { View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { palette, type } from '@/constants/theme';
import { MuscleGroup } from '@/data/types';

/** Lerp untrained -> accent by intensity 0..1. */
function colorFor(intensity: number): string {
  const a = { r: 0x2c, g: 0x31, b: 0x3a }; // surface3 (untrained)
  const b = { r: 0x00, g: 0xe0, b: 0x7a }; // accent (trained)
  const t = Math.max(0, Math.min(1, intensity));
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(ch(a.r, b.r))}${h(ch(a.g, b.g))}${h(ch(a.b, b.b))}`;
}

export function BodyMap({ volumes, detailed = false }: { volumes: Record<string, number>; detailed?: boolean }) {
  const max = Math.max(1, ...Object.values(volumes));
  const v = (m: MuscleGroup | string) => colorFor((volumes[m] ?? 0) / max);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' }}>
      <Figure label="Zepředu">
        <Svg width={120} height={260} viewBox="0 0 120 260">
          {/* head + base body in muted tone */}
          <Circle cx={60} cy={20} r={14} fill={palette.surface3} />
          <Rect x={52} y={32} width={16} height={10} rx={4} fill={palette.surface3} />
          {/* shoulders */}
          <Ellipse cx={34} cy={56} rx={15} ry={11} fill={v('Ramena')} />
          <Ellipse cx={86} cy={56} rx={15} ry={11} fill={v('Ramena')} />
          {/* chest */}
          <Ellipse cx={48} cy={76} rx={14} ry={12} fill={v('Hrudník')} />
          <Ellipse cx={72} cy={76} rx={14} ry={12} fill={v('Hrudník')} />
          {/* biceps */}
          <Ellipse cx={22} cy={92} rx={9} ry={18} fill={v('Biceps')} />
          <Ellipse cx={98} cy={92} rx={9} ry={18} fill={v('Biceps')} />
          {/* forearms */}
          <Ellipse cx={17} cy={126} rx={7} ry={16} fill={v('Předloktí')} />
          <Ellipse cx={103} cy={126} rx={7} ry={16} fill={v('Předloktí')} />
          {/* abs */}
          <Rect x={47} y={92} width={26} height={42} rx={8} fill={v('Břicho')} />
          {/* quads */}
          <Ellipse cx={49} cy={176} rx={14} ry={34} fill={v(detailed ? 'Kvadricepsy' : 'Nohy')} />
          <Ellipse cx={71} cy={176} rx={14} ry={34} fill={v(detailed ? 'Kvadricepsy' : 'Nohy')} />
          {/* shins */}
          <Ellipse cx={49} cy={232} rx={9} ry={24} fill={palette.surface3} />
          <Ellipse cx={71} cy={232} rx={9} ry={24} fill={palette.surface3} />
        </Svg>
      </Figure>

      <Figure label="Zezadu">
        <Svg width={120} height={260} viewBox="0 0 120 260">
          <Circle cx={60} cy={20} r={14} fill={palette.surface3} />
          <Rect x={52} y={32} width={16} height={10} rx={4} fill={palette.surface3} />
          {/* rear delts */}
          <Ellipse cx={34} cy={56} rx={15} ry={11} fill={v('Ramena')} />
          <Ellipse cx={86} cy={56} rx={15} ry={11} fill={v('Ramena')} />
          {/* back / lats */}
          {detailed ? (
            <>
              {/* traps / upper back / lower back */}
              <Rect x={42} y={62} width={36} height={12} rx={6} fill={v('Trapézy')} />
              <Rect x={42} y={76} width={36} height={20} rx={8} fill={v('Horní záda')} />
              <Rect x={42} y={98} width={36} height={12} rx={6} fill={v('Spodní záda')} />
            </>
          ) : (
            <Rect x={42} y={64} width={36} height={46} rx={12} fill={v('Záda')} />
          )}
          {/* triceps */}
          <Ellipse cx={22} cy={92} rx={9} ry={18} fill={v('Triceps')} />
          <Ellipse cx={98} cy={92} rx={9} ry={18} fill={v('Triceps')} />
          {/* glutes */}
          <Ellipse cx={49} cy={128} rx={13} ry={13} fill={v('Hýždě')} />
          <Ellipse cx={71} cy={128} rx={13} ry={13} fill={v('Hýždě')} />
          {/* hamstrings (Nohy) */}
          <Ellipse cx={49} cy={176} rx={14} ry={32} fill={v(detailed ? 'Hamstringy' : 'Nohy')} />
          <Ellipse cx={71} cy={176} rx={14} ry={32} fill={v(detailed ? 'Hamstringy' : 'Nohy')} />
          {/* calves */}
          <Ellipse cx={49} cy={232} rx={9} ry={24} fill={v('Lýtka')} />
          <Ellipse cx={71} cy={232} rx={9} ry={24} fill={v('Lýtka')} />
        </Svg>
      </Figure>
    </View>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {children}
      <Txt size={type.caption} weight="medium" color={palette.textMute} style={{ marginTop: 4 }}>
        {label}
      </Txt>
    </View>
  );
}
