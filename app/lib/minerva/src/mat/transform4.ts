/// <reference path="../Rect" />

module minerva {
    Rect.transform4 = function (dest: Rect, projection: number[]) {
        console.warn("[Rect.transform4] Not implemented");
        /*
        if (!projection)
            return;

        var x = dest.x;
        var y = dest.y;
        var width = dest.width;
        var height = dest.height;

        var p1 = vec4.create(x, y, 0.0, 1.0);
        var p2 = vec4.create(x + width, y, 0.0, 1.0);
        var p3 = vec4.create(x + width, y + height, 0.0, 1.0);
        var p4 = vec4.create(x, y + height, 0.0, 1.0);

        mat4.transformVec4(projection, p1);
        mat4.transformVec4(projection, p2);
        mat4.transformVec4(projection, p3);
        mat4.transformVec4(projection, p4);

        var vs = 65536.0;
        var vsr = 1.0 / vs;
        p1[0] *= vsr;
        p1[1] *= vsr;
        p2[0] *= vsr;
        p2[1] *= vsr;
        p3[0] *= vsr;
        p3[1] *= vsr;
        p4[0] *= vsr;
        p4[1] *= vsr;

        var cm1 = clipmask(p1);
        var cm2 = clipmask(p2);
        var cm3 = clipmask(p3);
        var cm4 = clipmask(p4);

        if ((cm1 | cm2 | cm3 | cm4) !== 0) {
            if ((cm1 & cm2 & cm3 & cm4) === 0) {
                dest.x = dest.y = dest.width = dest.height = 0;
                //TODO: Implement
                //var r1 = Matrix3D._ClipToBounds(p1, p2, p3, cm1 | cm2 | cm3);
                //var r2 = Matrix3D._ClipToBounds(p1, p3, p4, cm1 | cm3 | cm4);
                //if (!r1.IsEmpty()) rect.union(dest, r1);
                //if (!r2.IsEmpty()) rect.union(dest, r2);
            }
        } else {
            var p1w = 1.0 / p1[3];
            var p2w = 1.0 / p2[3];
            var p3w = 1.0 / p3[3];
            var p4w = 1.0 / p4[3];
            p1[0] *= p1w * vs;
            p1[1] *= p1w * vs;
            p2[0] *= p2w * vs;
            p2[1] *= p2w * vs;
            p3[0] *= p3w * vs;
            p3[1] *= p3w * vs;
            p4[0] *= p4w * vs;
            p4[1] *= p4w * vs;

            dest.x = p1[0];
            dest.y = p1[1];
            dest.width = 0;
            dest.height = 0;
            Rect.extendTo(dest, p2[0], p2[1]);
            Rect.extendTo(dest, p3[0], p3[1]);
            Rect.extendTo(dest, p4[0], p4[1]);
        }
        */
    };

    function clipmask (clip: number[]): number {
        var mask = 0;

        if (-clip[0] + clip[3] < 0) mask |= (1 << 0);
        if (clip[0] + clip[3] < 0) mask |= (1 << 1);
        if (-clip[1] + clip[3] < 0) mask |= (1 << 2);
        if (clip[1] + clip[3] < 0) mask |= (1 << 3);
        if (clip[2] + clip[3] < 0) mask |= (1 << 4);
        if (-clip[2] + clip[3] < 0) mask |= (1 << 5);

        return mask;
    }
}