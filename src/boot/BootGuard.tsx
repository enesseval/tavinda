import { Component, useSyncExternalStore, type ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

// Deliberately depends on nothing but react and react-native: it must work even when
// the rest of the app fails to load.

let fatal: Error | null = null;
const listeners = new Set<() => void>();

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e));
}

/** Records an unrecoverable startup/runtime error so BootGuard shows it. */
export function reportFatal(e: unknown): void {
  if (fatal) return;
  fatal = toError(e);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Plain error screen so a release build shows what went wrong instead of hanging. */
export function StartupError({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F7F5F0' }} contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#1C1B19' }}>Tavında açılamadı</Text>
      <Text style={{ fontSize: 15, color: '#6B675F' }}>Bu ekranın görüntüsünü gönder; hatayı buradan bulacağız.</Text>
      <Text selectable style={{ fontSize: 13, color: '#A3122A', fontFamily: 'Menlo' }}>
        {error.name}: {error.message}
      </Text>
      <Text selectable style={{ fontSize: 11, color: '#6B675F', fontFamily: 'Menlo' }}>
        {(error.stack ?? '').split('\n').slice(0, 14).join('\n')}
      </Text>
      {retry ? (
        <Text onPress={retry} style={{ fontSize: 17, fontWeight: '600', color: '#1C1B19', paddingVertical: 12 }}>
          Tekrar dene
        </Text>
      ) : null}
    </ScrollView>
  );
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: toError(e) };
  }
  render() {
    return this.state.error ? <StartupError error={this.state.error} /> : this.props.children;
  }
}

/** Outermost wrapper: shows render errors and fatal errors reported from anywhere. */
export function BootGuard({ children }: { children: ReactNode }) {
  const error = useSyncExternalStore(subscribe, () => fatal);
  if (error) return <StartupError error={error} />;
  return <Boundary>{children}</Boundary>;
}
