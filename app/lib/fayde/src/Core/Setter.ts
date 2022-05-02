/// <reference path="DependencyObject.ts" />
/// <reference path="XamlObjectCollection.ts" />

module Fayde {
    export class SetterCollection extends XamlObjectCollection<Setter> {
        private _IsSealed: boolean = false;
        XamlNode: XamlNode;

        Seal () {
            if (this._IsSealed)
                return;
            for (var en = this.getEnumerator(); en.moveNext();) {
                en.current.Seal();
            }
            this._IsSealed = true;
        }

        AddingToCollection (value: Setter, error: BError): boolean {
            if (!value || !this._ValidateSetter(<Setter>value, error))
                return false;
            return super.AddingToCollection(value, error);
        }

        private _ValidateSetter (setter: Setter, error: BError) {
            if (!(setter.Property instanceof DependencyProperty)) {
                error.Message = "Setter.Property must be a DependencyProperty.";
                return false;
            }
            if (setter.Value === undefined) {
                if (!setter._HasDeferredValueExpression(Setter.ValueProperty)) {
                    error.Message = "Setter must have a Value.";
                    return false;
                }
            }
            if (this._IsSealed) {
                error.Message = "Setter is sealed.";
                return false;
            }
            return true;
        }
    }
    Fayde.CoreLibrary.add(SetterCollection);

    export class Setter extends DependencyObject {
        private _IsSealed: boolean = false;
        static PropertyProperty = DependencyProperty.Register("Property", () => DependencyProperty, Setter);
        static ValueProperty = DependencyProperty.Register("Value", () => Object, Setter);
        static ConvertedValueProperty = DependencyProperty.RegisterReadOnly("ConvertedValue", () => Object, Setter);
        Property: DependencyProperty;
        Value: any;
        ConvertedValue: any;

        Seal () {
            var propd = this.Property;
            var val = this.Value;

            var propTargetType = <Function>propd.GetTargetType();
            this.SetCurrentValue(Setter.ConvertedValueProperty, nullstone.convertAnyToType(val, propTargetType));
            this._IsSealed = true;
        }

        static Compare (setter1: Setter, setter2: Setter): number {
            var a = setter1.Property;
            var b = setter2.Property;
            return (a === b) ? 0 : ((a._ID > b._ID) ? 1 : -1);
        }
    }
    Fayde.CoreLibrary.add(Setter);
}