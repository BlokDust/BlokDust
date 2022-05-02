define(["Tone/core/Tone", "Tone/component/AmplitudeEnvelope", "Tone/component/FrequencyEnvelope", 
	"Tone/source/Noise", "Tone/signal/Signal", "Tone/component/Filter", "Tone/instrument/Instrument"], 
function(Tone){

	"use strict";

	/**
	 *  @class  Tone.NoiseSynth is composed of a noise generator (Tone.Noise), one filter (Tone.Filter), 
	 *          and two envelopes (Tone.Envelop). One envelope controls the amplitude
	 *          of the noise and the other is controls the cutoff frequency of the filter. 
	 *          <img src="https://docs.google.com/drawings/d/1rqzuX9rBlhT50MRvD2TKml9bnZhcZmzXF1rf_o7vdnE/pub?w=918&h=242">
	 *
	 *  @constructor
	 *  @extends {Tone.Instrument}
	 *  @param {Object} [options] the options available for the synth 
	 *                          see defaults below
	 * @example
	 * var noiseSynth = new Tone.NoiseSynth().toMaster();
	 * noiseSynth.triggerAttackRelease("8n");
	 */
	Tone.NoiseSynth = function(options){

		//get the defaults
		options = this.defaultArg(options, Tone.NoiseSynth.defaults);
		Tone.Instrument.call(this, options);

		/**
		 *  The noise source.
		 *  @type {Tone.Noise}
		 *  @example
		 * noiseSynth.set("noise.type", "brown");
		 */
		this.noise = new Tone.Noise();

		/**
		 *  The filter. 
		 *  @type {Tone.Filter}
		 */
		this.filter = new Tone.Filter(options.filter);

		/**
		 *  The filter envelope. 
		 *  @type {Tone.FrequencyEnvelope}
		 */
		this.filterEnvelope = new Tone.FrequencyEnvelope(options.filterEnvelope);

		/**
		 *  The amplitude envelope. 
		 *  @type {Tone.AmplitudeEnvelope}
		 */
		this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

		//connect the noise to the output
		this.noise.chain(this.filter, this.envelope, this.output);
		//start the noise
		this.noise.start();
		//connect the filter envelope
		this.filterEnvelope.connect(this.filter.frequency);
		this._readOnly(["noise", "filter", "filterEnvelope", "envelope"]);
	};

	Tone.extend(Tone.NoiseSynth, Tone.Instrument);

	/**
	 *  @const
	 *  @static
	 *  @type {Object}
	 */
	Tone.NoiseSynth.defaults = {
		"noise" : {
			"type" : "white"
		},
		"filter" : {
			"Q" : 6,
			"type" : "highpass",
			"rolloff" : -24
		},
		"envelope" : {
			"attack" : 0.005,
			"decay" : 0.1,
			"sustain" : 0.0,
		},
		"filterEnvelope" : {
			"attack" : 0.06,
			"decay" : 0.2,
			"sustain" : 0,
			"release" : 2,
			"baseFrequency" : 20,
			"octaves" : 5,
		}
	};

	/**
	 *  Start the attack portion of the envelopes. Unlike other 
	 *  instruments, Tone.NoiseSynth doesn't have a note. 
	 *  @param {Time} [time=now] the time the attack should start
	 *  @param {number} [velocity=1] the velocity of the note (0-1)
	 *  @returns {Tone.NoiseSynth} this
	 *  @example
	 * noiseSynth.triggerAttack();
	 */
	Tone.NoiseSynth.prototype.triggerAttack = function(time, velocity){
		//the envelopes
		this.envelope.triggerAttack(time, velocity);
		this.filterEnvelope.triggerAttack(time);	
		return this;	
	};

	/**
	 *  Start the release portion of the envelopes.
	 *  @param {Time} [time=now] the time the release should start
	 *  @returns {Tone.NoiseSynth} this
	 */
	Tone.NoiseSynth.prototype.triggerRelease = function(time){
		this.envelope.triggerRelease(time);
		this.filterEnvelope.triggerRelease(time);
		return this;
	};

	/**
	 *  Trigger the attack and then the release. 
	 *  @param  {Time} duration the duration of the note
	 *  @param  {Time} [time=now]     the time of the attack
	 *  @param  {number} [velocity=1] the velocity
	 *  @returns {Tone.NoiseSynth} this
	 */
	Tone.NoiseSynth.prototype.triggerAttackRelease = function(duration, time, velocity){
		time = this.toSeconds(time);
		duration = this.toSeconds(duration);
		this.triggerAttack(time, velocity);
		this.triggerRelease(time + duration);
		return this;
	};

	/**
	 *  Clean up. 
	 *  @returns {Tone.NoiseSynth} this
	 */
	Tone.NoiseSynth.prototype.dispose = function(){
		Tone.Instrument.prototype.dispose.call(this);
		this._writable(["noise", "filter", "filterEnvelope", "envelope"]);
		this.noise.dispose();
		this.noise = null;
		this.envelope.dispose();
		this.envelope = null;
		this.filterEnvelope.dispose();
		this.filterEnvelope = null;
		this.filter.dispose();
		this.filter = null;
		return this;
	};

	return Tone.NoiseSynth;
});