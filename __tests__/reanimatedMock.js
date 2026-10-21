// Reanimated's own jest mock, plus what it lacks for react-native-reorderable-list.
// Mapped over 'react-native-reanimated/mock' so expo-router's test helpers get it too.
const { useRef } = require('react');
const mock = require('../node_modules/react-native-reanimated/lib/module/mock');

/** Like the real one: a callable ref that also has `.current`. */
function useAnimatedRef() {
  const ref = useRef(null);
  if (!ref.current) {
    const fn = (node) => {
      fn.current = node;
    };
    fn.current = null;
    ref.current = fn;
  }
  return ref.current;
}

module.exports = { ...mock, useAnimatedRef, useComposedEventHandler: () => undefined };
