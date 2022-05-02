module nullstone.markup {
    export interface INsPrefixResolver {
        lookupNamespaceURI(prefix: string): string;
    }
    export interface IMarkupExtensionParser {
        setNamespaces (defaultXmlns: string, xXmlns: string): IMarkupExtensionParser;
        onResolveType (cb?: events.IResolveType): IMarkupExtensionParser;
        onResolveObject (cb?: events.IResolveObject): IMarkupExtensionParser;
        onResolvePrimitive (cb?: events.IResolvePrimitive): IMarkupExtensionParser;
        onError (cb?: events.IError): IMarkupExtensionParser;
        parse(val: string, resolver: INsPrefixResolver, os: any[]):any;
    }
}