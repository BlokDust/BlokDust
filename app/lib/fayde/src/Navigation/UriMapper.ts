/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Navigation {
    export class UriMapper extends DependencyObject {
        static UriMappingsProperty = DependencyProperty.RegisterImmutable<XamlObjectCollection<UriMapping>>("UriMappings", () => XamlObjectCollection, UriMapper);
        UriMappings: XamlObjectCollection<UriMapping>;

        constructor() {
            super();
            UriMapper.UriMappingsProperty.Initialize(this);
        }

        MapUri(uri: Uri): Uri {
            var enumerator = this.UriMappings.getEnumerator();
            var mapped: Uri;
            while (enumerator.moveNext()) {
                mapped = enumerator.current.MapUri(uri);
                if (mapped)
                    return mapped;
            }
            return uri;
        }
    }
    Fayde.CoreLibrary.add(UriMapper);
    Markup.Content(UriMapper, UriMapper.UriMappingsProperty);
}