import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, type ReactElement } from 'react';
import { FlatList, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

/** Pages on each side of "now" (10 years of weeks); far more than anyone scrolls. */
const SPAN = 520;

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
  { renderPage: (offset: number) => ReactElement; onChange?: (offset: number) => void }
>(function PeriodPager({ renderPage, onChange }, ref) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<number>>(null);
  const current = useRef(0);
  const offsets = useMemo(() => Array.from({ length: SPAN * 2 + 1 }, (_, i) => i - SPAN), []);

  useImperativeHandle(
    ref,
    () => ({
      goTo: (offset, animated = true) => {
        current.current = offset;
        list.current?.scrollToIndex({ index: offset + SPAN, animated });
        onChange?.(offset);
      },
    }),
    [onChange],
  );

  const onEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = Math.round(e.nativeEvent.contentOffset.x / width) - SPAN;
      if (offset !== current.current) {
        current.current = offset;
        onChange?.(offset);
      }
    },
    [onChange, width],
  );

  return (
    <FlatList
      ref={list}
      horizontal
      pagingEnabled
      data={offsets}
      keyExtractor={String}
      initialScrollIndex={SPAN}
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      renderItem={({ item }) => <View style={{ width }}>{renderPage(item)}</View>}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      onMomentumScrollEnd={onEnd}
      // New data (or a new width) re-renders the mounted pages.
      extraData={[renderPage, width]}
    />
  );
});
