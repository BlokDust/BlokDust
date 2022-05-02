/// <reference path="../../path/measure/PathMeasurePipeDef" />

module minerva.shapes.line.measure {
    export interface IInput extends path.measure.IInput {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }
    export interface IState extends path.measure.IState {
    }
    export interface IOutput extends path.measure.IOutput {
    }

    export class LineMeasurePipeDef extends path.measure.PathMeasurePipeDef {
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
            path.move(input.x1, input.y1);
            path.line(input.x2, input.y2);
            input.data.old = false;
            return true;
        }
    }
}