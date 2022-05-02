var exjs;
(function (exjs) {
    exjs.version = '0.4.0';
})(exjs || (exjs = {}));
var exjs;
(function (exjs) {
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }
})(exjs || (exjs = {}));
var exjs;
(function (exjs) {
    var Enumerable = (function () {
        function Enumerable() {
        }
        Enumerable.prototype.getEnumerator = function () {
            return {
                moveNext: function () {
                    return false;
                },
                current: undefined
            };
        };
        Enumerable.prototype.aggregate = function (seed, accumulator) {
            var active = seed;
            for (var enumerator = this.getEnumerator(); enumerator.moveNext();) {
                active = accumulator(active, enumerator.current);
            }
            return active;
        };
        Enumerable.prototype.all = function (predicate) {
            if (predicate) {
                var e = this.getEnumerator();
                var i = 0;
                while (e.moveNext()) {
                    if (!predicate(e.current, i))
                        return false;
                    i++;
                }
            }
            return true;
        };
        Enumerable.prototype.any = function (predicate) {
            var e = this.getEnumerator();
            var i = 0;
            while (e.moveNext()) {
                if (!predicate)
                    return true;
                if (predicate(e.current, i))
                    return true;
                i++;
            }
            return false;
        };
        Enumerable.prototype.append = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            throw new Error("Not implemented");
        };
        Enumerable.prototype.apply = function (action) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.at = function (index) {
            var e = this.getEnumerator();
            var i = 0;
            while (e.moveNext()) {
                if (i === index)
                    return e.current;
                i++;
            }
            return undefined;
        };
        Enumerable.prototype.average = function (selector) {
            var count = 0;
            var total = 0;
            selector = selector || function (t) {
                if (typeof t !== "number")
                    throw new Error("Object is not a number.");
                return t;
            };
            var e = this.getEnumerator();
            while (e.moveNext()) {
                total += selector(e.current);
                count++;
            }
            if (count === 0)
                return 0;
            return total / count;
        };
        Enumerable.prototype.concat = function (second) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.count = function (predicate) {
            var count = 0;
            var e = this.getEnumerator();
            while (e.moveNext()) {
                if (!predicate || predicate(e.current))
                    count++;
            }
            return count;
        };
        Enumerable.prototype.difference = function (second, comparer) {
            comparer = comparer || function (f2, s2) {
                return f2 === s2;
            };
            if (second instanceof Array)
                second = second.en();
            return {
                intersection: this.intersect(second, comparer).toArray().en(),
                aNotB: this.except(second, comparer).toArray().en(),
                bNotA: second.except(this, comparer).toArray().en()
            };
        };
        Enumerable.prototype.distinct = function (comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.except = function (second, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.first = function (match) {
            var e = this.getEnumerator();
            while (e.moveNext()) {
                if (!match || match(e.current))
                    return e.current;
            }
            return undefined;
        };
        Enumerable.prototype.firstIndex = function (match) {
            for (var e = this.getEnumerator(), i = 0; e.moveNext(); i++) {
                if (!match || match(e.current))
                    return i;
            }
            return -1;
        };
        Enumerable.prototype.forEach = function (action) {
            for (var en = this.getEnumerator(); en.moveNext();) {
                action(en.current);
            }
        };
        Enumerable.prototype.groupBy = function (keySelector, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.intersect = function (second, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.join = function (inner, outerKeySelector, innerKeySelector, resultSelector, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.last = function (match) {
            var e = this.getEnumerator();
            var l;
            while (e.moveNext()) {
                if (!match || match(e.current))
                    l = e.current;
            }
            return l;
        };
        Enumerable.prototype.lastIndex = function (match) {
            var j = -1;
            for (var e = this.getEnumerator(), i = 0; e.moveNext(); i++) {
                if (!match || match(e.current))
                    j = i;
            }
            return j;
        };
        Enumerable.prototype.max = function (selector) {
            var e = this.getEnumerator();
            if (!e.moveNext())
                return 0;
            selector = selector || function (t) {
                if (typeof t !== "number")
                    throw new Error("Object is not a number.");
                return t;
            };
            var max = selector(e.current);
            while (e.moveNext()) {
                max = Math.max(max, selector(e.current));
            }
            return max;
        };
        Enumerable.prototype.min = function (selector) {
            var e = this.getEnumerator();
            if (!e.moveNext())
                return 0;
            selector = selector || function (t) {
                if (typeof t !== "number")
                    throw new Error("Object is not a number.");
                return t;
            };
            var min = selector(e.current);
            while (e.moveNext()) {
                min = Math.min(min, selector(e.current));
            }
            return min;
        };
        Enumerable.prototype.orderBy = function (keySelector, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.orderByDescending = function (keySelector, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.prepend = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            throw new Error("Not implemented");
        };
        Enumerable.prototype.reverse = function () {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.select = function (selector) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.selectMany = function (selector) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.skip = function (count) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.skipWhile = function (predicate) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.standardDeviation = function (selector) {
            var avg = this.average(selector);
            var sum = 0;
            var count = 0;
            selector = selector || function (t) {
                if (typeof t !== "number")
                    throw new Error("Object is not a number.");
                return t;
            };
            var e = this.getEnumerator();
            while (e.moveNext()) {
                var diff = selector(e.current) - avg;
                sum += (diff * diff);
                count++;
            }
            return Math.sqrt(sum / count);
        };
        Enumerable.prototype.sum = function (selector) {
            var sum = 0;
            selector = selector || function (t) {
                if (typeof t !== "number")
                    throw new Error("Object is not a number.");
                return t;
            };
            var e = this.getEnumerator();
            while (e.moveNext()) {
                sum += selector(e.current);
            }
            return sum;
        };
        Enumerable.prototype.take = function (count) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.takeWhile = function (predicate) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.traverse = function (selector) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.traverseUnique = function (selector, matcher) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.toArray = function () {
            var arr = [];
            var enumerator = this.getEnumerator();
            while (enumerator.moveNext()) {
                arr.push(enumerator.current);
            }
            return arr;
        };
        Enumerable.prototype.toMap = function (keySelector, valueSelector) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.toList = function () {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.union = function (second, comparer) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.where = function (filter) {
            throw new Error("Not implemented");
        };
        Enumerable.prototype.zip = function (second, resultSelector) {
            throw new Error("Not implemented");
        };
        return Enumerable;
    })();
    exjs.Enumerable = Enumerable;
})(exjs || (exjs = {}));
/// <reference path="../enumerable.ts" />
var Symbol;
var exjs;
(function (exjs) {
    if (Symbol && Symbol.iterator) {
        exjs.Enumerable.prototype[Symbol.iterator] = function () {
            return iteratorFromEnumerable(this);
        };
    }
    function iteratorFromEnumerable(enu) {
        var en;
        return {
            next: function () {
                var res = {
                    done: true,
                    value: undefined
                };
                if (!enu)
                    return res;
                en = en || enu.getEnumerator();
                if (!en)
                    return res;
                res.done = !en.moveNext();
                res.value = en.current;
                return res;
            }
        };
    }
})(exjs || (exjs = {}));
/// <reference path="../enumerable.ts" />
var exjs;
(function (exjs) {
    var Map = (function () {
        function Map(enumerable) {
            this._keys = [];
            this._values = [];
            var enu;
            if (enumerable instanceof Array) {
                enu = enumerable.en();
            }
            else if (enumerable && enumerable.getEnumerator instanceof Function) {
                enu = enumerable;
            }
            if (!enu)
                return;
            for (var en = enu.getEnumerator(); en && en.moveNext();) {
                this.set(en.current[0], en.current[1]);
            }
        }
        Object.defineProperty(Map.prototype, "size", {
            get: function () {
                return this._keys.length;
            },
            enumerable: true,
            configurable: true
        });
        Map.prototype.clear = function () {
            this._keys.length = 0;
            this._values.length = 0;
        };
        Map.prototype.delete = function (key) {
            var index = this._keys.indexOf(key);
            if (!(index > -1))
                return false;
            this._keys.splice(index, 1);
            this._values.splice(index, 1);
            return true;
        };
        Map.prototype.entries = function () {
            var _this = this;
            return exjs.range(0, this.size).select(function (i) { return [_this._keys[i], _this._values[i]]; });
        };
        Map.prototype.forEach = function (callbackFn, thisArg) {
            if (thisArg == null)
                thisArg = this;
            for (var i = 0, keys = this._keys, vals = this._values, len = keys.length; i < len; i++) {
                callbackFn.call(thisArg, vals[i], keys[i], this);
            }
        };
        Map.prototype.get = function (key) {
            var index = this._keys.indexOf(key);
            return this._values[index];
        };
        Map.prototype.has = function (key) {
            return this._keys.indexOf(key) > -1;
        };
        Map.prototype.keys = function () {
            return this._keys.en();
        };
        Map.prototype.set = function (key, value) {
            var index = this._keys.indexOf(key);
            if (index > -1) {
                this._values[index] = value;
            }
            else {
                this._keys.push(key);
                this._values.push(value);
            }
            return undefined;
        };
        Map.prototype.values = function () {
            return this._values.en();
        };
        return Map;
    })();
    exjs.Map = Map;
    exjs.Enumerable.prototype.toMap = function (keySelector, valueSelector) {
        var m = new Map();
        for (var en = this.getEnumerator(); en.moveNext();) {
            m.set(keySelector(en.current), valueSelector(en.current));
        }
        return m;
    };
    if (exjs.List)
        exjs.List.prototype.toMap = exjs.Enumerable.prototype.toMap;
})(exjs || (exjs = {}));
(function (_global) {
    if (!_global.Map)
        _global.Map = exjs.Map;
})(typeof window === "undefined" ? global : window);
var exjs;
(function (exjs) {
    function anonymous(iterator) {
        var enumerable = new exjs.Enumerable();
        enumerable.getEnumerator = function () {
            var enumerator = {
                current: undefined,
                moveNext: function () { return iterator(enumerator); }
            };
            return enumerator;
        };
        return enumerable;
    }
    exjs.anonymous = anonymous;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function appendEnumerator(prev, items) {
        var stage = 1;
        var firstit;
        var secondit;
        var e = {
            current: undefined,
            moveNext: function () {
                if (stage < 2) {
                    firstit = firstit || prev.getEnumerator();
                    if (firstit.moveNext()) {
                        e.current = firstit.current;
                        return true;
                    }
                    stage++;
                }
                secondit = secondit || items.en().getEnumerator();
                if (secondit.moveNext()) {
                    e.current = secondit.current;
                    return true;
                }
                e.current = undefined;
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.append = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return appendEnumerator(_this, items); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.append = exjs.Enumerable.prototype.append;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function applyEnumerator(prev, action) {
        var t;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                if (!t.moveNext())
                    return false;
                action(e.current = t.current, i);
                i++;
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.apply = function (action) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return applyEnumerator(_this, action); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.apply = exjs.Enumerable.prototype.apply;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var exjs;
(function (exjs) {
    function arrayEnumerator(arr) {
        var len = arr.length;
        var e = { moveNext: undefined, current: undefined };
        var index = -1;
        e.moveNext = function () {
            index++;
            if (index >= len) {
                e.current = undefined;
                return false;
            }
            e.current = arr[index];
            return true;
        };
        return e;
    }
    var ArrayEnumerable = (function (_super) {
        __extends(ArrayEnumerable, _super);
        function ArrayEnumerable(arr) {
            _super.call(this);
            this.getEnumerator = function () {
                return arrayEnumerator(arr);
            };
            this.toArray = function () {
                return arr.slice(0);
            };
        }
        return ArrayEnumerable;
    })(exjs.Enumerable);
    function en() {
        if (this && Array.isArray(this))
            return new ArrayEnumerable(this);
        return new exjs.Enumerable();
    }
    try {
        Object.defineProperty(Array.prototype, "en", {
            value: en,
            enumerable: false,
            writable: false,
            configurable: false
        });
    }
    catch (e) {
        Array.prototype.en = en;
    }
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function concatEnumerator(prev, second) {
        var t;
        var s = false;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                e.current = undefined;
                if (t.moveNext()) {
                    e.current = t.current;
                    return true;
                }
                if (s)
                    return false;
                s = true;
                t = second.getEnumerator();
                if (!t.moveNext())
                    return false;
                e.current = t.current;
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.concat = function (second) {
        var _this = this;
        var en = second instanceof Array ? second.en() : second;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return concatEnumerator(_this, en); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.concat = exjs.Enumerable.prototype.concat;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function distinctEnumerator(prev, comparer) {
        var t;
        var visited = [];
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                e.current = undefined;
                if (!comparer) {
                    while (t.moveNext()) {
                        if (visited.indexOf(t.current) < 0) {
                            visited.push(e.current = t.current);
                            return true;
                        }
                    }
                    return false;
                }
                while (t.moveNext()) {
                    for (var i = 0, len = visited.length, hit = false; i < len && !hit; i++) {
                        hit = !!comparer(visited[i], t.current);
                    }
                    if (!hit) {
                        visited.push(e.current = t.current);
                        return true;
                    }
                }
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.distinct = function (comparer) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return distinctEnumerator(_this, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.distinct = exjs.Enumerable.prototype.distinct;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function exceptEnumerator(prev, second, comparer) {
        comparer = comparer || function (f, s) {
            return f === s;
        };
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                e.current = undefined;
                while (t.moveNext()) {
                    for (var hit = false, x = second.getEnumerator(); x.moveNext() && !hit;) {
                        hit = comparer(t.current, x.current);
                    }
                    if (!hit) {
                        e.current = t.current;
                        return true;
                    }
                }
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.except = function (second, comparer) {
        var _this = this;
        var en = second instanceof Array ? second.en() : second;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return exceptEnumerator(_this, en, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.except = exjs.Enumerable.prototype.except;
})(exjs || (exjs = {}));
Function.prototype.fromJson = function (o, mappingOverrides) {
    var rv = new this();
    if (o == null)
        return rv;
    var mapped = [];
    for (var key in mappingOverrides) {
        var j = mapSubProperty(o[key], mappingOverrides[key]);
        if (j === undefined)
            continue;
        rv[key] = j;
        mapped.push(key);
    }
    for (var key in this.$jsonMappings) {
        if (mapped.indexOf(key) > -1)
            continue;
        var j = mapSubProperty(o[key], this.$jsonMappings[key]);
        if (j === undefined)
            continue;
        rv[key] = j;
        mapped.push(key);
    }
    for (var key in o) {
        if (mapped.indexOf(key) > -1)
            continue;
        rv[key] = o[key];
    }
    return rv;
    function mapSubProperty(j, mapping) {
        if (j == null)
            return j;
        if (mapping instanceof Function)
            return mapping(j);
        if (mapping instanceof Array) {
            mapping = mapping[0];
            if (!(mapping instanceof Function) || !(j instanceof Array))
                return undefined;
            var arr = [];
            for (var i = 0; i < j.length; i++) {
                arr.push(mapping(j[i]));
            }
            return arr;
        }
        return undefined;
    }
};
/// <reference path="enumerable.ts" />
/// <reference path="array.ts" />
var exjs;
(function (exjs) {
    function groupByEnumerator(prev, keySelector, comparer) {
        var grps;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!grps)
                    grps = createGroups(prev, keySelector, comparer);
                e.current = undefined;
                if (i >= grps.length)
                    return false;
                e.current = grps[i];
                i++;
                return true;
            }
        };
        return e;
    }
    function createGroups(prev, keySelector, comparer) {
        comparer = comparer || function (k1, k2) {
            return k1 === k2;
        };
        var grps = [];
        var keys = [];
        var e = prev.getEnumerator();
        var key;
        while (e.moveNext()) {
            key = keySelector(e.current);
            var index = -1;
            for (var i = 0, len = keys.length; i < len; i++) {
                if (comparer(key, keys[i])) {
                    index = i;
                    break;
                }
            }
            var grp;
            if (index < 0) {
                keys.push(key);
                grps.push(grp = new Group(key));
            }
            else {
                grp = grps[index];
            }
            grp._add(e.current);
        }
        return grps;
    }
    var Group = (function (_super) {
        __extends(Group, _super);
        function Group(key) {
            var _this = this;
            _super.call(this);
            this.key = key;
            this._arr = [];
            this.getEnumerator = function () { return _this._arr.en().getEnumerator(); };
        }
        Group.prototype._add = function (e) {
            this._arr.push(e);
        };
        return Group;
    })(exjs.Enumerable);
    exjs.Enumerable.prototype.groupBy = function (keySelector, comparer) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return groupByEnumerator(_this, keySelector, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.groupBy = exjs.Enumerable.prototype.groupBy;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function intersectEnumerator(prev, second, comparer) {
        comparer = comparer || function (f, s) { return f === s; };
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = exjs.en(prev).distinct().getEnumerator();
                e.current = undefined;
                while (t.moveNext()) {
                    for (var hit = false, x = second.getEnumerator(); x.moveNext() && !hit;) {
                        hit = comparer(t.current, x.current);
                    }
                    if (hit) {
                        e.current = t.current;
                        return true;
                    }
                }
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.intersect = function (second, comparer) {
        var _this = this;
        var en = second instanceof Array ? second.en() : second;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return intersectEnumerator(_this, en, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.intersect = exjs.Enumerable.prototype.intersect;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function joinEnumerator(prev, inner, outerKeySelector, innerKeySelector, resultSelector, comparer) {
        comparer = comparer || function (k1, k2) {
            return k1 === k2;
        };
        var s;
        var ins;
        var j = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                e.current = undefined;
                if (!s) {
                    s = prev.getEnumerator();
                    if (!s.moveNext())
                        return false;
                    ins = exjs.en(inner).toArray();
                }
                var cur;
                do {
                    for (; j < ins.length; j++) {
                        cur = ins[j];
                        if (comparer(outerKeySelector(s.current), innerKeySelector(cur))) {
                            j++;
                            e.current = resultSelector(s.current, cur);
                            return true;
                        }
                    }
                    j = 0;
                } while (s.moveNext());
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.join = function (inner, outerKeySelector, innerKeySelector, resultSelector, comparer) {
        var _this = this;
        var en = inner instanceof Array ? inner.en() : inner;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return joinEnumerator(_this, en, outerKeySelector, innerKeySelector, resultSelector, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.join = exjs.Enumerable.prototype.join;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
/// <reference path="fromJson.ts" />
var exjs;
(function (exjs) {
    exjs.Enumerable.prototype.toList = function () {
        var l = new List();
        var enumerator = this.getEnumerator();
        while (enumerator.moveNext()) {
            l.push(enumerator.current);
        }
        return l;
    };
    var List = (function (_super) {
        __extends(List, _super);
        function List() {
            _super.apply(this, arguments);
        }
        List.prototype.toString = function () { throw new Error("Not implemented"); };
        List.prototype.toLocaleString = function () { throw new Error("Not implemented"); };
        List.prototype.pop = function () { throw new Error("Not implemented"); };
        List.prototype.push = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            throw new Error("Not implemented");
        };
        List.prototype.shift = function () { throw new Error("Not implemented"); };
        List.prototype.slice = function (start, end) { throw new Error("Not implemented"); };
        List.prototype.sort = function (compareFn) { throw new Error("Not implemented"); };
        List.prototype.splice = function () { throw new Error("Not implemented"); };
        List.prototype.unshift = function () {
            var items = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                items[_i - 0] = arguments[_i];
            }
            throw new Error("Not implemented");
        };
        List.prototype.indexOf = function (searchElement, fromIndex) { throw new Error("Not implemented"); };
        List.prototype.lastIndexOf = function (searchElement, fromIndex) { throw new Error("Not implemented"); };
        List.prototype.every = function (callbackfn, thisArg) { throw new Error("Not implemented"); };
        List.prototype.some = function (callbackfn, thisArg) { throw new Error("Not implemented"); };
        List.prototype.forEach = function (callbackfn, thisArg) { throw new Error("Not implemented"); };
        List.prototype.map = function (callbackfn, thisArg) { throw new Error("Not implemented"); };
        List.prototype.filter = function (callbackfn, thisArg) { throw new Error("Not implemented"); };
        List.prototype.reduce = function (callbackfn, initialValue) { throw new Error("Not implemented"); };
        List.prototype.reduceRight = function (callbackfn, initialValue) { throw new Error("Not implemented"); };
        List.prototype.remove = function (item) { throw new Error("Not implemented"); };
        List.prototype.removeWhere = function (predicate) { throw new Error("Not implemented"); };
        return List;
    })(exjs.Enumerable);
    exjs.List = List;
    for (var p in Array)
        if (Array.hasOwnProperty(p))
            List[p] = Array[p];
    function __() { this.constructor = List; }
    __.prototype = Array.prototype;
    List.prototype = new __();
    for (var key in exjs.Enumerable.prototype) {
        if (key === "getEnumerator")
            continue;
        List.prototype[key] = exjs.Enumerable.prototype[key];
    }
    List.prototype.getEnumerator = function () {
        var list = this;
        var len = list.length;
        var e = { moveNext: undefined, current: undefined };
        var index = -1;
        e.moveNext = function () {
            index++;
            if (index >= len) {
                e.current = undefined;
                return false;
            }
            e.current = list[index];
            return true;
        };
        return e;
    };
    List.prototype.remove = function (item) {
        return this.removeWhere(function (t) { return t === item; }).any();
    };
    List.prototype.removeWhere = function (predicate) {
        var removed = [];
        var cur;
        for (var i = this.length - 1; i >= 0; i--) {
            cur = this[i];
            if (predicate(cur, i) === true) {
                this.splice(i, 1);
                removed.push(cur);
            }
        }
        return removed.en().reverse();
    };
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function orderByEnumerable(source, keySelector, isDescending, comparer) {
        return new OrderedEnumerable(source, keySelector, isDescending, comparer);
    }
    var OrderedEnumerable = (function (_super) {
        __extends(OrderedEnumerable, _super);
        function OrderedEnumerable(source, keySelector, isDescending, keyComparer) {
            _super.call(this);
            this.Source = source;
            keyComparer = keyComparer || function (f, s) {
                return f > s ? 1 : (f < s ? -1 : 0);
            };
            var factor = (isDescending === true) ? -1 : 1;
            this.Sorter = function (a, b) { return factor * keyComparer(keySelector(a), keySelector(b)); };
        }
        OrderedEnumerable.prototype.getEnumerator = function () {
            var source = this.Source;
            var sorter = this.Sorter;
            var arr;
            var i = 0;
            var e = {
                current: undefined,
                moveNext: function () {
                    if (!arr) {
                        arr = exjs.en(source).toArray();
                        arr.sort(sorter);
                    }
                    e.current = undefined;
                    if (i >= arr.length)
                        return false;
                    e.current = arr[i];
                    i++;
                    return true;
                }
            };
            return e;
        };
        OrderedEnumerable.prototype.thenBy = function (keySelector, comparer) {
            return new ThenEnumerable(this, keySelector, false, comparer);
        };
        OrderedEnumerable.prototype.thenByDescending = function (keySelector, comparer) {
            return new ThenEnumerable(this, keySelector, true, comparer);
        };
        return OrderedEnumerable;
    })(exjs.Enumerable);
    var ThenEnumerable = (function (_super) {
        __extends(ThenEnumerable, _super);
        function ThenEnumerable(source, keySelector, isDescending, keyComparer) {
            _super.call(this, source, keySelector, isDescending, keyComparer);
            var parentSorter = source.Sorter;
            var thisSorter = this.Sorter;
            this.Sorter = function (a, b) { return parentSorter(a, b) || thisSorter(a, b); };
        }
        return ThenEnumerable;
    })(OrderedEnumerable);
    var fn = exjs.Enumerable.prototype;
    fn.orderBy = function (keySelector, comparer) {
        return orderByEnumerable(this, keySelector, false, comparer);
    };
    fn.orderByDescending = function (keySelector, comparer) {
        return orderByEnumerable(this, keySelector, true, comparer);
    };
    if (exjs.List) {
        exjs.List.prototype.orderBy = exjs.Enumerable.prototype.orderBy;
        exjs.List.prototype.orderByDescending = exjs.Enumerable.prototype.orderByDescending;
    }
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function prependEnumerator(prev, items) {
        var stage = 1;
        var firstit;
        var secondit;
        var e = {
            current: undefined,
            moveNext: function () {
                if (stage < 2) {
                    firstit = firstit || items.en().getEnumerator();
                    if (firstit.moveNext()) {
                        e.current = firstit.current;
                        return true;
                    }
                    stage++;
                }
                secondit = secondit || prev.getEnumerator();
                if (secondit.moveNext()) {
                    e.current = secondit.current;
                    return true;
                }
                e.current = undefined;
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.prepend = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return prependEnumerator(_this, items); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.prepend = exjs.Enumerable.prototype.prepend;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function rangeEnumerator(start, end, increment) {
        var i = start - increment;
        var e = {
            current: undefined,
            moveNext: function () {
                i += increment;
                if (i >= end)
                    return false;
                e.current = i;
                return true;
            }
        };
        return e;
    }
    function range(start, end, increment) {
        start = start || 0;
        end = end || 0;
        if (start > end)
            throw new Error("Start cannot be greater than end.");
        if (increment == null)
            increment = 1;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return rangeEnumerator(start, end, increment); };
        return e;
    }
    exjs.range = range;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function reverseEnumerator(prev) {
        var a;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!a) {
                    a = exjs.en(prev).toArray();
                    i = a.length;
                }
                i--;
                e.current = a[i];
                return i >= 0;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.reverse = function () {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return reverseEnumerator(_this); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.reverse = exjs.Enumerable.prototype.reverse;
})(exjs || (exjs = {}));
var exjs;
(function (exjs) {
    function round(value, digits) {
        digits = digits || 0;
        if (digits === 0)
            return Math.round(value);
        var shift = Math.pow(10, digits);
        return Math.round(value * shift) / shift;
    }
    exjs.round = round;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
/// <reference path="array.ts" />
var exjs;
(function (exjs) {
    function selectEnumerator(prev, selector) {
        var t;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                if (!t.moveNext())
                    return false;
                e.current = selector(t.current, i);
                i++;
                return true;
            }
        };
        return e;
    }
    function selectManyEnumerator(prev, selector) {
        var t;
        var active;
        var e = {
            current: undefined,
            moveNext: function () {
                e.current = undefined;
                if (!t)
                    t = prev.getEnumerator();
                while (!active || !active.moveNext()) {
                    if (!t.moveNext())
                        return false;
                    active = exjs.selectorEnumerator(selector(t.current));
                }
                e.current = active.current;
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.select = function (selector) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return selectEnumerator(_this, selector); };
        return e;
    };
    exjs.Enumerable.prototype.selectMany = function (selector) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return selectManyEnumerator(_this, selector); };
        return e;
    };
    if (exjs.List) {
        exjs.List.prototype.select = exjs.Enumerable.prototype.select;
        exjs.List.prototype.selectMany = exjs.Enumerable.prototype.selectMany;
    }
})(exjs || (exjs = {}));
var exjs;
(function (exjs) {
    function selectorEnumerator(obj) {
        if (Array.isArray(obj))
            return obj.en().getEnumerator();
        if (obj != null && typeof obj.getEnumerator === "function")
            return obj.getEnumerator();
        return null;
    }
    exjs.selectorEnumerator = selectorEnumerator;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function skipEnumerator(prev, count) {
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t) {
                    t = prev.getEnumerator();
                    for (var i = 0; i < count; i++) {
                        if (!t.moveNext())
                            return false;
                    }
                }
                if (!t.moveNext()) {
                    e.current = undefined;
                    return false;
                }
                e.current = t.current;
                return true;
            }
        };
        return e;
    }
    function skipWhileEnumerator(prev, predicate) {
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t) {
                    t = prev.getEnumerator();
                    for (var i = 0; t.moveNext(); i++) {
                        if (!predicate(e.current = t.current, i))
                            return true;
                    }
                    e.current = undefined;
                    return false;
                }
                if (!t.moveNext()) {
                    e.current = undefined;
                    return false;
                }
                e.current = t.current;
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.skip = function (count) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return skipEnumerator(_this, count); };
        return e;
    };
    exjs.Enumerable.prototype.skipWhile = function (predicate) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return skipWhileEnumerator(_this, predicate); };
        return e;
    };
    if (exjs.List) {
        exjs.List.prototype.skip = exjs.Enumerable.prototype.skip;
        exjs.List.prototype.skipWhile = exjs.Enumerable.prototype.skipWhile;
    }
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function takeEnumerator(prev, count) {
        var t;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                i++;
                if (i > count)
                    return false;
                e.current = undefined;
                if (!t.moveNext())
                    return false;
                e.current = t.current;
                return true;
            }
        };
        return e;
    }
    function takeWhileEnumerator(prev, predicate) {
        var t;
        var i = 0;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                if (!t.moveNext() || !predicate(t.current, i)) {
                    e.current = undefined;
                    return false;
                }
                i++;
                e.current = t.current;
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.take = function (count) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return takeEnumerator(_this, count); };
        return e;
    };
    exjs.Enumerable.prototype.takeWhile = function (predicate) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return takeWhileEnumerator(_this, predicate); };
        return e;
    };
    if (exjs.List) {
        exjs.List.prototype.take = exjs.Enumerable.prototype.take;
        exjs.List.prototype.takeWhile = exjs.Enumerable.prototype.takeWhile;
    }
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function traverseEnumerator(prev, selector) {
        var started = false;
        var enstack = [];
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!started) {
                    t = prev.getEnumerator();
                    started = true;
                }
                else if (t == null) {
                    return false;
                }
                else {
                    enstack.push(t);
                    t = exjs.selectorEnumerator(selector(e.current));
                }
                while (!t || !t.moveNext()) {
                    if (enstack.length < 1)
                        break;
                    t = enstack.pop();
                }
                e.current = t == null ? undefined : t.current;
                return e.current !== undefined;
            }
        };
        return e;
    }
    function traverseUniqueEnumerator(prev, selector, turnstile) {
        var started = false;
        var enstack = [];
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!started) {
                    t = prev.getEnumerator();
                    started = true;
                }
                else if (t == null) {
                    return false;
                }
                else {
                    enstack.push(t);
                    t = exjs.selectorEnumerator(selector(e.current));
                }
                do {
                    while (!t || !t.moveNext()) {
                        if (enstack.length < 1)
                            break;
                        t = enstack.pop();
                    }
                    e.current = t == null ? undefined : t.current;
                } while (turnstile(e.current));
                return e.current !== undefined;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.traverse = function (selector) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return traverseEnumerator(_this, selector); };
        return e;
    };
    exjs.Enumerable.prototype.traverseUnique = function (selector, matcher) {
        var _this = this;
        var existing = [];
        var e = new exjs.Enumerable();
        if (matcher) {
            e.getEnumerator = function () { return traverseUniqueEnumerator(_this, selector, function (x) {
                if (existing.some(function (e) { return matcher(x, e); }))
                    return true;
                existing.push(x);
                return false;
            }); };
        }
        else {
            e.getEnumerator = function () { return traverseUniqueEnumerator(_this, selector, function (x) {
                if (existing.indexOf(x) > -1)
                    return true;
                existing.push(x);
                return false;
            }); };
        }
        return e;
    };
    if (exjs.List) {
        exjs.List.prototype.traverse = exjs.Enumerable.prototype.traverse;
        exjs.List.prototype.traverseUnique = exjs.Enumerable.prototype.traverseUnique;
    }
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function unionEnumerator(prev, second, comparer) {
        comparer = comparer || function (f, s) {
            return f === s;
        };
        var t;
        var visited = [];
        var s;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = exjs.en(prev).distinct().getEnumerator();
                e.current = undefined;
                if (!s && t.moveNext()) {
                    visited.push(e.current = t.current);
                    return true;
                }
                s = s || exjs.en(second).distinct().getEnumerator();
                while (s.moveNext()) {
                    for (var i = 0, hit = false, len = visited.length; i < len && !hit; i++) {
                        hit = comparer(visited[i], s.current);
                    }
                    if (!hit) {
                        e.current = s.current;
                        return true;
                    }
                }
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.union = function (second, comparer) {
        var _this = this;
        var en = second instanceof Array ? second.en() : second;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return unionEnumerator(_this, en, comparer); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.union = exjs.Enumerable.prototype.union;
})(exjs || (exjs = {}));
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function whereEnumerator(prev, filter) {
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!t)
                    t = prev.getEnumerator();
                var c;
                while (t.moveNext()) {
                    if (filter(c = t.current)) {
                        e.current = c;
                        return true;
                    }
                }
                return false;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.where = function (filter) {
        var _this = this;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return whereEnumerator(_this, filter); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.where = exjs.Enumerable.prototype.where;
})(exjs || (exjs = {}));
var exjs;
(function (exjs) {
    function en(enu) {
        var x = new exjs.Enumerable();
        x.getEnumerator = function () {
            return wrapEnumerator(enu);
        };
        return x;
    }
    exjs.en = en;
    function wrapEnumerator(enu) {
        var wrapped = enu.getEnumerator();
        var x = { current: undefined, moveNext: undefined };
        x.moveNext = function () {
            if (wrapped.moveNext()) {
                x.current = wrapped.current;
                return true;
            }
            x.current = undefined;
            return false;
        };
        return x;
    }
})(exjs || (exjs = {}));
var ex = exjs.en;
/// <reference path="enumerable.ts" />
var exjs;
(function (exjs) {
    function zipEnumerator(prev, second, resultSelector) {
        var s;
        var t;
        var e = {
            current: undefined,
            moveNext: function () {
                if (!s)
                    s = prev.getEnumerator();
                if (!t)
                    t = second.getEnumerator();
                e.current = undefined;
                if (!s.moveNext() || !t.moveNext())
                    return false;
                e.current = resultSelector(s.current, t.current);
                return true;
            }
        };
        return e;
    }
    exjs.Enumerable.prototype.zip = function (second, resultSelector) {
        var _this = this;
        var en = second instanceof Array ? second.en() : second;
        var e = new exjs.Enumerable();
        e.getEnumerator = function () { return zipEnumerator(_this, en, resultSelector); };
        return e;
    };
    if (exjs.List)
        exjs.List.prototype.zip = exjs.Enumerable.prototype.zip;
})(exjs || (exjs = {}));

//# sourceMappingURL=ex.js.map
