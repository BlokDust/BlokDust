/// <reference path="Geometry.ts" />

module Fayde.Media {
    export class LineGeometry extends Geometry {
        static StartPointProperty = DependencyProperty.Register("StartPoint", () => Point, LineGeometry, undefined, (d: Geometry, args) => d.InvalidateGeometry());
        static EndPointProperty = DependencyProperty.Register("EndPoint", () => Point, LineGeometry, undefined, (d: Geometry, args) => d.InvalidateGeometry());
        StartPoint: Point;
        EndPoint: Point;

        _Build (): minerva.path.Path {
            var p1 = this.StartPoint;
            var p2 = this.EndPoint;

            var p = new minerva.path.Path();
            p.move(p1.x, p1.y);
            p.line(p2.x, p2.y);
            return p;
        }
    }
    Fayde.CoreLibrary.add(LineGeometry);
}