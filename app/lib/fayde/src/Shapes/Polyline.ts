/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import PolylineUpdater = minerva.shapes.polyline.PolylineUpdater;
    export class Polyline extends Shape {
        CreateLayoutUpdater () {
            return new PolylineUpdater();
        }

        private static _PointsCoercer (d: DependencyObject, propd: DependencyProperty, value: any): any {
            if (typeof value === "string")
                value = PointCollection.FromData(<string>value);
            if (value instanceof Array)
                value = PointCollection.FromArray(<Point[]>value);
            return value;
        }

        static FillRuleProperty = DependencyProperty.RegisterCore("FillRule", () => new Enum(FillRule), Polyline, FillRule.EvenOdd);
        static PointsProperty = DependencyProperty.RegisterFull("Points", () => PointCollection, Polyline, undefined, undefined, Polyline._PointsCoercer);
        FillRule: FillRule;
        Points: PointCollection;

        constructor () {
            super();
            this.Points = new PointCollection();
        }
    }
    Fayde.CoreLibrary.add(Polyline);

    module reactions {
        UIReaction<FillRule>(Polyline.FillRuleProperty, (upd: PolylineUpdater, ov, nv) => upd.invalidateFillRule(), false);
        UIReaction<PointCollection>(Polyline.PointsProperty, (upd: PolylineUpdater, ov, nv) => {
            upd.assets.points = nv._ht;
            upd.invalidatePath();
        }, true, false);
    }
}