/// <reference path="../../Core/DependencyObject.ts" />

module Fayde.Media.Animation {
    export class KeySpline extends DependencyObject {
        static PRECISION_LEVEL: number = 4;
        static TOTAL_COUNT: number = Math.pow(2, KeySpline.PRECISION_LEVEL);

        static ControlPoint1Property: DependencyProperty = DependencyProperty.RegisterCore("ControlPoint1", function () { return Point; }, KeySpline, undefined, (d, args) => (<KeySpline>d).InvalidateControlPoints());
        static ControlPoint2Property: DependencyProperty = DependencyProperty.RegisterCore("ControlPoint2", function () { return Point; }, KeySpline, undefined, (d, args) => (<KeySpline>d).InvalidateControlPoints());
        ControlPoint1: Point; //undefined is 0,0
        ControlPoint2: Point; //undefined is 1,1

        private _QuadraticsArray: IQuadraticCurve[] = null;
        GetSplineProgress(linearProgress: number): number {
            if (linearProgress >= 1.0)
                return 1.0;
            if (linearProgress <= 0.0)
                return 0.0;
            if (!this._QuadraticsArray)
                this._RegenerateQuadratics();
            return Curves.QuadraticArrayYForX(this._QuadraticsArray, linearProgress, KeySpline.TOTAL_COUNT);
        }
        private InvalidateControlPoints() {
            this._QuadraticsArray = null;
        }
        private _RegenerateQuadratics() {
            var c1 = this.ControlPoint1 || new Point(0, 0);
            var c2 = this.ControlPoint2 || new Point(1.0, 1.0);
            var src: ICubicCurve = {
                c0: { x: 0.0, y: 0.0 },
                c1: { x: c1.x, y: c1.y },
                c2: { x: c2.x, y: c2.y },
                c3: { x: 1.0, y: 1.0 }
            };

            var carr: ICubicCurve[] = [];
            Curves.SubdivideCubicAtLevel(carr, KeySpline.PRECISION_LEVEL, src);
            this._QuadraticsArray = Curves.ConvertCubicsToQuadratics(carr, KeySpline.TOTAL_COUNT);
        }
    }
    Fayde.CoreLibrary.add(KeySpline);
}