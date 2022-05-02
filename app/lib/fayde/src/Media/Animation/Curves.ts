
module Fayde.Media.Animation {
    export interface ICurvePoint {
        x: number;
        y: number;
    }
    export interface IQuadraticCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
    }
    export interface ICubicCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
        c3: ICurvePoint;
    }
    export interface ISubdiviedCubicCurve {
        b1: ICubicCurve;
        b2: ICubicCurve;
    }

    export class Curves {
        static QuadraticArrayYForX(arr: IQuadraticCurve[], x: number, count: number): number {
            for (var i = 0; i < count; i++) {
                if (x < arr[i].c2.x)
                    return Curves.QuadraticYForX(x, arr[i]);
            }
            return 0.0;
        }
        static QuadraticYForX(x: number, src: IQuadraticCurve): number {
            var l = src.c2.x - src.c0.x;
            if (l <= 0)
                return 0.0;
            x = (x - src.c0.x) / l;
            return ((1 - x) * (1 - x)) * src.c0.y + ((2 * x) * (1 - x) * src.c1.y) + ((x * x) * src.c2.y);
        }

        static SubdivideCubicAtLevel(b: ICubicCurve[], lvl: number, src: ICubicCurve) {
            Curves.RecursiveSubdivide(b, lvl, 1, 0, src);
        }
        static RecursiveSubdivide(b: ICubicCurve[], lvl: number, currentlvl: number, pos: number, src: ICubicCurve) {
            var data: ISubdiviedCubicCurve = { b1: null, b2: null };
            Curves.SubdivideCubic(data, src);
            var b1 = data.b1;
            var b2 = data.b2;

            if (currentlvl === lvl) {
                b[pos] = b1;
                b[pos + 1] = b2;
                return pos + 2;
            }
            pos = Curves.RecursiveSubdivide(b, lvl, currentlvl + 1, pos, b1);
            pos = Curves.RecursiveSubdivide(b, lvl, currentlvl + 1, pos, b2);
            return pos;
        }
        static SubdivideCubic(data: ISubdiviedCubicCurve, src: ICubicCurve) {
            var p01 = { x: 0, y: 0 }, p012 = { x: 0, y: 0 }, p0123 = { x: 0, y: 0 };
            var p12 = { x: 0, y: 0 }, p123 = { x: 0, y: 0 };
            var p23 = { x: 0, y: 0 };

            Curves.HalfLerpPoint(p01, src.c0, src.c1);
            Curves.HalfLerpPoint(p12, src.c1, src.c2);
            Curves.HalfLerpPoint(p23, src.c2, src.c3);

            Curves.HalfLerpPoint(p012, p01, p12);

            Curves.HalfLerpPoint(p123, p12, p23);
            Curves.HalfLerpPoint(p0123, p012, p123);

            data.b1 = {
                c0: src.c0,
                c1: p01,
                c2: p012,
                c3: p0123
            };
            data.b2 = {
                c0: p0123,
                c1: p123,
                c2: p23,
                c3: src.c3
            };
        }
        static HalfLerpPoint(p: ICurvePoint, p1: ICurvePoint, p2: ICurvePoint) {
            p.x = p1.x + (p2.x - p1.x) * 0.5;
            p.y = p1.y + (p2.y - p1.y) * 0.5;
        }

        static ConvertCubicsToQuadratics(srcArray: ICubicCurve[], count: number): IQuadraticCurve[] {
            var destArray: IQuadraticCurve[] = [];
            for (var i = 0; i < count; i++) {
                destArray.push(Curves.QuadraticFromCubic(srcArray[i]));
            }
            return destArray;
        }
        static QuadraticFromCubic(src: ICubicCurve): IQuadraticCurve {
            return {
                c0: {
                    x: src.c0.x,
                    y: src.c0.y
                },
                c1: {
                    x: (src.c1.x + src.c2.x) / 2.0,
                    y: (src.c1.y + src.c2.y) / 2.0
                },
                c2: {
                    x: src.c3.x,
                    y: src.c3.y
                }
            };
        }
    }
}