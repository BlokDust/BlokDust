module nullstone.markup.xaml {
    var parser = new DOMParser();
    var xcache = new Memoizer<XamlMarkup>((key) => new XamlMarkup(key));

    export class XamlMarkup extends markup.Markup<Element> {
        static create (uri: string): XamlMarkup;
        static create (uri: Uri): XamlMarkup;
        static create (uri: any): XamlMarkup {
            return xcache.memoize(uri.toString());
        }

        createParser () {
            return new XamlParser();
        }

        loadRoot (data: string): Element {
            var doc = parser.parseFromString(data, "text/xml");
            return doc.documentElement;
        }
    }
}