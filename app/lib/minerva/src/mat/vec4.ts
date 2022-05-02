interface IVector4Static {
    create(x: number, y: number, z: number, w: number): number[];
    init(x: number, y: number, z: number, w: number, dest?: number[]): number[];
}
module minerva {
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

    export var vec4: IVector4Static = {
        create (x: number, y: number, z: number, w: number): number[] {
            var dest = createTypedArray(4);
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            dest[3] = w;
            return dest;
        },
        init (x: number, y: number, z: number, w: number, dest?: number[]): number[] {
            if (!dest) dest = createTypedArray(4);
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            dest[3] = w;
            return dest;
        }
    };
}

var vec4 = minerva.vec4;