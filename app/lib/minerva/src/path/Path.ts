module minerva.path {
    //TODO: Optimize to work similar to Rect, Size
    export class Path {
        private $$entries: IPathSegment[] = [];
        private $$endX = 0.0;
        private $$endY = 0.0;

        get endX (): number {
            return this.$$endX;
        }

        get endY (): number {
            return this.$$endY;
        }

        reset () {
            this.$$entries.length = 0;
            this.$$endX = 0;
            this.$$endY = 0;
        }

        move (x: number, y: number) {
            this.$$entries.push(segments.move(x, y));
            this.$$endX = x;
            this.$$endY = y;
        }

        line (x: number, y: number) {
            this.$$entries.push(segments.line(x, y));
            this.$$endX = x;
            this.$$endY = y;
        }

        quadraticBezier (cpx: number, cpy: number, x: number, y: number) {
            this.$$entries.push(segments.quadraticBezier(cpx, cpy, x, y));
            this.$$endX = x;
            this.$$endY = y;
        }

        cubicBezier (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
            this.$$entries.push(segments.cubicBezier(cp1x, cp1y, cp2x, cp2y, x, y));
            this.$$endX = x;
            this.$$endY = y;
        }

        ellipse (x: number, y: number, width: number, height: number) {
            this.$$entries.push(segments.ellipse(x, y, width, height));
            this.$$endX = x;
            this.$$endY = y;
        }

        ellipticalArc (rx: number, ry: number, rotationAngle: number, isLargeArcFlag: boolean, sweepDirectionFlag: SweepDirection, ex: number, ey: number) {
            this.$$entries.push(segments.ellipticalArc(rx, ry, rotationAngle, isLargeArcFlag, sweepDirectionFlag, ex, ey));
            this.$$endX = ex;
            this.$$endY = ey;
        }

        arc (x: number, y: number, r: number, sAngle: number, eAngle: number, aClockwise: boolean) {
            this.$$entries.push(segments.arc(x, y, r, sAngle, eAngle, aClockwise));
        }

        arcTo (cpx: number, cpy: number, x: number, y: number, radius: number) {
            var arcto = segments.arcTo(cpx, cpy, x, y, radius);
            this.$$entries.push(arcto);
            this.$$endX = arcto.ex;
            this.$$endY = arcto.ey;
        }

        rect (x: number, y: number, width: number, height: number) {
            this.$$entries.push(segments.rect(x, y, width, height));
        }

        roundedRect (x: number, y: number, width: number, height: number, radiusX: number, radiusY: number) {
            this.$$entries.push(segments.roundedRect(x, y, width, height, radiusX, radiusY));
            this.$$endX = x;
            this.$$endY = y;
        }

        close () {
            this.$$entries.push(segments.close());
        }

        draw (ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            var path = this.$$entries;
            var len = path.length;
            for (var i = 0; i < len; i++) {
                path[i].draw(ctx);
            }
        }

        calcBounds (pars?: IStrokeParameters): Rect {
            if (this.$$entries.length <= 0)
                return new Rect();
            var box = pars && pars.strokeThickness > 1 ? this.$$calcStrokeBox(pars) : this.$$calcFillBox();
            return new Rect(box.l, box.t, Math.max(0, box.r - box.l), Math.max(0, box.b - box.t));
        }

        private $$calcFillBox (): IBoundingBox {
            var path = this.$$entries;
            var len = path.length;
            var box: IBoundingBox = {
                l: Number.POSITIVE_INFINITY,
                r: Number.NEGATIVE_INFINITY,
                t: Number.POSITIVE_INFINITY,
                b: Number.NEGATIVE_INFINITY
            };
            var curx = null;
            var cury = null;
            var entry: IPathSegment;
            for (var i = 0; i < len; i++) {
                entry = path[i];
                entry.sx = curx;
                entry.sy = cury;

                entry.extendFillBox(box);

                curx = entry.ex || 0;
                cury = entry.ey || 0;
            }
            return box;
        }

        private $$calcStrokeBox (pars: IStrokeParameters): IBoundingBox {
            var box: IBoundingBox = {
                l: Number.POSITIVE_INFINITY,
                r: Number.NEGATIVE_INFINITY,
                t: Number.POSITIVE_INFINITY,
                b: Number.NEGATIVE_INFINITY
            };
            processStrokedBounds(box, this.$$entries, pars);
            return box;
        }

        static Merge (path1: Path, path2: Path) {
            path1.$$entries.push.apply(path1.$$entries, path2.$$entries);
            path1.$$endX += path2.$$endX;
            path1.$$endY += path2.$$endY;
        }

        Serialize (): string {
            var path = this.$$entries;
            var len = path.length;
            var s = "";
            for (var i = 0; i < len; i++) {
                if (i > 0) s += " ";
                s += path[i].toString();
            }
            return s;
        }
    }
    function expandStartCap (box: IBoundingBox, entry: IPathSegment, pars: IStrokeParameters) {
        var v: number[];
        var hs = pars.strokeThickness / 2.0;
        var cap = pars.strokeStartLineCap || pars.strokeEndLineCap || 0; //HTML5 doesn't support start and end cap
        switch (cap) {
            case PenLineCap.Round:
                box.l = Math.min(box.l, entry.sx - hs);
                box.r = Math.max(box.r, entry.sx + hs);
                box.t = Math.min(box.t, entry.sy - hs);
                box.b = Math.max(box.b, entry.sy + hs);
                break;
            case PenLineCap.Square:
                if (!(v = entry.getStartVector())) return;
                if (!v[0] || !v[1]) return;
                var sd = Vector.reverse(Vector.normalize(v.slice(0)));
                var sdo = Vector.orthogonal(sd.slice(0));

                var x1 = entry.sx + hs * (sd[0] + sdo[0]);
                var x2 = entry.sx + hs * (sd[0] - sdo[0]);
                var y1 = entry.sy + hs * (sd[1] + sdo[1]);
                var y2 = entry.sy + hs * (sd[1] - sdo[1]);

                box.l = Math.min(box.l, x1, x2);
                box.r = Math.max(box.r, x1, x2);
                box.t = Math.min(box.t, y1, y2);
                box.b = Math.max(box.b, y1, y2);
                break;
            case PenLineCap.Flat:
            default:
                if (!(v = entry.getStartVector())) return;
                if (!v[0] || !v[1]) return;
                var sdo = Vector.orthogonal(Vector.normalize(v.slice(0)));

                var x1 = entry.sx + hs * sdo[0];
                var x2 = entry.sx + hs * -sdo[0];
                var y1 = entry.sy + hs * sdo[1];
                var y2 = entry.sy + hs * -sdo[1];

                box.l = Math.min(box.l, x1, x2);
                box.r = Math.max(box.r, x1, x2);
                box.t = Math.min(box.t, y1, y2);
                box.b = Math.max(box.b, y1, y2);
                break;
        }
    }

    function expandEndCap (box: IBoundingBox, entry: IPathSegment, pars: IStrokeParameters) {
        var ex = entry.ex;
        var ey = entry.ey;

        var v: number[];
        var hs = pars.strokeThickness / 2.0;
        var cap = pars.strokeStartLineCap || pars.strokeEndLineCap || 0; //HTML5 doesn't support start and end cap
        switch (cap) {
            case PenLineCap.Round:
                box.l = Math.min(box.l, ex - hs);
                box.r = Math.max(box.r, ex + hs);
                box.t = Math.min(box.t, ey - hs);
                box.b = Math.max(box.b, ey + hs);
                break;
            case PenLineCap.Square:
                if (!(v = entry.getEndVector())) return;
                if (!v[0] || !v[1]) return;
                var ed = Vector.normalize(v.slice(0));
                var edo = Vector.orthogonal(ed.slice(0));

                var x1 = ex + hs * (ed[0] + edo[0]);
                var x2 = ex + hs * (ed[0] - edo[0]);
                var y1 = ey + hs * (ed[1] + edo[1]);
                var y2 = ey + hs * (ed[1] - edo[1]);

                box.l = Math.min(box.l, x1, x2);
                box.r = Math.max(box.r, x1, x2);
                box.t = Math.min(box.t, y1, y2);
                box.b = Math.max(box.b, y1, y2);
                break;
            case PenLineCap.Flat:
            default:
                if (!(v = entry.getEndVector())) return;
                if (!v[0] || !v[1]) return;
                var edo = Vector.orthogonal(Vector.normalize(v.slice(0)));

                var x1 = ex + hs * edo[0];
                var x2 = ex + hs * -edo[0];
                var y1 = ey + hs * edo[1];
                var y2 = ey + hs * -edo[1];

                box.l = Math.min(box.l, x1, x2);
                box.r = Math.max(box.r, x1, x2);
                box.t = Math.min(box.t, y1, y2);
                box.b = Math.max(box.b, y1, y2);
                break;
        }
    }

    function expandLineJoin (box: IBoundingBox, previous: IPathSegment, entry: IPathSegment, pars: IStrokeParameters) {
        var hs = pars.strokeThickness / 2.0;
        if (pars.strokeLineJoin === PenLineJoin.Round) {
            box.l = Math.min(box.l, entry.sx - hs);
            box.r = Math.max(box.r, entry.sx + hs);
            box.t = Math.min(box.t, entry.sy - hs);
            box.b = Math.max(box.b, entry.sy + hs);
        }
        var tips = (pars.strokeLineJoin === PenLineJoin.Miter) ? findMiterTips(previous, entry, hs, pars.strokeMiterLimit) : findBevelTips(previous, entry, hs);
        if (!tips)
            return;
        var x1 = tips[0].x;
        var x2 = tips[1].x;
        var y1 = tips[0].y;
        var y2 = tips[1].y;
        box.l = Math.min(box.l, x1, x2);
        box.r = Math.max(box.r, x1, x2);
        box.t = Math.min(box.t, y1, y2);
        box.b = Math.max(box.b, y1, y2);
    }

    function processStrokedBounds (box: IBoundingBox, segs: IPathSegment[], pars: IStrokeParameters) {
        var len = segs.length;
        var last: IPathSegment = null;
        var curx: number = null;
        var cury: number = null;
        var sx: number = null;
        var sy: number = null;

        var isLastEntryMove = false;

        function processEntry (entry: IPathSegment, i: number) {
            entry.sx = curx;
            entry.sy = cury;

            if (!entry.isSingle) {
                if (!(<segments.IMove>entry).isMove && isLastEntryMove) {
                    sx = entry.sx;
                    sy = entry.sy;
                    expandStartCap(box, entry, pars);
                }
                if (!isLastEntryMove && i > 0)
                    expandLineJoin(box, last, entry, pars);
            }

            entry.extendStrokeBox(box, pars);

            curx = entry.ex || 0;
            cury = entry.ey || 0;
            isLastEntryMove = !!(<segments.IMove>entry).isMove;
            last = entry;
        }

        for (var i = 0; i < len; i++) {
            processEntry(segs[i], i);
        }
        var end = segs[len - 1];
        if (end && !end.isSingle)
            expandEndCap(box, end, pars);
    }

    export function findMiterTips (previous: IPathSegment, entry: IPathSegment, hs: number, miterLimit: number) {
        var x = entry.sx;
        var y = entry.sy;

        var av = previous.getEndVector();
        var bv = entry.getStartVector();
        if (!av || !bv)
            return null;
        Vector.reverse(av);
        var tau = Vector.angleBetween(av, bv) / 2;
        if (isNaN(tau))
            return null;

        var miterRatio = 1 / Math.sin(tau);
        if (miterRatio > miterLimit)
            return findBevelTips(previous, entry, hs);

        //vector in direction of join point to miter tip
        var cv = Vector.isClockwiseTo(av, bv) ? av.slice(0) : bv.slice(0);
        Vector.normalize(Vector.reverse(Vector.rotate(cv, tau)));

        //distance from join point and miter tip
        var miterLen = hs * miterRatio;

        var tip = {x: x + miterLen * cv[0], y: y + miterLen * cv[1]}
        return [
            tip,
            tip
        ];
    }

    export function findBevelTips (previous: IPathSegment, entry: IPathSegment, hs: number) {
        var x = entry.sx;
        var y = entry.sy;

        var av = previous.getEndVector();
        var bv = entry.getStartVector();
        if (!av || !bv)
            return;
        Vector.normalize(Vector.reverse(av));
        Vector.normalize(bv);
        var avo: number[],
            bvo: number[];
        if (Vector.isClockwiseTo(av, bv)) {
            avo = Vector.orthogonal(av.slice(0));
            bvo = Vector.reverse(Vector.orthogonal(bv.slice(0)));
        } else {
            avo = Vector.reverse(Vector.orthogonal(av.slice(0)));
            bvo = Vector.orthogonal(bv.slice(0));
        }

        return [
            {x: x - hs * avo[0], y: y - hs * avo[1]},
            {x: x - hs * bvo[0], y: y - hs * bvo[1]}
        ];
    }
}