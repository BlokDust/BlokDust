interface ICloneable {
    Clone(): any;
}

module Fayde {
    export function Clone (value: any): any {
        if (value === undefined)
            return undefined;
        if (value === null)
            return null;
        if (value instanceof Array)
            return (<any[]>value).slice(0);
        if (value !== Object(value)) //primitive
            return value;
        if (value.Clone instanceof Function)
            return (<ICloneable>value).Clone();
        return extend(new value.constructor(), value);
    }

    function extend (obj: any, ...args: any[]): any {
        var s: any;
        for (var i = 0, len = args.length; i < len; i++) {
            if (s = args[i]) {
                for (var prop in s) {
                    obj[prop] = s[prop];
                }
            }
        }
        return obj;
    }
}