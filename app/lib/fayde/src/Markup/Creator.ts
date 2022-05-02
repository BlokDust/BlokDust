module Fayde.Markup {
    import XamlMarkup = nullstone.markup.xaml.XamlMarkup;
    var lastId = 0;

    export function CreateXaml (xaml: string, uri?: string): XamlMarkup;
    export function CreateXaml (el: Element, uri?: string): XamlMarkup;
    export function CreateXaml (obj: any, uri?: string): XamlMarkup {
        lastId++;
        uri = uri || "http://gen/" + lastId.toString();
        var xm = new XamlMarkup(uri);
        var root = (typeof obj === "string")
            ? xm.loadRoot(obj)
            : obj;
        if (!root.isDefaultNamespace(Fayde.XMLNS))
            throw new XamlParseException("Invalid default namespace. [" + root.lookupNamespaceURI(null) + "]");
        xm.setRoot(root);
        return xm;
    }
}