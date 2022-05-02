define(["Tone/core/Tone", "Tone/core/Buffer", "Tone/source/SimpleSource"], function(Tone){

    "use strict";

    /**
     *  @class  Tone.SimplePlayer is an audio file player with start, loop, and stop functions.
     *
     *  @constructor
     *  @extends {Tone.SimpleSource}
     *  @param {string|AudioBuffer} url Either the AudioBuffer or the url from
     *                                  which to load the AudioBuffer
     *  @param {function=} onload The function to invoke when the buffer is loaded.
     *                            Recommended to use Tone.Buffer.onload instead.
     *  @example
     * var player = new Tone.SimplePlayer("./path/to/sample.mp3").toMaster();
     * Tone.Buffer.onload = function(){
	 * 	player.start();
	 * }
     */

    Tone.SimplePlayer = function(url){

        var options;
        if (url instanceof Tone.Buffer){
            url = url.get();
            options = Tone.SimplePlayer.defaults;
        } else {
            options = this.optionsObject(arguments, ["url", "onload"], Tone.SimplePlayer.defaults);
        }

        Tone.SimpleSource.call(this, options);

        /**
         *  @private
         *  @type {AudioBufferSourceNode}
         */
        this._source = null;
        this._lastSource = null;
        this._sourceGain = null;
        this._lastSourceGain = null;

        /**
         *  If the file should play as soon
         *  as the buffer is loaded.
         *  @type {boolean}
         *  @example
         * //will play as soon as it's loaded
         * var player = new Tone.SimplePlayer({
		 * 	"url" : "./path/to/sample.mp3",
		 * 	"autostart" : true,
		 * }).toMaster();
         */
        this.autostart = options.autostart;

        /**
         *  the buffer
         *  @private
         *  @type {Tone.Buffer}
         */
        this._buffer = new Tone.Buffer({
            "url" : options.url,
            "onload" : this._onload.bind(this, options.onload),
            "reverse" : options.reverse
        });
        if (url instanceof AudioBuffer){
            this._buffer.set(url);
        }

        /**
         *  if the buffer should loop once it's over
         *  @type {boolean}
         *  @private
         */
        this._loop = options.loop;

        /**
         *  if 'loop' is true, the loop will start at this position
         *  @type {Time}
         *  @private
         */
        this._loopStart = options.loopStart;

        /**
         *  if 'loop' is true, the loop will end at this position
         *  @type {Time}
         *  @private
         */
        this._loopEnd = options.loopEnd;

        /**
         * The playback speed of the buffer. 1 is normal speed.
         * @type {Positive}
         * @name playbackRate
         * @signal in all browsers except safari
         */
        if (Tone.isSafari) {
            this._playbackRate = options.playbackRate;
        } else {
            this.playbackRate = new Tone.Signal(options.playbackRate, Tone.Type.Positive);
            this._readOnly("playbackRate");
        }

        /**
         *  The detune control signal. Only works in browsers that support it
         *  @type {Cents}
         *  @signal
         */
        var s = this.context.createBufferSource();
        if (s.detune) {
            this.detune = new Tone.Signal(options.detune, Tone.Type.Cents);
            this._readOnly("detune");
        }

        /**
         *  Enabling retrigger will allow a player to be restarted
         *  before the the previous 'start' is done playing. Otherwise,
         *  successive calls to Tone.SimplePlayer.start will only start
         *  the sample if it had played all the way through.
         *  @type {boolean}
         */
        this.retrigger = options.retrigger;
    };

    Tone.extend(Tone.SimplePlayer, Tone.SimpleSource);

    /**
     *  the default parameters
     *  @static
     *  @const
     *  @type {Object}
     */
    Tone.SimplePlayer.defaults = {
        "onload" : Tone.noOp,
        "playbackRate" : 1,
        "loop" : false,
        "autostart" : false,
        "loopStart" : 0,
        "loopEnd" : 0,
        "retrigger" : false,
        "reverse" : false,
        "detune" : 0,
    };

    /**
     *  Load the audio file as an audio buffer.
     *  Decodes the audio asynchronously and invokes
     *  the callback once the audio buffer loads.
     *  Note: this does not need to be called if a url
     *  was passed in to the constructor. Only use this
     *  if you want to manually load a new url.
     * @param {string} url The url of the buffer to load.
     *                     Filetype support depends on the
     *                     browser.
     *  @param  {function=} callback The function to invoke once
     *                               the sample is loaded.
     *  @returns {Tone.SimplePlayer} this
     */
    Tone.SimplePlayer.prototype.load = function(url, callback){
        this._buffer.load(url, this._onload.bind(this, callback));
        return this;
    };

    /**
     * Internal callback when the buffer is loaded.
     * @private
     */
    Tone.SimplePlayer.prototype._onload = function(callback){
        callback(this);
        if (this.autostart){
            this.start();
        }
    };

    /**
     *  play the buffer between the desired positions
     *
     *  @private
     *  @param  {Time} [startTime=now] when the player should start.
     *  @param  {Time} [offset=0] the offset from the beginning of the sample
     *                                 to start at.
     *  @param  {Time=} duration how long the sample should play. If no duration
     *                                is given, it will default to the full length
     *                                of the sample (minus any offset)
     *  @returns {Tone.SimplePlayer} this
     */
    Tone.SimplePlayer.prototype._start = function(offset, duration){
        if (this._buffer.loaded && this._buffer._buffer){
            var now = this.context.currentTime;

            //if it's a loop the default offset is the loopstart point
            if (this._loop){
                offset = this.defaultArg(offset, this._loopStart);
            } else {
                //otherwise the default offset is 0
                offset = this.defaultArg(offset, 0);
            }

            duration = this.defaultArg(duration, this._buffer.duration - offset);
            
            //if an existing voice needs cutting short
            if (this._lastSource) {
            	this._lastSourceGain.gain.setValueAtTime(1, this.context.currentTime);
            	this._lastSourceGain.gain.linearRampToValueAtTime(0, this.context.currentTime+0.001);
            	this._lastSource.stop(this.context.currentTime+0.001);
            }

            //make the source
            this._source = this.context.createBufferSource();
            this._lastSource = this._source;
            this._sourceGain = this.context.createGain();
            this._lastSourceGain = this._sourceGain;
            this._source.buffer = this._buffer.get();
            
            
            //set the looping properties
            if (this._loop){
                this._source.loop = this._loop;
                this._source.loopStart = this._loopStart;
                this._source.loopEnd = this._loopEnd;
                // this fixes a bug in chrome 42 that breaks looping
                // https://code.google.com/p/chromium/issues/detail?id=457099
                duration = 65536;
            }

            //and other properties

            if (Tone.isSafari) {
                this._source.playbackRate.value = this._playbackRate;
            } else {
                this.playbackRate.connect(this._source.playbackRate);
            }
            // Only connect detune signal in browsers that support it
            if (this._source.detune) {
                this.detune.connect(this._source.detune);
            }
            
            // connect
            this._sourceGain.connect(this.output);
            this._source.connect(this._sourceGain);
            
            
            //start it
            if (this._loop){
                this._source.start(now, offset);
            } else {
                this._source.start(now, offset, duration);
            }
        } else {
            console.log("tried to start Player before the buffer was loaded");
        }
    };

    /**
     *  Stop playback.
     *  @private
     *  @param  {Time} [time=now]
     *  @returns {Tone.SimplePlayer} this
     */
    Tone.SimplePlayer.prototype._stop = function(time){
        if (this._source){
            this._source.stop(time);
            this._source = null;
        }
    };

    /**
     *  Set the loop start and end. Will only loop if loop is
     *  set to true.
     *  @param {Time} loopStart The loop end time
     *  @param {Time} loopEnd The loop end time
     *  @returns {Tone.SimplePlayer} this
     *  @example
     * //loop 0.1 seconds of the file.
     * player.setLoopPoints(0.2, 0.3);
     * player.loop = true;
     */
    Tone.SimplePlayer.prototype.setLoopPoints = function(loopStart, loopEnd){
        this.loopStart = loopStart;
        this.loopEnd = loopEnd;
        return this;
    };

    /**
     * If loop is true, the loop will start at this position.
     * @memberOf Tone.SimplePlayer#
     * @type {Time}
     * @name loopStart
     */
    Object.defineProperty(Tone.SimplePlayer.prototype, "loopStart", {
        get : function(){
            return this._loopStart;
        },
        set : function(loopStart){
            this._loopStart = loopStart;
            if (this._source){
                this._source.loopStart = this.toSeconds(loopStart);
            }
        }
    });

    /**
     * If loop is true, the loop will end at this position.
     * @memberOf Tone.SimplePlayer#
     * @type {Time}
     * @name loopEnd
     */
    Object.defineProperty(Tone.SimplePlayer.prototype, "loopEnd", {
        get : function(){
            return this._loopEnd;
        },
        set : function(loopEnd){
            this._loopEnd = loopEnd;
            if (this._source){
                this._source.loopEnd = this.toSeconds(loopEnd);
            }
        }
    });

    /**
     * The audio buffer belonging to the player.
     * @memberOf Tone.SimplePlayer#
     * @type {Tone.Buffer}
     * @name buffer
     */
    Object.defineProperty(Tone.SimplePlayer.prototype, "buffer", {
        get : function(){
            return this._buffer;
        },
        set : function(buffer){
            this._buffer.set(buffer);
        }
    });

    /**
     * If the buffer should loop once it's over.
     * @memberOf Tone.SimplePlayer#
     * @type {boolean}
     * @name loop
     */
    Object.defineProperty(Tone.SimplePlayer.prototype, "loop", {
        get : function(){
            return this._loop;
        },
        set : function(loop){
            this._loop = loop;
            if (this._source){
                this._source.loop = loop;
            }
        }
    });

    if (Tone.isSafari) {
        /**
         * The playback speed. 1 is normal speed. This is not a signal because
         * Safari and iOS currently don't support playbackRate as a signal.
         * @memberOf Tone.SimplePlayer#
         * @type {number}
         * @name playbackRate
         */
        Object.defineProperty(Tone.SimplePlayer.prototype, "playbackRate", {
            get: function () {
                return this._playbackRate;
            },
            set: function (rate) {
                this._playbackRate = rate;
                if (this._source) {
                    this._source.playbackRate.value = rate;
                }
            }
        });
    }

    /**
     * The direction the buffer should play in
     * @memberOf Tone.SimplePlayer#
     * @type {boolean}
     * @name reverse
     */
    Object.defineProperty(Tone.SimplePlayer.prototype, "reverse", {
        get : function(){
            return this._buffer.reverse;
        },
        set : function(rev){
            this._buffer.reverse = rev;
        }
    });

    /**
     *  Dispose and disconnect.
     *  @return {Tone.SimplePlayer} this
     */
    Tone.SimplePlayer.prototype.dispose = function(){
        Tone.SimpleSource.prototype.dispose.call(this);
        if (this._source !== null){
            this._source.disconnect();
            this._source = null;
        }
        this._buffer.dispose();
        this._buffer = null;
        if (!Tone.isSafari) {
            this._writable("playbackRate");
            this.playbackRate.dispose();
            this.playbackRate = null;
        }
        if (this.detune){
            this._writable("detune");
            this.detune.dispose();
            this.detune = null;
        }
        return this;
    };

    return Tone.SimplePlayer;
});
