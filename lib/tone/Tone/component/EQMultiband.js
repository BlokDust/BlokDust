define(["Tone/core/Tone", "Tone/component/Filter"], function(Tone){

    "use strict";

    /**
     *  @class  6BandEQ object which uses 6 Filters //TODO add methods for adding more bands
     *
     *  @extends {Tone}
     *  @constructor
     *  @param {Array} Array of options objects for each bands filter setting. The amount of items in the array
     *  denotes how many EQ bands there will be
     */
    Tone.EQMultiband = function(options){


        //TODO: get all of the defaults
        //options = Tone.EQMultiband.defaults;


        this._bands = [];

        /**
         *  the number of EQ bands.
         *  @type {number}
         */
        this.numberOfBands = options.length;


        for (var i = 0; i < this.numberOfBands; i++) {
            var filter = new Tone.Filter({
                "type" : options[i].type,
                "frequency" : options[i].frequency,
                "rolloff" : options[i].rolloff,
                "Q" : options[i].Q,
                "gain" : options[i].gain
            });
            this._bands.push(filter);
        }

        this.input = this._bands[0];
        this.output = this._bands[this.numberOfBands-1];

        //Connect all the filters
        var currentUnit = this._bands[0];
        for (var j = 1; j < this._bands.length; j++) {
            var toUnit = this._bands[j];
            currentUnit.connect(toUnit);
            currentUnit = toUnit;
        }
    };

    Tone.extend(Tone.EQMultiband);

    /**
     *  the default parameters
     *
     *  @static
     *  @type {Object}
     */
    Tone.EQMultiband.defaults = [
        {
            "type" : "lowshelf",
            "frequency" : 80,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 0
        },
        {
            "type" : "peaking",
            "frequency" : 160,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 0
        },
        {
            "type" : "peaking",
            "frequency" : 480,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 0
        },
        {
            "type" : "peaking",
            "frequency" : 1200,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 0
        },
        {
            "type" : "peaking",
            "frequency" : 3000,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 5
        },
        {
            "type" : "highshelf",
            "frequency" : 12000,
            "rolloff" : -12,
            "Q" : 1,
            "gain" : 10
        }
    ];


    /**
     *  set the type
     *  @param {string} type the filter type
     *  @param {number} the EQ band
     */
    Tone.EQMultiband.prototype.setType = function(type, band){
        this._bands[band-1].type = type;
    };

    /**
     *  get the type
     *  @param {number} the EQ band
     *  @return {string} the type of the filter
     */
    Tone.EQMultiband.prototype.getType = function(band){
        return this._bands[band-1].type;
    };

    /**
     *  set the frequency
     *  @param {number} freq the frequency value
     *  @param {number} the EQ band
     */
    Tone.EQMultiband.prototype.setFrequency = function(freq, band){
        this._bands[band-1].frequency.value = freq;
    };

    /**
     *  get the frequency
     *  @param {number} the EQ band
     *  @return {number} the frequency of the EQ
     */
    Tone.EQMultiband.prototype.getFrequency = function(band){
        return this._bands[band-1].frequency.value;
    };

    /**
     *  set the quality of the filter
     *  @param {number} Q the filter's Q
     *  @param {number} the EQ band
     */
    Tone.EQMultiband.prototype.setQ = function(Q, band){
        this._bands[band-1].Q.value = Q;
    };

    /**
     *  get the Q
     *  @param {number} the EQ band
     *  @return {number} the Q value
     */
    Tone.EQMultiband.prototype.getQ = function(band){
        return this._bands[band-1].Q.value;
    };

    /**
     *  set the bands gain
     *  @param {number} the gain of this band
     *  @param {number} the EQ band
     */
    Tone.EQMultiband.prototype.setGain = function(gain, band){
        this._bands[band-1].gain.value = gain;
    };

    /**
     *  get the gain
     *  @param {number} the EQ band
     *  @return {number} the current gain value
     */
    Tone.EQMultiband.prototype.getGain = function(band){
        return this._bands[band-1].gain.value;
    };


    /**
     *  clean up
     */
    Tone.EQMultiband.prototype.dispose = function(){
        Tone.prototype.dispose.call(this);
        for (var i = 0; i < this._bands.length; i++) {
            this._bands[i].dispose();
        }
        this.numberOfBands = null;
        this._bands = null;
    };

    return Tone.EQMultiband;
});