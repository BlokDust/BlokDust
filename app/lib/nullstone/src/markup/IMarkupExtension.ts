module nullstone.markup {
    export interface IMarkupExtension {
        init(val: string);
        resolveTypeFields?(resolver: (full: string) => any);
        transmute?(os: any[]): any;
    }

    export function finishMarkupExtension (me: IMarkupExtension, prefixResolver: INsPrefixResolver, resolver: events.IResolveType, os: any[]): any {
        if (!me)
            return me;
        if (typeof me.resolveTypeFields === "function") {
            me.resolveTypeFields((full) => parseType(full, prefixResolver, resolver));
        }
        if (typeof me.transmute === "function") {
            return me.transmute(os);
        }
        return me;
    }

    function parseType (full: string, prefixResolver: INsPrefixResolver, resolver: events.IResolveType) {
        var prefix: string = null;
        var name = full;
        var ind = name.indexOf(":");
        if (ind > -1) {
            prefix = name.substr(0, ind);
            name = name.substr(ind + 1);
        }
        var uri = prefixResolver.lookupNamespaceURI(prefix);
        var ort = resolver(uri, name);
        return ort.type;
    }
}