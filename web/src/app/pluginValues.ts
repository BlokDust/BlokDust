// Values the plugin keeps outside the patch: the page sends bd_get ({keys}), it answers bd_values.
// Asked at start and on every focus return; a new value is a field here and a line in EditorSend.cpp.
import { onFocusReturn } from './focus.ts';
import type { JuceBackend } from './plugin/juceBackend.ts';

export interface PluginValues {
  /** Settings › About's switch: this install's choice (SPEC-SHARING-USAGE-ANALYTICS R7). */
  usageStats: boolean;
}

export interface PluginValuesClient {
  /** Call `listener` with the value whenever the plugin sends it. */
  follow: <Key extends keyof PluginValues>(
    key: Key,
    listener: (value: PluginValues[Key]) => void,
  ) => void;
  /** Ask for every followed value now (the page asks again by itself on each focus return). */
  ask: () => void;
}

export function pluginValues(plugin: JuceBackend): PluginValuesClient {
  const followers = new Map<string, (value: unknown) => void>();
  plugin.addEventListener('bd_values', (values: Partial<Record<string, unknown>> | null) => {
    for (const [key, value] of Object.entries(values ?? {})) followers.get(key)?.(value);
  });
  const ask = () => {
    if (followers.size) plugin.emitEvent('bd_get', { keys: [...followers.keys()] });
  };
  onFocusReturn(ask);
  return {
    follow: (key, listener) => {
      followers.set(key, listener as (value: unknown) => void);
    },
    ask,
  };
}
