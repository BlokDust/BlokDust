define(["Tone/core/Tone", "Tone/component/AmplitudeEnvelope", "Tone/source/OmniOscillator", "Tone/signal/Signal", "Tone/instrument/Monophonic"], 
function(Tone){

	"use strict";

	/**
	 *  @class  Tone.SimpleSynth is composed simply of a Tone.OmniOscillator
	 *          routed through a Tone.AmplitudeEnvelope. 
	 *          <img src="https://docs.google.com/drawings/d/1-1_0YW2Z1J2EPI36P8fNCMcZG7N1w1GZluPs4og4evo/pub?w=1163&h=231">
	 *
	 *  @constructor
	 *  @extends {Tone.Monophonic}
	 *  @param {Object} [options] the options available for the synth 
	 *                          see defaults below
	 *  @example
	 * var synth = new Tone.SimpleSynth().toMaster();
	 * synth.triggerAttackRelease("C4", "8n");
	 */
	Tone.SimpleSynth = function(options){

		//get the defaults
		options = this.defaultArg(options, Tone.SimpleSynth.defaults);
		Tone.Monophonic.call(this, options);

		/**
		 *  The oscillator.
		 *  @type {Tone.OmniOscillator}
		 */
		this.oscillator = new Tone.OmniOscillator(options.oscillator);

		/**
		 *  The frequency control.
		 *  @type {Frequency}
		 *  @signal
		 */
		this.frequency = this.oscillator.frequency;

		/**
		 *  The detune control.
		 *  @type {Cents}
		 *  @signal
		 */
		this.detune = this.oscillator.detune;

		/**
		 *  The amplitude envelope.
		 *  @type {Tone.AmplitudeEnvelope}
		 */
		this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

		//connect the oscillators to the output
		this.oscillator.chain(this.envelope, this.output);
		//start the oscillators
		this.oscillator.start();
		this._readOnly(["oscillator", "frequency", "detune", "envelope"]);
	};

	Tone.extend(Tone.SimpleSynth, Tone.Monophonic);

	/**
	 *  @const
	 *  @static
	 *  @type {Object}
	 */
	Tone.SimpleSynth.defaults = {
		"oscillator" : {
			"type" : "triangle"
		},
		"envelope" : {
			"attack" : 0.005,
			"decay" : 0.1,
			"sustain" : 0.3,
			"release" : 1
		}
	};

	/**
	 *  start the attack portion of the envelope
	 *  @param {Time} [time=now] the time the attack should start
	 *  @param {number} [velocity=1] the velocity of the note (0-1)
	 *  @returns {Tone.SimpleSynth} this
	 *  @private
	 */
	Tone.SimpleSynth.prototype._triggerEnvelopeAttack = function(time, velocity){
		//the envelopes
		this.envelope.triggerAttack(time, velocity);
		return this;	
	};

	/**
	 *  start the release portion of the envelope
	 *  @param {Time} [time=now] the time the release should start
	 *  @returns {Tone.SimpleSynth} this
	 *  @private
	 */
	Tone.SimpleSynth.prototype._triggerEnvelopeRelease = function(time){
		this.envelope.triggerRelease(time);
		return this;
	};


	/**
	 *  clean up
	 *  @returns {Tone.SimpleSynth} this
	 */
	Tone.SimpleSynth.prototype.dispose = function(){
		Tone.Monophonic.prototype.dispose.call(this);
		this._writable(["oscillator", "frequency", "detune", "envelope"]);
		this.oscillator.dispose();
		this.oscillator = null;
		this.envelope.dispose();
		this.envelope = null;
		this.frequency = null;
		this.detune = null;
		return this;
	};

	return Tone.SimpleSynth;
});