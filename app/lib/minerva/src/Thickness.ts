module minerva {
    export class Thickness {
        left: number;
        top: number;
        right: number;
        bottom: number;

        constructor (left?: number, top?: number, right?: number, bottom?: number) {
            this.left = left == null ? 0 : left;
            this.top = top == null ? 0 : top;
            this.right = right == null ? 0 : right;
            this.bottom = bottom == null ? 0 : bottom;
        }

        static add (dest: Thickness, t2: Thickness) {
            dest.left += t2.left;
            dest.top += t2.top;
            dest.right += t2.right;
            dest.bottom += t2.bottom;
        }

        static copyTo (thickness: Thickness, dest: Thickness) {
            dest.left = thickness.left;
            dest.top = thickness.top;
            dest.right = thickness.right;
            dest.bottom = thickness.bottom;
        }

        static isEmpty (thickness: Thickness): boolean {
            return thickness.left === 0 && thickness.top === 0 && thickness.right === 0 && thickness.bottom === 0;
        }

        static isBalanced (thickness: Thickness): boolean {
            return thickness.left === thickness.top
                && thickness.left === thickness.right
                && thickness.left === thickness.bottom;
        }

        static shrinkSize (thickness: Thickness, dest: Size) {
            var w = dest.width;
            var h = dest.height;
            if (w != Number.POSITIVE_INFINITY)
                w -= thickness.left + thickness.right;
            if (h != Number.POSITIVE_INFINITY)
                h -= thickness.top + thickness.bottom;
            dest.width = w > 0 ? w : 0;
            dest.height = h > 0 ? h : 0;
            return dest;
        }

        static shrinkRect (thickness: Thickness, dest: Rect) {
            dest.x += thickness.left;
            dest.y += thickness.top;
            dest.width -= thickness.left + thickness.right;
            dest.height -= thickness.top + thickness.bottom;
            if (dest.width < 0)
                dest.width = 0;
            if (dest.height < 0)
                dest.height = 0;
        }

        static shrinkCornerRadius (thickness: Thickness, dest: ICornerRadius) {
            dest.topLeft = Math.max(dest.topLeft - Math.max(thickness.left, thickness.top) * 0.5, 0);
            dest.topRight = Math.max(dest.topRight - Math.max(thickness.right, thickness.top) * 0.5, 0);
            dest.bottomRight = Math.max(dest.bottomRight - Math.max(thickness.right, thickness.bottom) * 0.5, 0);
            dest.bottomLeft = Math.max(dest.bottomLeft - Math.max(thickness.left, thickness.bottom) * 0.5, 0);
        }

        static growSize (thickness: Thickness, dest: Size) {
            var w = dest.width;
            var h = dest.height;
            if (w != Number.POSITIVE_INFINITY)
                w += thickness.left + thickness.right;
            if (h != Number.POSITIVE_INFINITY)
                h += thickness.top + thickness.bottom;
            dest.width = w > 0 ? w : 0;
            dest.height = h > 0 ? h : 0;
            return dest;
        }

        static growRect (thickness: Thickness, dest: Rect) {
            dest.x -= thickness.left;
            dest.y -= thickness.top;
            dest.width += thickness.left + thickness.right;
            dest.height += thickness.top + thickness.bottom;
            if (dest.width < 0)
                dest.width = 0;
            if (dest.height < 0)
                dest.height = 0;
        }

        static growCornerRadius (thickness: Thickness, dest: ICornerRadius) {
            dest.topLeft = dest.topLeft ? Math.max(dest.topLeft + Math.max(thickness.left, thickness.top) * 0.5, 0) : 0;
            dest.topRight = dest.topRight ? Math.max(dest.topRight + Math.max(thickness.right, thickness.top) * 0.5, 0) : 0;
            dest.bottomRight = dest.bottomRight ? Math.max(dest.bottomRight + Math.max(thickness.right, thickness.bottom) * 0.5, 0) : 0;
            dest.bottomLeft = dest.bottomLeft ? Math.max(dest.bottomLeft + Math.max(thickness.left, thickness.bottom) * 0.5, 0) : 0;
        }
    }
}