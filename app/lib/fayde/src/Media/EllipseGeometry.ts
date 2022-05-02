/// <reference path="Geometry.ts" />

module Fayde.Media {
    export class EllipseGeometry extends Geometry {
        static CenterProperty = DependencyProperty.Register("Center", () => Point, EllipseGeometry, undefined, (d: Geometry, args) => d.InvalidateGeometry());
        static RadiusXProperty = DependencyProperty.Register("RadiusX", () => Number, EllipseGeometry, 0.0, (d: Geometry, args) => d.InvalidateGeometry());
        static RadiusYProperty = DependencyProperty.Register("RadiusY", () => Number, EllipseGeometry, 0.0, (d: Geometry, args) => d.InvalidateGeometry());
        Center: Point;
        RadiusX: number;
        RadiusY: number;

        _Build(): minerva.path.Path {
            var rx = this.RadiusX;
            var ry = this.RadiusY;
            var center = this.Center;
            var x = center ? center.x : 0.0;
            var y = center ? center.y : 0.0;

            var p = new minerva.path.Path();
            p.ellipse(x - rx, y - ry, rx * 2.0, ry * 2.0);
            return p;
        }
    }
    Fayde.CoreLibrary.add(EllipseGeometry);
}