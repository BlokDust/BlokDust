/// <reference path="./Tween.d.ts" />

// note: comment this line out if you get "'this' cannot be referenced within module bodies" when compiling.
// it's purely for the js examples, not necessary for TypeScript apps.
// http://typescript.codeplex.com/workitem/1951
window.TWEEN = this;

export var _tweens: Tween[] = [];

export var REVISION = '14';

export var getAll = function () {
    return this._tweens;
};

export var removeAll = function () {
    this._tweens = [];
};

export var add = function (tween) {
    this._tweens.push(tween);
};

export var remove = function (tween) {
    var i = this._tweens.indexOf( tween );
    if ( i !== -1 ) {
        this._tweens.splice( i, 1 );
    }
};

export var update = function (time) {

    if (this._tweens.length === 0 ) return false;

    var i = 0;

    time = !!time ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );

    while ( i < this._tweens.length ) {
        if ( this._tweens[ i ].update(time) ) {
            i++;
        } else {
            this._tweens.splice( i, 1 );
        }
    }

    return true;
}

export class Tween {
    _object;
    _valuesStart = {};
    _valuesEnd = {};
    _valuesStartRepeat = {};
    _duration = 1000;
    _repeat = 0;
    _yoyo = false;
    _isPlaying = false;
    _reversed = false;
    _delayTime = 0;
    _startTime = NaN;
    _easingFunction = Easing.Linear.None;
    _interpolationFunction = Interpolation.Linear;
    _chainedTweens = [];
    _onStartCallback = null;
    _onStartCallbackFired = false;
    _onUpdateCallback = null;
    _onCompleteCallback = null;
    _onStopCallback = null;

    constructor(object){
        this._object = object;
        // Set all starting values present on the target object
        for ( var field in object ) {
            this._valuesStart[ field ] = parseFloat(object[field]);
        }
    }

    to(properties, duration){
        if (duration !== undefined ) {
            this._duration = duration;
        }
        this._valuesEnd = properties;
        return this;
    }

    start(time){
        add(this);

        this._isPlaying = true;

        this._onStartCallbackFired = false;

        this._startTime = !!time ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );
        this._startTime += this._delayTime;

        for (var property in this._valuesEnd) {

            // check if an Array was provided as property value
            if (this._valuesEnd[property] instanceof Array) {

                if (this._valuesEnd[property].length === 0 ) {
                    continue;
                }

                // create a local copy of the Array with the start value at the front
                this._valuesEnd[property] = [this._object[property] ].concat(this._valuesEnd[property] );

            }

            this._valuesStart[property] = this._object[property];

            if((this._valuesStart[property] instanceof Array) === false) {
                this._valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
            }

            this._valuesStartRepeat[property] = this._valuesStart[property] || 0;

        }

        return this;
    }

    stop() {
        if (!this._isPlaying) {
            return this;
        }

        remove(this);
        this._isPlaying = false;

        if (this._onStopCallback !== null ) {
            this._onStopCallback.call(this._object);

        }

        this.stopChainedTweens();
        return this;
    }

    stopChainedTweens() {
        for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
            this._chainedTweens[i].stop();
        }
    }

    delay(amount) {
        this._delayTime = amount;
        return this;
    }

    repeat(times) {
        this._repeat = times;
        return this;
    }

    yoyo(yoyo) {
        this._yoyo = yoyo;
        return this;
    }

    easing(easing) {
        this._easingFunction = easing;
        return this;
    }

    interpolation(interpolation) {
        this._interpolationFunction = interpolation;
        return this;
    }

    chain(...tweens) {
        this._chainedTweens = tweens;
        return this;
    }

    onStart(callback) {
        this._onStartCallback = callback;
        return this;
    }

    onUpdate(callback) {
        this._onUpdateCallback = callback;
        return this;
    }

    onComplete(callback) {
        this._onCompleteCallback = callback;
        return this;
    }

    onStop(callback) {
        this._onStopCallback = callback;
        return this;
    }

    update(time) {

        var property;

        if (time < this._startTime ) {
            return true;
        }

        if (this._onStartCallbackFired === false) {

            if (this._onStartCallback !== null ) {
                this._onStartCallback.call( this._object );
            }

            this._onStartCallbackFired = true;
        }

        var elapsed = ( time - this._startTime ) / this._duration;
        elapsed = elapsed > 1 ? 1 : elapsed;

        var value = this._easingFunction(elapsed);

        for ( property in this._valuesEnd ) {

            var start = this._valuesStart[ property ] || 0;
            var end = this._valuesEnd[ property ];

            if ( end instanceof Array ) {

                this._object[ property ] = this._interpolationFunction( end, value );

            } else {

                // Parses relative end values with start as base (e.g.: +10, -3)
                if ( typeof(end) === "string" ) {
                    end = start + parseFloat(end);
                }

                // protect against non numeric properties.
                if ( typeof(end) === "number" ) {
                    this._object[ property ] = start + ( end - start ) * value;
                }

            }

        }

        if (this._onUpdateCallback !== null ) {

            this._onUpdateCallback.call( this._object, value );

        }

        if ( elapsed == 1 ) {

            if ( this._repeat > 0 ) {

                if( isFinite( this._repeat ) ) {
                    this._repeat--;
                }

                // reassign starting values, restart by making startTime = now
                for( property in this._valuesStartRepeat ) {

                    if ( typeof( this._valuesEnd[ property ] ) === "string" ) {
                        this._valuesStartRepeat[ property ] = this._valuesStartRepeat[ property ] + parseFloat(this._valuesEnd[ property ]);
                    }

                    if (this._yoyo) {
                        var tmp = this._valuesStartRepeat[ property ];
                        this._valuesStartRepeat[ property ] = this._valuesEnd[ property ];
                        this._valuesEnd[ property ] = tmp;
                    }

                    this._valuesStart[ property ] = this._valuesStartRepeat[ property ];

                }

                if (this._yoyo) {
                    this._reversed = !this._reversed;
                }

                this._startTime = time + this._delayTime;

                return true;

            } else {

                if (this._onCompleteCallback !== null ) {

                    this._onCompleteCallback.call( this._object );

                }

                for ( var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++ ) {

                    this._chainedTweens[ i ].start( time );

                }

                return false;

            }

        }

        return true;

    }
}

export var Easing: TweenEasing = {

    Linear: {
        None: function (k) {
            return k;
        }
    },

    Quadratic: {
        In: function (k) {
            return k * k;
        },

        Out: function (k) {
            return k * ( 2 - k );
        },

        InOut: function (k) {
            if (( k *= 2 ) < 1) return 0.5 * k * k;
            return -0.5 * ( --k * ( k - 2 ) - 1 );
        }
    },

    Cubic: {
        In: function (k) {
            return k * k * k;
        },

        Out: function (k) {
            return --k * k * k + 1;
        },

        InOut: function (k) {
            if (( k *= 2 ) < 1) return 0.5 * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k + 2 );
        }

    },

    Quartic: {
        In: function (k) {
            return k * k * k * k;
        },

        Out: function (k) {
            return 1 - ( --k * k * k * k );
        },

        InOut: function (k) {
            if (( k *= 2 ) < 1) return 0.5 * k * k * k * k;
            return -0.5 * ( ( k -= 2 ) * k * k * k - 2 );
        }

    },

    Quintic: {
        In: function (k) {
            return k * k * k * k * k;
        },

        Out: function (k) {
            return --k * k * k * k * k + 1;
        },

        InOut: function (k) {
            if (( k *= 2 ) < 1) return 0.5 * k * k * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );
        }

    },

    Sinusoidal: {
        In: function (k) {
            return 1 - Math.cos(k * Math.PI / 2);
        },

        Out: function (k) {
            return Math.sin(k * Math.PI / 2);
        },

        InOut: function (k) {
            return 0.5 * ( 1 - Math.cos(Math.PI * k) );
        }

    },

    Exponential: {
        In: function (k) {
            return k === 0 ? 0 : Math.pow(1024, k - 1);
        },

        Out: function (k) {
            return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        },

        InOut: function (k) {
            if (k === 0) return 0;
            if (k === 1) return 1;
            if (( k *= 2 ) < 1) return 0.5 * Math.pow(1024, k - 1);
            return 0.5 * ( -Math.pow(2, -10 * ( k - 1 )) + 2 );
        }
    },

    Circular: {
        In: function (k) {
            return 1 - Math.sqrt(1 - k * k);
        },

        Out: function (k) {
            return Math.sqrt(1 - ( --k * k ));
        },

        InOut: function (k) {
            if (( k *= 2 ) < 1) return -0.5 * ( Math.sqrt(1 - k * k) - 1);
            return 0.5 * ( Math.sqrt(1 - ( k -= 2) * k) + 1);
        }
    },

    Elastic: {
        In: function (k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) return 0;
            if (k === 1) return 1;
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else s = p * Math.asin(1 / a) / ( 2 * Math.PI );
            return -( a * Math.pow(2, 10 * ( k -= 1 )) * Math.sin(( k - s ) * ( 2 * Math.PI ) / p) );
        },

        Out: function (k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) return 0;
            if (k === 1) return 1;
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else s = p * Math.asin(1 / a) / ( 2 * Math.PI );
            return ( a * Math.pow(2, -10 * k) * Math.sin(( k - s ) * ( 2 * Math.PI ) / p) + 1 );
        },

        InOut: function (k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) return 0;
            if (k === 1) return 1;
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else s = p * Math.asin(1 / a) / ( 2 * Math.PI );
            if (( k *= 2 ) < 1) return -0.5 * ( a * Math.pow(2, 10 * ( k -= 1 )) * Math.sin(( k - s ) * ( 2 * Math.PI ) / p) );
            return a * Math.pow(2, -10 * ( k -= 1 )) * Math.sin(( k - s ) * ( 2 * Math.PI ) / p) * 0.5 + 1;
        }
    },

    Back: {
        In: function (k) {
            var s = 1.70158;
            return k * k * ( ( s + 1 ) * k - s );
        },

        Out: function (k) {
            var s = 1.70158;
            return --k * k * ( ( s + 1 ) * k + s ) + 1;
        },

        InOut: function (k) {
            var s = 1.70158 * 1.525;
            if (( k *= 2 ) < 1) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
            return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );
        }
    },

    Bounce: {
        In: function (k) {
            return 1 - TWEEN.Easing.Bounce.Out(1 - k);
        },

        Out: function (k) {
            if (k < ( 1 / 2.75 )) {
                return 7.5625 * k * k;
            } else if (k < ( 2 / 2.75 )) {
                return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
            } else if (k < ( 2.5 / 2.75 )) {
                return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
            } else {
                return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
            }
        },

        InOut: function (k) {
            if (k < 0.5) return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
            return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;
        }

    }
}

export var Interpolation: TweenInterpolation = {

    Linear: function ( v, k ) {
        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

        if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
        if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

        return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );
    },

    Bezier: function ( v, k ) {
        var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

        for ( i = 0; i <= n; i++ ) {
            b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
        }

        return b;
    },

    CatmullRom: function ( v, k ) {
        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

        if ( v[ 0 ] === v[ m ] ) {
            if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

            return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );
        } else {
            if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
            if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

            return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );
        }
    },

    Utils: {
        Linear: function ( p0, p1, t ) {
            return ( p1 - p0 ) * t + p0;
        },

        Bernstein: function ( n , i ) {
            var fc = TWEEN.Interpolation.Utils.Factorial;
            return fc( n ) / fc( i ) / fc( n - i );
        },

        Factorial: ( function () {
            var a = [ 1 ];

            return function ( n ) {
                var s = 1, i;
                if ( a[ n ] ) return a[ n ];
                for ( i = n; i > 1; i-- ) s *= i;
                return a[ n ] = s;
            };

        } )(),

        CatmullRom: function ( p0, p1, p2, p3, t ) {
            var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
            return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;
        }
    }
}

