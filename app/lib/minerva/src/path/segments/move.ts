module minerva.path.segments {
    export interface IMove extends IPathSegment {
        x: number;
        y: number;
        isMove: boolean;
    }
    export function move(x: number, y: number): IMove {
        return {
            sx: null,
            sy: null,
            ex: x,
            ey: y,
            isSingle: false,
            isMove: true,
            x: x,
            y: y,
            draw: function (ctx: CanvasRenderingContext2D) {
                ctx.moveTo(x, y);
            },
            extendFillBox: function (box: IBoundingBox) {
                box.l = Math.min(box.l, x);
                box.r = Math.max(box.r, x);
                box.t = Math.min(box.t, y);
                box.b = Math.max(box.b, y);
            },
            extendStrokeBox: function (box: IBoundingBox, pars: IStrokeParameters) {
                this.extendFillBox(box);
            },
            toString: function (): string {
                return "M" + x.toString() + "," + y.toString();
            },
            getStartVector: function (): number[] {
                return null;
            },
            getEndVector: function (): number[] {
                return null;
            }
        };
    }
}