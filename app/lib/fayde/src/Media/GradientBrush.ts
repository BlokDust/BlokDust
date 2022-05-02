/// <reference path="Brush.ts" />
/// <reference path="Enums.ts" />

module Fayde.Media {
    export class GradientBrush extends Brush {
        static GradientStopsProperty = DependencyProperty.RegisterImmutable<GradientStopCollection>("GradientStops", () => GradientStopCollection, GradientBrush);
        static MappingModeProperty = DependencyProperty.Register("MappingMode", () => new Enum(BrushMappingMode), GradientBrush, BrushMappingMode.RelativeToBoundingBox, (d: GradientBrush, args) => d.InvalidateBrush());
        static SpreadMethodProperty = DependencyProperty.Register("SpreadMethod", () => new Enum(GradientSpreadMethod), GradientBrush, GradientSpreadMethod.Pad, (d: GradientBrush, args) => d.InvalidateBrush());
        GradientStops: GradientStopCollection;
        MappingMode: BrushMappingMode;
        SpreadMethod: GradientSpreadMethod;

        constructor() {
            super();
            var coll = GradientBrush.GradientStopsProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, () => this.InvalidateBrush());
        }

        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any {
            var spread = this.SpreadMethod;
            switch (spread) {
                case GradientSpreadMethod.Pad:
                default:
                    return this.CreatePad(ctx, bounds);
                case GradientSpreadMethod.Repeat:
                    return this.CreateRepeat(ctx, bounds);
                case GradientSpreadMethod.Reflect:
                    return this.CreateReflect(ctx, bounds);
            }
        }
        CreatePad(ctx: CanvasRenderingContext2D, bounds: minerva.Rect) { }
        CreateRepeat(ctx: CanvasRenderingContext2D, bounds: minerva.Rect) { }
        CreateReflect(ctx: CanvasRenderingContext2D, bounds: minerva.Rect) { }
    }
    Fayde.CoreLibrary.add(GradientBrush);
    Markup.Content(GradientBrush, GradientBrush.GradientStopsProperty);
}