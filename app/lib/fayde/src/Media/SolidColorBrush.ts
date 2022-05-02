/// <reference path="Brush.ts" />

module Fayde.Media {
    export class SolidColorBrush extends Brush {
        static ColorProperty = DependencyProperty.Register("Color", () => Color, SolidColorBrush, undefined, (d, args) => (<Brush>d).InvalidateBrush());
        Color: Color;

        constructor(...args: any[]) {
            super();
            if (args && args.length === 1 && args[0] instanceof Color)
                this.Color = args[0];
        }

        isTransparent(): boolean {
            var color = this.Color;
            return !color || (color.A <= 0);
        }

        static FromColor(color: Color): SolidColorBrush {
            var scb = new SolidColorBrush();
            scb.Color = color;
            return scb;
        }

        setupBrush (ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            if ((<any>this)._CachedBrush)
                return;
            (<any>this)._CachedBrush = this.CreateBrush(ctx, bounds);
        }

        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any {
            var color = this.Color;
            if (!color)
                return "#000000";
            return color.toString();
        }
    }
    Fayde.CoreLibrary.add(SolidColorBrush);

    function brushConverter(val: any): Brush {
        if (!val)
            return undefined;
        if (val instanceof Brush)
            return val;
        var scb = new SolidColorBrush();
        scb.Color = nullstone.convertAnyToType(val, Color);
        return scb;
    }

    nullstone.registerTypeConverter(Brush, brushConverter);
    nullstone.registerTypeConverter(SolidColorBrush, brushConverter);
}