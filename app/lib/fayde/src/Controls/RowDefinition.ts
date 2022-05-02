/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Controls {
    export class RowDefinition extends DependencyObject implements minerva.controls.grid.IRowDefinition {
        //NOTE: Will not receive property changes from GridLength
        static HeightProperty = DependencyProperty.Register("Height", () => GridLength, RowDefinition, undefined, Incite);
        static MaxHeightProperty = DependencyProperty.Register("MaxHeight", () => Number, RowDefinition, Number.POSITIVE_INFINITY, Incite);
        static MinHeightProperty = DependencyProperty.Register("MinHeight", () => Number, RowDefinition, 0.0, Incite);
        static ActualHeightProperty = DependencyProperty.RegisterReadOnly("ActualHeight", () => Number, RowDefinition, 0.0);
        Height: GridLength;
        MaxHeight: number;
        MinHeight: number;
        ActualHeight: number;

        setActualHeight (value: number) {
            this.SetCurrentValue(RowDefinition.ActualHeightProperty, value);
        }
    }
    Fayde.CoreLibrary.add(RowDefinition);

    import GridUnitType = minerva.controls.grid.GridUnitType;
    function ConvertRowDefinition (o: any): RowDefinition {
        if (!o || o instanceof RowDefinition)
            return <RowDefinition>o;
        var s: string = o.toString();
        var rd = new RowDefinition();
        if (s.toLowerCase() === "auto") {
            rd.Height = new GridLength(0, GridUnitType.Auto);
            return rd;
        }
        if (s === "*") {
            rd.Height = new GridLength(1, GridUnitType.Star);
            return rd;
        }
        var v = parseFloat(s);
        if (isNaN(v))
            throw new XamlParseException("Invalid RowDefinition: '" + s + "'.");
        rd.Height = new GridLength(v, s[s.length - 1] === "*" ? GridUnitType.Star : GridUnitType.Pixel);
        return rd;
    }

    nullstone.registerTypeConverter(RowDefinition, ConvertRowDefinition);

    export class RowDefinitionCollection extends XamlObjectCollection<RowDefinition> {
        _RaiseItemAdded (value: RowDefinition, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: true
            });
        }

        _RaiseItemRemoved (value: RowDefinition, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: false
            });
        }
    }
    Fayde.CoreLibrary.add(RowDefinitionCollection);

    function ConvertRowDefinitionCollection (o: any): RowDefinitionCollection {
        if (!o || o instanceof RowDefinitionCollection)
            return <RowDefinitionCollection>o;
        if (typeof o === "string") {
            var tokens = (<string>o).split(" ");
            var len = tokens.length;
            var rdc = new RowDefinitionCollection();
            var rd: RowDefinition;
            for (var i = 0; i < len; i++) {
                if (rd = ConvertRowDefinition(tokens[i]))
                    rdc.Add(rd);
            }
            return rdc;
        }
        return undefined;
    }

    nullstone.registerTypeConverter(RowDefinitionCollection, ConvertRowDefinitionCollection);
}