/// <reference path="Geometry.ts" />
/// <reference path="../Shapes/Enums.ts" />

module Fayde.Media {
    export class GeometryGroup extends Geometry {
        static FillRulleProperty = DependencyProperty.Register("FillRule", () => new Enum(Shapes.FillRule), GeometryGroup, Shapes.FillRule.EvenOdd);
        static ChildrenProperty = DependencyProperty.RegisterImmutable<GeometryCollection>("Children", () => GeometryCollection, GeometryGroup);
        FillRule: Shapes.FillRule;
        Children: GeometryCollection;

        constructor () {
            super();
            var coll = GeometryGroup.ChildrenProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, () => this.InvalidateGeometry());
        }

        ComputePathBounds (pars: minerva.path.IStrokeParameters): minerva.Rect {
            var bounds = new minerva.Rect();
            var cbounds: minerva.Rect;
            for (var enumerator = this.Children.getEnumerator(); enumerator.moveNext();) {
                cbounds = enumerator.current.GetBounds(pars);
                if (cbounds.width <= 0 && cbounds.height <= 0)
                    continue;
                if (bounds.width <= 0 && bounds.height <= 0)
                    minerva.Rect.copyTo(cbounds, bounds);
                else
                    minerva.Rect.union(bounds, cbounds);
            }
            return bounds;
        }

        Draw (ctx: minerva.core.render.RenderContext) {
            var transform = this.Transform;
            if (transform != null) {
                ctx.save();
                ctx.apply(transform.Value._Raw);
            }
            var enumerator = this.Children.getEnumerator();
            while (enumerator.moveNext()) {
                (<Geometry>enumerator.current).Draw(ctx);
            }
            if (transform != null)
                ctx.restore();
        }
    }
    Fayde.CoreLibrary.add(GeometryGroup);
}