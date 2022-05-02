/// <reference path="Geometry.ts" />

module Fayde.Media {
    export class PathGeometry extends Geometry implements minerva.shapes.path.IPathGeometry {
        private _OverridePath: minerva.path.Path = null;
        static FillRuleProperty = DependencyProperty.Register("FillRule", () => new Enum(Shapes.FillRule), PathGeometry, Shapes.FillRule.EvenOdd, (d: Geometry, args) => d.InvalidateGeometry());
        static FiguresProperty = DependencyProperty.RegisterImmutable<PathFigureCollection>("Figures", () => PathFigureCollection, PathGeometry);
        FillRule: Shapes.FillRule;
        Figures: PathFigureCollection;

        get fillRule (): minerva.FillRule {
            return <any>this.FillRule;
        }

        constructor () {
            super();
            var coll = PathGeometry.FiguresProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, () => this.InvalidateFigures());
        }

        OverridePath (path: minerva.path.Path) {
            this._OverridePath = path;
        }

        _Build (): minerva.path.Path {
            if (this._OverridePath)
                return this._OverridePath;

            var p = new minerva.path.Path();
            var figures = this.Figures;
            if (!figures)
                return;

            var enumerator = figures.getEnumerator();
            while (enumerator.moveNext()) {
                (<PathFigure>enumerator.current).MergeInto(p);
            }
            return p;
        }

        InvalidateFigures () {
            this._OverridePath = null; //Any change in PathFigures invalidates a path override
            this.InvalidateGeometry();
        }
    }
    Fayde.CoreLibrary.add(PathGeometry);
    Markup.Content(PathGeometry, PathGeometry.FiguresProperty);
}