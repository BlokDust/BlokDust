module Utils.Measurements {

    export class Size{
        constructor (public width: number, public height: number){}
    }

    export class Dimensions {
        static fitRect(width1: number, height1: number, width2: number, height2: number): Size {
            var ratio1 = height1 / width1;
            var ratio2 = height2 / width2;

            var width, height, scale;

            if (ratio1 < ratio2) {
                scale = width2 / width1;
                width = width1 * scale;
                height = height1 * scale;
            }
            if (ratio2 < ratio1) {
                scale = height2 / height1;
                width = width1 * scale;
                height = height1 * scale;
            }

            return new Size(Math.floor(width), Math.floor(height));
        }

        static hitRect(x: number, y: number, w: number, h: number, mx: number, my: number) {
            if (mx > x && mx < (x + w) && my > y && my < (y + h)) {
                return true;
            }
            return false;
        }
    }
}