// Minimal react-native-worklets stand-in for Jest (0.5.x ships no mock).
const passthrough = (fn) => fn;
module.exports = {
  scheduleOnRN: (fn, ...args) => fn(...args),
  scheduleOnUI: (fn, ...args) => fn(...args),
  runOnJS: passthrough,
  runOnUI: passthrough,
  runOnUISync: (fn, ...args) => fn(...args),
  executeOnUIRuntimeSync: passthrough,
  isWorkletFunction: () => false,
  createSerializable: (v) => v,
  makeShareableCloneRecursive: (v) => v,
};
