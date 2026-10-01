import { NativeModules, TurboModuleRegistry } from 'react-native';

// Only react-native imports: this must work when Expo's native modules are broken.

type ExpoGlobal = { expo?: { modules?: Record<string, unknown> } };

function expoModuleNames(): string[] {
  try {
    const modules = (globalThis as ExpoGlobal).expo?.modules;
    return modules ? Object.keys(modules).sort() : [];
  } catch {
    return [];
  }
}

function safe(fn: () => unknown): string {
  try {
    return fn() ? 'var' : 'yok';
  } catch (e) {
    return `hata: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Plain-text snapshot of how Expo native modules are wired, for the startup error screen. */
export function nativeReport(): string {
  const g = globalThis as ExpoGlobal & { RN$Bridgeless?: boolean; nativeFabricUIManager?: unknown };
  const names = expoModuleNames();
  const legacy = (NativeModules as Record<string, { exportedMethods?: Record<string, unknown> } | undefined>)
    .NativeUnimoduleProxy;
  return [
    `bridgeless: ${String(!!g.RN$Bridgeless)} · fabric: ${String(!!g.nativeFabricUIManager)}`,
    `global.expo: ${typeof g.expo} · expo.modules: ${typeof g.expo?.modules}`,
    `ExpoModulesCore turbo: ${safe(() => TurboModuleRegistry.get('ExpoModulesCore'))}`,
    `NativeUnimoduleProxy: ${legacy ? `var (${Object.keys(legacy.exportedMethods ?? {}).length} modül)` : 'yok'}`,
    `ExpoLinking şimdi: ${safe(() => g.expo?.modules?.ExpoLinking)}`,
    `expo.modules (${names.length}): ${names.join(', ') || '—'}`,
  ].join('\n');
}
