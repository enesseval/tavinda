import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, type ReactElement } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Pages on each side of "now" (10 years of weeks); far more than anyone scrolls. */
export const SPAN = 520;

export interface PeriodPagerHandle {
  /** Jumps to the page `offset` periods from now (0 = this week/month). */
  goTo: (offset: number, animated?: boolean) => void;
}

/**
 * Native paging for weeks and months: the neighbouring period follows the
 * finger and settles with the system's own deceleration, so there is no jump
 * at the end. Only the visible page and its neighbours are mounted.
 */
export const PeriodPager = forwardRef<
  PeriodPagerHandle,
  {
    renderPage: (offset: number) => ReactElement;
    onChange?: (offset: number) => void;
    /** Page width when the pager doesn't span the screen (e.g. next to fixed hour labels). */
    width?: number;
    /** Fixed page height; otherwise pages fill the pager. */
    height?: number;
    /**
     * Live position in periods from now (0 = this one, 0.5 = halfway to the next), updated on
     * the UI thread while the finger moves, so fixed headers can follow the swipe exactly.
     */
    progress?: SharedValue<number>;
    /** Page to open on (periods from now). */
    initialOffset?: number;
  }
>(function PeriodPager({ renderPage, onChange, width: fixedWidth, height: fixedHeight, progress, initialOffset = 0 }, ref) {
  const window = useWindowDimensions();
  const width = fixedWidth ?? window.width;
  // Pages fill the pager's height so each one can keep its header fixed and scroll the rest.
  const [measured, setMeasured] = useState(0);
  const height = fixedHeight ?? measured;
  const list = useRef<FlatList<number>>(null);
  const current = useRef(initialOffset);
  const offsets = useMemo(() => Array.from({ length: SPAN * 2 + 1 }, (_, i) => i - SPAN), []);

  useImperativeHandle(
    ref,
    () => ({
      goTo: (offset, animated = true) => {
        current.current = offset;
        list.current?.scrollToIndex({ index: offset + SPAN, animated });
        if (!animated && progress) progress.value = offset;
        onChange?.(offset);
      },
    }),
    [onChange, progress],
  );

  const settle = useCallback(
    (x: number) => {
      const offset = Math.round(x / width) - SPAN;
      if (offset !== current.current) {
        current.current = offset;
        onChange?.(offset);
      }
    },
    [onChange, width],
  );

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        if (progress && width > 0) progress.value = e.contentOffset.x / width - SPAN;
      },
      onMomentumEnd: (e) => {
        scheduleOnRN(settle, e.contentOffset.x);
      },
    },
    [progress, width, settle],
  );

  return (
    <Animated.FlatList
      ref={list as never}
      style={fixedHeight != null ? { height: fixedHeight, flexGrow: 0 } : { flex: 1 }}
      onLayout={fixedHeight != null ? undefined : (e) => setMeasured(e.nativeEvent.layout.height)}
      horizontal
      pagingEnabled
      data={offsets}
      keyExtractor={String}
      initialScrollIndex={SPAN + initialOffset}
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      renderItem={({ item }) => <View style={{ width, height: height || undefined }}>{renderPage(item)}</View>}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      onScroll={onScroll}
      scrollEventThrottle={16}
      // New data (or a new width) re-renders the mounted pages.
      extraData={[renderPage, width, height]}
    />
  );
});
