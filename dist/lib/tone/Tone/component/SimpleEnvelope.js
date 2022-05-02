define(["Tone/core/Tone", "Tone/signal/Signal",
    "Tone/signal/Pow", "Tone/core/Type"], function(Tone){

    "use strict";

    /**
     *  @class  Tone.SimpleEnvelope is an [ADSR](https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope)
     *          envelope generator. Adapted from the more advanced Tone.Envelope. This cannot schedule triggers,
     *          release curves are always linear and there are no state checks.
     *          <img src="https://upload.wikimedia.org/wikipedia/commons/e/ea/ADSR_parameter.svg">
     *
     *  @constructor
     *  @extends {Tone}
     *  @param {Time} [attack] The amount of time it takes for the envelope to go from
     *                         0 to it's maximum value.
     *  @param {Time} [decay]	The period of time after the attack that it takes for the envelope
     *                       	to fall to the sustain value.
     *  @param {NormalRange} [sustain]	The percent of the maximum value that the envelope rests at until
     *                                	the release is triggered.
     *  @param {Time} [release]	The amount of time after the release is triggered it takes to reach 0.
     *  @example
     * //an amplitude envelope
     * var gainNode = Tone.context.createGain();
     * var env = new Tone.SimpleEnvelope({
	 * 	"attack" : 0.1,
	 * 	"decay" : 0.2,
	 * 	"sustain" : 1,
	 * 	"release" : 0.8,
	 * });
     * env.connect(gainNode.gain);
     */
    Tone.SimpleEnvelope = function(){

        //get all of the defaults
        var options = this.optionsObject(arguments, ["attack", "decay", "sustain", "release"], Tone.SimpleEnvelope.defaults);

        /**
         *  When triggerAttack is called, the attack time is the amount of
         *  time it takes for the envelope to reach it's maximum value.
         *  @type {Time}
         */
        this.attack = options.attack;

        /**
         *  After the attack portion of the envelope, the value will fall
         *  over the duration of the decay time to it's sustain value.
         *  @type {Time}
         */
        this.decay = options.decay;

        /**
         * 	The sustain value is the value
         * 	which the envelope rests at after triggerAttack is
         * 	called, but before triggerRelease is invoked.
         *  @type {NormalRange}
         */
        this.sustain = options.sustain;

        /**
         *  After triggerRelease is called, the envelope's
         *  value will fall to it's miminum value over the
         *  duration of the release time.
         *  @type {Time}
         */
        this.release = options.release;

        /**
         *  the minimum output value
         *  @type {number}
         *  @private
         */
        this._minOutput = 0.0001;

        /**
         *  the signal
         *  @type {Tone.TimelineSignal}
         *  @private
         */
        this._sig = this.output = new Tone.Signal();
        this._sig.setValueAtTime(this._minOutput, 0);
    };

    Tone.extend(Tone.SimpleEnvelope);

    /**
     *  the default parameters
     *  @static
     *  @const
     */
    Tone.SimpleEnvelope.defaults = {
        "attack" : 0.01,
        "decay" : 0.1,
        "sustain" : 0.5,
        "release" : 1,
    };

    /**
     *  Trigger the attack/decay portion of the ADSR envelope.
     *  @param  {Time} [time=now] When the attack should start.
     *  @param {NormalRange} [velocity=1] The velocity of the envelope scales the vales.
     *                               number between 0-1
     *  @returns {Tone.Envelope} this
     *  @example
     *  //trigger the attack 0.5 seconds from now with a velocity of 0.2
     *  env.triggerAttack("+0.5", 0.2);
     */
    Tone.SimpleEnvelope.prototype.triggerAttack = function(when, velocity){
        when = this.isUndef(when) ? this.context.currentTime : when;
        velocity = this.isUndef(velocity) ? 1 : velocity;
        this._sig.cancelScheduledValues(0);
        this._sig.setValueAtTime(this._sig.value, when);
        this._sig.linearRampToValueAtTime(velocity, when + this.attack);
        this._sig.linearRampToValueAtTime(this.sustain * velocity, when + this.attack + this.decay)
    };

    /**
     *  Triggers the release of the envelope.
     *  @param  {Time} [time=now] When the release portion of the envelope should start.
     *  @returns {Tone.Envelope} this
     *  @example
     *  //trigger release immediately
     *  env.triggerRelease();
     */
    Tone.SimpleEnvelope.prototype.triggerRelease = function(when){
        when = this.isUndef(when) ? this.context.currentTime : when;
        this._sig.cancelScheduledValues(0);
        this._sig.setValueAtTime(this._sig.value, when);
        this._sig.linearRampToValueAtTime(this._minOutput, when + this.release);
    };


    Tone.SimpleEnvelope.prototype.triggerAttackRelease = function(duration, when, velocity){
        when = this.isUndef(when) ? this.context.currentTime : when;
        duration = this.isUndef(duration) ? 0 : duration;
        velocity = this.isUndef(velocity) ? 1 : velocity;

        this._sig.cancelScheduledValues(0);

        // ATTACK
        this._sig.setValueAtTime(this._sig.value, when);
        this._sig.linearRampToValueAtTime(velocity, when + this.attack);
        this._sig.linearRampToValueAtTime(this.sustain * velocity, when + this.attack + this.decay)

        // RELEASE
        this._sig.setValueAtTime(this._sig.value, duration + when + this.attack + this.decay);
        this._sig.linearRampToValueAtTime(this._minOutput, duration + when + this.release + this.attack + this.decay);
    };

    /**
     *  Borrows the connect method from Tone.Signal.
     *  @function
     *  @private
     */
    Tone.SimpleEnvelope.prototype.connect = Tone.Signal.prototype.connect;

    /**
     *  Disconnect and dispose.
     *  @returns {Tone.Envelope} this
     */
    Tone.SimpleEnvelope.prototype.dispose = function(){
        Tone.prototype.dispose.call(this);
        this._sig.dispose();
        this._sig = null;
        return this;
    };

    return Tone.SimpleEnvelope;
});
