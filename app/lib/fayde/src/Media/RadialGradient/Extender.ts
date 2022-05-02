module Fayde.Media.RadialGradient {
    export interface IExtender {
        x0: number;
        y0: number;
        r0: number;
        x1: number;
        y1: number;
        r1: number;
        step(): boolean;
        createGradient(ctx: CanvasRenderingContext2D): CanvasGradient;
    }
    export interface IRadialPointData {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        r1: number;
        sx: number;
        sy: number;
        side: number;
        balanced: boolean;
    }
    export function createExtender (data: IRadialPointData, bounds: minerva.Rect): IExtender {
        var started = false;
        var dx = data.x1 - data.x0;
        var dy = data.y1 - data.y0;
        var rstep = data.r1;
        var reached = false;

        var ext = {
            x0: data.x0,
            y0: data.y0,
            r0: 0,
            x1: data.x1,
            y1: data.y1,
            r1: data.r1,
            step (): boolean {
                if (!started) {
                    started = true;
                    return true;
                }

                ext.x0 = ext.x1;
                ext.y0 = ext.y1;
                ext.r0 += rstep;
                ext.r1 += rstep;
                ext.x1 += dx;
                ext.y1 += dy;

                if (reached)
                    return false;
                reached = exceedBounds(ext.x1, ext.y1, ext.r1, bounds);
                return true;
            },
            createGradient (ctx: CanvasRenderingContext2D): CanvasGradient {
                return ctx.createRadialGradient(ext.x0, ext.y0, ext.r0, ext.x1, ext.y1, ext.r1);
            }
        };
        return ext;
    }

    function exceedBounds(cx: number, cy: number, radius: number, bounds: minerva.Rect) {
        var ne = len(cx, cy, bounds.x, bounds.y);
        var nw = len(cx, cy, bounds.x + bounds.width, bounds.y);
        var sw = len(cx, cy, bounds.x + bounds.width, bounds.y + bounds.height);
        var se = len(cx, cy, bounds.x, bounds.y + bounds.height);
        return Math.max(ne, nw, sw, se) < radius;
    }

    function len (x1: number, y1: number, x2: number, y2: number): number {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt((dx * dx) + (dy * dy));
    }
}