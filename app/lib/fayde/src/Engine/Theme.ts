module Fayde {
    export class Theme {
        Name: string;
        LibraryUri: Uri;
        Resources: ResourceDictionary = null;

        static WarnMissing = false;

        constructor (name: string, libUri: Uri) {
            this.Name = name;
            this.LibraryUri = libUri;
        }

        LoadAsync (): nullstone.async.IAsyncRequest<Theme> {
            var reqUri = ThemeConfig.GetRequestUri(this.LibraryUri, this.Name);
            if (!reqUri)
                return nullstone.async.resolve(this);
            return nullstone.async.create((resolve, reject) => {
                Markup.Resolve(reqUri)
                    .then(md => {
                        var rd = Markup.Load<ResourceDictionary>(null, md);
                        if (!(rd instanceof ResourceDictionary))
                            reject(new Error("Theme root must be a ResourceDictionary."));
                        Object.defineProperty(this, "Resources", {value: rd, writable: false});
                        resolve(this);
                    }, () => {
                        if (Theme.WarnMissing)
                            console.warn("Failed to load Theme. [" + this.LibraryUri + "][" + this.Name + "]");
                        resolve(this);
                    });
            });
        }

        GetImplicitStyle (type: any): Style {
            var rd = this.Resources;
            if (!rd)
                return undefined;
            var style = <Style>rd.Get(type);
            if (style instanceof Style)
                return style;
            return undefined;
        }
    }
    Fayde.CoreLibrary.add(Theme);
}