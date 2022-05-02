/// <reference path="../../shape/measure/ShapeMeasurePipeDef" />

module minerva.shapes.ellipse.measure {
    export class EllipseMeasurePipeDef extends shape.measure.ShapeMeasurePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'shrinkAvailable', tapins.shrinkAvailable);
        }
    }

    export module tapins {
        export function shrinkAvailable (input: shape.measure.IInput, state: shape.measure.IState, output: shape.measure.IOutput, tree: core.IUpdaterTree) {
            var available = state.availableSize;
            available.width = available.height = 0;
            return true;
        }
    }
}