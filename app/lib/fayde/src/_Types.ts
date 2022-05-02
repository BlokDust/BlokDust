module Fayde {
    export var XMLNS = "http://schemas.wsick.com/fayde";
    export var XMLNSX = "http://schemas.wsick.com/fayde/x";
    export var XMLNSINTERNAL = "http://schemas.wsick.com/fayde/internal";

    export var Enum = nullstone.Enum;
    export interface Enum {
        new(): nullstone.Enum;
    }

    export var Uri = nullstone.Uri;
    export interface Uri extends nullstone.Uri {
    }

    export class ResourceTypeManager extends nullstone.TypeManager {
        resolveResource (uri: Uri): string {
            if (uri.scheme === "lib") {
                var res = uri.resource;
                var full = uri.toString();
                var base = full.replace(res, "");
                var lib = this.resolveLibrary(base);
                if (!lib)
                    throw new Error(`Could not find library when resolving resource [${full}].`);
                return joinPaths(lib.basePath, res.length > 1 ? res.substr(1) : "");
            }
            return uri.toString();
        }
    }
    export var TypeManager = new ResourceTypeManager(XMLNS, XMLNSX);

    function joinPaths (base: string, rel: string): string {
        if (base[base.length - 1] !== "/")
            base += "/";
        return base + (rel[0] === "/" ? rel.substr(1) : rel);
    }

    export var CoreLibrary = TypeManager.resolveLibrary(XMLNS);
    (<any>CoreLibrary).$$module = Fayde;
    export var XLibrary = TypeManager.resolveLibrary(XMLNSX);
    (<any>XLibrary).$$module = Fayde;

    export function RegisterType (type: Function, uri: string, name?: string) {
        name = name || nullstone.getTypeName(type);
        TypeManager.add(uri, name, type);
    }

    export function RegisterEnum (enu: any, uri: string, name: string) {
        TypeManager.addEnum(uri, name, enu);
    }

    export var IType_ = new nullstone.Interface("IType");
    IType_.is = function (o): boolean {
        return typeof o === "function";
    };
}