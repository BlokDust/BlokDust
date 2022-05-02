module Fayde.Media.LinearGradient {
    export interface IInterpolator {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        step(): boolean;
        interpolate(offset: number): number;
    }

    export function createRepeatInterpolator (start: Point, end: Point, bounds: minerva.Rect): IInterpolator {
        var first = {x: start.x, y: start.y};
        var last = {x: end.x, y: end.y};
        var dir = {x: end.x - start.x, y: end.y - start.y};

        calcMetrics(dir, first, last, bounds);
        var numSteps = (last.x - first.x) / dir.x;
        var stepSize = 1.0 / numSteps;
        var cur = -stepSize;

        return {
            x0: first.x,
            y0: first.y,
            x1: last.x,
            y1: last.y,
            step (): boolean {
                cur += stepSize;
                return cur < 1;
            },
            interpolate (offset: number): number {
                return cur + (offset / numSteps);
            }
        };
    }

    export function createReflectInterpolator (start: Point, end: Point, bounds: minerva.Rect): IInterpolator {
        var first = {x: start.x, y: start.y};
        var last = {x: end.x, y: end.y};
        var dir = {x: end.x - start.x, y: end.y - start.y};

        calcMetrics(dir, first, last, bounds);
        var numSteps = (last.x - first.x) / dir.x;
        var stepSize = 1.0 / numSteps;
        var cur = -stepSize;
        var inverted = Math.round((start.x - first.x) / dir.x) % 2 === 0;

        return {
            x0: first.x,
            y0: first.y,
            x1: last.x,
            y1: last.y,
            step (): boolean {
                inverted = !inverted;
                cur += stepSize;
                return cur < 1;
            },
            interpolate (offset: number): number {
                var norm = offset / numSteps;
                return !inverted ? cur + norm : cur + (stepSize - norm);
            }
        };
    }
}