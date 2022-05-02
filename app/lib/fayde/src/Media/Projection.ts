/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Media {
    export class Projection extends DependencyObject implements minerva.IProjection {
        private _ProjectionMatrix: Matrix3D = null;
        private _ObjectWidth: number = 0;
        get ObjectWidth (): number {
            return this._ObjectWidth;
        }

        private _ObjectHeight: number = 0;
        get ObjectHeight (): number {
            return this._ObjectHeight;
        }

        setObjectSize (objectWidth: number, objectHeight: number) {
            var w = Math.max(objectWidth, 1.0);
            var h = Math.max(objectHeight, 1.0);
            if (w !== this._ObjectWidth && h !== this._ObjectHeight) {
                this._ObjectWidth = w;
                this._ObjectHeight = h;
                this._ProjectionMatrix = null;
            }
        }

        getDistanceFromXYPlane (): number {
            return NaN;
        }

        getTransform (): number[] {
            var m3 = this._ProjectionMatrix;
            if (!m3)
                m3 = this._ProjectionMatrix = this.CreateProjectionMatrix();
            if (m3)
                return mat4.create(m3._Raw);
            return mat4.identity();
        }

        CreateProjectionMatrix (): Matrix3D {
            return null;
        }

        InvalidateProjection () {
            this._ProjectionMatrix = null;
            Incite(this);
        }
    }
    Fayde.CoreLibrary.add(Projection);
}