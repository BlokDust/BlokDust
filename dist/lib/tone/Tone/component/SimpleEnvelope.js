define(["Tone/core/Tone", "Tone/signal/Signal",
    "Tone/signal/Pow", "Tone/core/Type"], function(Tone){

    "use strict";

    /**
     *  @class  Tone.SimpleEnvelope is an [ADSR](https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope)
     *          envelope generator. Tone.SimpleEnvelope outputs a signal which
     *          can be connected to an AudioParam or Tone.Signal.
     *          This runs faster than the Tone.Envelope but is limited in that the time
     *          parameters need to be of type number in seconds.
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
        this._minOutput = 0.00001;

        /**
         *  the attack curve shape
         *  @type {string}
         *  @private
         */
        this._attackCurve = Tone.SimpleEnvelope.Type.Linear;

        /**
         *  the decay curve shape
         *  @type {string}
         *  @private
         */
        this._decayCurve = Tone.SimpleEnvelope.Type.Exponential;

        /**
         *  the release curve shape
         *  @type {string}
         *  @private
         */
        this._releaseCurve = Tone.SimpleEnvelope.Type.Exponential;

        /**
         *  the signal
         *  @type {Tone.Signal}
         *  @private
         */
        this._sig = this.output = new Tone.Signal();
        this._sig.setValueAtTime(0, 0);

        //set the attackCurve initially
        this.attackCurve = options.attackCurve;
        this.decayCurve = options.decayCurve;
        this.releaseCurve = options.releaseCurve;

        /**
         *  the input node
         *  @type {GainNode}
         *  @private
         */
        this.input = this.output = new Tone.Gain();

        this._sig.connect(this.output.gain);
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
        "attackCurve" : "linear",
        "decayCurve" : "exponential",
        "releaseCurve" : "exponential",
    };

    /**
     *  the envelope time multipler
     *  @type {number}
     *  @private
     */
    Tone.SimpleEnvelope.prototype._timeMult = 0.25;

    /**
     * Read the current value of the envelope. Useful for
     * syncronizing visual output to the envelope.
     * @memberOf Tone.SimpleEnvelope#
     * @type {Number}
     * @name value
     * @readOnly
     */
    Object.defineProperty(Tone.SimpleEnvelope.prototype, "value", {
        get : function(){
            return this._sig.value;
        }
    });

    /**
     * The slope of the attack. Either "linear" or "exponential".
     * @memberOf Tone.SimpleEnvelope#
     * @type {string}
     * @name attackCurve
     * @example
     * env.attackCurve = "linear";
     */
    Object.defineProperty(Tone.SimpleEnvelope.prototype, "attackCurve", {
        get : function(){
            return this._attackCurve;
        },
        set : function(type){
            if (type === Tone.SimpleEnvelope.Type.Linear ||
                type === Tone.SimpleEnvelope.Type.Exponential){
                this._attackCurve = type;
            } else {
                throw Error("attackCurve must be either \"linear\" or \"exponential\". Invalid type: ", type);
            }
        }
    });

    /**
     * The slope of the Decay. Either "linear" or "exponential".
     * @memberOf Tone.SimpleEnvelope#
     * @type {string}
     * @name decayCurve
     * @example
     * env.decayCurve = "linear";
     */
    Object.defineProperty(Tone.SimpleEnvelope.prototype, "decayCurve", {
        get : function(){
            return this._decayCurve;
        },
        set : function(type){
            if (type === Tone.SimpleEnvelope.Type.Linear ||
                type === Tone.SimpleEnvelope.Type.Exponential){
                this._decayCurve = type;
            } else {
                throw Error("decayCurve must be either \"linear\" or \"exponential\". Invalid type: ", type);
            }
        }
    });

    /**
     * The slope of the Release. Either "linear" or "exponential".
     * @memberOf Tone.SimpleEnvelope#
     * @type {string}
     * @name releaseCurve
     * @example
     * env.releaseCurve = "linear";
     */
    Object.defineProperty(Tone.SimpleEnvelope.prototype, "releaseCurve", {
        get : function(){
            return this._releaseCurve;
        },
        set : function(type){
            if (type === Tone.SimpleEnvelope.Type.Linear ||
                type === Tone.SimpleEnvelope.Type.Exponential){
                this._releaseCurve = type;
            } else {
                throw Error("releaseCurve must be either \"linear\" or \"exponential\". Invalid type: ", type);
            }
        }
    });

    /**
     *  Trigger the attack/decay portion of the ADSR envelope.
     *  @param  {number} [time=now] When the attack should start.
     *  @param {NormalRange} [velocity=1] The velocity of the envelope scales the vales.
     *                               number between 0-1
     *  @returns {Tone.SimpleEnvelope} this
     *  @example
     *  //trigger the attack 0.5 seconds from now with a velocity of 0.2
     *  env.triggerAttack("+0.5", 0.2);
     */
    Tone.SimpleEnvelope.prototype.triggerAttack = function(time, velocity){
        time = this.defaultArg(time, 0) + Tone.context.currentTime;
        var attack = this.toSeconds(this.attack);
        var decay = this.toSeconds(this.decay) * this._timeMult;
        velocity = this.defaultArg(velocity, 1);
        this._sig.cancelScheduledValues( time );
        // Anchor beginning of ramp at current value.
        this._sig.setValueAtTime(this._sig.value, time);
        // Ramp quickly up.
        if (this._attackCurve === Tone.SimpleEnvelope.Type.Linear){
            this._sig.linearRampToValueAtTime(velocity, time + attack);
        } else {
            this._sig.exponentialRampToValueAtTime(velocity, time + attack);
        }
        // Then decay down to a sustain level.
        if (this._decayCurve === Tone.SimpleEnvelope.Type.Linear){
            this._sig.linearRampToValueAtTime(this.sustain * velocity, time + attack + decay);
        } else {
            this._sig.exponentialRampToValueAtTime(this.sustain * velocity, time + attack + decay);
        }
        return this;
    };

    /**
     *  Triggers the release of the envelope.
     *  @param  {number} [time=now] When the release portion of the envelope should start.
     *  @returns {Tone.SimpleEnvelope} this
     *  @example
     *  //trigger release immediately
     *  env.triggerRelease();
     */
    Tone.SimpleEnvelope.prototype.triggerRelease = function(time){
        time = this.defaultArg(time, 0) + Tone.context.currentTime;
        var release = this.toSeconds(this.release) * this._timeMult;
        this._sig.cancelScheduledValues( time );
        // Anchor beginning of ramp at current value.
        this._sig.setValueAtTime(this._sig.value, time);
        // Third value controls how slow the value decays.
        if (this._releaseCurve === Tone.SimpleEnvelope.Type.Linear){
            this._sig.linearRampToValueAtTime(this._minOutput, time + release);
        } else {
            this._sig.exponentialRampToValueAtTime(this._minOutput, time + release);
        }
        this._sig.exponentialRampToValueAtTime(this._minOutput, time + release);
        return this;
    };

    /**
     *  triggerAttackRelease is shorthand for triggerAttack, then waiting
     *  some duration, then triggerRelease.
     *  @param {Time} duration The duration of the sustain.
     *  @param {number} [time=now] When the attack should be triggered.
     *  @param {number} [velocity=1] The velocity of the envelope.
     *  @returns {Tone.SimpleEnvelope} this
     *  @example
     * //trigger the attack and then the release after 0.6 seconds.
     * env.triggerAttackRelease(0.6);
     */
    Tone.SimpleEnvelope.prototype.triggerAttackRelease = function(duration, time, velocity) {
        this.triggerAttack(time, velocity);
        this.triggerRelease(time + this.toSeconds(duration));
        return this;
    };

    /**
     *  Borrows the connect method from Tone.Signal.
     *  @function
     *  @private
     */
    Tone.SimpleEnvelope.prototype.connect = Tone.Signal.prototype.connect;

    /**
     *  Disconnect and dispose.
     *  @returns {Tone.SimpleEnvelope} this
     *  @returns {Tone.SimpleEnvelope} this
     */
    Tone.SimpleEnvelope.prototype.dispose = function(){
        this.input.dispose();
        this.input = null;
        Tone.prototype.dispose.call(this);
        this._sig.dispose();
        this._sig = null;
        return this;
    };

    /**
     *  The phase of the envelope.
     *  @enum {string}
     */
    Tone.SimpleEnvelope.Type = {
        Linear : "linear",
        Exponential : "exponential",
    };

    return Tone.SimpleEnvelope;
});
