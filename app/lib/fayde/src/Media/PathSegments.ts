/// <reference path="PathSegment.ts" />

module Fayde.Media {
    //TODO: Should we be doing `Incite(this)` when properties change?
    export class ArcSegment extends PathSegment {
        static IsLargeArcProperty = DependencyProperty.RegisterCore("IsLargeArc", () => Boolean, ArcSegment, false, (d: ArcSegment, args) => Incite(d));
        static PointProperty = DependencyProperty.Register("Point", () => Point, ArcSegment, undefined, (d: ArcSegment, args) => Incite(d));
        static RotationAngleProperty = DependencyProperty.Register("RotationAngle", () => Number, ArcSegment, 0.0, (d: ArcSegment, args) => Incite(d));
        static SizeProperty = DependencyProperty.Register("Size", () => minerva.Size, ArcSegment, undefined, (d: ArcSegment, args) => Incite(d));
        static SweepDirectionProperty = DependencyProperty.Register("SweepDirection", () => new Enum(Shapes.SweepDirection), ArcSegment, Shapes.SweepDirection.Counterclockwise, (d: ArcSegment, args) => Incite(d));
        IsLargeArc: boolean;
        Point: Point;
        RotationAngle: number;
        Size: minerva.Size;
        SweepDirection: Shapes.SweepDirection;

        _Append(path: minerva.path.Path) {
            var size = this.Size;
            var width = size ? size.width : 0.0;
            var height = size ? size.height : 0.0;

            var endpt = this.Point;
            var ex = endpt ? endpt.x : 0.0;
            var ey = endpt ? endpt.y : 0.0;

            path.ellipticalArc(width, height, this.RotationAngle, this.IsLargeArc, <minerva.SweepDirection><number>this.SweepDirection, ex, ey);
        }
    }
    Fayde.CoreLibrary.add(ArcSegment);

    export class BezierSegment extends PathSegment {
        static Point1Property = DependencyProperty.Register("Point1", () => Point, BezierSegment);
        static Point2Property = DependencyProperty.Register("Point2", () => Point, BezierSegment);
        static Point3Property = DependencyProperty.Register("Point3", () => Point, BezierSegment);
        Point1: Point;
        Point2: Point;
        Point3: Point;

        _Append(path: minerva.path.Path) {
	        var p1 = this.Point1;
	        var p2 = this.Point2;
	        var p3 = this.Point3;

	        var x1 = p1 ? p1.x : 0.0;
	        var y1 = p1 ? p1.y : 0.0;
	        var x2 = p2 ? p2.x : 0.0;
	        var y2 = p2 ? p2.y : 0.0;
	        var x3 = p3 ? p3.x : 0.0;
	        var y3 = p3 ? p3.y : 0.0;

	        path.cubicBezier(x1, y1, x2, y2, x3, y3);
        }
    }
    Fayde.CoreLibrary.add(BezierSegment);

    export class LineSegment extends PathSegment {
        static PointProperty = DependencyProperty.Register("Point", () => Point, LineSegment);
        Point: Point;

        _Append(path: minerva.path.Path) {
            var p = this.Point;
            var x = p ? p.x : 0.0;
            var y = p ? p.y : 0.0;
            path.line(x, y);
        }
    }
    Fayde.CoreLibrary.add(LineSegment);

    export class PolyBezierSegment extends PathSegment {
        static PointsProperty = DependencyProperty.RegisterImmutable<Shapes.PointCollection>("Points", () => Shapes.PointCollection, PolyBezierSegment);
        Points: Shapes.PointCollection;

        constructor() {
            super();
            PolyBezierSegment.PointsProperty.Initialize(this);
        }

        _Append(path: minerva.path.Path) {
            var points = this.Points;
            if (!points || (points.Count % 3) !== 0)
                return;

            var p1: Point;
            var p2: Point;
            var p3: Point;
            var enumerator = points.getEnumerator();
            while (enumerator.moveNext()) {
                p1 = enumerator.current;
                enumerator.moveNext();
                p2 = enumerator.current;
                enumerator.moveNext();
                p3 = enumerator.current;
                path.cubicBezier(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
            }
        }
    }
    Fayde.CoreLibrary.add(PolyBezierSegment);
    Markup.Content(PolyBezierSegment, PolyBezierSegment.PointsProperty);

    export class PolyLineSegment extends PathSegment {
        static PointsProperty = DependencyProperty.RegisterImmutable<Shapes.PointCollection>("Points", () => Shapes.PointCollection, PolyLineSegment);
        Points: Shapes.PointCollection;

        constructor() {
            super();
            PolyLineSegment.PointsProperty.Initialize(this);
        }

        _Append(path: minerva.path.Path) {
            var p: Point;
            var enumerator = this.Points.getEnumerator();
            while (enumerator.moveNext()) {
                p = enumerator.current;
                path.line(p.x, p.y);
            }
            console.warn("PolyLineSegment._Append");
        }
    }
    Fayde.CoreLibrary.add(PolyLineSegment);
    Markup.Content(PolyLineSegment, PolyLineSegment.PointsProperty);

    export class PolyQuadraticBezierSegment extends PathSegment {
        static PointsProperty = DependencyProperty.RegisterImmutable<Shapes.PointCollection>("Points", () => Shapes.PointCollection, PolyQuadraticBezierSegment);
        Points: Shapes.PointCollection;

        constructor() {
            super();
            PolyQuadraticBezierSegment.PointsProperty.Initialize(this);
        }

        _Append(path: minerva.path.Path) {
            var points = this.Points;
            if (!points || (points.Count % 2) !== 0)
                return;

            var x0 = path.endX;
            var y0 = path.endY;
            var x1: number;
            var y1: number;
            var x2: number;
            var y2: number;
            var x3: number;
            var y3: number;
            var enumerator = points.getEnumerator();
            while (enumerator.moveNext()) {
                x1 = enumerator.current.x;
                y1 = enumerator.current.y;
                enumerator.moveNext();
                x2 = enumerator.current.x;
                y2 = enumerator.current.y;
                x3 = x2;
                y3 = y2;
                
		        x2 = x1 + (x2 - x1) / 3;
		        y2 = y1 + (y2 - y1) / 3;
		        x1 = x0 + 2 * (x1 - x0) / 3;
		        y1 = y0 + 2 * (y1 - y0) / 3;

                path.cubicBezier(x1, y1, x2, y2, x3, y3);
                x0 = x3;
                y0 = y3;
            }
        }
    }
    Fayde.CoreLibrary.add(PolyQuadraticBezierSegment);
    Markup.Content(PolyQuadraticBezierSegment, PolyQuadraticBezierSegment.PointsProperty);

    export class QuadraticBezierSegment extends PathSegment {
        static Point1Property = DependencyProperty.Register("Point1", () => Point, QuadraticBezierSegment);
        static Point2Property = DependencyProperty.Register("Point2", () => Point, QuadraticBezierSegment);
        Point1: Point;
        Point2: Point;

        _Append(path: minerva.path.Path) {
            var p1 = this.Point1;
            var p2 = this.Point2;

            var x1 = p1 ? p1.x : 0.0;
            var y1 = p1 ? p1.y : 0.0;
            var x2 = p2 ? p2.x : 0.0;
            var y2 = p2 ? p2.y : 0.0;

            path.quadraticBezier(x1, y1, x2, y2);
        }
    }
    Fayde.CoreLibrary.add(QuadraticBezierSegment);
}