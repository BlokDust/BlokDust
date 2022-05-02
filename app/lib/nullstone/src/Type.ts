module nullstone {
    export function getTypeName (type: Function): string {
        var t = <any>type;
        if (!t)
            return "";
        var name = t.name;
        if (name)
            return name;
        var name = t.toString().match(/function ([^\(]+)/)[1];
        Object.defineProperty(t, "name", {enumerable: false, value: name, writable: false});
        return name;
    }

    export function getTypeParent (type: Function): Function {
        if (type === Object)
            return null;
        var p = (<any>type).$$parent;
        if (!p) {
            if (!type.prototype)
                return undefined;
            p = <Function>Object.getPrototypeOf(type.prototype).constructor;
            Object.defineProperty(type, "$$parent", {value: p, writable: false});
        }
        return p;
    }

    export function addTypeInterfaces (type: Function, ...interfaces: IInterfaceDeclaration<any>[]) {
        if (!interfaces)
            return;
        for (var j = 0, len = interfaces.length; j < len; j++) {
            if (!interfaces[j]) {
                console.warn("Registering undefined interface on type.", type);
                break;
            }
        }
        Object.defineProperty(type, "$$interfaces", {value: interfaces, writable: false});
    }

    export function doesInheritFrom (t: Function, type: any): boolean {
        var temp = <Function><any>t;
        while (temp && temp !== type) {
            temp = getTypeParent(temp);
        }
        return temp != null;
    }
}