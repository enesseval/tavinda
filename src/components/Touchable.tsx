import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type StyleInput = StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

export type TouchableProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleInput;
  children?: ReactNode;
};

/**
 * Pressable that resolves `style` itself and always passes a plain style down.
 * NativeWind wraps Pressable and can drop function styles, which hid button
 * backgrounds (and with them the light button labels) on device.
 */
export function Touchable({ style, onPressIn, onPressOut, children, ...rest }: TouchableProps) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <Pressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={resolved}
    >
      {children}
    </Pressable>
  );
}
