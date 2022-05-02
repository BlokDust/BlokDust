define(["Tone/core/Tone", "Tone/core/Transport", "Tone/component/Volume",
		"Tone/core/Type", "Tone/core/TimelineState", "Tone/signal/Signal"],
	function(Tone){

		"use strict";

		/**
		 *  @class  Base class for sources. Sources have start/stop methods
		 *          and the ability to be synced to the
		 *          start/stop of Tone.Transport.
		 *
		 *  @constructor
		 *  @extends {Tone}
		 *  @example
		 * //Multiple state change events can be chained together,
		 * //but must be set in the correct order and with ascending times
		 *
		 * // OK
		 * state.start().stop("+0.2");
		 * // AND
		 * state.start().stop("+0.2").start("+0.4").stop("+0.7")
		 *
		 * // BAD
		 * state.stop("+0.2").start();
		 * // OR
		 * state.start("+0.3").stop("+0.2");
		 *
		 */
		Tone.Source = function(options){
			//Sources only have an output and no input
			Tone.call(this);

			options = this.defaultArg(options, Tone.Source.defaults);

			/**
			 *  The output volume node
			 *  @type  {Tone.Volume}
			 *  @private
			 */
			this._volume = this.output = new Tone.Volume(options.volume);

			/**
			 * The volume of the output in decibels.
			 * @type {Decibels}
			 * @signal
			 * @example
			 * source.volume.value = -6;
			 */
			this.volume = this._volume.volume;
			this._readOnly("volume");

			/**
			 * 	Keep track of the scheduled state.
			 *  @type {Tone.TimelineState}
			 *  @private
			 */
			this._state = new Tone.TimelineState(Tone.State.Stopped);

			//TODO: temporary until #132 gets fixed
			/**
			 *  the next time the source is started
			 *  @type {number}
			 *  @private
			 */
			this._nextStart = Infinity;

			//TODO: temporary until #132 gets fixed
			/**
			 *  the next time the source is stopped
			 *  @type {number}
			 *  @private
			 */
			this._nextStop = Infinity;

			/**
			 *  The synced `start` callback function from the transport
			 *  @type {Function}
			 *  @private
			 */
			this._syncStart = function(time, offset){
				time = this.toSeconds(time);
				time += this.toSeconds(this._startDelay);
				this.start(time, offset);
			}.bind(this);

			/**
			 *  The synced `stop` callback function from the transport
			 *  @type {Function}
			 *  @private
			 */
			this._syncStop = this.stop.bind(this);

			/**
			 *  The offset from the start of the Transport `start`
			 *  @type {Time}
			 *  @private
			 */
			this._startDelay = 0;

			//make the output explicitly stereo
			this._volume.output.output.channelCount = 2;
			this._volume.output.output.channelCountMode = "explicit";


			//TODO: temporary until #132 gets fixed
			/**
			 * 	keeps track of the timeout for chaning the state
			 * 	and calling the onended
			 *  @type {number}
			 *  @private
			 */
			this._timeout = -1;
		};

		Tone.extend(Tone.Source);

		/**
		 *  The default parameters
		 *  @static
		 *  @const
		 *  @type {Object}
		 */
		Tone.Source.defaults = {
			"volume" : 0,
		};

		/**
		 *  Returns the playback state of the source, either "started" or "stopped".
		 *  @type {Tone.State}
		 *  @readOnly
		 *  @memberOf Tone.Source#
		 *  @name state
		 */
		Object.defineProperty(Tone.Source.prototype, "state", {
			get : function(){
				return this._state.getStateAtTime(this.now());
			}
		});


		//TODO: temporary until #132 gets fixed
		Tone.Source.prototype._stateAtTime = function(time){
			time = this.toSeconds(time);
			if (this._nextStart <= time && this._nextStop > time){
				return Tone.State.Started;
			} else if (this._nextStop <= time){
				return Tone.State.Stopped; // Do we need this else if?
			} else {
				return Tone.State.Stopped;
			}
		};

		/**
		 *  Start the source at the specified time. If no time is given,
		 *  start the source now.
		 *  @param  {Time} [time=now] When the source should be started.
		 *  @returns {Tone.Source} this
		 *  @example
		 * source.start("+0.5"); //starts the source 0.5 seconds from now
		 */
		Tone.Source.prototype.start = function(time){
			time = this.toSeconds(time);
			//if (this._state.getStateAtTime(time) !== Tone.State.Started || this.retrigger){
			if (this._stateAtTime(time) !== Tone.State.Started || this.retrigger){
				//TODO: temporary until #132 gets fixed
				this._nextStart = time;
				this._nextStop = Infinity;
				this._state.setStateAtTime(Tone.State.Started, time);
				if (this._start){
					this._start.apply(this, arguments);
				}
			} else {
				//console.log('Cant start buffer. Buffer state isnt stopped');
			}
			return this;
		};

		/**
		 *  Stop the source at the specified time. If no time is given,
		 *  stop the source now.
		 *  @param  {Time} [time=now] When the source should be stopped.
		 *  @returns {Tone.Source} this
		 *  @example
		 * source.stop(); // stops the source immediately
		 */
		Tone.Source.prototype.stop = function(time){
			//time = this.toSeconds(time);
			var now = this.now();
			time = this.toSeconds(time, now);
			//if (this._state.getStateAtTime(time) === Tone.State.Started){
			if (this._stateAtTime(time) === Tone.State.Started){
				this._state.setStateAtTime(Tone.State.Stopped, time);
				//TODO: temporary until #132 gets fixed
				this._nextStop = this.toSeconds(time);
				clearTimeout(this._timeout);
				var diff = time - now;
				if (diff > 0){
					//add a small buffer before invoking the callback
					this._timeout = setTimeout(this.onended, diff * 1000 + 20);
				} else {
					this.onended();
				}
				if (this._stop){
					this._stop.apply(this, arguments);
				}
			}
			return this;
		};

		/**
		 *  Sync the source to the Transport so that when the transport
		 *  is started, this source is started and when the transport is stopped
		 *  or paused, so is the source.
		 *
		 *  @param {Time} [delay=0] Delay time before starting the source after the
		 *                               Transport has started.
		 *  @returns {Tone.Source} this
		 *  @example
		 * //sync the source to start 1 measure after the transport starts
		 * source.sync("1m");
		 * //start the transport. the source will start 1 measure later.
		 * Tone.Transport.start();
		 */
		Tone.Source.prototype.sync = function(delay){
			this._startDelay = this.defaultArg(delay, 0);
			Tone.Transport.on("start", this._syncStart);
			Tone.Transport.on("stop pause", this._syncStop);
			return this;
		};

		/**
		 *  Unsync the source to the Transport. See Tone.Source.sync
		 *  @returns {Tone.Source} this
		 */
		Tone.Source.prototype.unsync = function(){
			this._startDelay = 0;
			Tone.Transport.off("start", this._syncStart);
			Tone.Transport.off("stop pause", this._syncStop);
			return this;
		};

		/**
		 *	Clean up.
		 *  @return {Tone.Source} this
		 */
		Tone.Source.prototype.dispose = function(){
			this.stop();
			Tone.prototype.dispose.call(this);
			this.unsync();
			this._writable("volume");
			this._volume.dispose();
			this._volume = null;
			this.volume = null;
			this._state.dispose();
			this._state = null;
			this._syncStart = null;
			this._syncStart = null;
		};

		return Tone.Source;
	});