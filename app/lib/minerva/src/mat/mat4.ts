interface IMatrix4Static {
    create (src?: number[]): number[];
    copyTo (src: number[], dest: number[]): number[];
    identity(dest?: number[]): number[];
    equal(a: number[], b: number[]): boolean;
    // dest = a * b
    multiply (a: number[], b: number[], dest?: number[]): number[];
    inverse (mat: number[], dest?: number[]): number[];
    transpose (mat: number[], dest?: number[]): number[];
    transformVec4 (mat: number[], vec: number[], dest?: number[]): number[];
    createTranslate (x: number, y: number, z: number, dest?: number[]): number[];
    createScale (x: number, y: number, z: number, dest?: number[]): number[];
    createRotateX (theta: number, dest?: number[]): number[];
    createRotateY (theta: number, dest?: number[]): number[];
    createRotateZ (theta: number, dest?: number[]): number[];
    createPerspective (fieldOfViewY: number, aspectRatio: number, zNearPlane: number, zFarPlane: number, dest?: number[]): number[];
    createViewport (width: number, height: number, dest?: number[]): number[];
}

module minerva {
    enum Indexes {
        M11 = 0,
        M12 = 1,
        M13 = 2,
        M14 = 3,
        M21 = 4,
        M22 = 5,
        M23 = 6,
        M24 = 7,
        M31 = 8,
        M32 = 9,
        M33 = 10,
        M34 = 11,
        OffsetX = 12,
        OffsetY = 13,
        OffsetZ = 14,
        M44 = 15
    }

    var FLOAT_EPSILON = 0.000001;
    var createTypedArray: (length: number) => number[];

    if (typeof Float32Array !== "undefined") {
        createTypedArray = function (length: number): number[] {
            return <number[]><any>new Float32Array(length);
        };
    } else {
        createTypedArray = function (length: number): number[] {
            return <number[]>new Array(length);
        };
    }

    export var mat4: IMatrix4Static = {
        create (src?: number[]): number[] {
            var dest = createTypedArray(16);

            if (src) {
                dest[Indexes.M11] = src[Indexes.M11];
                dest[Indexes.M12] = src[Indexes.M12];
                dest[Indexes.M13] = src[Indexes.M13];
                dest[Indexes.M14] = src[Indexes.M14];
                dest[Indexes.M21] = src[Indexes.M21];
                dest[Indexes.M22] = src[Indexes.M22];
                dest[Indexes.M23] = src[Indexes.M23];
                dest[Indexes.M24] = src[Indexes.M24];
                dest[Indexes.M31] = src[Indexes.M31];
                dest[Indexes.M32] = src[Indexes.M32];
                dest[Indexes.M33] = src[Indexes.M33];
                dest[Indexes.M34] = src[Indexes.M34];
                dest[Indexes.OffsetX] = src[Indexes.OffsetX];
                dest[Indexes.OffsetY] = src[Indexes.OffsetY];
                dest[Indexes.OffsetZ] = src[Indexes.OffsetZ];
                dest[Indexes.M44] = src[Indexes.M44];
            }

            return dest;
        },
        copyTo (src: number[], dest: number[]): number[] {
            dest[Indexes.M11] = src[Indexes.M11];
            dest[Indexes.M12] = src[Indexes.M12];
            dest[Indexes.M13] = src[Indexes.M13];
            dest[Indexes.M14] = src[Indexes.M14];
            dest[Indexes.M21] = src[Indexes.M21];
            dest[Indexes.M22] = src[Indexes.M22];
            dest[Indexes.M23] = src[Indexes.M23];
            dest[Indexes.M24] = src[Indexes.M24];
            dest[Indexes.M31] = src[Indexes.M31];
            dest[Indexes.M32] = src[Indexes.M32];
            dest[Indexes.M33] = src[Indexes.M33];
            dest[Indexes.M34] = src[Indexes.M34];
            dest[Indexes.OffsetX] = src[Indexes.OffsetX];
            dest[Indexes.OffsetY] = src[Indexes.OffsetY];
            dest[Indexes.OffsetZ] = src[Indexes.OffsetZ];
            dest[Indexes.M44] = src[Indexes.M44];
            return dest;
        },
        identity (dest?: number[]): number[] {
            if (!dest) dest = mat4.create();
            dest[Indexes.M11] = 1;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;
            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = 1;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;
            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = 1;
            dest[Indexes.M34] = 0;
            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;
            return dest;
        },
        equal (a: number[], b: number[]): boolean {
            return a === b || (
                Math.abs(a[Indexes.M11] - b[Indexes.M11]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M12] - b[Indexes.M12]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M13] - b[Indexes.M13]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M14] - b[Indexes.M14]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M21] - b[Indexes.M21]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M22] - b[Indexes.M22]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M23] - b[Indexes.M23]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M24] - b[Indexes.M24]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M31] - b[Indexes.M31]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M32] - b[Indexes.M32]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M33] - b[Indexes.M33]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M34] - b[Indexes.M34]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.OffsetX] - b[Indexes.OffsetX]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.OffsetY] - b[Indexes.OffsetY]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.OffsetZ] - b[Indexes.OffsetZ]) < FLOAT_EPSILON &&
                Math.abs(a[Indexes.M44] - b[Indexes.M44]) < FLOAT_EPSILON
                );
        },
        multiply (a: number[], b: number[], dest?: number[]): number[] {
            if (!dest) dest = a;
            var m11 = a[Indexes.M11], m12 = a[Indexes.M12], m13 = a[Indexes.M13], m14 = a[Indexes.M14],
                m21 = a[Indexes.M21], m22 = a[Indexes.M22], m23 = a[Indexes.M23], m24 = a[Indexes.M24],
                m31 = a[Indexes.M31], m32 = a[Indexes.M32], m33 = a[Indexes.M33], m34 = a[Indexes.M34],
                mx0 = a[Indexes.OffsetX], my0 = a[Indexes.OffsetY], mz0 = a[Indexes.OffsetZ], m44 = a[Indexes.M44];

            var n11 = b[Indexes.M11], n12 = b[Indexes.M12], n13 = b[Indexes.M13], n14 = b[Indexes.M14],
                n21 = b[Indexes.M21], n22 = b[Indexes.M22], n23 = b[Indexes.M23], n24 = b[Indexes.M24],
                n31 = b[Indexes.M31], n32 = b[Indexes.M32], n33 = b[Indexes.M33], n34 = b[Indexes.M34],
                nx0 = b[Indexes.OffsetX], ny0 = b[Indexes.OffsetY], nz0 = b[Indexes.OffsetZ], n44 = b[Indexes.M44];

            dest[Indexes.M11] = m11 * n11 + m12 * n21 + m13 * n31 + m14 * nx0;
            dest[Indexes.M12] = m11 * n12 + m12 * n22 + m13 * n32 + m14 * ny0;
            dest[Indexes.M13] = m11 * n13 + m12 * n23 + m13 * n33 + m14 * nz0;
            dest[Indexes.M14] = m11 * n14 + m12 * n24 + m13 * n34 + m14 * n44;
            dest[Indexes.M21] = m21 * n11 + m22 * n21 + m23 * n31 + m24 * nx0;
            dest[Indexes.M22] = m21 * n12 + m22 * n22 + m23 * n32 + m24 * ny0;
            dest[Indexes.M23] = m21 * n13 + m22 * n23 + m23 * n33 + m24 * nz0;
            dest[Indexes.M24] = m21 * n14 + m22 * n24 + m23 * n34 + m24 * n44;
            dest[Indexes.M31] = m31 * n11 + m32 * n21 + m33 * n31 + m34 * nx0;
            dest[Indexes.M32] = m31 * n12 + m32 * n22 + m33 * n32 + m34 * ny0;
            dest[Indexes.M33] = m31 * n13 + m32 * n23 + m33 * n33 + m34 * nz0;
            dest[Indexes.M34] = m31 * n14 + m32 * n24 + m33 * n34 + m34 * n44;
            dest[Indexes.OffsetX] = mx0 * n11 + my0 * n21 + mz0 * n31 + m44 * nx0;
            dest[Indexes.OffsetY] = mx0 * n12 + my0 * n22 + mz0 * n32 + m44 * ny0;
            dest[Indexes.OffsetZ] = mx0 * n13 + my0 * n23 + mz0 * n33 + m44 * nz0;
            dest[Indexes.M44] = mx0 * n14 + my0 * n24 + mz0 * n34 + m44 * n44;
            return dest;
        },
        inverse (mat: number[], dest?: number[]): number[] {
            if (!dest) dest = mat;

            // Cache the matrix values (makes for huge speed increases!)
            var a00 = mat[Indexes.M11], a01 = mat[Indexes.M12], a02 = mat[Indexes.M13], a03 = mat[Indexes.M14],
                a10 = mat[Indexes.M21], a11 = mat[Indexes.M22], a12 = mat[Indexes.M23], a13 = mat[Indexes.M24],
                a20 = mat[Indexes.M31], a21 = mat[Indexes.M32], a22 = mat[Indexes.M33], a23 = mat[Indexes.M34],
                a30 = mat[Indexes.OffsetX], a31 = mat[Indexes.OffsetY], a32 = mat[Indexes.OffsetZ], a33 = mat[Indexes.M44],

                b00 = a00 * a11 - a01 * a10,
                b01 = a00 * a12 - a02 * a10,
                b02 = a00 * a13 - a03 * a10,
                b03 = a01 * a12 - a02 * a11,
                b04 = a01 * a13 - a03 * a11,
                b05 = a02 * a13 - a03 * a12,
                b06 = a20 * a31 - a21 * a30,
                b07 = a20 * a32 - a22 * a30,
                b08 = a20 * a33 - a23 * a30,
                b09 = a21 * a32 - a22 * a31,
                b10 = a21 * a33 - a23 * a31,
                b11 = a22 * a33 - a23 * a32;

            var d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
            if (!isFinite(d) || !d)
                return null;
            var id = 1 / d;

            dest[Indexes.M11] = (a11 * b11 - a12 * b10 + a13 * b09) * id;
            dest[Indexes.M12] = (-a01 * b11 + a02 * b10 - a03 * b09) * id;
            dest[Indexes.M13] = (a31 * b05 - a32 * b04 + a33 * b03) * id;
            dest[Indexes.M14] = (-a21 * b05 + a22 * b04 - a23 * b03) * id;
            dest[Indexes.M21] = (-a10 * b11 + a12 * b08 - a13 * b07) * id;
            dest[Indexes.M22] = (a00 * b11 - a02 * b08 + a03 * b07) * id;
            dest[Indexes.M23] = (-a30 * b05 + a32 * b02 - a33 * b01) * id;
            dest[Indexes.M24] = (a20 * b05 - a22 * b02 + a23 * b01) * id;
            dest[Indexes.M31] = (a10 * b10 - a11 * b08 + a13 * b06) * id;
            dest[Indexes.M32] = (-a00 * b10 + a01 * b08 - a03 * b06) * id;
            dest[Indexes.M33] = (a30 * b04 - a31 * b02 + a33 * b00) * id;
            dest[Indexes.M34] = (-a20 * b04 + a21 * b02 - a23 * b00) * id;
            dest[Indexes.OffsetX] = (-a10 * b09 + a11 * b07 - a12 * b06) * id;
            dest[Indexes.OffsetY] = (a00 * b09 - a01 * b07 + a02 * b06) * id;
            dest[Indexes.OffsetZ] = (-a30 * b03 + a31 * b01 - a32 * b00) * id;
            dest[Indexes.M44] = (a20 * b03 - a21 * b01 + a22 * b00) * id;

            return dest;
        },
        transpose (mat: number[], dest?: number[]): number[] {
            if (!dest) dest = mat;

            var a00 = mat[Indexes.M11], a01 = mat[Indexes.M12], a02 = mat[Indexes.M13], a03 = mat[Indexes.M14],
                a10 = mat[Indexes.M21], a11 = mat[Indexes.M22], a12 = mat[Indexes.M23], a13 = mat[Indexes.M24],
                a20 = mat[Indexes.M31], a21 = mat[Indexes.M32], a22 = mat[Indexes.M33], a23 = mat[Indexes.M34],
                a30 = mat[Indexes.OffsetX], a31 = mat[Indexes.OffsetY], a32 = mat[Indexes.OffsetZ], a33 = mat[Indexes.M44];

            dest[Indexes.M11] = a00; dest[Indexes.M21] = a01; dest[Indexes.M31] = a02; dest[Indexes.OffsetX] = a03;
            dest[Indexes.M12] = a10; dest[Indexes.M22] = a11; dest[Indexes.M32] = a12; dest[Indexes.OffsetY] = a13;
            dest[Indexes.M13] = a20; dest[Indexes.M23] = a21; dest[Indexes.M33] = a22; dest[Indexes.OffsetZ] = a23;
            dest[Indexes.M14] = a30; dest[Indexes.M24] = a31; dest[Indexes.M34] = a32; dest[Indexes.M44] = a33;

            return dest;
        },
        transformVec4 (mat: number[], vec: number[], dest?: number[]): number[] {
            if (!dest) dest = vec;

            var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

            var m11 = mat[Indexes.M11], m12 = mat[Indexes.M12], m13 = mat[Indexes.M13], m14 = mat[Indexes.M14],
                m21 = mat[Indexes.M21], m22 = mat[Indexes.M22], m23 = mat[Indexes.M23], m24 = mat[Indexes.M24],
                m31 = mat[Indexes.M31], m32 = mat[Indexes.M32], m33 = mat[Indexes.M33], m34 = mat[Indexes.M34],
                mx0 = mat[Indexes.OffsetX], my0 = mat[Indexes.OffsetY], mz0 = mat[Indexes.OffsetZ], m44 = mat[Indexes.M44];

            dest[0] = m11 * x + m12 * y + m13 * z + m14 * w;
            dest[1] = m21 * x + m22 * y + m23 * z + m24 * w;
            dest[2] = m31 * x + m32 * y + m33 * z + m34 * w;
            dest[3] = mx0 * x + my0 * y + mz0 * z + m44 * w;

            return dest;
        },

        createTranslate (x: number, y: number, z: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            dest[Indexes.M11] = 1;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = 1;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = 1;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = x;
            dest[Indexes.OffsetY] = y;
            dest[Indexes.OffsetZ] = z;
            dest[Indexes.M44] = 1;

            return dest;
        },
        createScale (x: number, y: number, z: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            dest[Indexes.M11] = x;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M11] = 0;
            dest[Indexes.M12] = y;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = z;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;

            return dest;
        },
        createRotateX (theta: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            var s = Math.sin(theta);
            var c = Math.cos(theta);

            dest[Indexes.M11] = 1;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = c;
            dest[Indexes.M23] = s;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = -s;
            dest[Indexes.M33] = c;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;

            return dest;
        },
        createRotateY (theta: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            var s = Math.sin(theta);
            var c = Math.cos(theta);

            dest[Indexes.M11] = c;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = -s;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = 1;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = s;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = c;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;

            return dest;
        },
        createRotateZ (theta: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            var s = Math.sin(theta);
            var c = Math.cos(theta);

            dest[Indexes.M11] = c;
            dest[Indexes.M12] = s;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = -s;
            dest[Indexes.M22] = c;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = 1;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;

            return dest;
        },

        createPerspective (fieldOfViewY: number, aspectRatio: number, zNearPlane: number, zFarPlane: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            var height = 1.0 / Math.tan(fieldOfViewY / 2.0);
            var width = height / aspectRatio;
            var d = zNearPlane - zFarPlane;

            dest[Indexes.M11] = width;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = height;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = zFarPlane / d;
            dest[Indexes.M34] = -1.0;

            dest[Indexes.OffsetX] = 0;
            dest[Indexes.OffsetY] = 0;
            dest[Indexes.OffsetZ] = zNearPlane * zFarPlane / d;
            dest[Indexes.M44] = 0.0;

            return dest;
        },
        createViewport (width: number, height: number, dest?: number[]): number[] {
            if (!dest) dest = mat4.create();

            dest[Indexes.M11] = width / 2.0;
            dest[Indexes.M12] = 0;
            dest[Indexes.M13] = 0;
            dest[Indexes.M14] = 0;

            dest[Indexes.M21] = 0;
            dest[Indexes.M22] = -height / 2.0;
            dest[Indexes.M23] = 0;
            dest[Indexes.M24] = 0;

            dest[Indexes.M31] = 0;
            dest[Indexes.M32] = 0;
            dest[Indexes.M33] = 1;
            dest[Indexes.M34] = 0;

            dest[Indexes.OffsetX] = width / 2.0;
            dest[Indexes.OffsetY] = height / 2.0;
            dest[Indexes.OffsetZ] = 0;
            dest[Indexes.M44] = 1;

            return dest;
        }
    };
}

var mat4 = minerva.mat4;