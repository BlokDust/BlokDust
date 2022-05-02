module minerva {
    export interface IPoint {
        x: number;
        y: number;
    }

    export class Point implements IPoint {
        x: number;
        y: number;

        constructor(x?: number, y?: number) {
            this.x = x == null ? 0 : x;
            this.y = y == null ? 0 : y;
        }

        static isEqual(p1: IPoint, p2: IPoint): boolean {
            return p1.x === p2.x
                && p1.y === p2.y;
        }

        static copyTo(src: IPoint, dest: IPoint) {
            dest.x = src.x;
            dest.y = src.y;
        }
    }
}