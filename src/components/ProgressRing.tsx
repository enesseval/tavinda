import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track: string;
  children?: React.ReactNode;
}

export function ProgressRing({ size, stroke, progress, color, track, children }: Props) {
  const { reduceMotion } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(progress);

  useEffect(() => {
    p.value = reduceMotion ? progress : withTiming(progress, { duration: 250 });
  }, [progress, reduceMotion, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - Math.max(0, Math.min(100, p.value)) / 100),
    strokeOpacity: p.value > 0.5 ? 1 : 0,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      ) : null}
    </View>
  );
}
