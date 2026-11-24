// Settings › About's usage stats switch in the plugins (SPEC-SHARING-USAGE-ANALYTICS R7): the install's choice, kept by
// the processor in a file every BlokDust on the machine shares (on iPad: the app and its extensions). The page reads it
// as a plugin value (usageStats, asked again on each focus return) and sets it with bd_analytics.
import type { Bridge, PluginValuesClient } from '../app/pluginValues.ts';

export function pluginUsageStats(
  juce: Bridge,
  values: PluginValuesClient,
  changed: () => void,
): { get(): boolean; set(on: boolean): void } {
  let on = true;
  values.follow('usageStats', (v) => {
    on = !!v;
    changed();
  });
  return {
    get: () => on,
    set: (v) => {
      on = v;
      juce.emitEvent('bd_analytics', { on: v });
    },
  };
}
