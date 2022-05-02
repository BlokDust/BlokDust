/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Media {
    export class GeneralTransform extends DependencyObject {
        Inverse: GeneralTransform;

        Transform (p: minerva.IPoint): Point {
            return new Point(p.x, p.y);
        }

        TransformBounds (r: minerva.Rect): minerva.Rect {
            return r;
        }

        TryTransform (inPoint: minerva.IPoint, outPoint: minerva.IPoint): boolean {
            return false;
        }
    }
    Fayde.CoreLibrary.add(GeneralTransform);

    export class InternalTransform extends GeneralTransform implements minerva.ITransform {
        private _Raw: number[];

        constructor (raw: number[]) {
            super();
            this._Raw = raw;
        }

        get Inverse (): InternalTransform {
            return new InternalTransform(mat4.inverse(this._Raw, mat4.create()));
        }

        get Value (): Matrix3D {
            return Matrix3D.FromRaw(this._Raw);
        }

        getRaw (): number[] {
            return this._Raw;
        }

        Transform (p: minerva.IPoint): Point {
            var pi = vec4.create(p.x, p.y, 0.0, 1.0);
            var po = vec4.create(0, 0, 0, 0);
            mat4.transformVec4(this._Raw, pi, po);
            if (po[3] !== 0.0) {
                var w = 1.0 / po[3];
                return new Point(po[0] * w, po[1] * w);
            }
            return new Point(NaN, NaN);
        }

        TransformBounds (r: minerva.Rect): minerva.Rect {
            if (!r)
                return undefined;

            var copy = new minerva.Rect();
            minerva.Rect.copyTo(r, copy);
            minerva.Rect.transform4(copy, this._Raw);
            return copy;
        }

        CreateMatrix3DProjection (): Matrix3DProjection {
            var projection = new Matrix3DProjection();
            projection.ProjectionMatrix = this.Inverse.Value;
            return projection
        }
    }
    Fayde.CoreLibrary.add(InternalTransform);
}