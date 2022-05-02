/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Navigation {
    export class RouteMapper extends DependencyObject {
        static RouteMappingsProperty = DependencyProperty.RegisterImmutable<XamlObjectCollection<RouteMapping>>("RouteMappings", () => XamlObjectCollection, RouteMapper);
        static ViewModelProviderProperty = DependencyProperty.Register("ViewModelProvider", () => Fayde.MVVM.IViewModelProvider_, RouteMapper);

        RouteMappings: XamlObjectCollection<RouteMapping>;
        ViewModelProvider: Fayde.MVVM.IViewModelProvider;

        constructor () {
            super();
            RouteMapper.RouteMappingsProperty.Initialize(this);
        }

        MapUri (uri: Uri): Route {
            var mapped: Route;
            for (var en = this.RouteMappings.getEnumerator(); en.moveNext();) {
                mapped = en.current.MapUri(uri);
                if (mapped) {
                    var vm: any = this.ViewModelProvider ? this.ViewModelProvider.ResolveViewModel(mapped) : null;
                    mapped.DataContext = vm;
                    return mapped;
                }
            }
            return undefined;
        }
    }
    Fayde.CoreLibrary.add(RouteMapper);
    Markup.Content(RouteMapper, RouteMapper.RouteMappingsProperty);
}