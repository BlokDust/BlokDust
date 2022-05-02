/// <reference path="Projection.ts" />

module Fayde.Media {
    var FIELD_OF_VIEW = 57.0 / 180 * Math.PI;
    var CAMERA_DIST = 999.0;
    var NEAR_VAL = 1.0;
    var FAR_VAL = 65536.0;
    var XY_PLANE_Z = (NEAR_VAL * FAR_VAL / (NEAR_VAL - FAR_VAL) * (1.0 - CAMERA_DIST)) / CAMERA_DIST;
    var PI_OVER_180 = Math.PI / 180.0;

    export class PlaneProjection extends Projection {
        static CenterOfRotationXProperty = DependencyProperty.Register("CenterOfRotationX", () => Number, PlaneProjection, 0.5, (d: Projection, args) => d.InvalidateProjection());
        static CenterOfRotationYProperty = DependencyProperty.Register("CenterOfRotationY", () => Number, PlaneProjection, 0.5, (d: Projection, args) => d.InvalidateProjection());
        static CenterOfRotationZProperty = DependencyProperty.Register("CenterOfRotationZ", () => Number, PlaneProjection, 0.5, (d: Projection, args) => d.InvalidateProjection());

        static GlobalOffsetXProperty = DependencyProperty.Register("GlobalOffsetX", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static GlobalOffsetYProperty = DependencyProperty.Register("GlobalOffsetY", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static GlobalOffsetZProperty = DependencyProperty.Register("GlobalOffsetZ", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());

        static LocalOffsetXProperty = DependencyProperty.Register("LocalOffsetX", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static LocalOffsetYProperty = DependencyProperty.Register("LocalOffsetY", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static LocalOffsetZProperty = DependencyProperty.Register("LocalOffsetZ", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());

        static RotationXProperty = DependencyProperty.Register("RotationX", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static RotationYProperty = DependencyProperty.Register("RotationY", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());
        static RotationZProperty = DependencyProperty.Register("RotationZ", () => Number, PlaneProjection, 0.0, (d: Projection, args) => d.InvalidateProjection());

        CenterOfRotationX: number;
        CenterOfRotationY: number;
        CenterOfRotationZ: number;

        GlobalOffsetX: number;
        GlobalOffsetY: number;
        GlobalOffsetZ: number;

        LocalOffsetX: number;
        LocalOffsetY: number;
        LocalOffsetZ: number;

        RotationX: number;
        RotationY: number;
        RotationZ: number;

        getDistanceFromXYPlane (): number {
            var w = Math.max(this.ObjectWidth, 1.0);
            var h = Math.max(this.ObjectHeight, 1.0);
            var p = [w / 2.0, h / 2.0, 0.0, 1.0];

            var m = this.getTransform();
            mat4.transformVec4(m, p, p);

            if (p[3] === 0.0)
                return NaN;
            return XY_PLANE_Z - (p[2] / p[3]);
        }

        CreateProjectionMatrix3D (): Matrix3D {
            var rotationX = this.RotationX;
            var rotationY = this.RotationY;
            var rotationZ = this.RotationZ;
            var radiansX = (rotationX || 0.0) * PI_OVER_180;
            var radiansY = (rotationY || 0.0) * PI_OVER_180;
            var radiansZ = (rotationZ || 0.0) * PI_OVER_180;
            var globalOffsetX = this.GlobalOffsetX;
            var globalOffsetY = this.GlobalOffsetY;
            var globalOffsetZ = this.GlobalOffsetZ;
            var globalX = globalOffsetX || 0.0;
            var globalY = globalOffsetY || 0.0;
            var globalZ = globalOffsetZ || 0.0;
            var localOffsetX = this.LocalOffsetX;
            var localOffsetY = this.LocalOffsetY;
            var localOffsetZ = this.LocalOffsetZ;
            var localX = localOffsetX || 0.0;
            var localY = localOffsetY || 0.0;
            var localZ = localOffsetZ || 0.0;

            var ow = this.ObjectWidth;
            var oh = this.ObjectHeight;

            var height = 2.0 * CAMERA_DIST * Math.tan(FIELD_OF_VIEW / 2.0);
            var scale = height / oh;

            var toCenter = mat4.createTranslate(
                -ow * this.CenterOfRotationX,
                -oh * this.CenterOfRotationY,
                -this.CenterOfRotationZ);
            var invertY = mat4.createScale(1.0, -1.0, 1.0);
            var localOffset = mat4.createTranslate(localX, -localY, localZ);
            var rotateX = mat4.createRotateX(radiansX);
            var rotateY = mat4.createRotateX(radiansY);
            var rotateZ = mat4.createRotateX(radiansZ);
            var toCamera = mat4.createTranslate(
                ow * (this.CenterOfRotationX - 0.5) + globalX,
                -oh * (this.CenterOfRotationY - 0.5) - globalY,
                this.CenterOfRotationZ - CAMERA_DIST + globalZ);
            var perspective = mat4.createPerspective(FIELD_OF_VIEW, ow / oh, NEAR_VAL, FAR_VAL);
            var zoom = mat4.createScale(scale, scale, 1.0);
            var viewport = mat4.createViewport(ow, oh);

            var m = mat4.multiply(toCenter, invertY);
            mat4.multiply(m, localOffset, m);
            mat4.multiply(m, rotateX, m);
            mat4.multiply(m, rotateY, m);
            mat4.multiply(m, rotateZ, m);
            mat4.multiply(m, toCamera, m);
            mat4.multiply(m, perspective, m);
            mat4.multiply(m, zoom, m);
            mat4.multiply(m, viewport, m);

            var r = new Matrix3D();
            r._Raw = m;
            return r;
        }
    }
    Fayde.CoreLibrary.add(PlaneProjection);
}