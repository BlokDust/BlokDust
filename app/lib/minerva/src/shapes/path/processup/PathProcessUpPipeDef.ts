/// <reference path="../../shape/processup/ShapeProcessUpPipeDef" />

module minerva.shapes.path.processup {
    export interface IInput extends shape.processup.IInput {
        naturalBounds: Rect;
        data: AnonPathGeometry;
        stretch: Stretch;
        stretchXform: number[];
    }
    export interface IState extends shape.processup.IState {
    }
    export interface IOutput extends shape.processup.IOutput {
        stretchXform: number[];
    }

    export class PathProcessUpPipeDef extends shape.processup.ShapeProcessUpPipeDef {
        constructor () {
            super();
            this.replaceTapin('calcActualSize', tapins.calcActualSize)
                .replaceTapin('calcShapeRect', tapins.calcShapeRect)
                .addTapinBefore('calcExtents', 'calcStretch', tapins.calcStretch)
                .replaceTapin('calcExtents', tapins.calcExtents);
        }

        createOutput () {
            var output = <IOutput>super.createOutput();
            output.stretchXform = mat3.identity();
            return output;
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            mat3.copyTo(input.stretchXform, output.stretchXform);
            super.prepare(input, state, output);
        }

        flush (input: IInput, state: IState, output: IOutput) {
            super.flush(input, state, output);
            mat3.copyTo(output.stretchXform, input.stretchXform);
        }
    }
}