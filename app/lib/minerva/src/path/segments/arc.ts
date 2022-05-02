module minerva.path.segments {
    export interface IArc extends IPathSegment {
        x: number;
        y: number;
        radius: number;
        sAngle: number;
        eAngle: number;
        aClockwise: boolean;
    }
    export function arc(x: number, y: number, radius: number, sa: number, ea: number, cc: boolean): IArc {
        var inited = false;
        //start point
        var sx: number;
        var sy: number;
        //end point
        var ex: number;
        var ey: number;
        //cardinal corners
        var l: number;
        var r: number;
        var t: number;
        var b: number;
        //contains cardinal corners
        var cl: boolean;
        var cr: boolean;
        var ct: boolean;
        var cb: boolean;

        function init() {
            if (inited) return;
            sx = x + (radius * Math.cos(sa));
            sy = y + (radius * Math.sin(sa));
            ex = x + (radius * Math.cos(ea));
            ey = y + (radius * Math.sin(ea));

            l = x - radius;
            cl = arcContainsPoint(sx, sy, ex, ey, l, y, cc);

            r = x + radius;
            cr = arcContainsPoint(sx, sy, ex, ey, r, y, cc);

            t = y - radius;
            ct = arcContainsPoint(sx, sy, ex, ey, x, t, cc);

            b = y + radius;
            cb = arcContainsPoint(sx, sy, ex, ey, x, b, cc);

            inited = true;
        }

        return {
            sx: null,
            sy: null,
            isSingle: true,
            x: x,
            y: y,
            ex: x,
            ey: y,
            radius: radius,
            sAngle: sa,
            eAngle: ea,
            aClockwise: cc,
            draw: function (ctx: CanvasRenderingContext2D) {
                ctx.arc(x, y, radius, sa, ea, cc);
            },
            extendFillBox: function (box: IBoundingBox) {
                if (ea === sa)
                    return;
                init();
                this.ex = ex;
                this.ey = ey;

                box.l = Math.min(box.l, sx, ex);
                box.r = Math.max(box.r, sx, ex);
                box.t = Math.min(box.t, sy, ey);
                box.b = Math.max(box.b, sy, ey);

                if (cl)
                    box.l = Math.min(box.l, l);
                if (cr)
                    box.r = Math.max(box.r, r);
                if (ct)
                    box.t = Math.min(box.t, t);
                if (cb)
                    box.b = Math.max(box.b, b);
            },
            extendStrokeBox: function (box: IBoundingBox, pars: IStrokeParameters) {
                if (ea === sa)
                    return;
                init();
                this.ex = ex;
                this.ey = ey;

                box.l = Math.min(box.l, sx, ex);
                box.r = Math.max(box.r, sx, ex);
                box.t = Math.min(box.t, sy, ey);
                box.b = Math.max(box.b, sy, ey);

                var hs = pars.strokeThickness / 2.0;
                if (cl)
                    box.l = Math.min(box.l, l - hs);
                if (cr)
                    box.r = Math.max(box.r, r + hs);
                if (ct)
                    box.t = Math.min(box.t, t - hs);
                if (cb)
                    box.b = Math.max(box.b, b + hs);

                var cap = pars.strokeStartLineCap || pars.strokeEndLineCap || 0; //HTML5 doesn't support start and end cap
                var sv = this.getStartVector();
                sv[0] = -sv[0];
                sv[1] = -sv[1];
                var ss = getCapSpread(sx, sy, pars.strokeThickness, cap, sv);
                var ev = this.getEndVector();
                var es = getCapSpread(ex, ey, pars.strokeThickness, cap, ev);

                box.l = Math.min(box.l, ss.x1, ss.x2, es.x1, es.x2);
                box.r = Math.max(box.r, ss.x1, ss.x2, es.x1, es.x2);
                box.t = Math.min(box.t, ss.y1, ss.y2, es.y1, es.y2);
                box.b = Math.max(box.b, ss.y1, ss.y2, es.y1, es.y2);
            },
            toString: function (): string {
                return "";
            },
            getStartVector: function (): number[] {
                var rv = [
                        sx - x,
                        sy - y
                ];
                if (cc)
                    return [rv[1], -rv[0]];
                return [-rv[1], rv[0]];
            },
            getEndVector: function (): number[] {
                var rv = [
                        ex - x,
                        ey - y
                ];
                if (cc)
                    return [rv[1], -rv[0]];
                return [-rv[1], rv[0]];
            },
        };
    }

    function arcContainsPoint(sx: number, sy: number, ex: number, ey: number, cpx: number, cpy: number, cc: boolean): boolean {
        // var a = ex - sx;
        // var b = cpx - sx;
        // var c = ey - sy;
        // var d = cpy - sy;
        // det = ad - bc;
        var n = (ex - sx) * (cpy - sy) - (cpx - sx) * (ey - sy);
        if (n === 0)
            return true;
        if (n > 0 && cc)
            return true;
        if (n < 0 && !cc)
            return true;
        return false;
    }

    function getCapSpread(x: number, y: number, thickness: number, cap: PenLineCap, vector: number[]) {
        var hs = thickness / 2.0;
        switch (cap) {
            case PenLineCap.Round:
                return {
                    x1: x - hs,
                    x2: x + hs,
                    y1: y - hs,
                    y2: y + hs
                };
                break;
            case PenLineCap.Square:
                var ed = normalizeVector(vector);
                var edo = perpendicularVector(ed);
                return {
                    x1: x + hs * (ed[0] + edo[0]),
                    x2: x + hs * (ed[0] - edo[0]),
                    y1: y + hs * (ed[1] + edo[1]),
                    y2: y + hs * (ed[1] - edo[1])
                };
                break;
            case PenLineCap.Flat:
            default:
                var ed = normalizeVector(vector);
                var edo = perpendicularVector(ed);
                return {
                    x1: x + hs * edo[0],
                    x2: x + hs * -edo[0],
                    y1: y + hs * edo[1],
                    y2: y + hs * -edo[1]
                };
                break;
        }
    }

    function normalizeVector(v: number[]): number[] {
        var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        return [
                v[0] / len,
                v[1] / len
        ];
    }

    function perpendicularVector(v: number[]): number[] {
        return [
            -v[1],
            v[0]
        ];
    }
}