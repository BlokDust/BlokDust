module minerva.shapes.shape.processup {
    export interface IInput extends core.processup.IInput {
        stroke: IBrush;
        strokeThickness: number;

        shapeFlags: ShapeFlags;
        shapeRect: Rect;
    }
    export interface IState extends core.processup.IState {
    }
    export interface IOutput extends core.processup.IOutput {
        shapeFlags: ShapeFlags;
        shapeRect: Rect;
    }

    export class ShapeProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.addTapinBefore('calcExtents', 'calcShapeRect', tapins.calcShapeRect)
                .replaceTapin('calcExtents', tapins.calcExtents);
        }

        createOutput () {
            var output = <IOutput>super.createOutput();
            output.shapeFlags = ShapeFlags.None;
            output.shapeRect = new Rect();
            return output;
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            output.shapeFlags = input.shapeFlags;
            Rect.copyTo(input.shapeRect, output.shapeRect);
            super.prepare(input, state, output);
        }

        flush (input: IInput, state: IState, output: IOutput) {
            super.flush(input, state, output);
            Rect.copyTo(output.shapeRect, input.shapeRect);
            input.shapeFlags = output.shapeFlags;
        }
    }
}