import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Horizontal gradient bar drawn with SVG (no extra native module). */
export function GradientBar({
  stops,
  height,
  radius = 0,
  opacity = 1,
}: {
  stops: { offset: number; color: string }[];
  height: number;
  radius?: number;
  opacity?: number;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <View style={{ height, opacity }}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {stops.map((s, i) => (
              <Stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={height} rx={radius} ry={radius} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
