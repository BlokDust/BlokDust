/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import PolygonUpdater = minerva.shapes.polygon.PolygonUpdater;
    export class Polygon extends Shape {
        CreateLayoutUpdater () {
            return new PolygonUpdater();
        }

        private static _PointsCoercer (dobj: DependencyObject, propd: DependencyProperty, value: any): any {
            if (typeof value === "string")
                value = PointCollection.FromData(<string>value);
            if (value instanceof Array)
                value = PointCollection.FromArray(<Point[]>value);
            return value;
        }

        static FillRuleProperty = DependencyProperty.RegisterCore("FillRule", () => new Enum(FillRule), Polygon, FillRule.EvenOdd);
        static PointsProperty = DependencyProperty.RegisterFull("Points", () => PointCollection, Polygon, undefined, undefined, Polygon._PointsCoercer);
        FillRule: FillRule;
        Points: PointCollection;

        constructor () {
            super();
            this.Points = new PointCollection();
        }
    }
    Fayde.CoreLibrary.add(Polygon);

    module reactions {
        UIReaction<FillRule>(Polygon.FillRuleProperty, (upd: PolygonUpdater, ov, nv) => upd.invalidateFillRule(), false);
        UIReaction<PointCollection>(Polygon.PointsProperty, (upd: PolygonUpdater, ov, nv) => {
            upd.assets.points = nv._ht;
            upd.invalidatePath();
        }, true, false);
    }
}