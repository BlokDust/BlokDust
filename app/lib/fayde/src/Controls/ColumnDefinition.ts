/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Controls {
    export class ColumnDefinition extends DependencyObject implements minerva.controls.grid.IColumnDefinition {
        //NOTE: Will not receive property changes from GridLength
        static WidthProperty = DependencyProperty.Register("Width", () => GridLength, ColumnDefinition, undefined, Incite);
        static MaxWidthProperty = DependencyProperty.Register("MaxWidth", () => Number, ColumnDefinition, Number.POSITIVE_INFINITY, Incite);
        static MinWidthProperty = DependencyProperty.Register("MinWidth", () => Number, ColumnDefinition, 0.0, Incite);
        static ActualWidthProperty = DependencyProperty.RegisterReadOnly("ActualWidth", () => Number, ColumnDefinition, 0.0);
        Width: GridLength;
        MaxWidth: number;
        MinWidth: number;
        ActualWidth: number;

        setActualWidth (value: number) {
            this.SetCurrentValue(ColumnDefinition.ActualWidthProperty, value);
        }
    }
    Fayde.CoreLibrary.add(ColumnDefinition);

    import GridUnitType = minerva.controls.grid.GridUnitType;
    function ConvertColumnDefinition (o: any): ColumnDefinition {
        if (!o || o instanceof ColumnDefinition)
            return <ColumnDefinition>o;
        var s: string = o.toString();
        var cd = new ColumnDefinition();
        if (s.toLowerCase() === "auto") {
            cd.Width = new GridLength(0, GridUnitType.Auto);
            return cd;
        }
        if (s === "*") {
            cd.Width = new GridLength(1, GridUnitType.Star);
            return cd;
        }
        var v = parseFloat(s);
        if (isNaN(v))
            throw new XamlParseException("Invalid ColumnDefinition: '" + s + "'.");
        cd.Width = new GridLength(v, s[s.length - 1] === "*" ? GridUnitType.Star : GridUnitType.Pixel);
        return cd;
    }

    nullstone.registerTypeConverter(ColumnDefinition, ConvertColumnDefinition);

    export class ColumnDefinitionCollection extends XamlObjectCollection<ColumnDefinition> {
        _RaiseItemAdded (value: ColumnDefinition, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: true
            });
        }

        _RaiseItemRemoved (value: ColumnDefinition, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: false
            });
        }
    }
    Fayde.CoreLibrary.add(ColumnDefinitionCollection);

    function ConvertColumnDefinitionCollection (o: any): ColumnDefinitionCollection {
        if (!o || o instanceof ColumnDefinitionCollection)
            return <ColumnDefinitionCollection>o;
        if (typeof o === "string") {
            var tokens = (<string>o).split(" ");
            var len = tokens.length;
            var cdc = new ColumnDefinitionCollection();
            var cd: ColumnDefinition;
            for (var i = 0; i < len; i++) {
                if (cd = ConvertColumnDefinition(tokens[i]))
                    cdc.Add(cd);
            }
            return cdc;
        }
        return undefined;
    }

    nullstone.registerTypeConverter(ColumnDefinitionCollection, ConvertColumnDefinitionCollection);
}