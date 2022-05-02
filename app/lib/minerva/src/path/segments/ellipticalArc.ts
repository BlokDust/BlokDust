module minerva.path.segments {
    export interface IEllipticalArc extends IPathSegment {
        rx: number;
        ry: number;
        rotationAngle: number;
        isLargeArcFlag: boolean;
        sweepDirectionFlag: SweepDirection;
        ex: number;
        ey: number;
    }

    //SVG implementation: http://www.w3.org/TR/SVG/implnote.html#ArcSyntax
    export function ellipticalArc (rx: number, ry: number, rotationAngle: number, isLargeArcFlag: boolean, sweepDirectionFlag: SweepDirection, ex: number, ey: number): IEllipticalArc {
        return <IEllipticalArc>{
            sx: null,
            sy: null,
            isSingle: false,
            rx: rx,
            ry: ry,
            rotationAngle: rotationAngle,
            isLargeArcFlag: isLargeArcFlag,
            sweepDirectionFlag: sweepDirectionFlag,
            ex: ex,
            ey: ey,
            sub: null,
            draw: function (ctx: CanvasRenderingContext2D) {
                this.sub = this.sub || buildSegments(this);
                for (var i = 0, sub = this.sub, len = sub.length; i < len; i++) {
                    sub[i].draw(ctx);
                }
            },
            extendFillBox: function (box: IBoundingBox) {
                this.sub = this.sub || buildSegments(this);
                for (var i = 0, sub = this.sub, len = sub.length; i < len; i++) {
                    sub[i].extendFillBox(box);
                }
            },
            extendStrokeBox: function (box: IBoundingBox, pars: IStrokeParameters) {
                this.sub = this.sub || buildSegments(this);
                for (var i = 0, sub = this.sub, len = sub.length; i < len; i++) {
                    sub[i].extendStrokeBox(box, pars);
                }
            },
            toString: function (): string {
                return "A" + rx.toString() + "," + ry.toString() + " " + rotationAngle.toString() + " " + isLargeArcFlag.toString() + " " + sweepDirectionFlag.toString() + " " + ex.toString() + "," + ey.toString();
            },
            getStartVector: function (): number[] {
                this.sub = this.sub || buildSegments(this);
                var sub = this.sub[0];
                return sub ? sub.getStartVector() : [0, 0];
            },
            getEndVector: function (): number[] {
                this.sub = this.sub || buildSegments(this);
                var sub = this.sub[this.sub.length - 1];
                return sub ? sub.getEndVector() : [0, 0];
            }
        };
    }

    var NO_DRAW_EPSILON = 0.000002;
    var ZERO_EPSILON = 0.000019;
    var SMALL_EPSILON = 0.000117;

    function buildSegments (ea: IEllipticalArc): IPathSegment[] {
        // from tests it seems that Silverlight closely follows SVG arc
        // behavior (which is very different from the model used with GDI+)
        // some helpful stuff is available here:
        // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes

        var segments: IPathSegment[] = [];

        // get start point from the existing path
        var sx = ea.sx,
            sy = ea.sy,
            ex = ea.ex,
            ey = ea.ey,
            rx = ea.rx,
            ry = ea.ry;

        // if start and end points are identical, then no arc is drawn
        // FIXME: what's the logic (if any) to compare points
        // e.g. 60 and 60.000002 are drawn while 80 and 80.000003 aren't
        if (Math.abs(ex - sx) < NO_DRAW_EPSILON && Math.abs(ey - sy) < NO_DRAW_EPSILON)
            return segments;

        // Correction of out-of-range radii, see F6.6 (step 1)
        if (Math.abs(rx) < ZERO_EPSILON || Math.abs(ry) < ZERO_EPSILON) {
            // treat this as a straight line (to end point)
            segments.push(line(ex, ey));
            return segments;
        }

        // Silverlight "too small to be useful"
        if (Math.abs(rx) < SMALL_EPSILON || Math.abs(ry) < SMALL_EPSILON) {
            // yes it does mean there's a hole between "normal" FP values and "zero" FP values
            // and SL doesn't render anything in this twilight sonze
            return segments;
        }

        // Correction of out-of-range radii, see F6.6.1 (step 2)
        rx = Math.abs(rx);
        ry = Math.abs(ry);

        // convert angle into radians
        var angle = ea.rotationAngle * Math.PI / 180.0;

        // variables required for F6.3.1
        var cos_phi = Math.cos(angle);
        var sin_phi = Math.sin(angle);
        var dx2 = (sx - ex) / 2.0;
        var dy2 = (sy - ey) / 2.0;
        var x1p = cos_phi * dx2 + sin_phi * dy2;
        var y1p = cos_phi * dy2 - sin_phi * dx2;
        var x1p2 = x1p * x1p;
        var y1p2 = y1p * y1p;
        var rx2 = rx * rx;
        var ry2 = ry * ry;

        // Correction of out-of-range radii, see F6.6.2 (step 4)
        var lambda = (x1p2 / rx2) + (y1p2 / ry2);
        if (lambda > 1.0) {
            // see F6.6.3
            var lambda_root = Math.sqrt(lambda);
            rx *= lambda_root;
            ry *= lambda_root;
            // update rx2 and ry2
            rx2 = rx * rx;
            ry2 = ry * ry;
        }

        var cxp, cyp, cx, cy;
        var c = (rx2 * ry2) - (rx2 * y1p2) - (ry2 * x1p2);

        var large = ea.isLargeArcFlag === true;
        var sweep = ea.sweepDirectionFlag === SweepDirection.Clockwise;
        // check if there is no possible solution (i.e. we can't do a square root of a negative value)
        if (c < 0.0) {
            // scale uniformly until we have a single solution (see F6.2) i.e. when c == 0.0
            var scale = Math.sqrt(1.0 - c / (rx2 * ry2));
            rx *= scale;
            ry *= scale;
            // update rx2 and ry2
            rx2 = rx * rx;
            ry2 = ry * ry;

            // step 2 (F6.5.2) - simplified since c == 0.0
            cxp = 0.0;
            cyp = 0.0;

            // step 3 (F6.5.3 first part) - simplified since cxp and cyp == 0.0
            cx = 0.0;
            cy = 0.0;
        } else {
            // complete c calculation
            c = Math.sqrt(c / ((rx2 * y1p2) + (ry2 * x1p2)));

            // inverse sign if Fa == Fs
            if (large === sweep)
                c = -c;

            // step 2 (F6.5.2)
            cxp = c * ( rx * y1p / ry);
            cyp = c * (-ry * x1p / rx);

            // step 3 (F6.5.3 first part)
            cx = cos_phi * cxp - sin_phi * cyp;
            cy = sin_phi * cxp + cos_phi * cyp;
        }

        // step 3 (F6.5.3 second part) we now have the center point of the ellipse
        cx += (sx + ex) / 2.0;
        cy += (sy + ey) / 2.0;

        // step 4 (F6.5.4)
        // we dont' use arccos (as per w3c doc), see http://www.euclideanspace.com/maths/algebra/vectors/angleBetween/index.htm
        // note: atan2 (0.0, 1.0) == 0.0
        var at = Math.atan2(((y1p - cyp) / ry), ((x1p - cxp) / rx));
        var theta1 = (at < 0.0) ? 2.0 * Math.PI + at : at;

        var nat = Math.atan2(((-y1p - cyp) / ry), ((-x1p - cxp) / rx));
        var delta_theta = (nat < at) ? 2.0 * Math.PI - at + nat : nat - at;

        if (sweep) {
            // ensure delta theta < 0 or else add 360 degrees
            if (delta_theta < 0.0)
                delta_theta += 2.0 * Math.PI;
        } else {
            // ensure delta theta > 0 or else substract 360 degrees
            if (delta_theta > 0.0)
                delta_theta -= 2.0 * Math.PI;
        }

        // add several cubic bezier to approximate the arc (smaller than 90 degrees)
        // we add one extra segment because we want something smaller than 90deg (i.e. not 90 itself)
        var segment_count = Math.floor(Math.abs(delta_theta / (Math.PI / 2))) + 1;
        var delta = delta_theta / segment_count;

        // http://www.stillhq.com/ctpfaq/2001/comp.text.pdf-faq-2001-04.txt (section 2.13)
        var bcp = 4.0 / 3 * (1 - Math.cos(delta / 2)) / Math.sin(delta / 2);

        var cos_phi_rx = cos_phi * rx;
        var cos_phi_ry = cos_phi * ry;
        var sin_phi_rx = sin_phi * rx;
        var sin_phi_ry = sin_phi * ry;

        var cos_theta1 = Math.cos(theta1);
        var sin_theta1 = Math.sin(theta1);

        for (var i = 0; i < segment_count; ++i) {
            // end angle (for this segment) = current + delta
            var theta2 = theta1 + delta;
            var cos_theta2 = Math.cos(theta2);
            var sin_theta2 = Math.sin(theta2);

            // first control point (based on start point sx,sy)
            var c1x = sx - bcp * (cos_phi_rx * sin_theta1 + sin_phi_ry * cos_theta1);
            var c1y = sy + bcp * (cos_phi_ry * cos_theta1 - sin_phi_rx * sin_theta1);

            // end point (for this segment)
            var cur_ex = cx + (cos_phi_rx * cos_theta2 - sin_phi_ry * sin_theta2);
            var cur_ey = cy + (sin_phi_rx * cos_theta2 + cos_phi_ry * sin_theta2);

            // second control point (based on end point ex,ey)
            var c2x = cur_ex + bcp * (cos_phi_rx * sin_theta2 + sin_phi_ry * cos_theta2);
            var c2y = cur_ey + bcp * (sin_phi_rx * sin_theta2 - cos_phi_ry * cos_theta2);

            segments.push(cubicBezier(c1x, c1y, c2x, c2y, cur_ex, cur_ey));

            // next start point is the current end point (same for angle)
            sx = cur_ex;
            sy = cur_ey;
            theta1 = theta2;
            // avoid recomputations
            cos_theta1 = cos_theta2;
            sin_theta1 = sin_theta2;
        }

        return segments;
    }
}