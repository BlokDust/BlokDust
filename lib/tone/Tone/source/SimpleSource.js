define(["Tone/core/Tone", "Tone/component/Volume"],
    function(Tone){

        "use strict";

        /**
         *  @class  Base class for sources. Sources have start/stop methods
         *
         *  @constructor
         *  @extends {Tone}
         */
        Tone.SimpleSource = function(options){
            //Sources only have an output and no input
            Tone.call(this);

            options = this.defaultArg(options, Tone.SimpleSource.defaults);

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

            //make the output explicitly stereo
            this._volume.output.output.channelCount = 2;
            this._volume.output.output.channelCountMode = "explicit";
        };

        Tone.extend(Tone.SimpleSource);

        /**
         *  The default parameters
         *  @static
         *  @const
         *  @type {Object}
         */
        Tone.SimpleSource.defaults = {
            "volume" : 0,
        };

        /**
         *  Start the source at the specified time. If no time is given,
         *  start the source now.
         *  @param  {Time} [time=now] When the source should be started.
         *  @returns {Tone.SimpleSource} this
         *  @example
         * source.start("+0.5"); //starts the source 0.5 seconds from now
         */
        Tone.SimpleSource.prototype.start = function(time){
            if (this._start){
                this._start.apply(this, arguments);
            }
        };

        /**
         *  Stop the source at the specified time. If no time is given,
         *  stop the source now.
         *  @param  {Time} [time=now] When the source should be stopped.
         *  @returns {Tone.SimpleSource} this
         *  @example
         * source.stop(); // stops the source immediately
         */
        Tone.SimpleSource.prototype.stop = function(time){
            if (this._stop){
                this._stop.apply(this, arguments);
            }
        };

        /**
         *	Clean up.
         *  @return {Tone.SimpleSource} this
         */
        Tone.SimpleSource.prototype.dispose = function(){
            this.stop();
            Tone.prototype.dispose.call(this);
            this._volume.dispose();
            this._volume = null;
            this.volume = null;
        };

        return Tone.SimpleSource;
    });