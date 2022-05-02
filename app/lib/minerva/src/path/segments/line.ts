module minerva.path.segments {
    export interface ILine extends IPathSegment {
        x: number;
        y: number;
    }
    export function line(x: number, y: number): ILine {
        return {
            isSingle: false,
            sx: null,
            sy: null,
            x: x,
            y: y,
            ex: x,
            ey: y,
            draw: function (ctx: CanvasRenderingContext2D) {
                ctx.lineTo(x, y);
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
                return "L" + x.toString() + "," + y.toString();
            },
            getStartVector: function (): number[] {
                return [
                        x - this.sx,
                        y - this.sy
                ];
            },
            getEndVector: function (): number[] {
                return [
                        x - this.sx,
                        y - this.sy
                ];
            }
        };
    }
}