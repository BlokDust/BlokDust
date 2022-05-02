/// <reference path="../../path/measure/PathMeasurePipeDef" />

module minerva.shapes.polyline.measure {
    export interface IInput extends path.measure.IInput {
        isClosed: boolean;
        points: IPoint[];
    }
    export interface IState extends path.measure.IState {
    }
    export interface IOutput extends path.measure.IOutput {
    }

    export class PolylineMeasurePipeDef extends path.measure.PathMeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('buildPath', tapins.buildPath);
        }
    }

    export module tapins {
        export function buildPath (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree) {
            if (!input.data.old)
                return true;

            var path = input.data.path;
            path.reset();

            var points = input.points;
            if (points.length < 2)
                return true;

            var p0 = points[0];
            var p = points[1];
            if (points.length === 2) {
                extendLine(p0, p, input.strokeThickness);
                path.move(p0.x, p0.y);
                path.line(p.x, p.y);
            } else {
                path.move(p0.x, p0.y);
                for (var i = 1; i < points.length; i++) {
                    var p = points[i];
                    path.line(p.x, p.y);
                }
            }
            if (input.isClosed)
                path.close();

            input.data.old = false;
            return true;
        }

        function extendLine (p1: IPoint, p2: IPoint, thickness: number) {
            var t5 = thickness * 5.0;
            var dx = p1.x - p2.x;
            var dy = p1.y - p2.y;

            if (dy === 0.0) {
                t5 -= thickness / 2.0;
                if (dx > 0.0) {
                    p1.x += t5;
                    p2.x -= t5;
                } else {
                    p1.x -= t5;
                    p2.x += t5;
                }
            } else if (dx === 0.0) {
                t5 -= thickness / 2.0;
                if (dy > 0.0) {
                    p1.y += t5;
                    p2.y -= t5;
                } else {
                    p1.y -= t5;
                    p2.y += t5;
                }
            } else {
                var angle = Math.atan2(dy, dx);
                var ax = Math.abs(Math.sin(angle) * t5);
                if (dx > 0.0) {
                    p1.x += ax;
                    p2.x -= ax;
                } else {
                    p1.x -= ax;
                    p2.x += ax;
                }
                var ay = Math.abs(Math.sin(Math.PI / 2 - angle)) * t5;
                if (dy > 0.0) {
                    p1.y += ay;
                    p2.y -= ay;
                } else {
                    p1.y -= ay;
                    p2.y += ay;
                }
            }
        }
    }
}