/// <reference path="GeneralTransform.ts" />

module Fayde.Media {
    export class Transform extends GeneralTransform implements minerva.ITransform {
        private _Value: Matrix;

        constructor () {
            super();
            XamlNode.SetShareable(this.XamlNode);
        }

        get Value (): Matrix {
            var val = this._Value;
            if (!val) {
                this._Value = val = new Matrix();
                val._Raw = this._BuildValue();
            }
            return val;
        }

        getRaw (): number[] {
            return this.Value._Raw;
        }

        get Inverse (): Transform {
            var inverse = this.Value.Inverse;
            if (!inverse)
                return null;
            var mt = new MatrixTransform();
            mt.Matrix = inverse;
            return mt;
        }

        Transform (p: minerva.IPoint): Point {
            var val = this.Value;
            var v: number[];
            if (!val || !(v = val._Raw))
                return new Point(p.x, p.y);
            v = mat3.transformVec2(v, vec2.create(p.x, p.y));
            return new Point(v[0], v[1]);
        }

        TransformBounds (r: minerva.Rect): minerva.Rect {
            if (!r)
                return undefined;
            var v = this.Value;
            var copy = new minerva.Rect();
            minerva.Rect.copyTo(r, copy);
            if (!v || !v._Raw)
                return copy;
            return minerva.Rect.transform(copy, v._Raw);
        }

        TryTransform (inPoint: minerva.IPoint, outPoint: minerva.IPoint): boolean {
            return false;
        }

        InvalidateValue () {
            if (this._Value !== undefined)
                this._Value = undefined;
            Incite(this);
        }

        _BuildValue (): number[] {
            //Abstract Method
            return undefined;
        }

        static copyMatTo (t: Transform, mat: number[]) {
            mat3.copyTo(t.Value._Raw, mat);
        }
    }
    Fayde.CoreLibrary.add(Transform);

    export class MatrixTransform extends Transform {
        static MatrixProperty = DependencyProperty.RegisterFull("Matrix", () => Matrix, MatrixTransform);
        Matrix: Matrix;

        _BuildValue (): number[] {
            var m = this.Matrix;
            if (m)
                return m._Raw;
            return mat3.identity();
        }

        Clone (): MatrixTransform {
            var xform = new MatrixTransform();
            xform.Matrix = this.Matrix.Clone();
            return xform;
        }
    }
    Fayde.CoreLibrary.add(MatrixTransform);

    module reactions {
        DPReaction<Matrix>(MatrixTransform.MatrixProperty, (mt: MatrixTransform, ov, nv) => mt.InvalidateValue());
    }
}