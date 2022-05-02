/// <reference path="../Core/FrameworkElement.ts" />

module Fayde.Shapes {
    import ShapeUpdater = minerva.shapes.shape.ShapeUpdater;

    export class Shape extends FrameworkElement {
        CreateLayoutUpdater () {
            return new ShapeUpdater();
        }

        static FillProperty = DependencyProperty.Register("Fill", () => Media.Brush, Shape);
        //http://msdn.microsoft.com/en-us/library/system.windows.shapes.shape.stretch(v=vs.95).aspx
        static StretchProperty = DependencyProperty.Register("Stretch", () => new Enum(Media.Stretch), Shape, Media.Stretch.None);
        static StrokeProperty = DependencyProperty.Register("Stroke", () => Media.Brush, Shape);
        static StrokeThicknessProperty = DependencyProperty.RegisterFull("StrokeThickness", () => Number, Shape, 1.0, undefined, strokeThicknessCoercer);
        static StrokeDashArrayProperty = DependencyProperty.Register("StrokeDashArray", () => DoubleCollection, Shape);
        static StrokeDashCapProperty = DependencyProperty.Register("StrokeDashCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat);
        static StrokeDashOffsetProperty = DependencyProperty.Register("StrokeDashOffset", () => Number, Shape, 0.0);
        static StrokeEndLineCapProperty = DependencyProperty.Register("StrokeEndLineCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat);
        static StrokeLineJoinProperty = DependencyProperty.Register("StrokeLineJoin", () => new Enum(PenLineJoin), Shape, PenLineJoin.Miter);
        static StrokeMiterLimitProperty = DependencyProperty.Register("StrokeMiterLimit", () => Number, Shape, 10.0);
        static StrokeStartLineCapProperty = DependencyProperty.Register("StrokeStartLineCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat);
        Fill: Media.Brush;
        Stretch: Media.Stretch;
        Stroke: Media.Brush;
        StrokeThickness: number;
        StrokeDashArray: DoubleCollection;
        StrokeDashCap: PenLineCap;
        StrokeDashOffset: number;
        StrokeEndLineCap: PenLineCap;
        StrokeLineJoin: PenLineJoin;
        StrokeMiterLimit: number;
        StrokeStartLineCap: PenLineCap;
        //NOTE: HTML5 Canvas does not support start and end cap. Will use start if it's not "Flat"; otherwise, use end

        constructor () {
            super();
            FrameworkElement.WidthProperty.Store.ListenToChanged(this, FrameworkElement.WidthProperty, onSizeChanged, this);
            FrameworkElement.HeightProperty.Store.ListenToChanged(this, FrameworkElement.HeightProperty, onSizeChanged, this);
        }
    }
    Fayde.CoreLibrary.add(Shape);

    function onSizeChanged (shape: Shape, args: IDependencyPropertyChangedEventArgs) {
        var updater = <ShapeUpdater>shape.XamlNode.LayoutUpdater;
        updater.invalidateMeasure();
    }

    function strokeThicknessCoercer (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any): any {
        if (value instanceof Thickness)
            return (<Thickness>value).left;
        return value;
    }

    module reactions {
        UIReaction<Media.Stretch>(Shape.StretchProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateMeasure(), false);
        UIReaction<Media.Brush>(Shape.FillProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds());
        UIReaction<Media.Brush>(Shape.StrokeProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds());
        UIReaction<number>(Shape.StrokeThicknessProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<DoubleCollection>(Shape.StrokeDashArrayProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds());
        UIReaction<PenLineCap>(Shape.StrokeDashCapProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<number>(Shape.StrokeDashOffsetProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<PenLineCap>(Shape.StrokeEndLineCapProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<PenLineJoin>(Shape.StrokeLineJoinProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<number>(Shape.StrokeMiterLimitProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
        UIReaction<PenLineCap>(Shape.StrokeStartLineCapProperty, (upd: ShapeUpdater, ov, nv) => upd.invalidateNaturalBounds(), false);
    }
}