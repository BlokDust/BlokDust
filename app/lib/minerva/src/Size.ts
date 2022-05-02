module minerva {
    export interface ISize {
        width: number;
        height: number;
    }

    export class Size implements ISize {
        width: number;
        height: number;

        constructor (width?: number, height?: number) {
            this.width = width == null ? 0 : width;
            this.height = height == null ? 0 : height;
        }

        static copyTo (src: ISize, dest: ISize) {
            dest.width = src.width;
            dest.height = src.height;
        }

        static isEqual (size1: ISize, size2: ISize): boolean {
            return size1.width === size2.width
                && size1.height === size2.height;
        }

        static isEmpty (size: Size): boolean {
            return size.width === 0
                || size.height === 0;
        }

        static min (dest: ISize, size2: ISize) {
            dest.width = Math.min(dest.width, size2.width);
            dest.height = Math.min(dest.height, size2.height);
        }

        static isUndef (size: ISize): boolean {
            return isNaN(size.width) && isNaN(size.height);
        }

        static undef (size: ISize) {
            size.width = NaN;
            size.height = NaN;
        }
    }
}