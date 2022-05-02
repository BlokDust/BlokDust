define(["Tone/core/Tone", "Tone/source/SimplePlayer", "Tone/component/AmplitudeEnvelope", "Tone/instrument/Instrument"],
    function(Tone){

        "use strict";

        /**
         *  @class A stripped back Tone.Sampler which plays an audio buffer
         *         through an amplitude envelope only. A sample's offset can
         *         be called using triggerAttack.
         *         Nested lists will be flattened.
         *
         *  @constructor
         *  @extends {Tone.Instrument}
         *  @param {Object|string} urls the urls of the audio file
         *  @param {Object} options the options object for the synth
         *  @example
         *  var simpler = new Simpler({
     *  	A : {
     *  		1 : {"./audio/casio/A1.mp3",
     *  		2 : "./audio/casio/A2.mp3",
     *  	},
     *  	"B.1" : "./audio/casio/B1.mp3",
     *  }).toMaster();
     *
     *  //listen for when all the samples have loaded
     * Tone.Buffer.onload = function(){
     *  simpler.triggerAttack(time, offset, velocity);
     * };
     */
        Tone.Simpler = function(urls, options){

            options = this.defaultArg(options, Tone.Simpler.defaults);
            Tone.Instrument.call(this, options);

            /**
             *  The sample player
             *  @type {Tone.SimplePlayer}
             */
            this.player = new Tone.SimplePlayer(options.player);

            /**
             *  the buffers
             *  @type {Object}
             *  @private
             */
            this._buffers = {};

            /**
             *  The amplitude envelope.
             *  @type {Tone.SimpleEnvelope}
             */
            this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

            /**
             *  The name of the current sample.
             *  @type {string}
             *  @private
             */
            this._sample = options.sample;

            //connections / setup
            this._loadBuffers(urls);
            this.player.chain(this.envelope, this.output);
            this._readOnly(["player", "envelope"]);
        };

        Tone.extend(Tone.Simpler, Tone.Instrument);

        /**
         *  the default parameters
         *  @static
         */
        Tone.Simpler.defaults = {
            "sample" : 0,
            "pitch" : 0,
            "player" : {
                "loop" : false,
            },
            "envelope" : {
                "attack" : 0.001,
                "decay" : 0,
                "sustain" : 1,
                "release" : 0.1,
            },
        };

        /**
         *  load the buffers
         *  @param   {Object} urls   the urls
         *  @private
         */
        Tone.Simpler.prototype._loadBuffers = function(urls){
            if (typeof urls === "string"){
                this._buffers["0"] = new Tone.Buffer(urls, function(){
                    this.sample = "0";
                }.bind(this));
            } else {
                urls = this._flattenUrls(urls);
                for (var buffName in urls){
                    this._sample = buffName;
                    var urlString = urls[buffName];
                    this._buffers[buffName] = new Tone.Buffer(urlString);
                }
            }
        };

        /**
         *  Flatten an object into a single depth object.
         *  thanks to https://gist.github.com/penguinboy/762197
         *  @param   {Object} ob
         *  @return  {Object}
         *  @private
         */
        Tone.Simpler.prototype._flattenUrls = function(ob) {
            var toReturn = {};
            for (var i in ob) {
                if (!ob.hasOwnProperty(i)) continue;
                if ((typeof ob[i]) == "object") {
                    var flatObject = this._flattenUrls(ob[i]);
                    for (var x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) continue;
                        toReturn[i + "." + x] = flatObject[x];
                    }
                } else {
                    toReturn[i] = ob[i];
                }
            }
            return toReturn;
        };

        /**
         *  Start the sample and trigger the envelope.
         *  @param {Tone.Time} [time=now] The time when the note should start
         *  @param {Tone.Time} [0] The offset time in the buffer (in seconds) where playback will begin
         *  @param {Tone.Time}  The duration of the portion (in seconds) to be played
         *  @param {number} [velocity=1] the velocity of the note
         *  @returns {Tone.Simpler} `this`
         */
        Tone.Simpler.prototype.triggerAttack = function(offset, duration){
            this.player.start(offset, duration);
            this.envelope.triggerAttack();
            return this;
        };

        /**
         *  Start the release portion of the sample. Will stop the sample once the
         *  envelope has fully released.
         *
         *  @param {Tone.Time} [time=now] The time when the note should release
         *  @returns {Tone.Simpler} this
         *  @example
         *  sampler.triggerRelease();
         */
        Tone.Simpler.prototype.triggerRelease = function(){
            var now = this.context.currentTime;
            this.envelope.triggerRelease();
            this.player.stop(this.envelope.release + now);
            return this;
        };

        /**
         * Start and stop the sampler for a length of time
         *  @param {Tone.Time} length of playback time before the release kicks in
         *  @param {Tone.Time} offset time in the buffer (in seconds) where playback will begin
         *  @param {Tone.Time}  duration of the portion (in seconds) to be played
         */
        Tone.Simpler.prototype.triggerAttackRelease = function(length, offset, duration){
            this.triggerAttack(offset, duration);
            var that = this;
            setTimeout(function(){
                that.triggerRelease();
            }, length);
            return this;
        };

        /**
         * The name of the sample to trigger.
         * @memberOf Tone.Simpler#
         * @type {number|string}
         * @name sample
         * @example
         * //set the sample to "A.2" for next time the sample is triggered
         * sampler.sample = "A.2";
         */
        Object.defineProperty(Tone.Simpler.prototype, "sample", {
            get : function(){
                return this._sample;
            },
            set : function(name){
                if (this._buffers.hasOwnProperty(name)){
                    this._sample = name;
                    this.player.buffer = this._buffers[name];
                } else {
                    throw new Error("Simpler does not have a sample named "+name);
                }
            }
        });

        /**
         * The direction the buffer should play in
         * @memberOf Tone.Simpler#
         * @type {boolean}
         * @name reverse
         */
        Object.defineProperty(Tone.Simpler.prototype, "reverse", {
            get : function(){
                for (var i in this._buffers){
                    return this._buffers[i].reverse;
                }
            },
            set : function(rev){
                for (var i in this._buffers){
                    this._buffers[i].reverse = rev;
                }
            }
        });

        /**
         *  clean up
         *  @returns {Tone.Simpler} this
         */
        Tone.Simpler.prototype.dispose = function(){
            Tone.Instrument.prototype.dispose.call(this);
            this._writable(["player", "envelope"]);
            this.player.dispose();
            this.envelope.dispose();
            this.player = null;
            this.envelope = null;
            for (var sample in this._buffers){
                this._buffers[sample].dispose();
                this._buffers[sample] = null;
            }
            this._buffers = null;
            return this;
        };

        return Tone.Simpler;
    });
