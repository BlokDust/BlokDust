### r6

* Added PitchShift and Vibrato Effect.
* Added Timeline/TimelineState/TimelineSignal which keeps track of all scheduled state changes.
* Clock uses requestAnimationFrame instead of ScriptProcessorNode
* Removed `onended` event from Tone.Source
* Refactored tests into individual files. 
* Renamed some Signal methods: `exponentialRampToValueNow`->`exponentialRampToValue`, `setCurrentValueNow`->`setRampPoint`
* LFO no longer starts at bottom of cycle. Starts at whatever phase it's set at.
* Transport is an event emitter. triggers events on "start", "stop", "pause", and "loop". 
* Oscillator accepts a "partials" array. 
* Microphone inherits from ExternalInput which is generalized for different inputs.
* New scheduling methods on Transport - `schedule`, `scheduleOnce`, and `scheduleRepeat`.
* Tone.Gain and Tone.Delay classes wrap the native Web Audio nodes.
* Moved [MidiToScore](https://github.com/Tonejs/MidiConvert) and [TypeScript](https://github.com/Tonejs/TypeScript) definitions to separate repos.
* Tone.Param wraps the native AudioParam and allows for unit conversion. 
* Quantization with Transport.quantize and using "@" in any Time. [Read more](https://github.com/Tonejs/Tone.js/wiki/Time).
* Control-rate generators for value interpolation, patterns, random numbers, and markov chains. 
* Scheduable musical events: Tone.Event, Tone.Loop, Tone.Part, Tone.Pattern, Tone.Sequence. 
* Player's playbackRate is now a signal and Noise includes a playbackRate signal. 
* All filterEnvelopes use new Tone.FrequencyEnvelope with frequency units and `baseFrequency` and `octaves` instead of `min` and `max`. 
* Phaser uses "octaves" instead of "depth" to be more consistent across the whole Tone.js API. 
* Presets now have [their own repo](https://github.com/Tonejs/Presets)

DEPRECATED:
* `setTimeout`, `setInterval`, `setTimeline` in favor of new `schedule`, `scheduleOnce`, and `scheduleRepeat`.
* Tone.Signal no longer takes an AudioParam in the first argument. Use Tone.Param instead. 
* Tone.Buffer.onload/onprogress/onerror is deprecated. Use `Tone.Buffer.on("load", callback)` instead. 

### r5

* reverse buffer for Player and Sampler.
* Tone.Volume for simple volume control in Decibels.
* Panner uses StereoPannerNode when available.
* AutoFilter and Tremolo effects. 
* Made many attributes read-only. preventing this common type of error: `oscillator.frequency = 200` when it should be `oscillator.frequency.value = 200`.
* Envelope supports "linear" and "exponential" attack curves. 
* Renamed Tone.EQ -> Tone.EQ3. 
* Tone.DrumSynth makes kick and tom sounds.
* Tone.MidSideCompressor and Tone.MidSideSplit/Tone.MidSideMerge
* Tone.Oscillator - can specify the number of partials in the type: i.e. "sine10", "triangle3", "square4", etc.
* mute/unmute the master output: `Tone.Master.mute = true`. 
* 3 new simplified synths: SimpleSynth, SimpleAM and SimpleFM
* `harmonicity` is a signal-rate value for all instruments. 
* expose Q in Phaser. 
* unit conversions using Tone.Type for signals and LFO. 
* [new docs](http://tonejs.org/docs)
* [updated examples](http://tonejs.org/examples)

### r4

* `toFrequency` accepts notes by name (i.e. `"C4"`)
* Envelope no longer accepts exponential scaling, only Tone.ScaledEnvelope
* Buffer progress and load events which tracks the progress of all downloads
* Buffer only accepts a single url
* Sampler accepts multiple samples as an object.
* `setPitch` in sampler -> `setNote`
* Deprecated MultiSampler - use Sampler with PolySynth instead
* Added [cdn](http://cdn.tonejs.org/latest/Tone.min.js) - please don't use for production code
* Renamed DryWet to CrossFade
* Functions return `this` to allow for chaining. i.e. `player.toMaster().start(2)`.
* Added `units` to Signal class which allows signals to be set in terms of Tone.Time, Tone.Frequency, Numbers, or Decibels.
* Replaced set/get method with ES5 dot notation. i.e. `player.setVolume(-10)` is now `player.volume.value = -10`.
	To ramp the volume use either `player.volume.linearRampToValueNow(-10, "4n")`, or the new `rampTo` method which automaically selects the ramp (linear|exponential) based on the type of data. 
* set/get methods for all components
* syncSignal and unsyncSignal moved from Signal to Transport
* Add/Multiply/Subtract/Min/Max/GreaterThan/LessThan all extend Tone.Signal which allows them to be scheduled and automated just like Tone.Signal.
* Deprecated Tone.Divide and Tone.Inverse. They were more complicated than they were useful.

BREAKING CHANGES:

The API has been changed consistently to use `.attribute` for getting and setting instead of `getAttribute` and `setAttribute` methods. The reasoning for this is twofold: firstly, Tone.Signal attributes were previously limited in their scheduling capabilities when set through a setter function. For exactly, it was not possible to do a setValueAtTime on the `bpm` of the Transport. Secondly, the new EcmaScript 5 getter/setter approach resembles the Web Audio API much more closely, which will make intermixing the two APIs even easier. 

If you're using Sublime Text, one way to transition from the old API to the new one is with a regex find/replace:
	find `Tone.Transport.setBpm\((\d+)\)` and replace it with `Tone.Transport.bpm.value = $1`.

Or if setBpm was being invoked with a rampTime:
	find `Tone.Transport.setBpm\((\d+)\, (\d+)\)` and replace it with `Tone.Transport.bpm.rampTo($1, $2)`.


### r3

Core Change:

* Swing parameter on Transport
* Player loop positions stay in tempo-relative terms even with tempo changes
* Envelope ASDR stay in tempo-relative terms even with tempo changes
* Modified build script to accommodate using requirejs with build and minified version

Signal Processing:

* Tone.Expr: signal processing expression parser for Tone.Signal math
* All signal binary operators accept two signals as inputs
* Deprecated Tone.Threshold - new class Tone.GreaterThanZero
* NOT, OR, AND, and IfThenElse signal logic operators
* Additional signal classes: Inverse, Divide, Pow, AudioToGain, Subtract
* Scale no longer accepts input min/max. Assumes [0,1] range.
* Normalize class if scaling needs to happen from other input ranges
* WaveShaper function wraps the WaveShaperNode

Effects:

* Distortion and Chebyshev distortion effects
* Compressor and MultibandCompressor
* MidSide effect type and StereoWidener
* Convolver effect and example

Synths:

* Setters on PluckSynth and PulseOscillator
* new PWMOscillator
* OmniOscillator which combines PWMOscillator, Oscillator, and PulseOscillator into one
* NoiseSynth


### r2

* PluckSynth - Karplus-Strong Plucked String modeling synth
* Freeverb
* John Chowning Reverb (JCReverb)
* LowpassCombFilter and FeedbackCombFilter
* Sampler with pitch control
* Clock tick callback is out of the audio thread using setTimeout
* Optimized Tone.Modulo
* Tests run using OfflineRenderingContext
* Fixed Transport bug where timeouts/intervals and timelines were on a different tick counter
* AmplitudeEnvelope + triggerAttackDecay on Envelope
* Instruments inherit from Tone.Instrument base-class
* midi<-->note conversions


### r1 - First!