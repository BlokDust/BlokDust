// Values the plugin keeps outside the patch, asked for by name: the page sends bd_get ({keys}), the plugin answers
// bd_values ({name: value}) with the names it knows. Asked when the page starts and again each time it comes back into
// focus, as another BlokDust or the DAW may have changed them. A new value: a field in PluginValues here and one line
// in BlokDustEditor::sendValues (plugin/src/EditorSend.cpp).
import { onFocusReturn } from './focus.ts';

export interface Bridge {
  emitEvent(id: string, payload: unknown): void;
  addEventListener<T>(id: string, fn: (payload: T) => void): unknown;
}

export interface PluginValues {
  /** Settings › About's switch: this install's choice (SPEC-SHARING-USAGE-ANALYTICS R7). */
  usageStats: boolean;
}

export interface PluginValuesClient {
  /** Call `fn` with the value whenever the plugin sends it. */
  follow<K extends keyof PluginValues>(key: K, fn: (value: PluginValues[K]) => void): void;
  /** Ask for every followed value now (the page asks again by itself on each focus return). */
  ask(): void;
}

export function pluginValues(juce: Bridge): PluginValuesClient {
  const followers = new Map<string, (value: unknown) => void>();
  juce.addEventListener('bd_values', (values: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(values ?? {})) followers.get(key)?.(value);
  });
  const ask = () => {
    if (followers.size) juce.emitEvent('bd_get', { keys: [...followers.keys()] });
  };
  onFocusReturn(ask);
  return {
    follow: (key, fn) => {
      followers.set(key, fn as (value: unknown) => void);
    },
    ask,
  };
}
