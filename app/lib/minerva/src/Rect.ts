/// <reference path="mat/vec2" />

module minerva {
    export enum RectOverlap {
        Out,
        In,
        Part,
    }

    var p1 = vec2.create(0, 0);
    var p2 = vec2.create(0, 0);
    var p3 = vec2.create(0, 0);
    var p4 = vec2.create(0, 0);

    export class Rect implements IPoint, ISize {
        x: number;
        y: number;
        width: number;
        height: number;

        constructor (x?: number, y?: number, width?: number, height?: number) {
            this.x = x == null ? 0 : x;
            this.y = y == null ? 0 : y;
            this.width = width == null ? 0 : width;
            this.height = height == null ? 0 : height;
        }

        static clear (rect: Rect) {
            rect.x = rect.y = rect.width = rect.height = 0;
        }

        static getBottom (rect: Rect): number {
            return rect.y + rect.height;
        }

        static getRight (rect: Rect): number {
            return rect.x + rect.width;
        }

        static isEqual (rect1: Rect, rect2: Rect): boolean {
            return rect1.x === rect2.x
                && rect1.y === rect2.y
                && rect1.width === rect2.width
                && rect1.height === rect2.height;
        }

        static isEmpty (src: Rect): boolean {
            return src.width === 0
                || src.height === 0;
        }

        static copyTo (src: Rect, dest: Rect) {
            dest.x = src.x;
            dest.y = src.y;
            dest.width = src.width;
            dest.height = src.height;
        }

        static roundOut (dest: Rect) {
            var x = Math.floor(dest.x);
            var y = Math.floor(dest.y);
            dest.width = Math.ceil(dest.x + dest.width) - x;
            dest.height = Math.ceil(dest.y + dest.height) - y;
            dest.x = x;
            dest.y = y;
        }

        static roundIn (dest: Rect) {
            var x = Math.ceil(dest.x);
            var y = Math.ceil(dest.y);
            dest.width = Math.floor(dest.x + dest.width) - Math.ceil(dest.x);
            dest.height = Math.floor(dest.y + dest.height) - Math.ceil(dest.y);
            dest.x = x;
            dest.y = y;
            return dest;
        }

        static intersection (dest: Rect, rect2: Rect) {
            var x = Math.max(dest.x, rect2.x);
            var y = Math.max(dest.y, rect2.y);
            dest.width = Math.max(0, Math.min(dest.x + dest.width, rect2.x + rect2.width) - x);
            dest.height = Math.max(0, Math.min(dest.y + dest.height, rect2.y + rect2.height) - y);
            dest.x = x;
            dest.y = y;
        }

        static union (dest: Rect, rect2: Rect) {
            if (rect2.width <= 0 || rect2.height <= 0)
                return;
            if (dest.width <= 0 || dest.height <= 0) {
                Rect.copyTo(rect2, dest);
                return;
            }

            var x = Math.min(dest.x, rect2.x);
            var y = Math.min(dest.y, rect2.y);
            dest.width = Math.max(dest.x + dest.width, rect2.x + rect2.width) - x;
            dest.height = Math.max(dest.y + dest.height, rect2.y + rect2.height) - y;
            dest.x = x;
            dest.y = y;
        }

        static isContainedIn (src: Rect, test: Rect) {
            var sl = src.x;
            var st = src.y;
            var sr = src.x + src.width;
            var sb = src.y + src.height;

            var tl = test.x;
            var tt = test.y;
            var tr = test.x + test.width;
            var tb = test.y + test.height;

            if (sl < tl || st < tt || sl > tr || st > tb) //src top-left is outside test
                return false;
            if (sr < tl || sb < tt || sr > tr || sb > tb) //src bottom-right is outside test
                return false;
            return true;
        }

        static containsPoint (rect1: Rect, p: Point): boolean {
            return rect1.x <= p.x
                && rect1.y <= p.y
                && (rect1.x + rect1.width) >= p.x
                && (rect1.y + rect1.height) >= p.y;
        }

        static extendTo (dest: Rect, x: number, y: number) {
            var rx = dest.x;
            var ry = dest.y;
            var rw = dest.width;
            var rh = dest.height;

            if (x < rx || x > (rx + rw))
                rw = Math.max(Math.abs(x - rx), Math.abs(x - rx - rw));
            if (y < ry || y > (ry + rh))
                rh = Math.max(Math.abs(y - ry), Math.abs(y - ry - rh));

            dest.x = Math.min(rx, x);
            dest.y = Math.min(ry, y);
            dest.width = rw;
            dest.height = rh;
        }

        static grow (dest: Rect, left: number, top: number, right: number, bottom: number) {
            dest.x -= left;
            dest.y -= top;
            dest.width += left + right;
            dest.height += top + bottom;
            if (dest.width < 0)
                dest.width = 0;
            if (dest.height < 0)
                dest.height = 0;
            return dest;
        }

        static shrink (dest: Rect, left: number, top: number, right: number, bottom: number) {
            dest.x += left;
            dest.y += top;
            dest.width -= left + right;
            dest.height -= top + bottom;
            if (dest.width < 0)
                dest.width = 0;
            if (dest.height < 0)
                dest.height = 0;
        }

        static rectIn (rect1: Rect, rect2: Rect) {
            //TODO: Implement without creating Rect
            var copy = new Rect();
            Rect.copyTo(rect1, copy);
            Rect.intersection(copy, rect2);
            if (Rect.isEmpty(copy))
                return RectOverlap.Out;
            if (Rect.isEqual(copy, rect2))
                return RectOverlap.In;
            return RectOverlap.Part;
        }

        static transform (dest: Rect, mat: number[]) {
            if (!mat)
                return dest;
            var x = dest.x;
            var y = dest.y;
            var width = dest.width;
            var height = dest.height;

            vec2.init(x, y, p1);
            vec2.init(x + width, y, p2);
            vec2.init(x + width, y + height, p3);
            vec2.init(x, y + height, p4);

            mat3.transformVec2(mat, p1);
            mat3.transformVec2(mat, p2);
            mat3.transformVec2(mat, p3);
            mat3.transformVec2(mat, p4);

            var l = Math.min(p1[0], p2[0], p3[0], p4[0]);
            var t = Math.min(p1[1], p2[1], p3[1], p4[1]);
            var r = Math.max(p1[0], p2[0], p3[0], p4[0]);
            var b = Math.max(p1[1], p2[1], p3[1], p4[1]);

            dest.x = l;
            dest.y = t;
            dest.width = r - l;
            dest.height = b - t;
            return dest;
        }

        static transform4 (dest: Rect, projection: number[]) {
            //See mat/transform4.ts
        }
    }
}