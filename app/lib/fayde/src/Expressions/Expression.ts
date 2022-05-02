module Fayde {
    export class Expression {
        IsUpdating: boolean = false;
        IsAttached: boolean = false;

        Seal (owner: DependencyObject, prop: any) {
        }

        OnAttached (target: XamlObject) {
            this.IsAttached = true;
            this.OnDataContextChanged(target.XamlNode.DataContext);
        }

        OnDetached (target: XamlObject) {
            this.IsAttached = false;
            this.OnDataContextChanged(undefined);
        }

        GetValue (propd: DependencyProperty): any {
        }

        OnDataContextChanged (newDataContext: any) {
        }
    }
}