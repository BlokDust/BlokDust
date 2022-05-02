module Fayde.Navigation {
    export class Route {
        View: Uri;
        HashParams: { [key: string]: string };
        DataContext: any;

        constructor (view: Uri, hashParams: { [key: string]: string }, dataContext: any) {
            this.View = view;
            this.HashParams = hashParams;
            this.DataContext = dataContext;
        }
    }
    Fayde.CoreLibrary.add(Route);
}