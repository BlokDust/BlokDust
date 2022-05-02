/// <reference path="Geometry.ts" />


// Path Markup Syntax: http://msdn.microsoft.com/en-us/library/cc189041(v=vs.95).aspx

//FigureDescription Syntax
// MoveCommand DrawCommands [CloseCommand]

//Double Syntax
// digits
// digits.digits
// 'Infinity'
// '-Infinity'
// 'NaN'

//Point Syntax
// x,y
// x y

//Loop until exhausted
//  Parse FigureDescription
//      Find "M" or "m"? - Parse MoveCommand (start point)
//          <point>
//
//      Find "L" or "l"? - Parse LineCommand (end point)
//          <point>
//      Find "H" or "h"? - Parse HorizontalLineCommand (x)
//          <double>
//      Find "V" or "v"? - Parse VerticalLineCommand (y)
//          <double>
//      Find "C" or "c"? - Parse CubicBezierCurveCommand (control point 1, control point 2, end point)
//          <point> <point> <point>
//      Find "Q" or "q"? - Parse QuadraticBezierCurveCommand (control point, end point)
//          <point> <point>
//      Find "S" or "s"? - Parse SmoothCubicBezierCurveCommand (control point 2, end point)
//          <point> <point>
//      Find "T" or "t"? - Parse SmoothQuadraticBezierCurveCommand (control point, end point)
//          <point> <point>
//      Find "A" or "a"? - Parse EllipticalArcCommand (size, rotationAngle, isLargeArcFlag, sweepDirectionFlag, endPoint)
//          <point> <double> <1,0> <1,0> <point>
//
//      Find "Z" or "z"? - CloseCommand

module Fayde.Media {
    export function ParseGeometry (val: string): Geometry {
        return (new MediaParser(val)).ParseGeometryImpl();
    }

    export function ParseShapePoints (val: string): Point[] {
        return (new MediaParser(val)).ParseShapePoints();
    }

    class MediaParser {
        private str: string;
        private len: number;
        private index: number = 0;

        constructor (str: string) {
            this.str = str;
            this.len = str.length;
        }

        ParseGeometryImpl (): Geometry {
            var cp = new Point();
            var cp1: Point, cp2: Point, cp3: Point;
            var start = new Point();
            var fillRule = Shapes.FillRule.EvenOdd;
            var cbz = false; // last figure is a cubic bezier curve
            var qbz = false; // last figure is a quadratic bezier curve
            var cbzp = new Point(); // points needed to create "smooth" beziers
            var qbzp = new Point(); // points needed to create "smooth" beziers

            var path = new minerva.path.Path();
            while (this.index < this.len) {
                var c;
                while (this.index < this.len && (c = this.str.charAt(this.index)) === ' ') {
                    this.index++;
                }
                this.index++;
                var relative = false;
                switch (c) {
                    case 'f':
                    case 'F':
                        c = this.str.charAt(this.index);
                        if (c === '0')
                            fillRule = Shapes.FillRule.EvenOdd;
                        else if (c === '1')
                            fillRule = Shapes.FillRule.NonZero;
                        else
                            return null;
                        this.index++;
                        c = this.str.charAt(this.index);
                        break;
                    case 'm':
                        relative = true;
                    case 'M':
                        cp1 = this.ParsePoint();
                        if (cp1 == null)
                            break;
                        if (relative) {
                            cp1.x += cp.x;
                            cp1.y += cp.y;
                        }
                        path.move(cp1.x, cp1.y);
                        start.x = cp.x = cp1.x;
                        start.y = cp.y = cp1.y;
                        this.Advance();
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.x += cp.x;
                                cp1.y += cp.y;
                            }
                            path.line(cp1.x, cp1.y);
                        }
                        cp.x = cp1.x;
                        cp.y = cp1.y;
                        cbz = qbz = false;
                        break;
                    case 'l':
                        relative = true;
                    case 'L':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;

                            if (relative) {
                                cp1.x += cp.x;
                                cp1.y += cp.y;
                            }

                            path.line(cp1.x, cp1.y);

                            cp.x = cp1.x;
                            cp.y = cp1.y;
                            this.Advance();
                        }
                        cbz = qbz = false;
                        break;
                    case 'h':
                        relative = true;
                    case 'H':
                        var x = this.ParseDouble();
                        if (x == null)
                            break;

                        if (relative)
                            x += cp.x;
                        cp = new Point(x, cp.y);

                        path.line(cp.x, cp.y);
                        cbz = qbz = false;
                        break;
                    case 'v':
                        relative = true;
                    case 'V':
                        var y = this.ParseDouble();
                        if (y == null)
                            break;

                        if (relative)
                            y += cp.y;
                        cp = new Point(cp.x, y);

                        path.line(cp.x, cp.y);
                        cbz = qbz = false;
                        break;
                    case 'c':
                        relative = true;
                    case 'C':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.x += cp.x;
                                cp1.y += cp.y;
                            }
                            this.Advance();
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.x += cp.x;
                                cp2.y += cp.y;
                            }
                            this.Advance();
                            if ((cp3 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp3.x += cp.x;
                                cp3.y += cp.y;
                            }
                            this.Advance();

                            path.cubicBezier(cp1.x, cp1.y, cp2.x, cp2.y, cp3.x, cp3.y);

                            cp1.x = cp3.x;
                            cp1.y = cp3.y;
                        }
                        cp.x = cp3.x;
                        cp.y = cp3.y;
                        cbz = true;
                        cbzp.x = cp2.x;
                        cbzp.y = cp2.y;
                        qbz = false;
                        break;
                    case 's':
                        relative = true;
                    case 'S':
                        while (this.MorePointsAvailable()) {
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.x += cp.x;
                                cp2.y += cp.y;
                            }
                            this.Advance();
                            if ((cp3 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp3.x += cp.x;
                                cp3.y += cp.y;
                            }

                            if (cbz) {
                                cp1.x = 2 * cp.x - cbzp.x;
                                cp1.y = 2 * cp.y - cbzp.y;
                            } else
                                cp1 = cp;

                            path.cubicBezier(cp1.x, cp1.y, cp2.x, cp2.y, cp3.x, cp3.y);

                            cbz = true;
                            cbzp.x = cp2.x;
                            cbzp.y = cp2.y;

                            cp.x = cp3.x;
                            cp.y = cp3.y;

                            this.Advance();
                        }
                        qbz = false;
                        break;
                    case 'q':
                        relative = true;
                    case 'Q':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.x += cp.x;
                                cp1.y += cp.y;
                            }
                            this.Advance();
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.x += cp.x;
                                cp2.y += cp.y;
                            }
                            this.Advance();

                            path.quadraticBezier(cp1.x, cp1.y, cp2.x, cp2.y);

                            cp.x = cp2.x;
                            cp.y = cp2.y;
                        }
                        qbz = true;
                        qbzp.x = cp1.x;
                        qbzp.y = cp1.y;
                        cbz = false;
                        break;
                    case 't':
                        relative = true;
                    case 'T':
                        while (this.MorePointsAvailable()) {
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.x += cp.x;
                                cp2.y += cp.y;
                            }

                            if (qbz) {
                                cp1.x = 2 * cp.x - qbzp.x;
                                cp1.y = 2 * cp.y - qbzp.y;
                            } else
                                cp1 = cp;

                            path.quadraticBezier(cp1.x, cp1.y, cp2.x, cp2.y);

                            qbz = true;
                            qbzp.x = cp1.x;
                            qbzp.y = cp1.y;

                            cp.x = cp2.x;
                            cp.y = cp2.y;

                            this.Advance();
                        }
                        cbz = false;
                        break;
                    case 'a':
                        relative = true;
                    case 'A':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;

                            var angle = this.ParseDouble();
                            var is_large = this.ParseDouble() !== 0;
                            var sweep = minerva.SweepDirection.Counterclockwise;
                            if (this.ParseDouble() !== 0) sweep = minerva.SweepDirection.Clockwise;

                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.x += cp.x;
                                cp2.y += cp.y;
                            }

                            path.ellipticalArc(cp1.x, cp1.y, angle, is_large, sweep, cp2.x, cp2.y);

                            cp.x = cp2.x;
                            cp.y = cp2.y;

                            this.Advance();
                        }
                        cbz = qbz = false;
                        break;
                    case 'z':
                    case 'Z':
                        //path.Line(start.x, start.y);
                        path.close();
                        //path.Move(start.x, start.y);

                        cp.x = start.x;
                        cp.y = start.y;
                        cbz = qbz = false;
                        break;
                    default:
                        break;
                }
            }
            var pg = new PathGeometry();
            pg.OverridePath(path);
            pg.FillRule = <Shapes.FillRule>fillRule;
            return pg;
        }

        ParseShapePoints (): Point[] {
            var points: Point[] = [];
            var p: Point;
            while (this.MorePointsAvailable() && (p = this.ParsePoint()) != null) {
                points.push(p);
            }
            return points;
        }

        private ParsePoint (): Point {
            var x = this.ParseDouble();
            if (x == null)
                return null;

            var c;
            while (this.index < this.len && ((c = this.str.charAt(this.index)) === ' ' || c === ',')) {
                this.index++;
            }
            if (this.index >= this.len)
                return null;

            var y = this.ParseDouble();
            if (y == null)
                return null;

            return new Point(x, y);
        }

        private ParseDouble (): number {
            this.Advance();
            var isNegative = false;
            if (this.Match('-')) {
                isNegative = true;
                this.index++;
            } else if (this.Match('+')) {
                this.index++;
            }
            if (this.Match('Infinity')) {
                this.index += 8;
                return isNegative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
            }
            if (this.Match('NaN'))
                return NaN;

            var temp = '';
            while (this.index < this.len) {
                var code = this.str.charCodeAt(this.index);
                var c = this.str[this.index];
                //0-9, ., E, e, E-, e-
                if (code >= 48 && code <= 57)
                    temp += c;
                else if (code === 46)
                    temp += c;
                else if (c === 'E' || c === 'e') {
                    temp += c;
                    if (this.str[this.index + 1] === '-') {
                        temp += '-';
                        this.index++;
                    }
                }
                else
                    break;
                this.index++;
            }
            if (temp.length === 0)
                return null;
            var f = parseFloat(temp);
            return isNegative ? -f : f;
        }

        private Match (matchStr: string): boolean {
            var c1: string;
            var c2: string;
            for (var i = 0; i < matchStr.length && (this.index + i) < this.len; i++) {
                c1 = matchStr.charAt(i);
                c2 = this.str.charAt(this.index + i);
                if (c1 !== c2)
                    return false;
            }
            return true;
        }

        private Advance () {
            var code: number;
            var c: string;
            while (this.index < this.len) {
                code = this.str.charCodeAt(this.index);
                //alphanum
                if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57))
                    break;
                c = String.fromCharCode(code);
                if (c === '.')
                    break;
                if (c === '-')
                    break;
                if (c === '+')
                    break;
                this.index++;
            }
        }

        private MorePointsAvailable (): boolean {
            var c;
            while (this.index < this.len && ((c = this.str.charAt(this.index)) === ',' || c === ' ')) {
                this.index++;
            }
            if (this.index >= this.len)
                return false;
            if (c === '.' || c === '-' || c === '+')
                return true;
            var code = this.str.charCodeAt(this.index);
            return code >= 48 && code <= 57;
        }
    }

    nullstone.registerTypeConverter(Geometry, (val: any): any => {
        if (val instanceof Geometry)
            return val;
        if (typeof val === "string")
            return ParseGeometry(val);
        return val;
    });
}