/// <reference path="../Control.ts" />

module Fayde.Controls.Primitives {
    export class RangeBase extends Controls.Control {
        static MinimumProperty = DependencyProperty.RegisterFull("Minimum", () => Number, RangeBase, 0, (d, args) => (<RangeBase>d)._Coercer.OnMinimumChanged(args.OldValue, args.NewValue), undefined, false, numberValidator);
        static MaximumProperty = DependencyProperty.RegisterFull("Maximum", () => Number, RangeBase, 1, (d, args) => (<RangeBase>d)._Coercer.OnMaximumChanged(args.OldValue, args.NewValue), undefined, false, numberValidator);
        static LargeChangeProperty = DependencyProperty.RegisterFull("LargeChange", () => Number, RangeBase, 1, undefined, undefined, false, changeValidator);
        static SmallChangeProperty = DependencyProperty.RegisterFull("SmallChange", () => Number, RangeBase, 0.1, undefined, undefined, false, changeValidator);
        static ValueProperty = DependencyProperty.RegisterFull("Value", () => Number, RangeBase, 0, (d, args) => (<RangeBase>d)._Coercer.OnValueChanged(args.OldValue, args.NewValue), undefined, false, numberValidator);

        Minimum: number;
        Maximum: number;
        SmallChange: number;
        LargeChange: number;
        Value: number;
        
        OnMinimumChanged(oldMin: number, newMin: number) { }
        OnMaximumChanged(oldMax: number, newMax: number) { }
        OnValueChanged(oldVal: number, newVal: number) {
            this.ValueChanged.raise(this, new RoutedPropertyChangedEventArgs(oldVal, newVal));
        }
        ValueChanged = new RoutedPropertyChangedEvent<number>();

        private _Coercer: Internal.IRangeCoercer;

        constructor() {
            super();
            this._Coercer = new Internal.RangeCoercer(this, 
                (val) => this.SetCurrentValue(RangeBase.MaximumProperty, val),
                (val) => this.SetCurrentValue(RangeBase.ValueProperty, val));
        }
    }
    Fayde.CoreLibrary.add(RangeBase);

    function numberValidator(d: DependencyObject, propd: DependencyProperty, value: any): boolean {
        if (typeof value !== "number")
            return false;
        if (isNaN(value))
            return false;
        if (!isFinite(value))
            return false;
        return true;
    }
    function changeValidator(d: DependencyObject, propd: DependencyProperty, value: any): boolean {
        if (!numberValidator(d, propd, value))
            return false;
        return value >= 0;
    }
}