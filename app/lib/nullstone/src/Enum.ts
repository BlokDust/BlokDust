module nullstone {
    export class Enum {
        constructor (public Object: any) {
        }

        static fromAny<T>(enuType: any, val: any, fallback?: number): number {
            if (typeof val === "number")
                return val;
            if (!val)
                return (fallback || 0);
            var obj = enuType[val.toString()];
            return (obj == null) ? (fallback || 0) : obj;
        }
    }
}