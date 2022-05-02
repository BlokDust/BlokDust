module minerva {
    export interface ICornerRadius {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
    }
    export class CornerRadius implements ICornerRadius {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;

        constructor (topLeft?: number, topRight?: number, bottomRight?: number, bottomLeft?: number) {
            this.topLeft = topLeft == null ? 0 : topLeft;
            this.topRight = topRight == null ? 0 : topRight;
            this.bottomRight = bottomRight == null ? 0 : bottomRight;
            this.bottomLeft = bottomLeft == null ? 0 : bottomLeft;
        }

        static isEmpty (cr: ICornerRadius): boolean {
            return cr.topLeft === 0
                && cr.topRight === 0
                && cr.bottomRight === 0
                && cr.bottomLeft === 0;
        }

        static isEqual (cr1: ICornerRadius, cr2: ICornerRadius): boolean {
            return cr1.topLeft === cr2.topLeft
                && cr1.topRight === cr2.topRight
                && cr1.bottomRight === cr2.bottomRight
                && cr1.bottomLeft === cr2.bottomLeft;
        }

        static clear (dest: ICornerRadius) {
            dest.topLeft = dest.topRight = dest.bottomRight = dest.bottomLeft = 0;
        }

        static copyTo (cr2: ICornerRadius, dest: ICornerRadius) {
            dest.topLeft = cr2.topLeft;
            dest.topRight = cr2.topRight;
            dest.bottomRight = cr2.bottomRight;
            dest.bottomLeft = cr2.bottomLeft;
        }
    }
}