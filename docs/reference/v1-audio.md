# v1 audio facts (measured)

What v1 actually sounds like, as found by measuring v1 itself (`pnpm bd v1 audio`, `--eval` diagnostics) during
CHG-0002. Several differ from what v1's source code appears to say. The engine reproduces all of them
(AUDIO-0001, SPEC-AUDIO-V1-PARITY); file references are to `.cache/v1/app` and v1's vendored Tone r6.

## Gain staging
- Tone r6 converts decibels with **gain = 2^(dB/6)** (`Tone.prototype.dbToGain`), not 10^(dB/20). This applies to every
  Tone volume/param in dB (Tone.Volume, Tone.Mono, Master).
- Every source feeds its chain through **Tone.Mono**, whose input gain is **−10 dB → 2^(−10/6)**. Tone.Mono also
  downmixes stereo sources (noise buffers) to (L+R)/2.
- `Source.Settings.output.volume` (0.5) is **never applied**.
- Master: `Audio.MasterVolume` says −10 dB, but `MainScene.Begin` fades in from −30 in 2 dB steps every 70 ms *while
  below −10*, so it **settles at −12 dB → 0.25**. Loading a composition sets it to −100 first, then runs this fade.
- `Tone.Master.chain(compressor)` inserts the compressor **before** Master's volume stage: sources → chains →
  DynamicsCompressor (−8 dB threshold, knee 10, ratio 8, attack 0, release 0.05) → ×0.25 → output.
- Chromium's DynamicsCompressor make-up gain for those settings is **+2.08 dB**.

## Oscillators and noise
- Tone.Oscillator always uses a PeriodicWave (even for basic shapes) → Chromium's band-limited tables, normalised to a
  peak of 1. A naive PolyBLEP square/saw is ~1.4 dB louder and brighter.
- Noise: Tone loops 4 s buffers of `Math.random()` (white; pink = Kellet filter ×0.11; brown = leaky integrator ×3.5),
  one per channel. Measured v1 noise has a high-end droop matching linear interpolation at a fractional read position
  (≈ 0.18 sample); cause in Chromium not pinned down.

## Chains and pre-effects
- `ConnectionManager.Update` mutes master for 35 ms, disconnects everything and rebuilds every chain on any change.
  Each chain: sources summed → post-effects in series (DFS order) → master.
- Pre-effects run in a `setTimeout(0)` **after** Power has triggered sources, and `Source.UpdateConnections` resets
  envelopes to default first. So **a Power-held source always plays the default ADSR**; the Envelope block only shapes
  particle, pulse, laser and keyboard triggers.
- Vibrato and Scuzz are Tone.LFOs (min −depth, max +depth cents) connected to each oscillator's `detune` (a-rate).

## Effects
- **Reverb bug:** `new Tone.Freeverb(this.Params.dampening, this.Params.roomSize)`, but Freeverb's arguments are
  `(roomSize, dampening)`. A newly created or loaded v1 Reverb runs with the two **swapped** until a slider is moved
  (`SetParam` uses the right names). Dampening maps to the comb lowpass through `ScaleExp(100, 8000, 0.5)`.
- Freeverb, PingPongDelay and Chorus contain feedback cycles. Chromium processes a cycle by pulling nodes; the node
  re-entered while in progress returns its **previous render quantum** (128 frames). Measured placement: PingPong's
  L→R feedback, Chorus's L→R (its direct send→return path makes a delay-free cycle), and each Freeverb comb loop.
- Tone.Freeverb renders slightly differently run to run in Chromium (level spread ~0.9 dB); everything else is
  deterministic.
- Chorus has wet 1 (v1 never sets `wet`); StereoDelay ramps `delayTime` changes (`rampTo`); WaveShaper-based effects
  (Distortion 4096 points, BitCrusher's Tone.Modulo 65536 points) build curves with `i / len · 2 − 1`.
- **AutoWah** (Tone.AutoWah, v1: sensitivity −10 dB, gain 30): Tone.Follower drives a Tone.Filter built without a
  type, so it is a **lowpass** (Q 2 dB); rolloff −48 is **3** biquads in r6; then a peaking filter (+30 dB, Q 1).
  The follower's lowpass frequency is attack/release Hz switched by a ×10000 WaveShaper on |x| minus the output one
  render quantum earlier. Measured in v1.
- **Chomp**: a **peaking** filter (gain = Gain slider, Q = Width; measured in v1, not Tone's default lowpass), starting
  at round(101 − rate) Hz, then a `setTimeout` chain sets 100 + round(rand·10000) Hz every `rate` ms (≥ 4 ms nested).
  `bd v1 audio` freezes v1's timers while it renders, so its Chomp reference holds one random frequency (known failure).
- **Chopper** = Tone.Tremolo: per side gain 1 − (depth·LFO + 1)/2, LFO phases 90 ∓ spread/2. `mix` has no `SetParam`
  case: only its creation value counts.
- **PitchShifter** = Tone.PitchShift built with the pitch only: the window stays Tone's default **0.1 s** (v1's
  `windowSize` param has no slider and is never applied).
- **Convolver**: Tone.Convolver (ConvolverNode, normalised). v1's default impulse response (Teufelsberg, on
  files.blokdust.io) no longer exists; v2 uses a built-in deterministic hall (2.4 s RT60), and the panel's button
  loads the user's own file. Responses longer than 2.5 s are truncated.
- **Voices** (Source.ts): power and mono keyboards share one voice; Poly adds 8 (`Config.PolyphonicVoices`), stealing
  the oldest. Mono glide is `frequency.linearRampToValue(f, glide)` (relative ramp in Hz; samplers ramp playbackRate),
  skipped when the voice is (re)triggered. Releasing the sounding key stops it even if an older key is held.
- **Recorder** records `App.Audio.Master` (RecorderJS) and plays it back as a Tone.Simpler with `volume` +20 dB (Sample
  and SampleGen never apply their `volume`). v1 wrote the recording into a 1-channel 44.1 kHz buffer (wrong rate in a
  48 kHz context, last channel only); v2 keeps the real rate, stereo.
- **SampleGen** renders a 2 s random arpeggio with `Math.random` (v1 `DataToBuffer`, ported verbatim) and saves the
  recipe in `Params.seed`, so a loaded patch regenerates the same voices (its noise "roam" stays random, as in v1).

## Granular (CHG-0004 3.8)
v1 `Granular.GrainLoop` runs 12 `Tone.SimplePlayer`s, each with an `AmplitudeEnvelope`.
- **Envelope:** attack and release are `grainlength × 0.4`; the release triggers `grainlength × 0.6` after the attack.
- **Timing:** a grain starts every `round(grainlength × 2 / density × 1500)` ms.
- **Position:** each grain starts at `region − spread/2 + random × spread`, clamped to `[0, duration − grainlength]`,
  cycling through `density` players.
- **Audio length:** a player plays `grainlength × playbackRate × 1.9` s of audio, but the envelope ends it after
  `grainlength`.
- **Reference capture:** v1 schedules all of this with `setTimeout`, so `bd v1 audio` renders it in 10 ms steps with
  v1's timers running (fixture `stepped: true`). Chomp, also timer-driven, is captured the same way.

