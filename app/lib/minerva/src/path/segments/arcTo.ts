function radToDegrees(rad) {
    return rad * 180 / Math.PI;
}

module minerva.path.segments {
    var EPSILON = 1e-10;

    export interface IArcTo extends IPathSegment {
        cpx: number;
        cpy: number;
        x: number;
        y: number;
        radius: number;
    }
    export function arcTo(cpx: number, cpy: number, x: number, y: number, radius: number): IArcTo {
        var line: ILine;
        var arc: IArc;
        var inited = false;

        function init(prevX: number, prevY: number) {
            if (inited) return;
            if (line && arc) return arc;
            var v1 = [cpx - prevX, cpy - prevY];
            var v2 = [x - cpx, y - cpy];
            var inner_theta = Math.PI - Vector.angleBetween(v1, v2);
            //find 2 points tangent to imaginary circle along guide lines
            var a = getTangentPoint(inner_theta, radius, [prevX, prevY], v1, true);
            var b = getTangentPoint(inner_theta, radius, [cpx, cpy], v2, false);
            //find center point
            var c = getPerpendicularIntersections(a, v1, b, v2);
            //counter clockwise test
            var cc = !Vector.isClockwiseTo(v1, v2);
            //find starting angle -- [1,0] is origin direction of 0rad
            var sa = Math.atan2(a[1] - c[1], a[0] - c[0]);
            if (sa < 0)
                sa = (2 * Math.PI) + sa;
            var ea = Math.atan2(b[1] - c[1], b[0] - c[0]);
            if (ea < 0)
                ea = (2 * Math.PI) + ea;

            line = segments.line(a[0], a[1]);
            line.sx = prevX;
            line.sy = prevY;
            arc = segments.arc(c[0], c[1], radius, sa, ea, cc);
            inited = true;
        }

        return {
            sx: null,
            sy: null,
            isSingle: false,
            cpx: cpx,
            cpy: cpy,
            x: x,
            y: y,
            ex: x,
            ey: y,
            radius: radius,
            draw: function (ctx: CanvasRenderingContext2D) {
                ctx.arcTo(cpx, cpy, x, y, radius);
            },
            extendFillBox: function (box: IBoundingBox) {
                init(this.sx, this.sy);
                this.ex = arc.ex;
                this.ey = arc.ey;

                box.l = Math.min(box.l, this.sx);
                box.r = Math.max(box.r, this.sx);
                box.t = Math.min(box.t, this.sy);
                box.b = Math.max(box.b, this.sy);

                line.extendFillBox(box);
                arc.extendFillBox(box);
            },
            extendStrokeBox: function (box: IBoundingBox, pars: IStrokeParameters) {
                init(this.sx, this.sy);
                this.ex = arc.ex;
                this.ey = arc.ey;

                var hs = pars.strokeThickness / 2;
                box.l = Math.min(box.l, this.sx - hs);
                box.r = Math.max(box.r, this.sx + hs);
                box.t = Math.min(box.t, this.sy - hs);
                box.b = Math.max(box.b, this.sy + hs);

                line.extendStrokeBox(box, pars);
                arc.extendStrokeBox(box, pars);
            },
            toString: function (): string {
                return "";
            },
            getStartVector: function (): number[] {
                init(this.sx, this.sy);
                return line.getStartVector();
            },
            getEndVector: function (): number[] {
                return arc.getEndVector();
            }
        };
    }

    function getTangentPoint(theta: number, radius: number, s: number[], d: number[], invert: boolean): number[] {
        var len = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
        var f = radius / Math.tan(theta / 2);
        var t = f / len;
        if (invert)
            t = 1 - t;
        return [s[0] + t * d[0], s[1] + t * d[1]];
    }

    function getPerpendicularIntersections(s1: number[], d1: number[], s2: number[], d2: number[]): number[] {
        return Vector.intersection(s1, Vector.orthogonal(d1.slice(0)), s2, Vector.orthogonal(d2.slice(0)));
    }
}