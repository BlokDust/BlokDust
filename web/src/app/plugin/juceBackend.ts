// The plugin's WebView bridge (JUCE): events to and from its processor.
export interface JuceBackend {
  emitEvent: (id: string, payload: unknown) => void;
  /** Each listener says what its message holds (the processor sends it). */
  addEventListener: (id: string, listener: (payload: never) => void) => unknown;
}
