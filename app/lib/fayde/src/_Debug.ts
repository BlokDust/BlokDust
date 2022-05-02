module Fayde {
    export function debugLayers (): any[] {
        var arr = [];
        var app = Fayde.Application.Current;
        for (var walker = app.MainSurface.walkLayers(); walker.step();) {
            arr.push(sexify(walker.current));
        }
        return arr;
    }

    export function sexify (updater: minerva.core.Updater) {
        var node = updater.getAttachedValue("$node");
        var xobj = node.XObject;

        var ctor = new Function("return function " + xobj.constructor.name + "() { }")();
        var obj = new ctor();

        obj.assets = updater.assets;
        obj.dirtyFlags = sexyflags(updater.assets.dirtyFlags);
        obj.uiFlags = sexyuiflags(updater.assets.uiFlags);
        obj.children = [];
        obj.id = xobj._ID;
        obj.node = node;

        for (var walker = updater.tree.walk(); walker.step();) {
            obj.children.push(sexify(walker.current));
        }

        return obj;
    }

    function sexyflags (flags: minerva.DirtyFlags): string {
        var all = Object.keys(minerva.DirtyFlags)
            .map(i => parseInt(i))
            .filter(key => !isNaN(key))
            .filter(isPowerOf2)
            .sort((a, b) => (a === b) ? 0 : (a < b ? -1 : 1))
            .reverse();

        var remaining = flags;
        return all
            .filter(cur => {
                if ((remaining & cur) === 0)
                    return false;
                remaining &= ~cur;
                return true;
            })
            .map(cur => (<any>minerva.DirtyFlags)[cur])
            .join("|");
    }

    function sexyuiflags (flags: minerva.UIFlags): string {
        var all = Object.keys(minerva.UIFlags)
            .map(i => parseInt(i))
            .filter(key => !isNaN(key))
            .filter(isPowerOf2)
            .sort((a, b) => (a === b) ? 0 : (a < b ? -1 : 1))
            .reverse();

        var remaining = flags;
        return all
            .filter(cur => {
                if ((remaining & cur) === 0)
                    return false;
                remaining &= ~cur;
                return true;
            })
            .map(cur => (<any>minerva.UIFlags)[cur])
            .join("|");
    }

    function isPowerOf2 (num: number): boolean {
        var y = (<Function>(<any>Math).log2)(num);
        return Math.abs(Math.round(y) - y) < 0.000001;
    }

    export function debugLayersRaw (): string {
        var app = Fayde.Application.Current;
        var output = "";
        for (var walker = app.MainSurface.walkLayers(); walker.step();) {
            output += stringify(walker.current);
        }
        return output;
    }

    function stringify (updater: minerva.core.Updater, level: number = 0): string {
        var node = updater.getAttachedValue("$node");
        var xobj = node.XObject;

        var output = "";

        for (var i = 0; i < level; i++) {
            output += "\t";
        }

        output += xobj.constructor.name;
        output += "[" + xobj._ID + "]";

        var ns = node.NameScope;
        var nsr = !ns ? "^" : (ns.IsRoot ? "+" : "-");
        output += " [" + nsr + node.Name + "]";

        output += "\n";

        for (var walker = updater.tree.walk(); walker.step();) {
            output += stringify(walker.current, level + 1);
        }

        return output;
    }

    export function getById (id: number) {
        var app = Fayde.Application.Current;
        for (var walker = app.MainSurface.walkLayers(); walker.step();) {
            for (var subwalker = walker.current.walkDeep(); subwalker.step();) {
                var upd = subwalker.current;
                var node = upd.getAttachedValue("$node");
                var xobj = node.XObject;
                if (xobj._ID === id) {
                    return {
                        obj: xobj,
                        node: node,
                        updater: upd,
                        flags: sexyflags(upd.assets.dirtyFlags),
                        uiflags: sexyuiflags(upd.assets.uiFlags)
                    };
                }
            }
        }
    }

    export function debugLayersFlatten (): any[] {
        var arr = [];
        var app = Fayde.Application.Current;
        for (var walker = app.MainSurface.walkLayers(); walker.step();) {
            for (var subwalker = walker.current.walkDeep(); subwalker.step();) {
                arr.push(subwalker.current);
            }
        }
        return arr;
    }
}