module minerva {
    export function singleton (type: Function): any {
        var x = <any>type;
        if (!x.$$instance)
            Object.defineProperty(x, '$$instance', {value: new x(), enumerable: false});
        return x.$$instance;
    }
}