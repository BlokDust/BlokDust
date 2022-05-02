//######################################################
// String
//######################################################

String.prototype.format = function () {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }

    return s;
};

String.prototype.startsWith = function (str) { return this.indexOf(str) == 0; };
String.prototype.endsWith = function(str) { return this.indexOf(str, this.length - str.length) !== -1; };
String.prototype.trim = function () { return this.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };
String.prototype.ltrim = function () { return this.replace(/^\s+/, ''); };
String.prototype.rtrim = function () { return this.replace(/\s+$/, ''); };
String.prototype.fulltrim = function () { return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, ' '); };
String.prototype.toFileName = function () { return this.replace(/[^a-z0-9]/gi, '_').toLowerCase(); };
String.prototype.contains = function(str) { return this.indexOf(str) !== -1; };
String.prototype.utf8_to_b64 = function(){ return window.btoa(window.unescape(encodeURIComponent(this))); };
String.prototype.b64_to_utf8 = function(){ return decodeURIComponent(window.escape(window.atob(this))); };


//######################################################
// Array
//######################################################

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement: any, fromIndex?: number) {
        var i = (fromIndex || 0);
        var j = this.length;

        for (i; i < j; i++) {
            if (this[i] === searchElement) {
                return i;
            }
        }
        return -1;
    };
};

if (!Array.prototype.clone) {
    Array.prototype.clone = function () {
        return this.slice(0);
    };
};

if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1];
    };
};

if (!Array.prototype.contains) {
    Array.prototype.contains = function (item: any){
        return this.indexOf(item) !== -1;
    };
};

Array.prototype.remove = function(item: any) {
    var index = this.indexOf(item);
    if (index > -1) {
        this.splice(index, 1);
    }
};

Array.prototype.removeAt = function(index: number) {
    this.splice(index, 1);
};

Array.prototype.insert = function(item: any, index: number){
    this.splice(index, 0, item);
};

//######################################################
// Math
//######################################################

Math.clamp = function(value: number, min: number, max: number){
    return Math.min(Math.max(value, min), max);
};

Math.roundToDecimalPlace = function(num: number, dec: number): number {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
};

Math.normalise = function(num: number, min: number, max: number): number {
    return (num - min) / (max - min);
};

Math.constrain = function(value: number, low: number, high: number): number{
    return Math.clamp(value, low, high);
};

Math.radiansToDegrees = function(radians: number): number {
    return (radians * 360) / Math.TAU;
};

Math.distanceBetween = function(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.sq(x2 - x1) + Math.sq(y2 - y1));
};

Math.lerp = function(start: number, stop: number, amount: number): number {
    return start + (stop-start) * amount;
};

Math.mag = function(a: number, b: number, c: number): number {
    return Math.sqrt(a*a + b*b + c*c);
};

Math.map = function(value: number,
    start1: number, stop1: number,
    start2: number, stop2: number): number {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};

Math.degreesToRadians = function(degrees: number): number {
    return Math.TAU * (degrees / 360);
};

/**
 * Get a random number between two numbers.
 * If 'high' isn't passed, get a number from 0 to 'low'.
 * @param {Number} low The low number.
 * @param {Number} [high] The high number.
 */
Math.randomBetween = function(low: number, high?: number): number {
    if (!high){
        high = low;
        low = 0;
    }

    if (low >= high) return low;

    return low + (high-low) * Math.random();
};

Math.sq = function(n: number): number {
    return n*n;
};

Math.TAU = Math.PI * 2;


//######################################################
// Number
//######################################################

Number.prototype.isInt = function(){ return this % 1 === 0; };


