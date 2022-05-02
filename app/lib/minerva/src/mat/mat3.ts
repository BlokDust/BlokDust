interface IMatrix3Static {
    create (src?: number[]): number[];
    copyTo (src: number[], dest: number[]): number[];
    init (dest: number[], m11: number, m12: number, m21: number, m22: number, x0: number, y0: number): number[];
    identity (dest?: number[]): number[];
    equal (a: number[], b: number[]): boolean;
    // dest = a * b
    multiply (a: number[], b: number[], dest?: number[]): number[];
    inverse(mat: number[], dest?: number[]): number[];
    transformVec2(mat: number[], vec: number[], dest?: number[]): number[];

    createTranslate(x: number, y: number, dest?: number[]): number[];
    translate(mat: number[], x: number, y: number): number[];
    createScale (sx: number, sy: number, dest?: number[]): number[];
    scale (mat: number[], sx: number, sy: number): number[];
    createRotate (angleRad: number, dest?: number[]): number[];
    createSkew (angleRadX: number, angleRadY: number, dest?: number[]): number[];

    preapply(dest: number[], mat: number[]): number[];
    apply(dest: number[], mat: number[]): number[];
}
module minerva {
    /// NOTE:
    ///     Row-major order
    ///     [m11, m12, m21, m22, x0, y0]
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

    export var mat3: IMatrix3Static = {
        create (src?: number[]): number[] {
            var dest = createTypedArray(6);

            if (src) {
                dest[0] = src[0];
                dest[1] = src[1];
                dest[2] = src[2];
                dest[3] = src[3];
                dest[4] = src[4];
                dest[5] = src[5];
            } else {
                dest[0] = dest[1] = dest[2] = dest[3] = dest[4] = dest[5] = 0;
            }

            return dest;
        },
        copyTo (src: number[], dest: number[]): number[] {
            dest[0] = src[0];
            dest[1] = src[1];
            dest[2] = src[2];
            dest[3] = src[3];
            dest[4] = src[4];
            dest[5] = src[5];
            return dest;
        },
        init (dest: number[], m11: number, m12: number, m21: number, m22: number, x0: number, y0: number): number[] {
            dest[0] = m11;
            dest[1] = m12;
            dest[2] = m21;
            dest[3] = m22;
            dest[4] = x0;
            dest[5] = y0;
            return dest;
        },
        identity (dest?: number[]): number[] {
            if (!dest) dest = mat3.create();
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 1;
            dest[4] = 0;
            dest[5] = 0;
            return dest;
        },
        equal (a: number[], b: number[]): boolean {
            return a === b || (
                    Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
                    Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
                    Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
                    Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
                    Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
                    Math.abs(a[5] - b[5]) < FLOAT_EPSILON
                );
        },
        multiply (a: number[], b: number[], dest?: number[]): number[] {
            if (!dest) dest = a;
            var a11 = a[0], a12 = a[1],
                a21 = a[2], a22 = a[3],
                ax0 = a[4], ay0 = a[5],
                b11 = b[0], b12 = b[1],
                b21 = b[2], b22 = b[3],
                bx0 = b[4], by0 = b[5];

            dest[0] = a11 * b11 + a12 * b21;
            dest[1] = a11 * b12 + a12 * b22;

            dest[2] = a21 * b11 + a22 * b21;
            dest[3] = a21 * b12 + a22 * b22;

            dest[4] = ax0 * b11 + ay0 * b21 + bx0;
            dest[5] = ax0 * b12 + ay0 * b22 + by0;

            return dest;
        },
        inverse (mat: number[], dest?: number[]): number[] {
            if (Math.abs(mat[1]) < FLOAT_EPSILON && Math.abs(mat[2]) < FLOAT_EPSILON) //Simple scaling/translation matrix
                return simple_inverse(mat, dest);
            else
                return complex_inverse(mat, dest);
        },
        transformVec2 (mat: number[], vec: number[], dest?: number[]): number[] {
            if (!dest) dest = vec;
            var x = vec[0],
                y = vec[1];
            dest[0] = (mat[0] * x) + (mat[2] * y) + mat[4];
            dest[1] = (mat[1] * x) + (mat[3] * y) + mat[5];
            return dest;
        },

        createTranslate (x: number, y: number, dest?: number[]): number[] {
            if (!dest) dest = mat3.create();
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 1;
            dest[4] = x;
            dest[5] = y;
            return dest;
        },
        translate (mat: number[], x: number, y: number): number[] {
            mat[4] += x;
            mat[5] += y;
            return mat;
        },
        createScale (sx: number, sy: number, dest?: number[]): number[] {
            if (!dest) dest = mat3.create();
            dest[0] = sx;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = sy;
            dest[4] = 0;
            dest[5] = 0;
            return dest;
        },
        scale (mat: number[], sx: number, sy: number): number[] {
            mat[0] *= sx;
            mat[2] *= sx;
            mat[4] *= sx;

            mat[1] *= sy;
            mat[3] *= sy;
            mat[5] *= sy;
            return mat;
        },
        createRotate (angleRad: number, dest?: number[]): number[] {
            if (!dest) dest = mat3.create();
            var c = Math.cos(angleRad);
            var s = Math.sin(angleRad);
            dest[0] = c;
            dest[1] = s;
            dest[2] = -s;
            dest[3] = c;
            dest[4] = 0;
            dest[5] = 0;
            return dest;
        },
        createSkew (angleRadX: number, angleRadY: number, dest?: number[]): number[] {
            if (!dest) dest = mat3.create();
            dest[0] = 1;
            dest[1] = Math.tan(angleRadY);
            dest[2] = Math.tan(angleRadX);
            dest[3] = 1;
            dest[4] = 0;
            dest[5] = 0;
            return dest;
        },

        preapply (dest: number[], mat: number[]): number[] {
            return mat3.multiply(mat, dest, dest);
        },
        apply (dest: number[], mat: number[]): number[] {
            return mat3.multiply(dest, mat, dest);
        }
    };

    function simple_inverse (mat: number[], dest?: number[]): number[] {
        var m11 = mat[0];
        if (Math.abs(m11) < FLOAT_EPSILON)
            return null;

        var m22 = mat[3];
        if (Math.abs(m22) < FLOAT_EPSILON)
            return null;

        if (!dest) {
            dest = mat;
        } else {
            dest[1] = mat[1];
            dest[2] = mat[2];
        }

        var x0 = -mat[4];
        var y0 = -mat[5];
        if (Math.abs(m11 - 1) > FLOAT_EPSILON) {
            m11 = 1 / m11;
            x0 *= m11;
        }
        if (Math.abs(m22 - 1) > FLOAT_EPSILON) {
            m22 = 1 / m22;
            y0 *= m22;
        }

        dest[0] = m11;
        dest[3] = m22;
        dest[4] = x0;
        dest[5] = y0;
        return dest;
    }

    function complex_inverse (mat: number[], dest?: number[]): number[] {
        if (!dest) dest = mat;

        var m11 = mat[0], m12 = mat[1],
            m21 = mat[2], m22 = mat[3];

        //inv(A) = 1/det(A) * adj(A)
        var det = m11 * m22 - m12 * m21;
        if (det === 0 || !isFinite(det))
            return null;
        var id = 1 / det;

        var x0 = mat[4], y0 = mat[5];

        dest[0] = m22 * id;
        dest[1] = -m12 * id;
        dest[2] = -m21 * id;
        dest[3] = m11 * id;
        dest[4] = (m21 * y0 - m22 * x0) * id;
        dest[5] = (m12 * x0 - m11 * y0) * id;
        return dest;
    }
}
var mat3 = minerva.mat3;