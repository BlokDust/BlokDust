interface IVector2Static {
    create(x: number, y: number): number[];
    init(x: number, y: number, dest?: number[]): number[];
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

    export var vec2: IVector2Static = {
        create (x: number, y: number): number[] {
            var dest = createTypedArray(2);
            dest[0] = x;
            dest[1] = y;
            return dest;
        },
        init (x: number, y: number, dest?: number[]): number[] {
            if (!dest) dest = createTypedArray(2);
            dest[0] = x;
            dest[1] = y;
            return dest;
        }
    };
}

var vec2 = minerva.vec2;