// The plugins' usage stats switch (SPEC-SHARING-USAGE-ANALYTICS R7): a file every BlokDust on the
// machine shares. Read as plugin value usageStats; set with bd_analytics.
import type { JuceBackend } from '../app/plugin/juceBackend.ts';
import type { PluginValuesClient } from '../app/pluginValues.ts';

export function pluginUsageStats(
  juce: JuceBackend,
  values: PluginValuesClient,
  changed: () => void,
): { get(): boolean; set(on: boolean): void } {
  let on = true;
  values.follow('usageStats', (value) => {
    on = Boolean(value as unknown); // plugin values arrive unchecked
    changed();
  });
  return {
    get: () => on,
    set: (enabled) => {
      on = enabled;
      juce.emitEvent('bd_analytics', { on: enabled });
    },
  };
}
