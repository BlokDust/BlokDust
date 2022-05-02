/// <reference path="Geometry.ts" />

module Fayde.Media {
    export class RectangleGeometry extends Geometry {
        static RectProperty = DependencyProperty.RegisterCore("Rect", () => Rect, RectangleGeometry, undefined, (d: RectangleGeometry, args) => d.InvalidateGeometry());
        static RadiusXProperty = DependencyProperty.RegisterCore("RadiusX", () => Number, RectangleGeometry, 0, (d: RectangleGeometry, args) => d.InvalidateGeometry());
        static RadiusYProperty = DependencyProperty.RegisterCore("RadiusY", () => Number, RectangleGeometry, 0, (d: RectangleGeometry, args) => d.InvalidateGeometry());
        Rect: minerva.Rect;
        RadiusX: number;
        RadiusY: number;

        _Build (): minerva.path.Path {
            var irect = this.Rect;
            if (!irect)
                return null;

            var radiusX = this.RadiusX;
            var radiusY = this.RadiusY;

            var p = new minerva.path.Path();
            p.roundedRect(irect.x, irect.y, irect.width, irect.height, radiusX, radiusY);
            return p;
        }
    }
    Fayde.CoreLibrary.add(RectangleGeometry);
}