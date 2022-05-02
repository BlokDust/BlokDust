// Object.create Partial Polyfill
// Support for second parameter is non-standard
if (typeof Object.create !== 'function') {
    Object.create = function(o, props) {
        // Create new object whose prototype is o
        function F() {}
        F.prototype = o;
        var result = new F();
        // Copy properties of second parameter into new object
        if (typeof(props) === "object") {
        for (var prop in props) {
                if (props.hasOwnProperty((prop))) {
                    // Even though we don't support all of the functionality that the second
                    // parameter would normally have, we respect the format for the object
                    // passed as that second parameter its specification.
                    result[prop] = props[prop].value;
                }
            }
        }
        // Return new object
        return result;
    };
}

/**
 * Polyfill for Object.keys
 *
 * @see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys
 */
if (!Object.keys) {
    Object.keys = (function () {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function (obj) {
            if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object');

            var result = [];

            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) result.push(prop);
            }

            if (hasDontEnumBug) {
                for (var i=0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
                }
            }
            return result;
        }
    })()
};