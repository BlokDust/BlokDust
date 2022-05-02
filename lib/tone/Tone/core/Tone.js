/**
 *  Tone.js
 *  @author Yotam Mann
 *  @license http://opensource.org/licenses/MIT MIT License
 *  @copyright 2014-2015 Yotam Mann
 */
define(function(){

	"use strict";

	//////////////////////////////////////////////////////////////////////////
	//	WEB AUDIO CONTEXT
	///////////////////////////////////////////////////////////////////////////

	//borrowed from underscore.js
	function isUndef(val){
		return val === void 0;
	}

	//borrowed from underscore.js
	function isFunction(val){
		return typeof val === "function";
	}

	var audioContext;

	//polyfill for AudioContext and OfflineAudioContext
	if (isUndef(window.AudioContext)){
		window.AudioContext = window.webkitAudioContext;
	} 
	if (isUndef(window.OfflineAudioContext)){
		window.OfflineAudioContext = window.webkitOfflineAudioContext;
	} 

	if (!isUndef(AudioContext)){
		audioContext = new AudioContext();
	} else {
		throw new Error("Web Audio is not supported in this browser");
	}

	//SHIMS////////////////////////////////////////////////////////////////////

	if (!isFunction(AudioContext.prototype.createGain)){
		AudioContext.prototype.createGain = AudioContext.prototype.createGainNode;
	}
	if (!isFunction(AudioContext.prototype.createDelay)){
		AudioContext.prototype.createDelay = AudioContext.prototype.createDelayNode;
	}
	if (!isFunction(AudioContext.prototype.createPeriodicWave)){
		AudioContext.prototype.createPeriodicWave = AudioContext.prototype.createWaveTable;
	}
	if (!isFunction(AudioBufferSourceNode.prototype.start)){
		AudioBufferSourceNode.prototype.start = AudioBufferSourceNode.prototype.noteGrainOn;
	}
	if (!isFunction(AudioBufferSourceNode.prototype.stop)){
		AudioBufferSourceNode.prototype.stop = AudioBufferSourceNode.prototype.noteOff;
	}
	if (!isFunction(AudioBuffer.prototype.copyToChannel)){
		AudioBuffer.prototype.copyToChannel = function(source, channelNumber, startInChannel) {
			var clipped = source.subarray(0, Math.min(source.length, this.length - (startInChannel|0)));
			this.getChannelData(channelNumber|0).set(clipped, startInChannel|0);
		};
	}
	if (!isFunction(OscillatorNode.prototype.start)){
		OscillatorNode.prototype.start = OscillatorNode.prototype.noteOn;
	}
	if (!isFunction(OscillatorNode.prototype.stop)){
		OscillatorNode.prototype.stop = OscillatorNode.prototype.noteOff;	
	}
	if (!isFunction(OscillatorNode.prototype.setPeriodicWave)){
		OscillatorNode.prototype.setPeriodicWave = OscillatorNode.prototype.setWaveTable;	
	}
	//extend the connect function to include Tones
	AudioNode.prototype._nativeConnect = AudioNode.prototype.connect;
	AudioNode.prototype.connect = function(B, outNum, inNum){
		if (B.input){
			if (Array.isArray(B.input)){
				if (isUndef(inNum)){
					inNum = 0;
				}
				this.connect(B.input[inNum]);
			} else {
				this.connect(B.input, outNum, inNum);
			}
		} else {
			try {
				if (B instanceof AudioNode){
					this._nativeConnect(B, outNum, inNum);
				} else {
					this._nativeConnect(B, outNum);
				}
			} catch (e) {
				throw new Error("error connecting to node: "+B);
			}
		}
	};

	///////////////////////////////////////////////////////////////////////////
	//	TONE
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  @class  Tone is the base class of all other classes. It provides 
	 *          a lot of methods and functionality to all classes that extend
	 *          it. 
	 *  
	 *  @constructor
	 *  @alias Tone
	 *  @param {number} [inputs=1] the number of input nodes
	 *  @param {number} [outputs=1] the number of output nodes
	 */
	var Tone = function(inputs, outputs){

		/**
		 *  the input node(s)
		 *  @type {GainNode|Array}
		 */
		if (isUndef(inputs) || inputs === 1){
			this.input = this.context.createGain();
		} else if (inputs > 1){
			this.input = new Array(inputs);
		}

		/**
		 *  the output node(s)
		 *  @type {GainNode|Array}
		 */
		if (isUndef(outputs) || outputs === 1){
			this.output = this.context.createGain();
		} else if (outputs > 1){
			this.output = new Array(inputs);
		}
	};

	/**
	 *  Set the parameters at once. Either pass in an
	 *  object mapping parameters to values, or to set a
	 *  single parameter, by passing in a string and value.
	 *  The last argument is an optional ramp time which 
	 *  will ramp any signal values to their destination value
	 *  over the duration of the rampTime.
	 *  @param {Object|string} params
	 *  @param {number=} value
	 *  @param {Time=} rampTime
	 *  @returns {Tone} this
	 *  @example
	 * //set values using an object
	 * filter.set({
	 * 	"frequency" : 300,
	 * 	"type" : highpass
	 * });
	 *  @example
	 * filter.set("type", "highpass");
	 *  @example
	 * //ramp to the value 220 over 3 seconds. 
	 * oscillator.set({
	 * 	"frequency" : 220
	 * }, 3);
	 */
	Tone.prototype.set = function(params, value, rampTime){
		if (this.isObject(params)){
			rampTime = value;
		} else if (this.isString(params)){
			var tmpObj = {};
			tmpObj[params] = value;
			params = tmpObj;
		}
		for (var attr in params){
			value = params[attr];
			var parent = this;
			if (attr.indexOf(".") !== -1){
				var attrSplit = attr.split(".");
				for (var i = 0; i < attrSplit.length - 1; i++){
					parent = parent[attrSplit[i]];
				}
				attr = attrSplit[attrSplit.length - 1];
			}
			var param = parent[attr];
			if (isUndef(param)){
				continue;
			}
			if ((Tone.Signal && param instanceof Tone.Signal) || 
					(Tone.Param && param instanceof Tone.Param)){
				if (param.value !== value){
					if (isUndef(rampTime)){
						param.value = value;
					} else {
						param.rampTo(value, rampTime);
					}
				}
			} else if (param instanceof AudioParam){
				if (param.value !== value){
					param.value = value;
				}				
			} else if (param instanceof Tone){
				param.set(value);
			} else if (param !== value){
				parent[attr] = value;
			}
		}
		return this;
	};

	/**
	 *  Get the object's attributes. Given no arguments get
	 *  will return all available object properties and their corresponding
	 *  values. Pass in a single attribute to retrieve or an array
	 *  of attributes. The attribute strings can also include a "."
	 *  to access deeper properties.
	 *  @example
	 * osc.get();
	 * //returns {"type" : "sine", "frequency" : 440, ...etc}
	 *  @example
	 * osc.get("type");
	 * //returns { "type" : "sine"}
	 * @example
	 * //use dot notation to access deep properties
	 * synth.get(["envelope.attack", "envelope.release"]);
	 * //returns {"envelope" : {"attack" : 0.2, "release" : 0.4}}
	 *  @param {Array=|string|undefined} params the parameters to get, otherwise will return 
	 *  					                  all available.
	 *  @returns {Object}
	 */
	Tone.prototype.get = function(params){
		if (isUndef(params)){
			params = this._collectDefaults(this.constructor);
		} else if (this.isString(params)){
			params = [params];
		} 
		var ret = {};
		for (var i = 0; i < params.length; i++){
			var attr = params[i];
			var parent = this;
			var subRet = ret;
			if (attr.indexOf(".") !== -1){
				var attrSplit = attr.split(".");
				for (var j = 0; j < attrSplit.length - 1; j++){
					var subAttr = attrSplit[j];
					subRet[subAttr] = subRet[subAttr] || {};
					subRet = subRet[subAttr];
					parent = parent[subAttr];
				}
				attr = attrSplit[attrSplit.length - 1];
			}
			var param = parent[attr];
			if (this.isObject(params[attr])){
				subRet[attr] = param.get();
			} else if (Tone.Signal && param instanceof Tone.Signal){
				subRet[attr] = param.value;
			} else if (Tone.Param && param instanceof Tone.Param){
				subRet[attr] = param.value;
			} else if (param instanceof AudioParam){
				subRet[attr] = param.value;
			} else if (param instanceof Tone){
				subRet[attr] = param.get();
			} else if (!isFunction(param) && !isUndef(param)){
				subRet[attr] = param;
			} 
		}
		return ret;
	};

	/**
	 *  collect all of the default attributes in one
	 *  @private
	 *  @param {function} constr the constructor to find the defaults from
	 *  @return {Array} all of the attributes which belong to the class
	 */
	Tone.prototype._collectDefaults = function(constr){
		var ret = [];
		if (!isUndef(constr.defaults)){
			ret = Object.keys(constr.defaults);
		}
		if (!isUndef(constr._super)){
			var superDefs = this._collectDefaults(constr._super);
			//filter out repeats
			for (var i = 0; i < superDefs.length; i++){
				if (ret.indexOf(superDefs[i]) === -1){
					ret.push(superDefs[i]);
				}
			}
		}
		return ret;
	};

	/**
	 *  @returns {string} returns the name of the class as a string
	 */
	Tone.prototype.toString = function(){
		for (var className in Tone){
			var isLetter = className[0].match(/^[A-Z]$/);
			var sameConstructor =  Tone[className] === this.constructor;
			if (isFunction(Tone[className]) && isLetter && sameConstructor){
				return className;
			}
		}
		return "Tone";
	};

	///////////////////////////////////////////////////////////////////////////
	//	CLASS VARS
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  A static pointer to the audio context accessible as Tone.context. 
	 *  @type {AudioContext}
	 */
	Tone.context = audioContext;

	/**
	 *  The audio context.
	 *  @type {AudioContext}
	 */
	Tone.prototype.context = Tone.context;

	/**
	 *  the default buffer size
	 *  @type {number}
	 *  @static
	 *  @const
	 */
	Tone.prototype.bufferSize = 2048;

	/**
	 *  The delay time of a single frame (128 samples according to the spec). 
	 *  @type {number}
	 *  @static
	 *  @const
	 */
	Tone.prototype.blockTime = 128 / Tone.context.sampleRate;
	
	///////////////////////////////////////////////////////////////////////////
	//	CONNECTIONS
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  disconnect and dispose
	 *  @returns {Tone} this
	 */
	Tone.prototype.dispose = function(){
		if (!this.isUndef(this.input)){
			if (this.input instanceof AudioNode){
				this.input.disconnect();
			} 
			this.input = null;
		}
		if (!this.isUndef(this.output)){
			if (this.output instanceof AudioNode){
				this.output.disconnect();
			} 
			this.output = null;
		}
		return this;
	};

	/**
	 *  a silent connection to the DesinationNode
	 *  which will ensure that anything connected to it
	 *  will not be garbage collected
	 *  
	 *  @private
	 */
	var _silentNode = null;

	/**
	 *  makes a connection to ensure that the node will not be garbage collected
	 *  until 'dispose' is explicitly called
	 *
	 *  use carefully. circumvents JS and WebAudio's normal Garbage Collection behavior
	 *  @returns {Tone} this
	 */
	Tone.prototype.noGC = function(){
		this.output.connect(_silentNode);
		return this;
	};

	AudioNode.prototype.noGC = function(){
		this.connect(_silentNode);
		return this;
	};

	/**
	 *  connect the output of a ToneNode to an AudioParam, AudioNode, or ToneNode
	 *  @param  {Tone | AudioParam | AudioNode} unit 
	 *  @param {number} [outputNum=0] optionally which output to connect from
	 *  @param {number} [inputNum=0] optionally which input to connect to
	 *  @returns {Tone} this
	 */
	Tone.prototype.connect = function(unit, outputNum, inputNum){
		if (Array.isArray(this.output)){
			outputNum = this.defaultArg(outputNum, 0);
			this.output[outputNum].connect(unit, 0, inputNum);
		} else {
			this.output.connect(unit, outputNum, inputNum);
		}
		return this;
	};

	/**
	 *  disconnect the output
	 *  @returns {Tone} this
	 */
	Tone.prototype.disconnect = function(outputNum){
		if (Array.isArray(this.output)){
			outputNum = this.defaultArg(outputNum, 0);
			this.output[outputNum].disconnect();
		} else {
			this.output.disconnect();
		}
		return this;
	};

	/**
	 *  connect together all of the arguments in series
	 *  @param {...AudioParam|Tone|AudioNode} nodes
	 *  @returns {Tone} this
	 */
	Tone.prototype.connectSeries = function(){
		if (arguments.length > 1){
			var currentUnit = arguments[0];
			for (var i = 1; i < arguments.length; i++){
				var toUnit = arguments[i];
				currentUnit.connect(toUnit);
				currentUnit = toUnit;
			}
		}
		return this;
	};

	/**
	 *  fan out the connection from the first argument to the rest of the arguments
	 *  @param {...AudioParam|Tone|AudioNode} nodes
	 *  @returns {Tone} this
	 */
	Tone.prototype.connectParallel = function(){
		var connectFrom = arguments[0];
		if (arguments.length > 1){
			for (var i = 1; i < arguments.length; i++){
				var connectTo = arguments[i];
				connectFrom.connect(connectTo);
			}
		}
		return this;
	};

	/**
	 *  Connect the output of this node to the rest of the nodes in series.
	 *  @example
	 *  //connect a node to an effect, panVol and then to the master output
	 *  node.chain(effect, panVol, Tone.Master);
	 *  @param {...AudioParam|Tone|AudioNode} nodes
	 *  @returns {Tone} this
	 */
	Tone.prototype.chain = function(){
		if (arguments.length > 0){
			var currentUnit = this;
			for (var i = 0; i < arguments.length; i++){
				var toUnit = arguments[i];
				currentUnit.connect(toUnit);
				currentUnit = toUnit;
			}
		}
		return this;
	};

	/**
	 *  connect the output of this node to the rest of the nodes in parallel.
	 *  @param {...AudioParam|Tone|AudioNode} nodes
	 *  @returns {Tone} this
	 */
	Tone.prototype.fan = function(){
		if (arguments.length > 0){
			for (var i = 0; i < arguments.length; i++){
				this.connect(arguments[i]);
			}
		}
		return this;
	};

	//give native nodes chain and fan methods
	AudioNode.prototype.chain = Tone.prototype.chain;
	AudioNode.prototype.fan = Tone.prototype.fan;

	///////////////////////////////////////////////////////////////////////////
	//	UTILITIES / HELPERS / MATHS
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  If the `given` parameter is undefined, use the `fallback`. 
	 *  If both `given` and `fallback` are object literals, it will
	 *  return a deep copy which includes all of the parameters from both 
	 *  objects. If a parameter is undefined in given, it will return
	 *  the fallback property. 
	 *  <br><br>
	 *  WARNING: if object is self referential, it will go into an an 
	 *  infinite recursive loop.
	 *  
	 *  @param  {*} given    
	 *  @param  {*} fallback 
	 *  @return {*}          
	 */
	Tone.prototype.defaultArg = function(given, fallback){
		if (this.isObject(given) && this.isObject(fallback)){
			var ret = {};
			//make a deep copy of the given object
			for (var givenProp in given) {
				ret[givenProp] = this.defaultArg(fallback[givenProp], given[givenProp]);
			}
			for (var fallbackProp in fallback) {
				ret[fallbackProp] = this.defaultArg(given[fallbackProp], fallback[fallbackProp]);
			}
			return ret;
		} else {
			return isUndef(given) ? fallback : given;
		}
	};

	/**
	 *  returns the args as an options object with given arguments
	 *  mapped to the names provided. 
	 *
	 *  if the args given is an array containing only one object, it is assumed
	 *  that that's already the options object and will just return it. 
	 *  
	 *  @param  {Array} values  the 'arguments' object of the function
	 *  @param  {Array} keys the names of the arguments as they
	 *                                 should appear in the options object
	 *  @param {Object=} defaults optional defaults to mixin to the returned 
	 *                            options object                              
	 *  @return {Object}       the options object with the names mapped to the arguments
	 */
	Tone.prototype.optionsObject = function(values, keys, defaults){
		var options = {};
		if (values.length === 1 && this.isObject(values[0])){
			options = values[0];
		} else {
			for (var i = 0; i < keys.length; i++){
				options[keys[i]] = values[i];
			}
		}
		if (!this.isUndef(defaults)){
			return this.defaultArg(options, defaults);
		} else {
			return options;
		}
	};

	///////////////////////////////////////////////////////////////////////////
	// TYPE CHECKING
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  test if the arg is undefined
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is undefined
	 *  @function
	 */
	Tone.prototype.isUndef = isUndef;

	/**
	 *  test if the arg is a function
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is a function
	 *  @function
	 */
	Tone.prototype.isFunction = isFunction;

	/**
	 *  Test if the argument is a number.
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is a number
	 */
	Tone.prototype.isNumber = function(arg){
		return (typeof arg === "number");
	};

	/**
	 *  Test if the given argument is an object literal (i.e. `{}`);
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is an object literal.
	 */
	Tone.prototype.isObject = function(arg){
		return (Object.prototype.toString.call(arg) === "[object Object]" && arg.constructor === Object);
	};

	/**
	 *  Test if the argument is a boolean.
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is a boolean
	 */
	Tone.prototype.isBoolean = function(arg){
		return (typeof arg === "boolean");
	};

	/**
	 *  Test if the argument is an Array
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is an array
	 */
	Tone.prototype.isArray = function(arg){
		return (Array.isArray(arg));
	};

	/**
	 *  Test if the argument is a string.
	 *  @param {*} arg the argument to test
	 *  @returns {boolean} true if the arg is a string
	 */
	Tone.prototype.isString = function(arg){
		return (typeof arg === "string");
	};

 	/**
	 *  An empty function.
	 *  @static
	 */
	Tone.noOp = function(){};

	/**
	 *  Make the property not writable. Internal use only. 
	 *  @private
	 *  @param  {string}  property  the property to make not writable
	 */
	Tone.prototype._readOnly = function(property){
		if (Array.isArray(property)){
			for (var i = 0; i < property.length; i++){
				this._readOnly(property[i]);
			}
		} else {
			Object.defineProperty(this, property, { 
				writable: false,
				enumerable : true,
			});
		}
	};

	/**
	 *  Make an attribute writeable. Interal use only. 
	 *  @private
	 *  @param  {string}  property  the property to make writable
	 */
	Tone.prototype._writable = function(property){
		if (Array.isArray(property)){
			for (var i = 0; i < property.length; i++){
				this._writable(property[i]);
			}
		} else {
			Object.defineProperty(this, property, { 
				writable: true,
			});
		}
	};

	/**
	 * Possible play states. 
	 * @enum {string}
	 */
	Tone.State = {
		Started : "started",
		Stopped : "stopped",
		Paused : "paused",
 	};

	///////////////////////////////////////////////////////////////////////////
	// GAIN CONVERSIONS
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  Equal power gain scale. Good for cross-fading.
	 *  @param  {NormalRange} percent (0-1)
	 *  @return {Number}         output gain (0-1)
	 */
	Tone.prototype.equalPowerScale = function(percent){
		var piFactor = 0.5 * Math.PI;
		return Math.sin(percent * piFactor);
	};

	/**
	 *  Convert decibels into gain.
	 *  @param  {Decibels} db
	 *  @return {Number}   
	 */
	Tone.prototype.dbToGain = function(db) {
		return Math.pow(2, db / 6);
	};

	/**
	 *  Convert gain to decibels.
	 *  @param  {Number} gain (0-1)
	 *  @return {Decibels}   
	 */
	Tone.prototype.gainToDb = function(gain) {
		return  20 * (Math.log(gain) / Math.LN10);
	};

	///////////////////////////////////////////////////////////////////////////
	//	TIMING
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  Return the current time of the clock + a single buffer frame. 
	 *  If this value is used to schedule a value to change, the earliest
	 *  it could be scheduled is the following frame. 
	 *  @return {number} the currentTime from the AudioContext
	 */
	Tone.prototype.now = function(){
		return this.context.currentTime;
	};

	///////////////////////////////////////////////////////////////////////////
	//	INHERITANCE
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  have a child inherit all of Tone's (or a parent's) prototype
	 *  to inherit the parent's properties, make sure to call 
	 *  Parent.call(this) in the child's constructor
	 *
	 *  based on closure library's inherit function
	 *
	 *  @static
	 *  @param  {function} 	child  
	 *  @param  {function=} parent (optional) parent to inherit from
	 *                             if no parent is supplied, the child
	 *                             will inherit from Tone
	 */
	Tone.extend = function(child, parent){
		if (isUndef(parent)){
			parent = Tone;
		}
		function TempConstructor(){}
		TempConstructor.prototype = parent.prototype;
		child.prototype = new TempConstructor();
		/** @override */
		child.prototype.constructor = child;
		child._super = parent;
	};

	///////////////////////////////////////////////////////////////////////////
	//	CONTEXT
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  array of callbacks to be invoked when a new context is added
	 *  @private 
	 *  @private
	 */
	var newContextCallbacks = [];

	/**
	 *  invoke this callback when a new context is added
	 *  will be invoked initially with the first context
	 *  @private 
	 *  @static
	 *  @param {function(AudioContext)} callback the callback to be invoked
	 *                                           with the audio context
	 */
	Tone._initAudioContext = function(callback){
		//invoke the callback with the existing AudioContext
		callback(Tone.context);
		//add it to the array
		newContextCallbacks.push(callback);
	};

	/**
	 *  Tone automatically creates a context on init, but if you are working
	 *  with other libraries which also create an AudioContext, it can be
	 *  useful to set your own. If you are going to set your own context, 
	 *  be sure to do it at the start of your code, before creating any objects.
	 *  @static
	 *  @param {AudioContext} ctx The new audio context to set
	 */
	Tone.setContext = function(ctx){
		//set the prototypes
		Tone.prototype.context = ctx;
		Tone.context = ctx;
		//invoke all the callbacks
		for (var i = 0; i < newContextCallbacks.length; i++){
			newContextCallbacks[i](ctx);
		}
	};

	/**
	 *  Bind this to a touchstart event to start the audio on mobile devices. 
	 *  <br>
	 *  http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api/12569290#12569290
	 *  @static
	 */
	Tone.startMobile = function(){
		var osc = Tone.context.createOscillator();
		var silent = Tone.context.createGain();
		silent.gain.value = 0;
		osc.connect(silent);
		silent.connect(Tone.context.destination);
		var now = Tone.context.currentTime;
		osc.start(now);
		osc.stop(now+1);
	};

	/**
	 *  Used to serve appropriate playbackRate implementation
	 *  {boolean} true if browser is Safari or iOS
	 */
	Tone.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;

	//setup the context
	Tone._initAudioContext(function(audioContext){
		//set the blockTime
		Tone.prototype.blockTime = 128 / audioContext.sampleRate;
		_silentNode = audioContext.createGain();
		_silentNode.gain.value = 0;
		_silentNode.connect(audioContext.destination);
	});

	Tone.version = "r6";

	console.log("%c * Tone.js " + Tone.version + " * ", "background: #000; color: #fff");

	return Tone;
});
