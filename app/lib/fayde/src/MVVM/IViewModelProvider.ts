/// <reference path="../Navigation/Route.ts" />

module Fayde.MVVM {
    export interface IViewModelProvider {
        ResolveViewModel(route: Fayde.Navigation.Route);
    }
    export var IViewModelProvider_ = new nullstone.Interface<IViewModelProvider>("IViewModelProvider");
    IViewModelProvider_.is = function (o: any): boolean {
        return o && typeof o.ResolveViewModel === "function";
    };
}